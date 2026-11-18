import { ClubID, Person } from '../../types';
import {
  KeywordRule,
  MatchCandidate,
  PollIntent,
  PollVote,
  ResolvedVoter,
  VoteChangeAlert,
  WhatsAppMemberMapping,
} from '../../types/whatsapp';
import {
  classifySelectedOptions,
  cleanWhatsAppPhone,
  extractPhoneFromVoterId,
  namesMatch,
  normalizePhone,
} from './pollFormatting';
import { deduplicateLatestVotes } from './pollResolver';
import { normalizeGroupKey } from './firestorePayloadHelpers';

export const getMappingUidForClub = (m: WhatsAppMemberMapping, clubId?: ClubID): string | undefined => {
  if (clubId && m.clubLinks?.[clubId]) return m.clubLinks[clubId];
  if (!clubId || m.clubId === clubId) return m.uid;
  return undefined;
};

export const mappingBelongsToClub = (
  m: WhatsAppMemberMapping,
  clubId: ClubID,
  linkedGroups: string[],
  pollVoterIds: Set<string>,
  linkedGroupIds: string[] = []
): boolean => {
  const isManualLink = m.matchedBy === 'MANUAL' && Boolean(getMappingUidForClub(m, clubId));
  if (linkedGroupIds.length > 0 || linkedGroups.length > 0) {
    const groups = (m.groups || []).map((g) => g.trim());
    const inLinkedById = linkedGroupIds.length > 0 && groups.some((g) => linkedGroupIds.includes(g));
    const inLinkedByName = groups.some((g) => {
      const gNorm = normalizeGroupKey(g);
      return linkedGroups.some((lg) => {
        const lgNorm = normalizeGroupKey(lg);
        return Boolean(lgNorm) && (gNorm === lgNorm || gNorm.includes(lgNorm) || lgNorm.includes(gNorm));
      });
    });
    if (inLinkedById || inLinkedByName) return true;
    if (Array.isArray(m.groups)) return isManualLink;
  }

  if (getMappingUidForClub(m, clubId)) return true;
  const aliases = m.aliasVoterIds || [m.voterId];
  if (aliases.some((id) => pollVoterIds.has(id))) return true;
  return !linkedGroups.length && !linkedGroupIds.length;
};

export const findAutoSyncCandidates = (
  mappings: WhatsAppMemberMapping[],
  people: Person[],
  clubId?: ClubID
): MatchCandidate[] => {
  const candidates: MatchCandidate[] = [];
  const peopleByPhone = new Map<string, Person[]>();

  people.forEach((p) => {
    const norm = normalizePhone(p.phone);
    if (norm) peopleByPhone.set(norm, [...(peopleByPhone.get(norm) || []), p]);
  });

  mappings.forEach((m) => {
    const linkedUid = getMappingUidForClub(m, clubId);
    if (linkedUid && people.some((p) => p.id === linkedUid)) return;
    const norm = cleanWhatsAppPhone(m.phone, m.voterId);
    if (norm) {
      const matches = peopleByPhone.get(norm) || [];
      if (matches.length === 1) {
        candidates.push({ mapping: m, person: matches[0], confidence: 'PHONE_EXACT' });
        return;
      }
    }
    if (m.pushName) {
      const nameMatches = people.filter((p) => namesMatch(m.pushName, p.name));
      if (nameMatches.length === 1) {
        candidates.push({ mapping: m, person: nameMatches[0], confidence: 'NAME_EXACT' });
      }
    }
  });

  return candidates;
};

export const detectVoteChanges = (
  prevVotesByVoter: Map<string, PollVote>,
  nextVotes: PollVote[],
  resolvedVoters: ResolvedVoter[],
  rules: KeywordRule[],
  pollId: string,
  mappings: WhatsAppMemberMapping[] = [],
  people: Person[] = [],
  clubId?: ClubID
): VoteChangeAlert[] => {
  const latestNext = deduplicateLatestVotes(nextVotes);
  const voterLookup = new Map(resolvedVoters.map((v) => [v.voterId, v]));
  const mappingByVoter = new Map<string, WhatsAppMemberMapping>();
  const mappingByPhone = new Map<string, WhatsAppMemberMapping>();
  mappings.forEach((m) => {
    (m.aliasVoterIds || [m.voterId]).forEach((id) => mappingByVoter.set(id, m));
    const norm = cleanWhatsAppPhone(m.phone, m.voterId);
    if (norm) mappingByPhone.set(norm, m);
  });
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const peopleByPhone = new Map<string, Person>();
  people.forEach((p) => {
    const norm = normalizePhone(p.phone);
    if (norm) peopleByPhone.set(norm, p);
  });

  const alerts: VoteChangeAlert[] = [];

  latestNext.forEach((next) => {
    const prev = prevVotesByVoter.get(next.voter);
    const prevOpts = prev ? [...prev.selectedOptions].sort().join('|') : '';
    const nextOpts = [...next.selectedOptions].sort().join('|');
    if (prev && prevOpts === nextOpts) return;
    if (!prev && next.selectedOptions.length === 0) return;

    const resolved = voterLookup.get(next.voter);
    const cleanPhone = cleanWhatsAppPhone(next.phone, next.voter) || extractPhoneFromVoterId(next.voter);
    const mapping = resolved?.mapping || mappingByVoter.get(next.voter) || (cleanPhone ? mappingByPhone.get(cleanPhone) : undefined);
    const linkedUid = mapping ? getMappingUidForClub(mapping, clubId) : undefined;
    const person = resolved?.person || (linkedUid ? peopleById.get(linkedUid) : undefined) || (cleanPhone ? peopleByPhone.get(cleanPhone) : undefined);

    const prevClass = prev
      ? classifySelectedOptions(prev.selectedOptions, rules)
      : { intent: 'UNVOTED' as PollIntent };
    const nextClass = classifySelectedOptions(next.selectedOptions, rules);

    alerts.push({
      id: `${pollId}_${next.voter}_${next.timestampMs || Date.now()}`,
      pollId,
      voterId: next.voter,
      displayName: resolved?.displayName || person?.name || next.pushName || mapping?.pushName || cleanPhone || next.voter.split('@')[0],
      profilePicUrl: resolved?.profilePicUrl || next.profilePicUrl || mapping?.profilePicUrl || person?.photoURL,
      personId: person?.id,
      previousOptions: prev?.selectedOptions || [],
      newOptions: next.selectedOptions,
      previousIntent: prevClass.intent,
      newIntent: nextClass.intent,
      newRole: nextClass.detectedRole,
      detectedAt: new Date().toISOString(),
    });
  });

  return alerts;
};
