import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { Person, Role } from '../types';
import { MatchCandidate, PollManageActions, ResolvedVoter, WhatsAppMemberMapping } from '../types/whatsapp';
import { resolvePollSummary } from '../services/whatsapp/pollResolver';
import { cleanWhatsAppPhone } from '../services/whatsapp/pollFormatting';
import { addLog } from '../services/syncService';
import { findAutoSyncCandidates, getMappingUidForClub, mappingBelongsToClub } from '../services/whatsapp/pollMatching';
import { mergeClubRosterWithWhatsApp } from '../services/whatsapp/rosterMerge';
import { deduplicateWhatsAppMappings, enrichVoteAlertsWithContacts } from '../services/whatsapp/mappingDedup';
import { runClubDuplicateCleanup } from '../services/whatsapp/clubDedupSync';
import { clearDeletedPollAttendance, reconcileInitialPollAttendance } from '../services/whatsapp/pollAttendanceSync';
import { autoLinkPhoneMatches, createClubGuestFromVoter, importWhatsAppRosterToClub, saveClubWhatsAppConfig, saveWhatsAppMemberMapping, unlinkWhatsAppMember, updateClubPersonRole } from '../services/whatsapp/whatsappMutations';
import { useWhatsAppSubscriptions } from './useWhatsAppSubscriptions';
import { useWhatsAppGroupConfigActions } from './useWhatsAppGroupConfigActions';
import { usePollDeleteActions } from './usePollDeleteActions';
import { useSmartRoleLifecycle } from './useSmartRoleLifecycle';

const autoCheckedPollByClub = new Map<string, string>();

