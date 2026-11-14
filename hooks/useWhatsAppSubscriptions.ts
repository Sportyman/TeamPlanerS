import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClubWhatsAppConfig,
  PollEvent,
  PollVote,
  ResolvedVoter,
  VoteChangeAlert,
  WhatsAppMemberMapping,
} from '../types/whatsapp';
import { DEFAULT_KEYWORD_RULES } from '../config/whatsappDefaults';
import { deduplicateLatestVotes } from '../services/whatsapp/pollResolver';
import { detectVoteChanges } from '../services/whatsapp/pollMatching';
import {
  fetchRecentPollVotesForClub,
  subscribeToClubWhatsAppConfig,
  subscribeToPollsEvents,
  subscribeToPollVotes,
  subscribeToWhatsAppMembers,
} from '../services/whatsapp/whatsappSubscriptions';

interface UseWhatsAppSubscriptionsParams {
  userId?: string;
  activeClub: string | null;
  onNotify: (msg: string, type?: 'INFO' | 'SUCCESS' | 'WARN') => void;
}

export const useWhatsAppSubscriptions = ({ userId, activeClub, onNotify }: UseWhatsAppSubscriptionsParams) => {
  const [polls, setPolls] = useState<PollEvent[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [historicalVotes, setHistoricalVotes] = useState<PollVote[]>([]);
  const [mappings, setMappings] = useState<WhatsAppMemberMapping[]>([]);
  const [clubConfig, setClubConfig] = useState<ClubWhatsAppConfig>({
    clubId: activeClub || '', linkedGroups: [], keywordRules: DEFAULT_KEYWORD_RULES, pollColors: {},
  });
  const [selectedPollId, setSelectedPollId] = useState<string>('');
  const [voteAlerts, setVoteAlerts] = useState<VoteChangeAlert[]>([]);
  const [recentChangedVoters, setRecentChangedVoters] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);

  const baselineVotesRef = useRef<Map<string, PollVote>>(new Map());
  const initializedPollRef = useRef<string | null>(null);
  const resolvedVotersRef = useRef<ResolvedVoter[]>([]);

  useEffect(() => {
    setSelectedPollId('');
    setHistoricalVotes([]);
    setVoteAlerts([]);
    setRecentChangedVoters(new Set());
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
      clubConfig.pollColors,
      (list) => { setPolls(list); setIsLoading(false); },
      (err) => { setError(err.message); setIsLoading(false); }
    );
    return () => unsubPolls();
  }, [userId, activeClub, clubConfig.pollColors, retryKey]);

  const relevantPolls = useMemo(() => {
    if (!clubConfig.linkedGroups.length) return [];
    return polls.filter((p) =>
      clubConfig.linkedGroups.some((g) => p.group.toLowerCase().includes(g.trim().toLowerCase()))
    );
  }, [polls, clubConfig.linkedGroups]);

  useEffect(() => {
    if (!userId || relevantPolls.length === 0) { setHistoricalVotes([]); return; }
    let cancelled = false;
    fetchRecentPollVotesForClub(relevantPolls.map((p) => p.pollId)).then((allVotes) => {
      if (!cancelled) setHistoricalVotes(allVotes);
    });
    return () => { cancelled = true; };
  }, [userId, relevantPolls, retryKey]);

  useEffect(() => {
    if (relevantPolls.length === 0) {
      if (selectedPollId) setSelectedPollId('');
      return;
    }
    if (selectedPollId && relevantPolls.some((p) => p.pollId === selectedPollId)) return;
    if (clubConfig.activePollId && relevantPolls.some((p) => p.pollId === clubConfig.activePollId)) {
      setSelectedPollId(clubConfig.activePollId);
      return;
    }
    setSelectedPollId(relevantPolls[0].pollId);
  }, [relevantPolls, clubConfig.activePollId, selectedPollId]);

  useEffect(() => {
    if (!userId || !selectedPollId) { setVotes([]); return; }
    initializedPollRef.current = null;
    baselineVotesRef.current = new Map();

    const unsubVotes = subscribeToPollVotes(
      selectedPollId,
      (nextVotes) => {
        const latestList = deduplicateLatestVotes(nextVotes);
        if (initializedPollRef.current !== selectedPollId) {
          baselineVotesRef.current = new Map(latestList.map((v) => [v.voter, v]));
          initializedPollRef.current = selectedPollId;
          setVotes(nextVotes);
          return;
        }
        const rules = clubConfig.keywordRules?.length ? clubConfig.keywordRules : DEFAULT_KEYWORD_RULES;
        const changes = detectVoteChanges(baselineVotesRef.current, nextVotes, resolvedVotersRef.current, rules, selectedPollId);
        if (changes.length > 0) {
          setVoteAlerts((prev) => [...changes, ...prev].slice(0, 25));
          setRecentChangedVoters((prev) => {
            const nextSet = new Set(prev);
            changes.forEach((c) => nextSet.add(c.voterId));
            return nextSet;
          });
          changes.forEach((c) => {
            const newText = c.newOptions.length ? c.newOptions.join(', ') : 'ביטל הצבעה';
            onNotify(`עדכון בסקר: ${c.displayName} בחר/ה "${newText}"`, 'WARN');
          });
        }
        baselineVotesRef.current = new Map(latestList.map((v) => [v.voter, v]));
        setVotes(nextVotes);
      },
      (err) => setError(err.message)
    );
    return () => unsubVotes();
  }, [userId, selectedPollId, clubConfig.keywordRules, onNotify, retryKey]);

  const setResolvedVotersRef = useCallback((voters: ResolvedVoter[]) => { resolvedVotersRef.current = voters; }, []);

  return {
    polls, relevantPolls, votes, historicalVotes, mappings, clubConfig, selectedPollId, setSelectedPollId,
    voteAlerts, setVoteAlerts, recentChangedVoters, isLoading, error,
    retry: () => setRetryKey((k) => k + 1), setResolvedVotersRef,
  };
};
