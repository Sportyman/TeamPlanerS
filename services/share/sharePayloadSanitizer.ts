import { BoatTypeLabel, Club, Gender, Person, Role, Team } from '../../types';
import { UpcomingSessionInfo } from '../scheduleService';

export interface PublicShareMember {
  name: string;
  role: Role;
  gender: Gender;
}

export interface PublicShareTeam {
  id: string;
  boatType: string;
  members: PublicShareMember[];
}

export interface PublicSharePayload {
  clubName: string;
  date: string;
  time: string;
  location: string;
  note: string;
  labels: Record<string, string>;
  teams: PublicShareTeam[];
}

const VALID_ROLES = new Set<string>(Object.values(Role));
const VALID_GENDERS = new Set<string>(Object.values(Gender));

const safeText = (value: unknown, maxLen: number): string => {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
};

export const buildPublicShareEncodedPayload = (params: {
  teams: Team[];
  club?: Club | null;
  upcoming?: UpcomingSessionInfo | null;
  boatLabels: Record<string, string>;
}): string => {
  const cleanTeams: PublicShareTeam[] = params.teams.map((t, idx) => ({
    id: safeText(t.id, 40) || `team-${idx + 1}`,
    boatType: safeText(t.boatType, 60) || 'UNKNOWN',
    members: (t.members || []).map((m: Person) => ({
      name: safeText(m.name, 80) || 'משתתף',
      role: VALID_ROLES.has(m.role) ? m.role : Role.MEMBER,
      gender: VALID_GENDERS.has(m.gender) ? m.gender : Gender.MALE,
    })),
  }));

  const cleanLabels: Record<string, string> = {};
  Object.entries(params.boatLabels || {}).forEach(([k, v]) => {
    const key = safeText(k, 60);
    const val = safeText(v, 80);
    if (key && val) cleanLabels[key] = val;
  });

  const timeStr = params.upcoming
    ? (params.upcoming.endTime ? `${params.upcoming.startTime}–${params.upcoming.endTime}` : params.upcoming.startTime)
    : '';

  const payload: PublicSharePayload = {
    clubName: safeText(params.club?.label, 80),
    date: params.upcoming
      ? safeText(`${params.upcoming.dayName}, ${params.upcoming.displayDate}`, 60)
      : new Date().toLocaleDateString('he-IL'),
    time: safeText(timeStr, 40),
    location: safeText(params.upcoming?.locationName, 100),
    note: safeText(params.upcoming?.note, 180),
    labels: cleanLabels,
    teams: cleanTeams,
  };

  const jsonString = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(jsonString)));
};

export const parsePublicShareEncodedPayload = (encoded: string): PublicSharePayload => {
  const jsonString = decodeURIComponent(escape(atob(encoded)));
  const raw = JSON.parse(jsonString);
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.teams)) {
    throw new Error('Invalid share payload');
  }

  const safeLabels: Record<string, string> = { ...BoatTypeLabel };
  if (raw.labels && typeof raw.labels === 'object') {
    Object.entries(raw.labels).forEach(([k, v]) => {
      const key = safeText(k, 60);
      const val = safeText(v, 80);
      if (key && val) safeLabels[key] = val;
    });
  }

  const safeTeams: PublicShareTeam[] = raw.teams.slice(0, 60).map((t: any, idx: number) => ({
    id: safeText(t?.id, 40) || `team-${idx + 1}`,
    boatType: safeText(t?.boatType, 60) || 'UNKNOWN',
    members: Array.isArray(t?.members)
      ? t.members.slice(0, 20).map((m: any) => ({
          name: safeText(m?.name, 80) || 'משתתף',
          role: VALID_ROLES.has(m?.role) ? (m.role as Role) : Role.MEMBER,
          gender: VALID_GENDERS.has(m?.gender) ? (m.gender as Gender) : Gender.MALE,
        }))
      : [],
  }));

  return {
    clubName: safeText(raw.clubName, 80),
    date: safeText(raw.date, 60) || new Date().toLocaleDateString('he-IL'),
    time: safeText(raw.time, 40),
    location: safeText(raw.location, 100),
    note: safeText(raw.note, 180),
    labels: safeLabels,
    teams: safeTeams,
  };
};