export const useWhatsAppPolls = () => {
  const [searchParams] = useSearchParams();
  const { user, activeClub, people, sessions, setBulkAttendance, setPeople, addNotification } = useAppStore();
  const clubPeople = useMemo(() => people.filter((p) => p.clubId === activeClub), [people, activeClub]);
  const {
    polls, relevantPolls, unmatchedPolls, hiddenPolls, votes, votesLoadedPollId, historicalVotes, mappings, clubConfig, selectedPollId,
    setSelectedPollId, voteAlerts: rawVoteAlerts, setVoteAlerts, recentChangedVoters, isLoading, error,
    groupCatalog, effectiveLinkedGroupIds, linkedGroupItems, retry, setResolvedVotersRef,
  } = useWhatsAppSubscriptions({ userId: user?.uid, activeClub, people: clubPeople, preferredPollId: searchParams.get('pollId'), onNotify: addNotification });

  const attemptedAutoLinkRef = useRef<Set<string>>(new Set());
  const profilePhotos = useMemo(() => Object.fromEntries(clubPeople.filter((p) => p.photoURL).map((p) => [p.id, p.photoURL!])), [clubPeople]);

  const activePoll = useMemo(() => relevantPolls.find((p) => p.pollId === selectedPollId) || null, [relevantPolls, selectedPollId]);
  const dedupedMappings = useMemo(() => deduplicateWhatsAppMappings(mappings, activeClub || undefined), [mappings, activeClub]);

  const clubMappings = useMemo(() => {
    if (!activeClub) return [];
    const pollVoters = new Set(votes.map((v) => v.voter));
    const pollPhones = new Set(votes.map((v) => cleanWhatsAppPhone(v.phone, v.voter)).filter((p): p is string => Boolean(p)));
    if (!clubConfig.linkedGroups.length && !effectiveLinkedGroupIds.length) {
      return dedupedMappings.filter((m) => {
        const phone = cleanWhatsAppPhone(m.phone, m.voterId);
        return Boolean(getMappingUidForClub(m, activeClub)) || (m.aliasVoterIds || [m.voterId]).some((id) => pollVoters.has(id)) || Boolean(phone && pollPhones.has(phone));
      });
    }
    return dedupedMappings.filter((m) => mappingBelongsToClub(m, activeClub, clubConfig.linkedGroups, pollVoters, effectiveLinkedGroupIds, pollPhones));
  }, [dedupedMappings, activeClub, clubConfig.linkedGroups, effectiveLinkedGroupIds, votes]);

  const baseUnifiedPeople = useMemo(() => mergeClubRosterWithWhatsApp({
    clubId: activeClub, clubPeople, mappings: clubMappings, summary: null, historicalVotes, keywordRules: clubConfig.keywordRules,
  }), [activeClub, clubPeople, clubMappings, historicalVotes, clubConfig.keywordRules]);

  const summary = useMemo(() => activePoll ? resolvePollSummary({
    poll: activePoll, votes, mappings: clubMappings, people: baseUnifiedPeople, profilePhotos, config: clubConfig, recentlyChangedVoterIds: recentChangedVoters,
  }) : null, [activePoll, votes, clubMappings, baseUnifiedPeople, profilePhotos, clubConfig, recentChangedVoters]);

  const effectiveClubPeople = useMemo(() => mergeClubRosterWithWhatsApp({
    clubId: activeClub, clubPeople, mappings: clubMappings, summary, historicalVotes, keywordRules: clubConfig.keywordRules,
  }), [activeClub, clubPeople, clubMappings, summary, historicalVotes, clubConfig.keywordRules]);

  const voteAlerts = useMemo(() => enrichVoteAlertsWithContacts(rawVoteAlerts, clubMappings, effectiveClubPeople), [rawVoteAlerts, clubMappings, effectiveClubPeople]);
  const syncCandidates = useMemo(() => findAutoSyncCandidates(clubMappings, clubPeople, activeClub || undefined), [clubMappings, clubPeople, activeClub]);
  const lastLogSigRef = useRef<string>('');
  useEffect(() => {
    if (!summary) return;
    const missingPic = summary.voters.filter((v) => !v.profilePicUrl).length;
    const sig = `${summary.poll.pollId}:${summary.voters.length}:${summary.counts.unmappedAttending}:${clubMappings.length}:${effectiveClubPeople.length}:${missingPic}`;
    if (lastLogSigRef.current === sig) return;
    lastLogSigRef.current = sig;
    addLog(`Poll resolved (${summary.poll.pollId})`, 'WA', { voters: summary.voters.length, attending: summary.counts.totalAttending, unmappedAttending: summary.counts.unmappedAttending, clubMappings: clubMappings.length, effectivePeople: effectiveClubPeople.length, missingPic });
  }, [summary, clubMappings.length, effectiveClubPeople.length]);
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
    const decliningIds = Object.entries(summary.personStatusMap).filter(([, st]) => st.intent === 'DECLINING').map(([id]) => id).sort();
    const sig = `${selectedPollId}|${[...summary.attendingPersonIds].sort().join(',')}|${decliningIds.join(',')}`;
    if (autoCheckedPollByClub.get(activeClub) === sig) return;
    autoCheckedPollByClub.set(activeClub, sig);
    const { nextIds, addedCount } = reconcileInitialPollAttendance(activeClub, summary, currentIds);
    if (nextIds) {
      setBulkAttendance(nextIds, recentChangedVoters.size > 0 ? 'עדכון חי מסקר וואטסאפ' : 'טעינת נוכחות מהסקר');
      if (addedCount > 0) {
        addNotification(`סומנו אוטומטית ${summary.attendingPersonIds.length} משתתפים מהסקר`, 'INFO', { to: '/app?step=1', label: 'למסך נוכחות' }, { dedupeKey: `poll-sync:${activeClub}:${sig}` });
      }
    }
  }, [activeClub, isLoading, relevantPolls.length, selectedPollId, votesLoadedPollId, summary, sessions, setBulkAttendance, addNotification, recentChangedVoters]);

  useEffect(() => {
    if (!activeClub || !user) return;
    const phoneMatches = syncCandidates.filter((c) => c.confidence === 'PHONE_EXACT' && !attemptedAutoLinkRef.current.has(`${activeClub}:${c.mapping.voterId}:${c.person.id}`));
    if (phoneMatches.length === 0) return;
    phoneMatches.forEach((c) => attemptedAutoLinkRef.current.add(`${activeClub}:${c.mapping.voterId}:${c.person.id}`));
    autoLinkPhoneMatches(phoneMatches, activeClub, user.email || user.uid).then((count) => {
      if (count > 0) addNotification(`סונכרנו אוטומטית ${count} חברים לפי טלפון וואטסאפ`, 'SUCCESS', { to: '/app/whatsapp?tab=MAPPING', label: 'לשיוך מצביעים' }, { dedupeKey: `autolink:${activeClub}:${count}` });
    }).catch(() => {});
  }, [activeClub, user, syncCandidates, addNotification]);

  useEffect(() => {
    if (!activeClub || !user || clubPeople.length < 2) return;
    runClubDuplicateCleanup({
      clubId: activeClub, clubPeople, allPeople: useAppStore.getState().people,
      mappings: clubMappings, attemptedSet: attemptedAutoLinkRef.current, updatedBy: user.email || user.uid,
    }).then((next) => { if (next) setPeople(next); }).catch(() => {});
  }, [activeClub, user, clubPeople, clubMappings, setPeople]);

  const availableGroups = useMemo(() => groupCatalog.map((g) => g.name), [groupCatalog]);
  const { linkClubGroup, unlinkClubGroup, saveConfig, setPollColor } = useWhatsAppGroupConfigActions({ activeClub, userId: user?.uid, isLoading, clubConfig, groupCatalog, onNotify: addNotification });
  const { hidePollsFromSite, restoreHiddenPolls, deletePollsPermanently } = usePollDeleteActions({ activeClub, clubConfig, onNotify: addNotification });
  const { roleSuggestions, acceptRoleSuggestion, dismissRoleSuggestion } = useSmartRoleLifecycle({ activeClub, clubPeople, summary, onNotify: addNotification });

  const updateMemberRole = useCallback(async (person: Person, nextRole: Role, nextIsSkipper?: boolean, nextTags?: string[]) => {
    if (!activeClub) return;
    const basePerson = clubPeople.find((p) => p.id === person.id);
    const keepBaseRole = Boolean(activePoll && basePerson && !basePerson.isWhatsAppGroupOnly && basePerson.role !== Role.UNASSIGNED);
    const savedRole = keepBaseRole ? basePerson!.role : nextRole;
    if (!keepBaseRole || nextIsSkipper !== undefined || nextTags !== undefined) {
      const patched: Person = { ...(basePerson || person), isWhatsAppGroupOnly: false, ...(nextTags !== undefined ? { tags: nextTags } : {}) };
      const updated = await updateClubPersonRole(activeClub, patched, savedRole, nextIsSkipper);
      const exists = people.some((p) => p.id === updated.id && p.clubId === activeClub);
      setPeople(exists ? people.map((p) => (p.id === updated.id && p.clubId === activeClub ? updated : p)) : [...people, updated]);
    }
    if (activePoll) {
      const prevOverrides = clubConfig.pollRoleOverrides || {};
      const nextPollMap = { ...(prevOverrides[activePoll.pollId] || {}), [person.id]: { role: nextRole, updatedAtMs: Date.now() } };
      await saveClubWhatsAppConfig({ ...clubConfig, clubId: activeClub, pollRoleOverrides: { ...prevOverrides, [activePoll.pollId]: nextPollMap } }).catch(() => {});
    }
    addNotification(`עודכן עבור ${person.name}${keepBaseRole && nextRole !== savedRole ? ' (לסקר הנוכחי בלבד)' : ''}`, 'SUCCESS');
  }, [activeClub, activePoll, clubConfig, clubPeople, people, setPeople, addNotification]);

  const applyPollAttendance = useCallback((mode: 'REPLACE' | 'MERGE') => {
    if (!activeClub || !summary) return 0;
    const currentIds = sessions[activeClub]?.presentPersonIds || [];
    const nextIds = mode === 'REPLACE' ? summary.attendingPersonIds : Array.from(new Set([...currentIds, ...summary.attendingPersonIds]));
    setBulkAttendance(nextIds);
    addNotification(`נטענו ${summary.attendingPersonIds.length} משתתפים מאושרים מהסקר`, 'SUCCESS', { to: '/app?step=1', label: 'למסך נוכחות' });
    return summary.attendingPersonIds.length;
  }, [activeClub, summary, sessions, setBulkAttendance, addNotification]);

  const linkVoterToPerson = useCallback(async (voter: ResolvedVoter, personId: string) => {
    if (!activeClub) return;
    await saveWhatsAppMemberMapping({ voterId: voter.voterId, pushName: voter.displayName, profilePicUrl: voter.profilePicUrl, phone: voter.phone, uid: personId, clubId: activeClub, matchedBy: 'MANUAL', updatedBy: user?.email || user?.uid });
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
    await unlinkWhatsAppMember(voterId, activeClub || undefined); addNotification('השיוך הוסר מהחוג הנוכחי', 'INFO');
  }, [activeClub, addNotification]);

  const addGuestFromVoter = useCallback(async (voter: ResolvedVoter, persistToClub: boolean) => {
    if (!activeClub) return null;
    const guest: Person = await createClubGuestFromVoter({ clubId: activeClub, voterId: voter.voterId, displayName: voter.displayName, phone: voter.phone, profilePicUrl: voter.profilePicUrl, persistToClub, updatedBy: user?.email || user?.uid });
    if (!persistToClub) setPeople([...people, guest]);
    const currentIds = sessions[activeClub]?.presentPersonIds || [];
    setBulkAttendance(Array.from(new Set([...currentIds, guest.id])));
    addNotification(`נוסף כאורח לאימון: ${guest.name}`, 'SUCCESS');
    return guest;
  }, [activeClub, user, people, sessions, setPeople, setBulkAttendance, addNotification]);

  const pollManageActions = useMemo<PollManageActions>(() => ({
    polls: relevantPolls, unmatchedPolls, hiddenPolls, onHidePolls: hidePollsFromSite, onRestorePolls: restoreHiddenPolls, onDeletePollsPermanent: deletePollsPermanently,
  }), [relevantPolls, unmatchedPolls, hiddenPolls, hidePollsFromSite, restoreHiddenPolls, deletePollsPermanently]);

  return {
    polls: relevantPolls, unmatchedPolls, hiddenPolls, allPollsCount: polls.length, activePoll, selectedPollId, setSelectedPollId, summary,
    clubConfig, clubPeople, effectiveClubPeople, mappings: clubMappings, syncCandidates,
    availableGroups, groupCatalog, linkedGroupItems, voteAlerts,
    dismissAlert: useCallback((id: string) => setVoteAlerts((p) => p.filter((a) => a.id !== id)), [setVoteAlerts]),
    clearAlerts: useCallback(() => setVoteAlerts([]), [setVoteAlerts]),
    isLoading, error, retry, applyPollAttendance, linkVoterToPerson, confirmSyncCandidate,
    importRosterMembers, unlinkVoter, addGuestFromVoter, saveConfig, setPollColor, linkClubGroup, unlinkClubGroup,
    updateMemberRole, pollManageActions, roleSuggestions, acceptRoleSuggestion, dismissRoleSuggestion,
  };
};
