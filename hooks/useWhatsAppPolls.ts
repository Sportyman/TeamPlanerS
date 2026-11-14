import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppStore } from '../store';
import { Person, Role } from '../types';
import { ClubWhatsAppConfig, MatchCandidate, ResolvedVoter, WhatsAppMemberMapping } from '../types/whatsapp';
import { resolvePollSummary } from '../services/whatsapp/pollResolver';
import { findAutoSyncCandidates, getMappingUidForClub, mappingBelongsToClub } from '../services/whatsapp/pollMatching';
import { mergeClubRosterWithWhatsApp } from '../services/whatsapp/rosterMerge';
import { deduplicateWhatsAppMappings, enrichVoteAlertsWithContacts } from '../services/whatsapp/mappingDedup';
import { collectAvailableGroups, runClubDuplicateCleanup } from '../services/whatsapp/clubDedupSync';
import { clearDeletedPollAttendance, reconcileInitialPollAttendance } from '../services/whatsapp/pollAttendanceSync';
import {
  autoLinkPhoneMatches, createClubGuestFromVoter, importWhatsAppRosterToClub,
  saveClubWhatsAppConfig, saveWhatsAppMemberMapping, unlinkWhatsAppMember, updateClubPersonRole,
} from '../services/whatsapp/whatsappMutations';
import { useWhatsAppSubscriptions } from './useWhatsAppSubscriptions';

const autoCheckedPollByClub = new Map<string, string>();

