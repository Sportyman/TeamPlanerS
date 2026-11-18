import { ActivityHistoryEntry, Person, Role } from '../types';

export interface RoleStreakSuggestion {
  person: Person;
  currentBaseRole: Role;
  suggestedRole: Role;
  streakCount: number;
}

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

export const getRoleStreakSuggestion = (person: Person, minStreak = 7): RoleStreakSuggestion | null => {
  if (person.isWhatsAppGroupOnly || person.role === Role.UNASSIGNED) return null;
  const history = Array.isArray(person.activityHistory) ? person.activityHistory : [];
  if (history.length < minStreak) return null;

  const latestRole = history[0]?.role;
  if (!latestRole || latestRole === Role.UNASSIGNED || latestRole === person.role) return null;

  let streakCount = 0;
  for (const item of history) {
    if (item.role === latestRole) streakCount++;
    else break;
  }
  if (streakCount < minStreak) return null;

  if (
    person.dismissedRoleStreak &&
    person.dismissedRoleStreak.role === latestRole &&
    streakCount < person.dismissedRoleStreak.reaskAtStreak
  ) {
    return null;
  }

  return { person, currentBaseRole: person.role, suggestedRole: latestRole, streakCount };
};
