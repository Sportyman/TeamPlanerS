import { Person, Role } from '../../types';
import {
  ClubWhatsAppConfig,
  KeywordRule,
  PersonPollStatus,
  PollEvent,
  PollIntent,
  PollVote,
  ResolvedPollCounts,
  ResolvedPollSummary,
  ResolvedVoter,
  VoteChangeAlert,
  WhatsAppMemberMapping,
} from '../../types/whatsapp';
import { DEFAULT_KEYWORD_RULES } from '../../config/whatsappDefaults';
import {
  classifySelectedOptions,
  extractPhoneFromVoterId,
  normalizePhone,
} from './pollFormatting';

export const deduplicateLatestVotes = (votes: PollVote[]): PollVote[] => {
  const map = new Map<string, PollVote>();
  votes.forEach((vote) => {
    const prev = map.get(vote.voter);
    if (!prev || vote.timestampMs >= prev.timestampMs) {
      map.set(vote.voter, vote);
    }
  });
  return Array.from(map.values());
};

export const resolvePollSummary = (params: {
  poll: PollEvent;
  votes: PollVote[];
  mappings: WhatsAppMemberMapping[];
  people: Person[];
  profilePhotos: Record<string, string>;
  config: ClubWhatsAppConfig;
  recentlyChangedVoterIds: Set<string>;
}): ResolvedPollSummary => {
  const { poll, votes, mappings, people, profilePhotos, config, recentlyChangedVoterIds } = params;
  const rules = config.keywordRules?.length ? config.keywordRules : DEFAULT_KEYWORD_RULES;
  const latestVotes = deduplicateLatestVotes(votes);

  const mappingByVoter = new Map<string, WhatsAppMemberMapping>();
  mappings.forEach((m) => mappingByVoter.set(m.voterId, m));

  const peopleById = new Map<string, Person>();
  const peopleByPhone = new Map<string, Person>();
  people.forEach((p) => {
    peopleById.set(p.id, p);
    const norm = normalizePhone(p.phone);
    if (norm) peopleByPhone.set(norm, p);
  });

  const counts: ResolvedPollCounts = {
    totalAttending: 0,
    volunteers: 0,
    members: 0,
    guests: 0,
    instructors: 0,
    declining: 0,
    maybe: 0,
    unmappedAttending: 0,
  };
  const personStatusMap: Record<string, PersonPollStatus> = {};
  const attendingSet = new Set<string>();

  const resolvedVoters: ResolvedVoter[] = latestVotes.map((vote) => {
    const mapping = mappingByVoter.get(vote.voter);
    const rawPhone = vote.phone || mapping?.phone || extractPhoneFromVoterId(vote.voter);
    const normPhone = normalizePhone(rawPhone);
    const manualPerson = mapping?.uid ? peopleById.get(mapping.uid) : undefined;
    const phonePerson = normPhone ? peopleByPhone.get(normPhone) : undefined;

    const person = manualPerson || phonePerson;
    const matchSource: ResolvedVoter['matchSource'] = manualPerson
      ? 'MANUAL_MAP'
      : phonePerson
      ? 'PHONE_AUTO'
      : 'UNMAPPED';

    const classification = classifySelectedOptions(vote.selectedOptions, rules);
    const effectiveRole = classification.detectedRole || person?.role || Role.GUEST;
    const displayName =
      person?.name || vote.pushName || mapping?.pushName || rawPhone || vote.voter.split('@')[0];
    const profilePicUrl =
      vote.profilePicUrl || mapping?.profilePicUrl || (person ? profilePhotos[person.id] : undefined);
    const updatedRecently = recentlyChangedVoterIds.has(vote.voter);

    if (classification.intent === 'ATTENDING') {
      counts.totalAttending++;
      if (effectiveRole === Role.VOLUNTEER) counts.volunteers++;
      else if (effectiveRole === Role.INSTRUCTOR) counts.instructors++;
      else if (effectiveRole === Role.GUEST) counts.guests++;
      else counts.members++;

      if (person) attendingSet.add(person.id);
      else counts.unmappedAttending++;
    } else if (classification.intent === 'DECLINING') {
      counts.declining++;
    } else if (classification.intent === 'MAYBE') {
      counts.maybe++;
    }

    if (person && classification.intent !== 'UNVOTED') {
      personStatusMap[person.id] = {
        intent: classification.intent,
        pollRole: classification.detectedRole,
        selectedOptions: vote.selectedOptions,
        updatedRecently,
      };
    }

    return {
      voterId: vote.voter,
      displayName,
      profilePicUrl,
      phone: rawPhone,
      selectedOptions: vote.selectedOptions,
      intent: classification.intent,
      pollRole: classification.detectedRole,
      effectiveRole,
      person,
      mapping,
      suggestedPerson: !manualPerson ? phonePerson : undefined,
      matchSource,
      timestampMs: vote.timestampMs,
      updatedRecently,
    };
  });

  return {
    poll,
    counts,
    voters: resolvedVoters.sort((a, b) => b.timestampMs - a.timestampMs),
    attendingPersonIds: Array.from(attendingSet),
    personStatusMap,
  };
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
