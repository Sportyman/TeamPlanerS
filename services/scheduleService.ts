import { doc, setDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { Club, ClubSchedule, SessionOverride } from '../types';
import { saveClubLabelToCloud } from './auth/superAdminService';

export {
  normalizeLocationName,
  fetchGlobalLocations,
  addGlobalLocation,
  updateGlobalLocation,
  deleteGlobalLocation,
} from './locationCatalogService';

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
