import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClubID, Person } from '../types';
import { ClubWhatsAppConfig, PollEvent, PollVote, WhatsAppMemberMapping } from '../types/whatsapp';
import { NotificationAction } from '../store/slices/createNotificationSlice';
import { DEFAULT_KEYWORD_RULES } from '../config/whatsappDefaults';
import { getPollColorToken } from '../services/whatsapp/pollFormatting';
import { buildWhatsAppGroupCatalog, doesPollMatchConfig, getEffectiveLinkedIds, resolveLinkedGroupItems } from '../services/whatsapp/groupCatalog';
import {
  fetchRecentPollVotesForClub, subscribeToClubWhatsAppConfig,
  subscribeToPollsEvents, subscribeToWhatsAppMembers,
} from '../services/whatsapp/whatsappSubscriptions';
import { usePollVotesSubscription } from './usePollVotesSubscription';

interface UseWhatsAppSubscriptionsParams {
  userId?: string;
  activeClub: ClubID | null;
  people: Person[];
  preferredPollId?: string | null;
  onNotify: (msg: string, type?: 'INFO' | 'SUCCESS' | 'WARN', action?: NotificationAction) => void;
}

export const useWhatsAppSubscriptions = ({ userId, activeClub, people, preferredPollId, onNotify }: UseWhatsAppSubscriptionsParams) => {
  const [polls, setPolls] = useState<PollEvent[]>([]);
  const [historicalVotes, setHistoricalVotes] = useState<PollVote[]>([]);
  const [mappings, setMappings] = useState<WhatsAppMemberMapping[]>([]);
  const [clubConfig, setClubConfig] = useState<ClubWhatsAppConfig>({
    clubId: activeClub || '', linkedGroups: [], keywordRules: DEFAULT_KEYWORD_RULES, pollColors: {},
  });
  const [selectedPollId, setSelectedPollId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);

  const knownRelevantIdsRef = useRef<Set<string> | null>(null);
  const handleVoteError = useCallback((msg: string) => setError(msg), []);

  useEffect(() => {
    knownRelevantIdsRef.current = null;
    setSelectedPollId('');
    setHistoricalVotes([]);
  }, [activeClub]);

  useEffect(() => {
    const handleSyncRefresh = () => setRetryKey((k) => k + 1);
    window.addEventListener('teamplaner:sync-refresh', handleSyncRefresh);
    return () => window.removeEventListener('teamplaner:sync-refresh', handleSyncRefresh);
  }, []);

  useEffect(() => {
    if (!userId || !activeClub) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const unsubConfig = subscribeToClubWhatsAppConfig(activeClub, (cfg) => setClubConfig(cfg), (err) => setError(err.message));
    const unsubMembers = subscribeToWhatsAppMembers((list) => setMappings(list), (err) => setError(err.message));
    return () => { unsubConfig(); unsubMembers(); };
  }, [userId, activeClub, retryKey]);

  useEffect(() => {
    if (!userId || !activeClub) return;
    const unsubPolls = subscribeToPollsEvents(
      undefined,
      (list) => { setPolls(list); setIsLoading(false); },
      (err) => { setError(err.message); setIsLoading(false); }
    );
    return () => unsubPolls();
  }, [userId, activeClub, retryKey]);

  const pollColors = clubConfig.pollColors;
  const hiddenPollSet = useMemo(() => new Set(clubConfig.hiddenPollIds || []), [clubConfig.hiddenPollIds]);
  const visiblePolls = useMemo(() => polls.filter((p) => !hiddenPollSet.has(p.pollId)), [polls, hiddenPollSet]);
  const hiddenPolls = useMemo(() => polls.filter((p) => hiddenPollSet.has(p.pollId)), [polls, hiddenPollSet]);

  const groupCatalog = useMemo(() => buildWhatsAppGroupCatalog(polls, mappings, clubConfig), [polls, mappings, clubConfig]);
  const effectiveLinkedGroupIds = useMemo(() => getEffectiveLinkedIds(clubConfig, groupCatalog), [clubConfig, groupCatalog]);
  const linkedGroupItems = useMemo(() => resolveLinkedGroupItems(clubConfig, groupCatalog), [clubConfig, groupCatalog]);
  const groupNameById = useMemo(() => new Map(groupCatalog.filter((g) => g.id).map((g) => [g.id!, g.name])), [groupCatalog]);
  const latestNameByAlias = useMemo(() => {
    const map = new Map<string, string>();
    groupCatalog.forEach((g) => {
      map.set(g.name.trim().toLowerCase(), g.name);
      g.knownAliases.forEach((a) => map.set(a.trim().toLowerCase(), g.name));
    });
    return map;
  }, [groupCatalog]);

  const relevantPolls = useMemo(() => {
    if (!clubConfig.linkedGroups.length && !effectiveLinkedGroupIds.length) return [];
    return visiblePolls
      .filter((p) => doesPollMatchConfig(p, clubConfig, effectiveLinkedGroupIds, groupCatalog))
      .map((p) => {
        const latestName = (p.groupId ? groupNameById.get(p.groupId) : undefined) || latestNameByAlias.get(p.group.trim().toLowerCase());
        const colorToken = pollColors?.[p.pollId] ? getPollColorToken(p.pollId, pollColors[p.pollId]) : p.colorToken;
        return { ...p, group: latestName || p.group, colorToken };
      });
  }, [visiblePolls, clubConfig, effectiveLinkedGroupIds, groupCatalog, groupNameById, latestNameByAlias, pollColors]);

  const unmatchedPolls = useMemo(() => {
    const matchedIds = new Set(relevantPolls.map((p) => p.pollId));
    return visiblePolls.filter((p) => !matchedIds.has(p.pollId));
  }, [visiblePolls, relevantPolls]);

  const relevantPollIdsKey = useMemo(() => relevantPolls.map((p) => p.pollId).slice(0, 10).join(','), [relevantPolls]);

  useEffect(() => {
    if (!userId || !relevantPollIdsKey) { setHistoricalVotes([]); return; }
    let cancelled = false;
    fetchRecentPollVotesForClub(relevantPollIdsKey.split(',')).then((allVotes) => {
      if (!cancelled) setHistoricalVotes(allVotes);
    });
    return () => { cancelled = true; };
  }, [userId, relevantPollIdsKey, retryKey]);

  useEffect(() => {
    if (preferredPollId && relevantPolls.some((p) => p.pollId === preferredPollId) && selectedPollId !== preferredPollId) {
      setSelectedPollId(preferredPollId);
    }
  }, [preferredPollId, relevantPolls, selectedPollId]);

  useEffect(() => {
    if (relevantPolls.length === 0) {
      if (selectedPollId) setSelectedPollId('');
      return;
    }
    const prevIds = knownRelevantIdsRef.current;
    const currentIds = new Set(relevantPolls.map((p) => p.pollId));
    if (prevIds && prevIds.size > 0) {
      const newlyArrived = relevantPolls.find((p) => !prevIds.has(p.pollId));
      knownRelevantIdsRef.current = currentIds;
      if (newlyArrived) {
        setSelectedPollId(newlyArrived.pollId);
        onNotify(`זוהה סקר חדש: "${newlyArrived.question}"`, 'INFO', {
          to: `/app/whatsapp?pollId=${encodeURIComponent(newlyArrived.pollId)}`,
          label: 'פתח סקר',
        });
        return;
      }
    } else {
      knownRelevantIdsRef.current = currentIds;
    }

    if (selectedPollId && currentIds.has(selectedPollId)) return;
    const topEntry = relevantPolls[0];
    const activeEntry = clubConfig.activePollId ? relevantPolls.find((p) => p.pollId === clubConfig.activePollId) : undefined;
    const topIsNewerPending = Boolean(topEntry.hasPendingTimestamp && topEntry.createdAtMs === 0);
    if (activeEntry && !topIsNewerPending && activeEntry.createdAtMs >= topEntry.createdAtMs) {
      setSelectedPollId(activeEntry.pollId);
      return;
    }
    setSelectedPollId(topEntry.pollId);
  }, [relevantPolls, clubConfig.activePollId, selectedPollId, onNotify]);

  const { votes, votesLoadedPollId, voteAlerts, setVoteAlerts, recentChangedVoters, setResolvedVotersRef } = usePollVotesSubscription({
    userId, activeClub, selectedPollId, retryKey,
    keywordRules: clubConfig.keywordRules, mappings, people,
    onNotify, onError: handleVoteError,
  });

  return {
    polls, relevantPolls, unmatchedPolls, hiddenPolls, votes, votesLoadedPollId, historicalVotes, mappings, clubConfig,
    selectedPollId, setSelectedPollId, voteAlerts, setVoteAlerts, recentChangedVoters, isLoading, error,
    groupCatalog, effectiveLinkedGroupIds, linkedGroupItems,
    retry: () => setRetryKey((k) => k + 1), setResolvedVotersRef,
  };
};
