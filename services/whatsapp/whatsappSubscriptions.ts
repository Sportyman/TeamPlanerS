import { db } from '../../firebase';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  Unsubscribe,
  where,
} from 'firebase/firestore';
import { ClubID } from '../../types';
import {
  ClubWhatsAppConfig,
  PollEvent,
  PollVote,
  WhatsAppMemberMapping,
} from '../../types/whatsapp';
import { DEFAULT_KEYWORD_RULES } from '../../config/whatsappDefaults';
import { formatHebrewPollDate, getPollColorToken, toTimestampMs } from './pollFormatting';
import { handleFirestoreError, OperationType } from './firestoreError';

export const subscribeToPollsEvents = (
  pollColors: Record<string, string> | undefined,
  onData: (polls: PollEvent[]) => void,
  onError: (err: Error) => void
): Unsubscribe => {
  const path = 'polls_events';
  const q = query(collection(db, path), limit(60));
  return onSnapshot(
    q,
    (snap) => {
      const parsed: PollEvent[] = snap.docs
        .map((d) => {
          const data = d.data();
          const pollId = String(data.pollId || d.id);
          const createdAtMs = toTimestampMs(data.createdAt);
          const { displayDate, displayTime } = formatHebrewPollDate(createdAtMs);
          return {
            id: d.id,
            pollId,
            group: String(data.group || 'קבוצה כללית'),
            question: String(data.question || 'סקר ללא כותרת'),
            options: Array.isArray(data.options) ? data.options.map(String) : [],
            createdAtMs,
            displayDate,
            displayTime,
            colorToken: getPollColorToken(pollId, pollColors?.[pollId]),
          };
        })
        .sort((a, b) => b.createdAtMs - a.createdAtMs);
      onData(parsed);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
};

export const subscribeToPollVotes = (
  pollId: string,
  onData: (votes: PollVote[]) => void,
  onError: (err: Error) => void
): Unsubscribe => {
  const path = 'poll_votes';
  const q = query(collection(db, path), where('pollId', '==', pollId));
  return onSnapshot(
    q,
    (snap) => {
      const parsed: PollVote[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          pollId: String(data.pollId || pollId),
          voter: String(data.voter || ''),
          pushName: data.pushName || data.voterName || undefined,
          profilePicUrl: data.profilePicUrl || undefined,
          phone: data.phone || undefined,
          selectedOptions: Array.isArray(data.selectedOptions) ? data.selectedOptions.map(String) : [],
          timestampMs: toTimestampMs(data.timestamp),
        };
      });
      onData(parsed);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
};

export const subscribeToWhatsAppMembers = (
  onData: (members: WhatsAppMemberMapping[]) => void,
  onError: (err: Error) => void
): Unsubscribe => {
  const path = 'whatsapp_members';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const parsed: WhatsAppMemberMapping[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          voterId: String(data.voterId || d.id),
          pushName: data.pushName || data.displayName || undefined,
          profilePicUrl: data.profilePicUrl || undefined,
          phone: data.phone || undefined,
          uid: data.uid || undefined,
          clubId: data.clubId || undefined,
          matchedBy: data.matchedBy || undefined,
          updatedAt: data.updatedAt || undefined,
          updatedBy: data.updatedBy || undefined,
        };
      });
      onData(parsed);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
};

export const subscribeToClubWhatsAppConfig = (
  clubId: ClubID,
  onData: (config: ClubWhatsAppConfig) => void,
  onError: (err: Error) => void
): Unsubscribe => {
  const path = `whatsapp_club_configs/${clubId}`;
  return onSnapshot(
    doc(db, 'whatsapp_club_configs', clubId),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onData({
          clubId,
          linkedGroups: Array.isArray(data.linkedGroups) ? data.linkedGroups : [],
          keywordRules:
            Array.isArray(data.keywordRules) && data.keywordRules.length > 0
              ? data.keywordRules
              : DEFAULT_KEYWORD_RULES,
          pollColors: data.pollColors || {},
          activePollId: data.activePollId || undefined,
          updatedAt: data.updatedAt || undefined,
        });
      } else {
        onData({
          clubId,
          linkedGroups: [],
          keywordRules: DEFAULT_KEYWORD_RULES,
          pollColors: {},
        });
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
};
