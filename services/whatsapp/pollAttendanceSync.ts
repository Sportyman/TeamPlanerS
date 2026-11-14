import { ResolvedPollSummary } from '../../types/whatsapp';

interface SyncedPollRecord {
  pollId: string;
  autoIds: string[];
}

const STORAGE_PREFIX = 'teamplaner_poll_sync_v1_';

const readSyncedRecord = (clubId: string): SyncedPollRecord | null => {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${clubId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SyncedPollRecord;
    return Array.isArray(parsed?.autoIds) ? parsed : null;
  } catch {
    return null;
  }
};

const writeSyncedRecord = (clubId: string, record: SyncedPollRecord | null): void => {
  try {
    if (!record) localStorage.removeItem(`${STORAGE_PREFIX}${clubId}`);
    else localStorage.setItem(`${STORAGE_PREFIX}${clubId}`, JSON.stringify(record));
  } catch {
    // ignore storage quota errors
  }
};

const arraysEqualAsSets = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
};

export const clearDeletedPollAttendance = (
  clubId: string,
  currentPresentIds: string[]
): string[] | null => {
  const prev = readSyncedRecord(clubId);
  if (!prev) return null;
  writeSyncedRecord(clubId, null);
  if (prev.autoIds.length === 0) return null;
  const autoSet = new Set(prev.autoIds);
  const nextIds = currentPresentIds.filter((id) => !autoSet.has(id));
  return arraysEqualAsSets(currentPresentIds, nextIds) ? null : nextIds;
};

export const reconcileInitialPollAttendance = (
  clubId: string,
  summary: ResolvedPollSummary,
  currentPresentIds: string[]
): { nextIds: string[] | null; addedCount: number } => {
  const prev = readSyncedRecord(clubId);
  const prevAutoSet = new Set(prev?.autoIds || []);
  const decliningSet = new Set(
    Object.entries(summary.personStatusMap)
      .filter(([, st]) => st.intent === 'DECLINING')
      .map(([id]) => id)
  );

  // Drop IDs previously auto-checked by an older/changed poll state or who declined in current poll
  const retainedManual = currentPresentIds.filter((id) => !prevAutoSet.has(id) && !decliningSet.has(id));
  const nextIds = Array.from(new Set([...retainedManual, ...summary.attendingPersonIds]));

  writeSyncedRecord(clubId, {
    pollId: summary.poll.pollId,
    autoIds: summary.attendingPersonIds,
  });

  if (arraysEqualAsSets(currentPresentIds, nextIds)) {
    return { nextIds: null, addedCount: 0 };
  }
  const currentSet = new Set(currentPresentIds);
  const addedCount = summary.attendingPersonIds.filter((id) => !currentSet.has(id)).length;
  return { nextIds, addedCount };
};
