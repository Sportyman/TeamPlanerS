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
  extractPhoneFromVoterId,
  namesMatch,
  normalizePhone,
} from './pollFormatting';
import { deduplicateLatestVotes } from './pollResolver';

export const getMappingUidForClub = (m: WhatsAppMemberMapping, clubId?: ClubID): string | undefined => {
  if (clubId && m.clubLinks?.[clubId]) return m.clubLinks[clubId];
  if (!clubId || m.clubId === clubId) return m.uid;
  return undefined;
};

export const mappingBelongsToClub = (
  m: WhatsAppMemberMapping,
  clubId: ClubID,
  linkedGroups: string[],
  pollVoterIds: Set<string>
): boolean => {
  if (getMappingUidForClub(m, clubId)) return true;
  if (pollVoterIds.has(m.voterId)) return true;
  if (!linkedGroups.length) return true;
  const groups = m.groups || [];
  return groups.some((g) =>
    linkedGroups.some((lg) => g.toLowerCase().includes(lg.trim().toLowerCase()))
  );
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
    const norm = normalizePhone(m.phone || extractPhoneFromVoterId(m.voterId));
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
  pollId: string
): VoteChangeAlert[] => {
  const latestNext = deduplicateLatestVotes(nextVotes);
  const voterLookup = new Map(resolvedVoters.map((v) => [v.voterId, v]));
  const alerts: VoteChangeAlert[] = [];

  latestNext.forEach((next) => {
    const prev = prevVotesByVoter.get(next.voter);
    const prevOpts = prev ? [...prev.selectedOptions].sort().join('|') : '';
    const nextOpts = [...next.selectedOptions].sort().join('|');
    if (prev && prevOpts === nextOpts) return;
    if (!prev && next.selectedOptions.length === 0) return;

    const resolved = voterLookup.get(next.voter);
    const prevClass = prev
      ? classifySelectedOptions(prev.selectedOptions, rules)
      : { intent: 'UNVOTED' as PollIntent };
    const nextClass = classifySelectedOptions(next.selectedOptions, rules);

    alerts.push({
      id: `${pollId}_${next.voter}_${next.timestampMs || Date.now()}`,
      pollId,
      voterId: next.voter,
      displayName: resolved?.displayName || next.pushName || next.voter.split('@')[0],
      profilePicUrl: resolved?.profilePicUrl || next.profilePicUrl,
      personId: resolved?.person?.id,
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
