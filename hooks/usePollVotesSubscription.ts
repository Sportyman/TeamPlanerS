import { useCallback, useEffect, useRef, useState } from 'react';
import { ClubID, Person } from '../types';
import { KeywordRule, PollVote, ResolvedVoter, VoteChangeAlert, WhatsAppMemberMapping } from '../types/whatsapp';
import { DEFAULT_KEYWORD_RULES } from '../config/whatsappDefaults';
import { deduplicateLatestVotes } from '../services/whatsapp/pollResolver';
import { detectVoteChanges } from '../services/whatsapp/pollMatching';
import { enrichVoteAlertsWithContacts, isNumericFallbackName } from '../services/whatsapp/mappingDedup';
import { subscribeToPollVotes } from '../services/whatsapp/whatsappSubscriptions';

interface UsePollVotesSubscriptionParams {
  userId?: string;
  activeClub: ClubID | null;
  selectedPollId: string;
  retryKey: number;
  keywordRules: KeywordRule[];
  mappings: WhatsAppMemberMapping[];
  people: Person[];
  onNotify: (msg: string, type?: 'INFO' | 'SUCCESS' | 'WARN') => void;
  onError: (msg: string) => void;
}

export const usePollVotesSubscription = ({
  userId,
  activeClub,
  selectedPollId,
  retryKey,
  keywordRules,
  mappings,
  people,
  onNotify,
  onError,
}: UsePollVotesSubscriptionParams) => {
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [votesLoadedPollId, setVotesLoadedPollId] = useState<string | null>(null);
  const [voteAlerts, setVoteAlerts] = useState<VoteChangeAlert[]>([]);
  const [recentChangedVoters, setRecentChangedVoters] = useState<Set<string>>(new Set());

  const baselineVotesRef = useRef<Map<string, PollVote>>(new Map());
  const initializedPollRef = useRef<string | null>(null);
  const resolvedVotersRef = useRef<ResolvedVoter[]>([]);
  const mappingsRef = useRef(mappings);
  const peopleRef = useRef(people);
  const keywordRulesRef = useRef(keywordRules);

  mappingsRef.current = mappings;
  peopleRef.current = people;
  keywordRulesRef.current = keywordRules;

  useEffect(() => {
    setVotesLoadedPollId(null);
    setVoteAlerts([]);
    setRecentChangedVoters(new Set());
  }, [activeClub]);

  useEffect(() => {
    if (!userId || !selectedPollId) {
      setVotes([]);
      setVotesLoadedPollId(null);
      return;
    }
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
      (err) => onError(err.message)
    );
    return () => unsubVotes();
  }, [userId, activeClub, selectedPollId, onNotify, onError, retryKey]);

  const setResolvedVotersRef = useCallback((voters: ResolvedVoter[]) => {
    resolvedVotersRef.current = voters;
  }, []);

  return { votes, votesLoadedPollId, voteAlerts, setVoteAlerts, recentChangedVoters, setResolvedVotersRef };
};
