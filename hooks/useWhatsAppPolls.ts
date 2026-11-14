import { useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { Person } from '../types';
import { ClubWhatsAppConfig, ResolvedVoter } from '../types/whatsapp';
import { resolvePollSummary } from '../services/whatsapp/pollResolver';
import {
  createClubGuestFromVoter,
  saveClubWhatsAppConfig,
  saveWhatsAppMemberMapping,
  unlinkWhatsAppMember,
} from '../services/whatsapp/whatsappMutations';
import { useWhatsAppSubscriptions } from './useWhatsAppSubscriptions';

export const useWhatsAppPolls = () => {
  const {
    user,
    activeClub,
    people,
    sessions,
    setBulkAttendance,
    setPeople,
    addNotification,
  } = useAppStore();

  const {
    polls,
    relevantPolls,
    votes,
    mappings,
    clubConfig,
    selectedPollId,
    setSelectedPollId,
    voteAlerts,
    setVoteAlerts,
    recentChangedVoters,
    isLoading,
    error,
    retry,
    setResolvedVotersRef,
  } = useWhatsAppSubscriptions({
    userId: user?.uid,
    activeClub,
    onNotify: addNotification,
  });

  const clubPeople = useMemo(
    () => people.filter((p) => p.clubId === activeClub),
    [people, activeClub]
  );

  const profilePhotos = useMemo(() => {
    const map: Record<string, string> = {};
    clubPeople.forEach((p) => {
      if (p.photoURL) map[p.id] = p.photoURL;
    });
    return map;
  }, [clubPeople]);

  const activePoll = useMemo(
    () => polls.find((p) => p.pollId === selectedPollId) || null,
    [polls, selectedPollId]
  );

  const summary = useMemo(() => {
    if (!activePoll) return null;
    return resolvePollSummary({
      poll: activePoll,
      votes,
      mappings,
      people: clubPeople,
      profilePhotos,
      config: clubConfig,
      recentlyChangedVoterIds: recentChangedVoters,
    });
  }, [activePoll, votes, mappings, clubPeople, profilePhotos, clubConfig, recentChangedVoters]);

  useEffect(() => {
    setResolvedVotersRef(summary?.voters || []);
  }, [summary, setResolvedVotersRef]);

  const availableGroups = useMemo(
    () => Array.from(new Set(polls.map((p) => p.group).filter(Boolean))),
    [polls]
  );

  const applyPollAttendance = useCallback(
    (mode: 'REPLACE' | 'MERGE') => {
      if (!activeClub || !summary) return 0;
      const currentIds = sessions[activeClub]?.presentPersonIds || [];
      const nextIds =
        mode === 'REPLACE'
          ? summary.attendingPersonIds
          : Array.from(new Set([...currentIds, ...summary.attendingPersonIds]));
      setBulkAttendance(nextIds);
      addNotification(`נטענו ${summary.attendingPersonIds.length} משתתפים מאושרים מהסקר`, 'SUCCESS');
      return summary.attendingPersonIds.length;
    },
    [activeClub, summary, sessions, setBulkAttendance, addNotification]
  );

  const linkVoterToPerson = useCallback(
    async (voter: ResolvedVoter, personId: string) => {
      if (!activeClub) return;
      await saveWhatsAppMemberMapping({
        voterId: voter.voterId,
        pushName: voter.displayName,
        profilePicUrl: voter.profilePicUrl,
        phone: voter.phone,
        uid: personId,
        clubId: activeClub,
        matchedBy: 'MANUAL',
        updatedBy: user?.email || user?.uid,
      });
      addNotification(`שויך מצביע (${voter.displayName}) לחבר בחוג`, 'SUCCESS');
    },
    [activeClub, user, addNotification]
  );

  const unlinkVoter = useCallback(
    async (voterId: string) => {
      await unlinkWhatsAppMember(voterId);
      addNotification('השיוך הוסר', 'INFO');
    },
    [addNotification]
  );

  const addGuestFromVoter = useCallback(
    async (voter: ResolvedVoter, persistToClub: boolean) => {
      if (!activeClub) return null;
      const guest: Person = await createClubGuestFromVoter({
        clubId: activeClub,
        voterId: voter.voterId,
        displayName: voter.displayName,
        phone: voter.phone,
        profilePicUrl: voter.profilePicUrl,
        persistToClub,
        updatedBy: user?.email || user?.uid,
      });
      if (!persistToClub) setPeople([...people, guest]);
      const currentIds = sessions[activeClub]?.presentPersonIds || [];
      setBulkAttendance(Array.from(new Set([...currentIds, guest.id])));
      addNotification(`נוסף כאורח לאימון: ${guest.name}`, 'SUCCESS');
      return guest;
    },
    [activeClub, user, people, sessions, setPeople, setBulkAttendance, addNotification]
  );

  const saveConfig = useCallback(
    async (nextConfig: ClubWhatsAppConfig) => {
      await saveClubWhatsAppConfig(nextConfig);
      addNotification('הגדרות וואטסאפ של החוג נשמרו', 'SUCCESS');
    },
    [addNotification]
  );

  const setPollColor = useCallback(
    async (pollId: string, colorId: string) => {
      if (!activeClub) return;
      await saveClubWhatsAppConfig({
        ...clubConfig,
        clubId: activeClub,
        pollColors: { ...(clubConfig.pollColors || {}), [pollId]: colorId },
      });
    },
    [activeClub, clubConfig]
  );

  return {
    polls,
    relevantPolls,
    activePoll,
    selectedPollId,
    setSelectedPollId,
    summary,
    clubConfig,
    clubPeople,
    mappings,
    availableGroups,
    voteAlerts,
    dismissAlert: useCallback((id: string) => setVoteAlerts((p) => p.filter((a) => a.id !== id)), [setVoteAlerts]),
    clearAlerts: useCallback(() => setVoteAlerts([]), [setVoteAlerts]),
    isLoading,
    error,
    retry,
    applyPollAttendance,
    linkVoterToPerson,
    unlinkVoter,
    addGuestFromVoter,
    saveConfig,
    setPollColor,
  };
};
