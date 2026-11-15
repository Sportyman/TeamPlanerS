import { db } from '../../firebase';
import { collection, doc, getDocs, onSnapshot, query, Unsubscribe, where } from 'firebase/firestore';
import { ClubID } from '../../types';
import { ClubWhatsAppConfig, PollEvent, PollVote, WhatsAppMemberMapping } from '../../types/whatsapp';
import { DEFAULT_KEYWORD_RULES } from '../../config/whatsappDefaults';
import { extractOptionLabels, formatHebrewPollDate, getPollColorToken, toTimestampMs } from './pollFormatting';
import { handleFirestoreError, OperationType } from './firestoreError';
import { addLog } from '../syncService';

export const subscribeToPollsEvents = (
  pollColors: Record<string, string> | undefined,
  onData: (polls: PollEvent[]) => void,
  onError: (err: Error) => void
): Unsubscribe => {
  const path = 'polls_events';
  return onSnapshot(
    collection(db, path),
    (snap) => {
      const parsed: PollEvent[] = snap.docs
        .map((d) => {
          const data = d.data();
          const pollId = String(data.pollId || d.id);
          const createdAtMs =
            toTimestampMs(data.createdAt) ||
            toTimestampMs(data.timestamp) ||
            toTimestampMs(data.created_at) ||
            toTimestampMs(data.updatedAt);
          const { displayDate, displayTime } = formatHebrewPollDate(createdAtMs);
          return {
            id: d.id,
            pollId,
            group: String(data.groupName || data.group || 'קבוצה כללית').trim(),
            question: String(data.question || 'סקר ללא כותרת'),
            options: extractOptionLabels(data.options),
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
          selectedOptions: extractOptionLabels(data.selectedOptions),
          timestampMs: toTimestampMs(data.interractedAt) || toTimestampMs(data.timestamp),
          interractedAtMs: toTimestampMs(data.interractedAt) || undefined,
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
          groups: Array.isArray(data.groups) ? data.groups.map(String) : undefined,
          uid: data.uid || undefined,
          clubId: data.clubId || undefined,
          clubLinks: data.clubLinks && typeof data.clubLinks === 'object' ? data.clubLinks : undefined,
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
  _onError: (err: Error) => void
): Unsubscribe => {
  const defaultConfig: ClubWhatsAppConfig = {
    clubId,
    linkedGroups: [],
    keywordRules: DEFAULT_KEYWORD_RULES,
    pollColors: {},
  };

  return onSnapshot(
    doc(db, 'clubs', clubId),
    (snap) => {
      const data = snap.exists() ? snap.data() : null;
      const cfg = data?.whatsappConfig;
      if (cfg && typeof cfg === 'object') {
        onData({
          clubId,
          linkedGroups: Array.isArray(cfg.linkedGroups) ? cfg.linkedGroups : [],
          keywordRules:
            Array.isArray(cfg.keywordRules) && cfg.keywordRules.length > 0
              ? cfg.keywordRules
              : DEFAULT_KEYWORD_RULES,
          pollColors: cfg.pollColors || {},
          activePollId: cfg.activePollId || undefined,
          updatedAt: cfg.updatedAt || undefined,
        });
      } else {
        onData(defaultConfig);
      }
    },
    (error) => {
      addLog(`Club WhatsApp config fallback (${clubId}): ${error.message}`, 'WARN');
      onData(defaultConfig);
    }
  );
};

export const fetchRecentPollVotesForClub = async (pollIds: string[]): Promise<PollVote[]> => {
  const uniqueIds = Array.from(new Set(pollIds.filter(Boolean))).slice(0, 10);
  if (uniqueIds.length === 0) return [];
  try {
    const snap = await getDocs(query(collection(db, 'poll_votes'), where('pollId', 'in', uniqueIds)));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        pollId: String(data.pollId || ''),
        voter: String(data.voter || ''),
        pushName: data.pushName || data.voterName || undefined,
        profilePicUrl: data.profilePicUrl || undefined,
        phone: data.phone || undefined,
        selectedOptions: extractOptionLabels(data.selectedOptions),
        timestampMs: toTimestampMs(data.interractedAt) || toTimestampMs(data.timestamp),
        interractedAtMs: toTimestampMs(data.interractedAt) || undefined,
      };
    });
  } catch {
    return [];
  }
};
