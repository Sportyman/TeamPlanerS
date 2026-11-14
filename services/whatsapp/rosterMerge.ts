import { ClubID, Gender, Person, Role } from '../../types';
import { ResolvedPollSummary, WhatsAppMemberMapping } from '../../types/whatsapp';
import { extractPhoneFromVoterId, normalizePhone, sanitizeDocId } from './pollFormatting';
import { getMappingUidForClub } from './pollMatching';

export const mergeClubRosterWithWhatsApp = (params: {
  clubId: ClubID | null;
  clubPeople: Person[];
  mappings: WhatsAppMemberMapping[];
  summary: ResolvedPollSummary | null;
}): Person[] => {
  const { clubId, clubPeople, mappings, summary } = params;
  if (!clubId) return clubPeople;

  const mappingByLinkedUid = new Map<string, WhatsAppMemberMapping>();
  const mappingByPhone = new Map<string, WhatsAppMemberMapping>();

  mappings.forEach((m) => {
    const linkedUid = getMappingUidForClub(m, clubId);
    if (linkedUid && !mappingByLinkedUid.has(linkedUid)) {
      mappingByLinkedUid.set(linkedUid, m);
    }
    const norm = normalizePhone(m.phone || extractPhoneFromVoterId(m.voterId));
    if (norm && !mappingByPhone.has(norm)) {
      mappingByPhone.set(norm, m);
    }
  });

  const existingIds = new Set(clubPeople.map((p) => p.id));
  const existingPhones = new Set(
    clubPeople.map((p) => normalizePhone(p.phone)).filter(Boolean)
  );

  const enrichedPeople: Person[] = clubPeople.map((person) => {
    const normPhone = normalizePhone(person.phone);
    const matchedMapping =
      mappingByLinkedUid.get(person.id) ||
      (normPhone ? mappingByPhone.get(normPhone) : undefined);
    const status = summary?.personStatusMap[person.id];
    const resolvedPhoto = person.photoURL || matchedMapping?.profilePicUrl;

    if (!status || status.intent !== 'ATTENDING') {
      return resolvedPhoto && resolvedPhoto !== person.photoURL
        ? { ...person, photoURL: resolvedPhoto }
        : person;
    }

    return {
      ...person,
      photoURL: resolvedPhoto,
      isSkipper: Boolean(person.isSkipper || status.detectedIsSkipper),
      tags: Array.from(new Set([...(person.tags || []), ...(status.detectedTags || [])])),
    };
  });

  const voteByVoterId = new Map(
    (summary?.voters || []).map((v) => [v.voterId, v])
  );

  const virtualMembers: Person[] = [];
  mappings.forEach((m) => {
    const linkedUid = getMappingUidForClub(m, clubId);
    if (linkedUid && existingIds.has(linkedUid)) return;

    const rawPhone = m.phone || extractPhoneFromVoterId(m.voterId) || '';
    const normPhone = normalizePhone(rawPhone);
    if (normPhone && existingPhones.has(normPhone)) return;

    const deterministicId = `wa_${sanitizeDocId(m.voterId).slice(0, 48)}`;
    if (existingIds.has(deterministicId)) return;

    existingIds.add(deterministicId);
    const vote = voteByVoterId.get(m.voterId);
    const displayName = (
      m.pushName ||
      vote?.displayName ||
      rawPhone ||
      m.voterId.split('@')[0]
    ).trim();

    const detectedRole =
      vote && vote.intent === 'ATTENDING' && vote.pollRole
        ? vote.pollRole
        : Role.MEMBER;

    virtualMembers.push({
      id: deterministicId,
      clubId,
      name: displayName,
      gender: Gender.MALE,
      role: detectedRole,
      rank: detectedRole === Role.INSTRUCTOR ? 5 : detectedRole === Role.VOLUNTEER ? 4 : 3,
      isSkipper: Boolean(vote?.detectedIsSkipper),
      phone: rawPhone,
      photoURL: m.profilePicUrl || vote?.profilePicUrl,
      attendanceCount: 0,
      tags: Array.from(new Set(['קבוצת וואטסאפ', ...(vote?.detectedTags || [])])),
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
