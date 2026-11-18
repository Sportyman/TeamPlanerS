import { ClubID, Gender, Person, Role } from '../../types';
import { KeywordRule, PollOptionClassification, PollVote, ResolvedPollSummary, WhatsAppMemberMapping } from '../../types/whatsapp';
import { DEFAULT_KEYWORD_RULES } from '../../config/whatsappDefaults';
import { classifySelectedOptions, cleanWhatsAppPhone, normalizeName, sanitizeDocId } from './pollFormatting';
import { getMappingUidForClub } from './pollMatching';
import { deduplicateClubPeople, getPersonCanonicalPhone, getPicKey } from './personDedup';
import { getMappingCanonicalPhone } from './mappingDedup';

const buildHistoricalClassifications = (
  votes: PollVote[],
  rules: KeywordRule[]
): Map<string, PollOptionClassification> => {
  const latestByVoter = new Map<string, PollVote>();
  votes.forEach((v) => {
    const prev = latestByVoter.get(v.voter);
    if (!prev || v.timestampMs >= prev.timestampMs) latestByVoter.set(v.voter, v);
  });
  const map = new Map<string, PollOptionClassification>();
  latestByVoter.forEach((v, voterId) => {
    const cls = classifySelectedOptions(v.selectedOptions, rules.length ? rules : DEFAULT_KEYWORD_RULES);
    if (cls.detectedRole) map.set(voterId, cls);
  });
  return map;
};

