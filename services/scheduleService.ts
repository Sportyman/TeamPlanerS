import { doc, getDoc, getDocFromServer, setDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { Club, ClubLocation, ClubSchedule, SessionOverride } from '../types';
import { useAppStore } from '../store';
import { addLog } from './syncService';
import { saveClubLabelToCloud } from './auth/superAdminService';

export const DAY_NAMES_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'] as const;

export interface UpcomingSessionInfo {
  defaultDate: string;
  effectiveDate: string;
  displayDate: string;
  dayName: string;
  startTime: string;
  endTime?: string;
  locationName: string;
  isOverridden: boolean;
  isCancelled: boolean;
  note?: string;
}

export const toLocalIsoDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const formatDisplayDateHe = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-');
  return y && m && d ? `${d}.${m}.${y}` : isoDate;
};

export const getDayNameFromIso = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return '';
  const dt = new Date(y, m - 1, d);
  return `יום ${DAY_NAMES_HE[dt.getDay()] || ''}`;
};

export const computeNextClubSession = (
  club?: Club | null,
  referenceDate: Date = new Date()
): UpcomingSessionInfo | null => {
  const sched = club?.defaultSchedule;
  if (!sched || sched.dayOfWeek === undefined || !sched.startTime) return null;

  const base = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const diffDays = (sched.dayOfWeek - base.getDay() + 7) % 7;
  const nextDate = new Date(base);
  nextDate.setDate(base.getDate() + diffDays);

  const defaultDate = toLocalIsoDate(nextDate);
  const ov = club?.sessionOverride;
  const hasActiveOverride = Boolean(ov && ov.targetDate === defaultDate);

  const effectiveDate = hasActiveOverride && ov?.dateOverride ? ov.dateOverride : defaultDate;
  const startTime = hasActiveOverride && ov?.startTime ? ov.startTime : sched.startTime;
  const endTime = hasActiveOverride && ov?.endTime !== undefined ? ov.endTime : sched.endTime;
  const locationName = hasActiveOverride && ov?.locationName ? ov.locationName : sched.locationName;

  return {
    defaultDate,
    effectiveDate,
    displayDate: formatDisplayDateHe(effectiveDate),
    dayName: getDayNameFromIso(effectiveDate),
    startTime,
    endTime: endTime || undefined,
    locationName: locationName || '',
    isOverridden: hasActiveOverride,
    isCancelled: Boolean(hasActiveOverride && ov?.isCancelled),
    note: hasActiveOverride ? ov?.note : undefined,
  };
};

export const formatScheduleSummary = (schedule?: ClubSchedule): string => {
  if (!schedule) return 'טרם הוגדר לוח זמנים קבוע';
  const day = `יום ${DAY_NAMES_HE[schedule.dayOfWeek] ?? ''}`;
  const time = schedule.endTime ? `${schedule.startTime}–${schedule.endTime}` : schedule.startTime;
  return schedule.locationName ? `${day} · ${time} · ${schedule.locationName}` : `${day} · ${time}`;
};

export const normalizeLocationName = (name: string): string => name.trim().replace(/\s+/g, ' ');

export const fetchGlobalLocations = async (): Promise<ClubLocation[]> => {
  try {
    const ref = doc(db, 'config', 'locations');
    const snap = await getDocFromServer(ref).catch(() => getDoc(ref));
    if (!snap.exists()) return [];
    const items = Array.isArray(snap.data().items) ? snap.data().items : [];
    return items
      .filter((item: any) => typeof item?.name === 'string' && item.name.trim())
      .map((item: any) => ({
        id: String(item.id || item.name),
        name: normalizeLocationName(item.name),
        createdAt: item.createdAt,
        createdBy: item.createdBy,
      }));
  } catch (err) {
    addLog(`Failed to fetch global locations: ${err}`, 'WARN');
    return [];
  }
};

export const addGlobalLocation = async (rawName: string, createdBy?: string): Promise<ClubLocation> => {
  const normalized = normalizeLocationName(rawName);
  if (!normalized) throw new Error('יש להזין שם מיקום');

  const existingRemote = await fetchGlobalLocations();
  const storeLocs = useAppStore.getState().locations;
  const mergedMap = new Map<string, ClubLocation>();
  [...storeLocs, ...existingRemote].forEach((loc) => {
    const key = normalizeLocationName(loc.name).toLowerCase();
    if (!mergedMap.has(key)) mergedMap.set(key, loc);
  });

  const existingMatch = mergedMap.get(normalized.toLowerCase());
  if (existingMatch) {
    useAppStore.getState().setLocations(Array.from(mergedMap.values()));
    return existingMatch;
  }

  const created: ClubLocation = {
    id: `loc-${Date.now()}`,
    name: normalized,
    createdAt: new Date().toISOString(),
    createdBy,
  };
  mergedMap.set(normalized.toLowerCase(), created);
  const nextList = Array.from(mergedMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'he'));

  await setDoc(doc(db, 'config', 'locations'), {
    items: nextList,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  useAppStore.getState().setLocations(nextList);
  return created;
};

export const saveClubScheduleToCloud = async (
  clubId: string,
  label: string,
  defaultSchedule?: ClubSchedule
): Promise<void> => {
  await saveClubLabelToCloud(clubId, label, defaultSchedule);
};

export const saveSessionOverrideToCloud = async (
  clubId: string,
  override: SessionOverride | null
): Promise<void> => {
  await setDoc(doc(db, 'clubs', clubId), {
    sessionOverride: override ? override : deleteField(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
};
