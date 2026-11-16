import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClubID, Person } from '../types';
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
import { getPollColorToken } from '../services/whatsapp/pollFormatting';
import { enrichVoteAlertsWithContacts, isNumericFallbackName } from '../services/whatsapp/mappingDedup';
import {
  fetchRecentPollVotesForClub,
  subscribeToClubWhatsAppConfig,
  subscribeToPollsEvents,
  subscribeToPollVotes,
  subscribeToWhatsAppMembers,
} from '../services/whatsapp/whatsappSubscriptions';

interface UseWhatsAppSubscriptionsParams {
  userId?: string;
  activeClub: ClubID | null;
  people: Person[];
  onNotify: (msg: string, type?: 'INFO' | 'SUCCESS' | 'WARN') => void;
}

export const useWhatsAppSubscriptions = ({ userId, activeClub, people, onNotify }: UseWhatsAppSubscriptionsParams) => {
  const [polls, setPolls] = useState<PollEvent[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [historicalVotes, setHistoricalVotes] = useState<PollVote[]>([]);
  const [mappings, setMappings] = useState<WhatsAppMemberMapping[]>([]);
  const [clubConfig, setClubConfig] = useState<ClubWhatsAppConfig>({
    clubId: activeClub || '', linkedGroups: [], keywordRules: DEFAULT_KEYWORD_RULES, pollColors: {},
  });
  const [selectedPollId, setSelectedPollId] = useState<string>('');
  const [votesLoadedPollId, setVotesLoadedPollId] = useState<string | null>(null);
  const [voteAlerts, setVoteAlerts] = useState<VoteChangeAlert[]>([]);
  const [recentChangedVoters, setRecentChangedVoters] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState<number>(0);

  const baselineVotesRef = useRef<Map<string, PollVote>>(new Map());
  const initializedPollRef = useRef<string | null>(null);
  const resolvedVotersRef = useRef<ResolvedVoter[]>([]);
  const mappingsRef = useRef<WhatsAppMemberMapping[]>([]);
  const peopleRef = useRef<Person[]>(people);

  mappingsRef.current = mappings;
  peopleRef.current = people;

  useEffect(() => {
    setSelectedPollId('');
    setVotesLoadedPollId(null);
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

  const keywordRulesRef = useRef(clubConfig.keywordRules);
  keywordRulesRef.current = clubConfig.keywordRules;

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
  const relevantPolls = useMemo(() => {
    if (!clubConfig.linkedGroups.length) return [];
    return polls
      .filter((p) => clubConfig.linkedGroups.some((g) => p.group.toLowerCase().includes(g.trim().toLowerCase())))
      .map((p) => (pollColors?.[p.pollId] ? { ...p, colorToken: getPollColorToken(p.pollId, pollColors[p.pollId]) } : p));
  }, [polls, clubConfig.linkedGroups, pollColors]);

  const relevantPollIdsKey = useMemo(
    () => relevantPolls.map((p) => p.pollId).slice(0, 10).join(','),
    [relevantPolls]
  );

  useEffect(() => {
    if (!userId || !relevantPollIdsKey) { setHistoricalVotes([]); return; }
    let cancelled = false;
    fetchRecentPollVotesForClub(relevantPollIdsKey.split(',')).then((allVotes) => {
      if (!cancelled) setHistoricalVotes(allVotes);
    });
    return () => { cancelled = true; };
  }, [userId, relevantPollIdsKey, retryKey]);

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
    if (!userId || !selectedPollId) { setVotes([]); setVotesLoadedPollId(null); return; }
    initializedPollRef.current = null;
    baselineVotesRef.current = new Map();
    setVotesLoadedPollId(null);

    const unsubVotes = subscribeToPollVotes(
      selectedPollId,
      (nextVotes) => {
        const latestList = deduplicateLatestVotes(nextVotes);
        setVotesLoadedPollId(selectedPollId);
        if (initializedPollRef.current !== selectedPollId) {
          baselineVotesRef.current = new Map(latestList.map((v) => [v.voter, v]));
          initializedPollRef.current = selectedPollId;
          setVotes(nextVotes);
          return;
        }
        const rules = keywordRulesRef.current?.length ? keywordRulesRef.current : DEFAULT_KEYWORD_RULES;
        const changes = detectVoteChanges(
          baselineVotesRef.current, nextVotes, resolvedVotersRef.current, rules, selectedPollId,
          mappingsRef.current, peopleRef.current, activeClub || undefined
        );
        if (changes.length > 0) {
          setVoteAlerts((prev) => [...changes, ...prev].slice(0, 25));
          setRecentChangedVoters((prev) => {
            const nextSet = new Set(prev);
            changes.forEach((c) => nextSet.add(c.voterId));
            return nextSet;
          });
          changes.forEach((c) => {
            const emitToast = (resolvedAlert: VoteChangeAlert) => {
              const newText = resolvedAlert.newOptions.length ? resolvedAlert.newOptions.join(', ') : 'ביטל הצבעה';
              onNotify(`עדכון בסקר: ${resolvedAlert.displayName} בחר/ה "${newText}"`, 'WARN');
            };
            if (isNumericFallbackName(c.displayName)) {
              setTimeout(() => {
                const enriched = enrichVoteAlertsWithContacts([c], mappingsRef.current, peopleRef.current)[0] || c;
                emitToast(enriched);
              }, 700);
            } else {
              emitToast(c);
            }
          });
        }
        baselineVotesRef.current = new Map(latestList.map((v) => [v.voter, v]));
        setVotes(nextVotes);
      },
      (err) => setError(err.message)
    );
    return () => unsubVotes();
  }, [userId, activeClub, selectedPollId, onNotify, retryKey]);

  const setResolvedVotersRef = useCallback((voters: ResolvedVoter[]) => { resolvedVotersRef.current = voters; }, []);

  return {
    polls, relevantPolls, votes, votesLoadedPollId, historicalVotes, mappings, clubConfig, selectedPollId,
    setSelectedPollId, voteAlerts, setVoteAlerts, recentChangedVoters, isLoading, error,
    retry: () => setRetryKey((k) => k + 1), setResolvedVotersRef,
  };
};