export const useWhatsAppPolls = () => {
  const { user, activeClub, people, sessions, setBulkAttendance, setPeople, addNotification } = useAppStore();
  const clubPeople = useMemo(() => people.filter((p) => p.clubId === activeClub), [people, activeClub]);
  const {
    polls, relevantPolls, votes, votesLoadedPollId, historicalVotes, mappings, clubConfig, selectedPollId,
    setSelectedPollId, voteAlerts: rawVoteAlerts, setVoteAlerts, recentChangedVoters, isLoading, error,
    retry, setResolvedVotersRef,
  } = useWhatsAppSubscriptions({ userId: user?.uid, activeClub, people: clubPeople, onNotify: addNotification });

  const attemptedAutoLinkRef = useRef<Set<string>>(new Set());
  const profilePhotos = useMemo(() => {
    const map: Record<string, string> = {};
    clubPeople.forEach((p) => { if (p.photoURL) map[p.id] = p.photoURL; });
    return map;
  }, [clubPeople]);

  const activePoll = useMemo(() => relevantPolls.find((p) => p.pollId === selectedPollId) || null, [relevantPolls, selectedPollId]);
  const dedupedMappings = useMemo(() => deduplicateWhatsAppMappings(mappings, activeClub || undefined), [mappings, activeClub]);

  const clubMappings = useMemo(() => {
    if (!activeClub) return [];
    const pollVoters = new Set(votes.map((v) => v.voter));
    if (!clubConfig.linkedGroups.length) {
      return dedupedMappings.filter((m) => Boolean(getMappingUidForClub(m, activeClub)) || (m.aliasVoterIds || [m.voterId]).some((id) => pollVoters.has(id)));
    }
    return dedupedMappings.filter((m) => mappingBelongsToClub(m, activeClub, clubConfig.linkedGroups, pollVoters));
  }, [dedupedMappings, activeClub, clubConfig.linkedGroups, votes]);

  const baseUnifiedPeople = useMemo(() => mergeClubRosterWithWhatsApp({
    clubId: activeClub, clubPeople, mappings: clubMappings, summary: null, historicalVotes, keywordRules: clubConfig.keywordRules,
  }), [activeClub, clubPeople, clubMappings, historicalVotes, clubConfig.keywordRules]);

  const summary = useMemo(() => activePoll ? resolvePollSummary({
    poll: activePoll, votes, mappings: clubMappings, people: baseUnifiedPeople, profilePhotos, config: clubConfig, recentlyChangedVoterIds: recentChangedVoters,
  }) : null, [activePoll, votes, clubMappings, baseUnifiedPeople, profilePhotos, clubConfig, recentChangedVoters]);

  const effectiveClubPeople = useMemo(() => mergeClubRosterWithWhatsApp({
    clubId: activeClub, clubPeople, mappings: clubMappings, summary, historicalVotes, keywordRules: clubConfig.keywordRules,
  }), [activeClub, clubPeople, clubMappings, summary, historicalVotes, clubConfig.keywordRules]);

  const voteAlerts = useMemo(
    () => enrichVoteAlertsWithContacts(rawVoteAlerts, clubMappings, effectiveClubPeople),
    [rawVoteAlerts, clubMappings, effectiveClubPeople]
  );

  const syncCandidates = useMemo(() => findAutoSyncCandidates(clubMappings, clubPeople, activeClub || undefined), [clubMappings, clubPeople, activeClub]);

  useEffect(() => { setResolvedVotersRef(summary?.voters || []); }, [summary, setResolvedVotersRef]);

  useEffect(() => {
    if (!activeClub || isLoading) return;
    const currentIds = sessions[activeClub]?.presentPersonIds || [];
    if (relevantPolls.length === 0 || !selectedPollId) {
      autoCheckedPollByClub.delete(activeClub);
      const cleared = clearDeletedPollAttendance(activeClub, currentIds);
      if (cleared) setBulkAttendance(cleared);
      return;
    }
    if (!summary || summary.poll.pollId !== selectedPollId || votesLoadedPollId !== selectedPollId) return;
    const decliningIds = Object.entries(summary.personStatusMap)
      .filter(([, st]) => st.intent === 'DECLINING')
      .map(([id]) => id)
      .sort();
    const sig = `${selectedPollId}|${[...summary.attendingPersonIds].sort().join(',')}|${decliningIds.join(',')}`;
    if (autoCheckedPollByClub.get(activeClub) === sig) return;
    if (recentChangedVoters.size > 0 && autoCheckedPollByClub.get(activeClub)?.startsWith(`${selectedPollId}|`)) return;

    autoCheckedPollByClub.set(activeClub, sig);
    const { nextIds, addedCount } = reconcileInitialPollAttendance(activeClub, summary, currentIds);
    if (nextIds) {
      setBulkAttendance(nextIds);
      if (addedCount > 0) addNotification(`סומנו אוטומטית ${summary.attendingPersonIds.length} משתתפים מהסקר`, 'INFO');
    }
  }, [activeClub, isLoading, relevantPolls.length, selectedPollId, votesLoadedPollId, summary, recentChangedVoters, sessions, setBulkAttendance, addNotification]);

  useEffect(() => {
    if (!activeClub || !user || user.isDev) return;
    const phoneMatches = syncCandidates.filter(
      (c) => c.confidence === 'PHONE_EXACT' && !attemptedAutoLinkRef.current.has(`${activeClub}:${c.mapping.voterId}:${c.person.id}`)
    );
    if (phoneMatches.length === 0) return;
    phoneMatches.forEach((c) => attemptedAutoLinkRef.current.add(`${activeClub}:${c.mapping.voterId}:${c.person.id}`));
    autoLinkPhoneMatches(phoneMatches, activeClub, user.email || user.uid).then((count) => {
      if (count > 0) addNotification(`סונכרנו אוטומטית ${count} חברים לפי טלפון וואטסאפ`, 'SUCCESS');
    }).catch(() => {});
  }, [activeClub, user, syncCandidates, addNotification]);

  useEffect(() => {
    if (!activeClub || !user || user.isDev || clubPeople.length < 2) return;
    runClubDuplicateCleanup({
      clubId: activeClub, clubPeople, allPeople: useAppStore.getState().people,
      mappings: clubMappings, attemptedSet: attemptedAutoLinkRef.current, updatedBy: user.email || user.uid,
    }).then((next) => { if (next) setPeople(next); }).catch(() => {});
  }, [activeClub, user, clubPeople, clubMappings, setPeople]);

  const availableGroups = useMemo(() => collectAvailableGroups(polls, mappings), [polls, mappings]);

  const linkClubGroup = useCallback(async (groupName: string) => {
    if (!activeClub || !groupName.trim()) return;
    const nextGroups = Array.from(new Set([...clubConfig.linkedGroups, groupName.trim()]));
    await saveClubWhatsAppConfig({ ...clubConfig, clubId: activeClub, linkedGroups: nextGroups });
    addNotification(`קבוצת "${groupName}" שויכה לחוג`, 'SUCCESS');
  }, [activeClub, clubConfig, addNotification]);

  const updateMemberRole = useCallback(async (person: Person, nextRole: Role, nextIsSkipper?: boolean, nextTags?: string[]) => {
    if (!activeClub) return;
    const patched: Person = { ...person, isWhatsAppGroupOnly: false, ...(nextTags !== undefined ? { tags: nextTags } : {}) };
    const updated = await updateClubPersonRole(activeClub, patched, nextRole, nextIsSkipper);
    const exists = people.some((p) => p.id === updated.id && p.clubId === activeClub);
    setPeople(exists ? people.map((p) => (p.id === updated.id && p.clubId === activeClub ? updated : p)) : [...people, updated]);
    addNotification(`עודכנו פרטי תפקיד/תג עבור ${person.name}`, 'SUCCESS');
  }, [activeClub, people, setPeople, addNotification]);

  const applyPollAttendance = useCallback((mode: 'REPLACE' | 'MERGE') => {
    if (!activeClub || !summary) return 0;
    const currentIds = sessions[activeClub]?.presentPersonIds || [];
    const nextIds = mode === 'REPLACE' ? summary.attendingPersonIds : Array.from(new Set([...currentIds, ...summary.attendingPersonIds]));
    setBulkAttendance(nextIds);
    addNotification(`נטענו ${summary.attendingPersonIds.length} משתתפים מאושרים מהסקר`, 'SUCCESS');
    return summary.attendingPersonIds.length;
  }, [activeClub, summary, sessions, setBulkAttendance, addNotification]);

  const linkVoterToPerson = useCallback(async (voter: ResolvedVoter, personId: string) => {
    if (!activeClub) return;
    await saveWhatsAppMemberMapping({
      voterId: voter.voterId, pushName: voter.displayName, profilePicUrl: voter.profilePicUrl,
      phone: voter.phone, uid: personId, clubId: activeClub, matchedBy: 'MANUAL', updatedBy: user?.email || user?.uid,
    });
    addNotification(`שויך מצביע (${voter.displayName}) לחבר בחוג`, 'SUCCESS');
  }, [activeClub, user, addNotification]);

  const confirmSyncCandidate = useCallback(async (candidate: MatchCandidate, roleOverride?: Role) => {
    if (!activeClub) return;
    if (roleOverride && roleOverride !== candidate.person.role) await updateMemberRole(candidate.person, roleOverride);
    await autoLinkPhoneMatches([candidate], activeClub, user?.email || user?.uid);
    addNotification(`אומת סנכרון: ${candidate.person.name}`, 'SUCCESS');
  }, [activeClub, user, updateMemberRole, addNotification]);

  const importRosterMembers = useCallback(async (entries: Array<{ mapping: WhatsAppMemberMapping; role: Role; isSkipper?: boolean }>) => {
    if (!activeClub || entries.length === 0) return 0;
    const created = await importWhatsAppRosterToClub(activeClub, entries, user?.email || user?.uid);
    addNotification(`יובאו ${created.length} חברים מקבוצת הוואטסאפ למאגר החוג`, 'SUCCESS');
    return created.length;
  }, [activeClub, user, addNotification]);

  const unlinkVoter = useCallback(async (voterId: string) => {
    await unlinkWhatsAppMember(voterId, activeClub || undefined);
    addNotification('השיוך הוסר מהחוג הנוכחי', 'INFO');
  }, [activeClub, addNotification]);

  const addGuestFromVoter = useCallback(async (voter: ResolvedVoter, persistToClub: boolean) => {
    if (!activeClub) return null;
    const guest: Person = await createClubGuestFromVoter({
      clubId: activeClub, voterId: voter.voterId, displayName: voter.displayName,
      phone: voter.phone, profilePicUrl: voter.profilePicUrl, persistToClub, updatedBy: user?.email || user?.uid,
    });
    if (!persistToClub) setPeople([...people, guest]);
    const currentIds = sessions[activeClub]?.presentPersonIds || [];
    setBulkAttendance(Array.from(new Set([...currentIds, guest.id])));
    addNotification(`נוסף כאורח לאימון: ${guest.name}`, 'SUCCESS');
    return guest;
  }, [activeClub, user, people, sessions, setPeople, setBulkAttendance, addNotification]);

  const saveConfig = useCallback(async (nextConfig: ClubWhatsAppConfig) => {
    await saveClubWhatsAppConfig(nextConfig);
    addNotification('הגדרות וואטסאפ של החוג נשמרו', 'SUCCESS');
  }, [addNotification]);

  const setPollColor = useCallback(async (pollId: string, colorId: string) => {
    if (!activeClub) return;
    await saveClubWhatsAppConfig({ ...clubConfig, clubId: activeClub, pollColors: { ...(clubConfig.pollColors || {}), [pollId]: colorId } });
  }, [activeClub, clubConfig]);

  return {
    polls: relevantPolls, allPollsCount: polls.length, activePoll, selectedPollId, setSelectedPollId, summary,
    clubConfig, clubPeople, effectiveClubPeople, mappings: clubMappings, syncCandidates, availableGroups, voteAlerts,
    dismissAlert: useCallback((id: string) => setVoteAlerts((p) => p.filter((a) => a.id !== id)), [setVoteAlerts]),
    clearAlerts: useCallback(() => setVoteAlerts([]), [setVoteAlerts]),
    isLoading, error, retry, applyPollAttendance, linkVoterToPerson, confirmSyncCandidate,
    importRosterMembers, unlinkVoter, addGuestFromVoter, saveConfig, setPollColor, linkClubGroup, updateMemberRole,
  };
};
