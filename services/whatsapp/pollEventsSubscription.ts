import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../../firebase';
import { PollEvent } from '../../types/whatsapp';
import { extractOptionLabels, formatHebrewPollDate, getPollColorToken } from './pollFormatting';
import { handleFirestoreError, OperationType } from './firestoreError';
import {
  extractPollCreatedAtInfo,
  fetchLatestVoteTimestampMap,
  resolvePollGroupInfo,
} from './firestorePayloadHelpers';

const getEffectiveSortMs = (poll: PollEvent): number =>
  poll.createdAtMs > 0 ? poll.createdAtMs : poll.hasPendingTimestamp ? Number.MAX_SAFE_INTEGER : 0;

export const subscribeToPollsEvents = (
  pollColors: Record<string, string> | undefined,
  onData: (polls: PollEvent[]) => void,
  onError: (err: Error) => void
): Unsubscribe => {
  const path = 'polls_events';
  const fallbackTsByPollId = new Map<string, number>();
  const requestedVoteFallback = new Set<string>();
  let latestDocs: Array<{ id: string; data: Record<string, unknown> }> = [];
  let hasInitialSnap = false;
  let cancelled = false;

  const buildAndEmit = () => {
    if (cancelled) return;
    const missingIds: string[] = [];

    const parsed: PollEvent[] = latestDocs
      .map(({ id, data }) => {
        const pollId = String(data.pollId || id);
        const { createdAtMs, hasPendingTimestamp } = extractPollCreatedAtInfo(
          data,
          fallbackTsByPollId.get(pollId)
        );
        if (createdAtMs === 0 && !requestedVoteFallback.has(pollId)) {
          missingIds.push(pollId);
        }
        const dateInfo =
          createdAtMs > 0
            ? formatHebrewPollDate(createdAtMs)
            : hasPendingTimestamp
            ? { displayDate: 'סקר חדש (ללא חותמת זמן)', displayTime: '' }
            : formatHebrewPollDate(0);
        const { groupId, group } = resolvePollGroupInfo(data);
        return {
          id,
          pollId,
          group,
          groupId,
          question: String(data.question || 'סקר ללא כותרת'),
          options: extractOptionLabels(data.options),
          createdAtMs,
          displayDate: dateInfo.displayDate,
          displayTime: dateInfo.displayTime,
          hasPendingTimestamp,
          colorToken: getPollColorToken(pollId, pollColors?.[pollId]),
        };
      })
      .sort((a, b) => getEffectiveSortMs(b) - getEffectiveSortMs(a));

    onData(parsed);

    if (missingIds.length > 0) {
      missingIds.forEach((pid) => requestedVoteFallback.add(pid));
      fetchLatestVoteTimestampMap(missingIds).then((recovered) => {
        if (cancelled || recovered.size === 0) return;
        let updated = false;
        recovered.forEach((ts, pid) => {
          if (ts > 0 && ts > (fallbackTsByPollId.get(pid) || 0)) {
            fallbackTsByPollId.set(pid, ts);
            updated = true;
          }
        });
        if (updated) buildAndEmit();
      });
    }
  };

  const unsub = onSnapshot(
    collection(db, path),
    (snap) => {
      if (hasInitialSnap) {
        snap.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const data = change.doc.data();
          const pollId = String(data.pollId || change.doc.id);
          const { createdAtMs } = extractPollCreatedAtInfo(data);
          if (createdAtMs === 0 && !fallbackTsByPollId.has(pollId)) {
            fallbackTsByPollId.set(pollId, Date.now());
          }
        });
      }
      hasInitialSnap = true;
      latestDocs = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
      buildAndEmit();
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );

  return () => {
    cancelled = true;
    unsub();
  };
};
