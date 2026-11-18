import { ActivityHistoryEntry, Person } from '../types';

export const buildNextActivityHistory = (
  person: Person,
  today: string,
  nowIso: string,
  pollMeta?: { pollId?: string; question?: string }
): { nextHistory: ActivityHistoryEntry[]; isNewDay: boolean; changedRoleOnSameDay: boolean } => {
  const existing = Array.isArray(person.activityHistory) ? person.activityHistory : [];
  const existingToday = existing.find((entry) => entry.date === today);
  const entry: ActivityHistoryEntry = {
    date: today,
    recordedAt: nowIso,
    role: person.role,
    ...(person.isSkipper ? { isSkipper: true } : {}),
    ...(pollMeta?.pollId ? { pollId: pollMeta.pollId } : {}),
    ...(pollMeta?.question ? { pollQuestion: pollMeta.question } : {}),
    source: pollMeta?.pollId ? 'POLL' : 'MANUAL',
  };

  if (existingToday) {
    const changed = existingToday.role !== entry.role || Boolean(existingToday.isSkipper) !== Boolean(entry.isSkipper);
    const nextHistory = existing.map((item) => (item.date === today ? entry : item)).slice(0, 40);
    return { nextHistory, isNewDay: false, changedRoleOnSameDay: changed };
  }

  const nextHistory = [entry, ...existing.filter((item) => item.date !== today)].slice(0, 40);
  return { nextHistory, isNewDay: person.lastAttendedAt?.slice(0, 10) !== today, changedRoleOnSameDay: false };
};