export const mergeClubRosterWithWhatsApp = (params: {
  clubId: ClubID | null;
  clubPeople: Person[];
  mappings: WhatsAppMemberMapping[];
  summary: ResolvedPollSummary | null;
  historicalVotes?: PollVote[];
  keywordRules?: KeywordRule[];
}): Person[] => {
  const { clubId, clubPeople, mappings, summary, historicalVotes = [], keywordRules = [] } = params;
  const { people: uniqueClubPeople, aliasToKeepId } = deduplicateClubPeople(clubPeople);
  if (!clubId) return uniqueClubPeople;

  const historicalClass = buildHistoricalClassifications(historicalVotes, keywordRules);
  const mappingByLinkedUid = new Map<string, WhatsAppMemberMapping>();
  const mappingByPhone = new Map<string, WhatsAppMemberMapping>();
  const mappingByPic = new Map<string, WhatsAppMemberMapping>();

  mappings.forEach((m) => {
    const linkedUid = getMappingUidForClub(m, clubId);
    const resolvedUid = linkedUid ? (aliasToKeepId.get(linkedUid) || linkedUid) : undefined;
    if (resolvedUid && !mappingByLinkedUid.has(resolvedUid)) mappingByLinkedUid.set(resolvedUid, m);
    const norm = getMappingCanonicalPhone(m);
    if (norm && !mappingByPhone.has(norm)) mappingByPhone.set(norm, m);
    const pic = getPicKey(m.profilePicUrl);
    if (pic && !mappingByPic.has(pic)) mappingByPic.set(pic, m);
  });

  const existingIds = new Set(uniqueClubPeople.map((p) => p.id));
  aliasToKeepId.forEach((_, rawId) => existingIds.add(rawId));
  const existingPhones = new Set(uniqueClubPeople.map((p) => getPersonCanonicalPhone(p)).filter(Boolean) as string[]);
  const existingNames = new Set(uniqueClubPeople.map((p) => normalizeName(p.name)).filter((n) => n.length >= 3));
  const existingPics = new Set(uniqueClubPeople.map((p) => getPicKey(p.photoURL)).filter(Boolean));

  const enrichedPeople: Person[] = uniqueClubPeople.map((person) => {
    const normPhone = getPersonCanonicalPhone(person);
    const picKey = getPicKey(person.photoURL);
    const matchedMapping = mappingByLinkedUid.get(person.id)
      || (normPhone ? mappingByPhone.get(normPhone) : undefined)
      || (picKey ? mappingByPic.get(picKey) : undefined);
    const status = summary?.personStatusMap[person.id];
    const aliases = matchedMapping?.aliasVoterIds || (matchedMapping ? [matchedMapping.voterId] : []);
    const hist = aliases.map((id) => historicalClass.get(id)).find(Boolean);
    const resolvedPhoto = person.photoURL || matchedMapping?.profilePicUrl;
    const sessionPollRole = status?.intent === 'ATTENDING' && status.pollRole && status.pollRole !== Role.UNASSIGNED
      ? status.pollRole
      : undefined;
    const inferredRole = sessionPollRole
      || (person.role === Role.UNASSIGNED ? (status?.pollRole || hist?.detectedRole || Role.UNASSIGNED) : person.role);

    return {
      ...person,
      phone: normPhone || cleanWhatsAppPhone(person.phone) || person.phone,
      role: inferredRole,
      photoURL: resolvedPhoto,
      isSkipper: Boolean(person.isSkipper || (status?.intent === 'ATTENDING' && status.detectedIsSkipper) || (person.role === Role.UNASSIGNED && hist?.detectedIsSkipper)),
      tags: Array.from(new Set([...(person.tags || []), ...((status?.intent === 'ATTENDING' && status.detectedTags) || []), ...(person.role === Role.UNASSIGNED && hist?.detectedTags ? hist.detectedTags : [])])),
    };
  });

  const voteByVoterId = new Map((summary?.voters || []).map((v) => [v.voterId, v]));
  const virtualMembers: Person[] = [];

  mappings.forEach((m) => {
    const linkedUid = getMappingUidForClub(m, clubId);
    if (linkedUid && existingIds.has(linkedUid)) return;
    const normPhone = getMappingCanonicalPhone(m) || '';
    if (normPhone && existingPhones.has(normPhone)) return;
    const aliases = m.aliasVoterIds || [m.voterId];
    if (aliases.some((id) => existingIds.has(`wa_${sanitizeDocId(id).slice(0, 48)}`))) return;
    const picKey = getPicKey(m.profilePicUrl);
    if (picKey && existingPics.has(picKey) && !normPhone) return;
    const normPush = normalizeName(m.pushName);
    if (normPush.length >= 3 && existingNames.has(normPush) && !normPhone) return;

    const deterministicId = `wa_${sanitizeDocId(m.voterId).slice(0, 48)}`;
    existingIds.add(deterministicId);
    aliases.forEach((id) => existingIds.add(`wa_${sanitizeDocId(id).slice(0, 48)}`));
    if (normPhone) existingPhones.add(normPhone);
    if (picKey) existingPics.add(picKey);
    if (normPush.length >= 3) existingNames.add(normPush);

    const vote = aliases.map((id) => voteByVoterId.get(id)).find(Boolean);
    const hist = aliases.map((id) => historicalClass.get(id)).find(Boolean);
    const displayName = (m.pushName || vote?.displayName || normPhone || m.voterId.split('@')[0]).trim();
    const detectedRole = vote?.pollRole || hist?.detectedRole || Role.UNASSIGNED;

    virtualMembers.push({
      id: deterministicId, clubId, name: displayName, gender: Gender.MALE, role: detectedRole,
      rank: detectedRole === Role.INSTRUCTOR ? 5 : detectedRole === Role.VOLUNTEER ? 4 : 3,
      isSkipper: Boolean(vote?.detectedIsSkipper || hist?.detectedIsSkipper),
      phone: normPhone, photoURL: m.profilePicUrl || vote?.profilePicUrl, attendanceCount: 0,
      tags: Array.from(new Set(['קבוצת וואטסאפ', ...(vote?.detectedTags || hist?.detectedTags || [])])),
      isWhatsAppGroupOnly: true,
    });
  });

  (summary?.voters || []).forEach((v) => {
    if (v.person && existingIds.has(v.person.id)) return;
    const deterministicId = `wa_${sanitizeDocId(v.voterId).slice(0, 48)}`;
    if (existingIds.has(deterministicId)) return;
    const normPhone = cleanWhatsAppPhone(v.phone, v.voterId) || '';
    if (normPhone && existingPhones.has(normPhone)) return;

    existingIds.add(deterministicId);
    if (normPhone) existingPhones.add(normPhone);
    const detectedRole = v.effectiveRole !== Role.UNASSIGNED ? v.effectiveRole : (v.pollRole || Role.UNASSIGNED);
    virtualMembers.push({
      id: deterministicId, clubId, name: v.displayName, gender: Gender.MALE, role: detectedRole,
      rank: detectedRole === Role.INSTRUCTOR ? 5 : detectedRole === Role.VOLUNTEER ? 4 : 3,
      isSkipper: Boolean(v.detectedIsSkipper),
      phone: normPhone, photoURL: v.profilePicUrl, attendanceCount: 0,
      tags: Array.from(new Set(['קבוצת וואטסאפ', ...(v.detectedTags || [])])),
      isWhatsAppGroupOnly: true,
    });
  });

  return [...enrichedPeople, ...virtualMembers];
};

export const sortAttendancePeople = (people: Person[]): Person[] => {
  return [...people].sort((a, b) => {
    const countDiff = (b.attendanceCount || 0) - (a.attendanceCount || 0);
    if (countDiff !== 0) return countDiff;
    return a.name.localeCompare(b.name, 'he');
  });
};
