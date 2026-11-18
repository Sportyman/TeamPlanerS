import { Person, Role } from '../../types';
import {
  ClubWhatsAppConfig,
  PersonPollStatus,
  PollEvent,
  PollVote,
  ResolvedPollCounts,
  ResolvedPollSummary,
  ResolvedVoter,
  WhatsAppMemberMapping,
} from '../../types/whatsapp';
import { DEFAULT_KEYWORD_RULES } from '../../config/whatsappDefaults';
import {
  classifySelectedOptions,
  cleanWhatsAppPhone,
  namesMatch,
  normalizePhone,
  sanitizeDocId,
} from './pollFormatting';
import { getMappingUidForClub } from './pollMatching';
import { getPersonCanonicalPhone, getPicKey } from './personDedup';
import { getMappingCanonicalPhone } from './mappingDedup';

export const deduplicateLatestVotes = (votes: PollVote[]): PollVote[] => {
  const map = new Map<string, PollVote>();
  votes.forEach((vote) => {
    const prev = map.get(vote.voter);
    if (!prev || vote.timestampMs >= prev.timestampMs) map.set(vote.voter, vote);
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

  const mappingByVoter = new Map<string, WhatsAppMemberMapping>();
  const mappingByPhone = new Map<string, WhatsAppMemberMapping>();
  mappings.forEach((m) => {
    (m.aliasVoterIds || [m.voterId]).forEach((id) => mappingByVoter.set(id, m));
    const p = getMappingCanonicalPhone(m);
    if (p && !mappingByPhone.has(p)) mappingByPhone.set(p, m);
  });

  const rawLatest = deduplicateLatestVotes(votes);
  const canonicalVoteMap = new Map<string, PollVote>();
  rawLatest.forEach((v) => {
    const key = mappingByVoter.get(v.voter)?.voterId || v.voter;
    const prev = canonicalVoteMap.get(key);
    if (!prev || v.timestampMs >= prev.timestampMs) canonicalVoteMap.set(key, v);
  });
  const latestVotes = Array.from(canonicalVoteMap.values());

  const peopleById = new Map<string, Person>();
  const peopleByPhone = new Map<string, Person>();
  const peopleByPic = new Map<string, Person>();
  people.forEach((p) => {
    peopleById.set(p.id, p);
    const norm = getPersonCanonicalPhone(p);
    if (norm && !peopleByPhone.has(norm)) peopleByPhone.set(norm, p);
    const pic = getPicKey(p.photoURL);
    if (pic && !peopleByPic.has(pic)) peopleByPic.set(pic, p);
  });

  const counts: ResolvedPollCounts = {
    totalAttending: 0, volunteers: 0, members: 0, guests: 0,
    instructors: 0, skippers: 0, declining: 0, maybe: 0, unmappedAttending: 0,
  };
  const personStatusMap: Record<string, PersonPollStatus> = {};
  const attendingSet = new Set<string>();

  const resolvedVoters: ResolvedVoter[] = latestVotes.map((vote) => {
    const rawPhoneFromVote = cleanWhatsAppPhone(vote.phone, vote.voter);
    const mapping = mappingByVoter.get(vote.voter) || (rawPhoneFromVote ? mappingByPhone.get(rawPhoneFromVote) : undefined);
    const rawPhone = rawPhoneFromVote || (mapping ? getMappingCanonicalPhone(mapping) : undefined);
    const normPhone = normalizePhone(rawPhone);
    const clubUid = mapping ? getMappingUidForClub(mapping, config.clubId) : undefined;
    const manualPerson = clubUid ? peopleById.get(clubUid) : undefined;
    const phonePerson = normPhone ? peopleByPhone.get(normPhone) : undefined;
    const picKey = getPicKey(vote.profilePicUrl || mapping?.profilePicUrl);
    const picPerson = picKey ? peopleByPic.get(picKey) : undefined;
    const aliasIds = mapping?.aliasVoterIds || [vote.voter];
    const virtualWaPerson = aliasIds
      .map((id) => peopleById.get(`wa_${sanitizeDocId(id).slice(0, 48)}`))
      .find(Boolean);
    const namePerson = !manualPerson && !phonePerson && (vote.pushName || mapping?.pushName)
      ? people.find((p) => namesMatch(vote.pushName || mapping?.pushName, p.name))
      : undefined;

    const person = manualPerson || phonePerson || picPerson || virtualWaPerson;
    const matchSource: ResolvedVoter['matchSource'] = manualPerson
      ? 'MANUAL_MAP'
      : phonePerson
      ? 'PHONE_AUTO'
      : 'UNMAPPED';

    const classification = classifySelectedOptions(vote.selectedOptions, rules);
    const knownRole = person && person.role !== Role.UNASSIGNED ? person.role : undefined;
    const pollOverrides = config.pollRoleOverrides?.[poll.pollId];
    const manualOverride = (person ? pollOverrides?.[person.id] : undefined) || pollOverrides?.[vote.voter];
    const useManualOverride = manualOverride && manualOverride.updatedAtMs >= (vote.timestampMs || 0);
    const votedRole = classification.intent === 'ATTENDING' ? classification.detectedRole : undefined;
    const effectiveRole = (useManualOverride ? manualOverride.role : undefined)
      || votedRole
      || knownRole
      || person?.role
      || Role.UNASSIGNED;
    const displayName = person?.name || vote.pushName || mapping?.pushName || rawPhone || vote.voter.split('@')[0];
    const profilePicUrl = vote.profilePicUrl || mapping?.profilePicUrl || (person ? profilePhotos[person.id] : undefined);
    const updatedRecently = recentlyChangedVoterIds.has(vote.voter);

    if (classification.intent === 'ATTENDING') {
      counts.totalAttending++;
      if (effectiveRole === Role.VOLUNTEER) counts.volunteers++;
      else if (effectiveRole === Role.INSTRUCTOR) counts.instructors++;
      else if (effectiveRole === Role.GUEST) counts.guests++;
      else if (effectiveRole === Role.MEMBER) counts.members++;

      if (classification.detectedIsSkipper || person?.isSkipper) counts.skippers++;
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
        pollRole: effectiveRole !== Role.UNASSIGNED ? effectiveRole : classification.detectedRole,
        detectedIsSkipper: classification.detectedIsSkipper,
        detectedTags: classification.detectedTags,
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
      detectedIsSkipper: classification.detectedIsSkipper,
      detectedTags: classification.detectedTags,
      effectiveRole,
      person,
      mapping,
      suggestedPerson: !manualPerson ? phonePerson || namePerson : undefined,
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
