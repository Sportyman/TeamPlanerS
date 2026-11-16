import { ClubWeatherConfig, WindUnit } from '../../types/weather';

export const kmhToKnots = (kmh: number): number => Math.round((kmh / 1.852) * 10) / 10;
export const knotsToKmh = (knots: number): number => Math.round(knots * 1.852 * 10) / 10;

export const toWindUnitValue = (kmh: number | null, unit: WindUnit): number | null => {
  if (kmh === null || !Number.isFinite(kmh)) return null;
  return unit === 'KN' ? kmhToKnots(kmh) : Math.round(kmh * 10) / 10;
};

export const formatWindUnitLabel = (unit: WindUnit): string => (unit === 'KN' ? 'קשר' : 'קמ"ש');

export const isSailingClub = (clubId: string, label = ''): boolean => {
  const combined = `${clubId} ${label}`.toLowerCase();
  return clubId === 'SAILING' || combined.includes('שייט') || combined.includes('sailing');
};

export const getDefaultWeatherConfig = (clubId: string, label = ''): ClubWeatherConfig => {
  if (isSailingClub(clubId, label)) {
    return {
      enabled: true,
      maxWaveCm: 90,
      maxWindSpeed: 15,
      windUnit: 'KN',
      actionOnExceed: 'RECOMMEND_CANCEL',
    };
  }
  return {
    enabled: true,
    maxWaveCm: 80,
    maxWindSpeed: 15,
    windUnit: 'KMH',
    actionOnExceed: 'RECOMMEND_RELOCATE',
    fallbackLocationName: 'מרכז דניאל',
  };
};

export const COASTAL_PRESET_COORDS: Array<{ keywords: string[]; name: string; lat: number; lng: number }> = [
  { keywords: ['מרינה תל אביב', 'אתגרים תל אביב', 'תל אביב', 'גבעת עלייה', 'דולפינריום'], name: 'חוף / מרינה תל אביב', lat: 32.0872, lng: 34.7646 },
  { keywords: ['דניאל', 'ירקון'], name: 'מרכז דניאל (ירקון)', lat: 32.0992, lng: 34.7825 },
  { keywords: ['הרצליה', 'מרינה הרצליה'], name: 'מרינה הרצליה', lat: 32.1636, lng: 34.7924 },
  { keywords: ['חיפה', 'קישון', 'בת גלים'], name: 'מפרץ חיפה / בת גלים', lat: 32.8336, lng: 34.9786 },
  { keywords: ['אשדוד'], name: 'מרינה אשדוד', lat: 31.8122, lng: 34.6396 },
  { keywords: ['אשקלון'], name: 'מרינה אשקלון', lat: 31.6828, lng: 34.5522 },
  { keywords: ['נתניה', 'פולג'], name: 'חוף נתניה / פולג', lat: 32.2756, lng: 34.8414 },
  { keywords: ['עכו'], name: 'נמל עכו', lat: 32.9212, lng: 35.0698 },
  { keywords: ['אילת'], name: 'מפרץ אילת', lat: 29.5469, lng: 34.9532 },
  { keywords: ['כנרת', 'טבריה', 'צמח'], name: 'הכנרת', lat: 32.7852, lng: 35.5372 },
  { keywords: ['שדות ים', 'קיסריה'], name: 'שדות ים', lat: 32.4911, lng: 34.8878 },
];

export const getCompassDirectionHe = (deg: number | null): string => {
  if (deg === null || !Number.isFinite(deg)) return '—';
  const dirs = ['צפונית', 'צפ׳-מזרחית', 'מזרחית', 'דר׳-מזרחית', 'דרומית', 'דר׳-מערבית', 'מערבית', 'צפ׳-מערבית'];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
};

export const getWmoWeatherLabelHe = (code: number | null): string => {
  if (code === null || !Number.isFinite(code)) return 'נתוני מזג אוויר';
  if (code === 0) return 'בהיר';
  if (code <= 2) return 'מעונן חלקית';
  if (code === 3) return 'מעונן';
  if (code === 45 || code === 48) return 'ערפל / אובך';
  if (code >= 51 && code <= 67) return 'טפטוף / גשם קל';
  if (code >= 71 && code <= 77) return 'משקעים';
  if (code >= 80 && code <= 82) return 'ממטרי גשם';
  if (code >= 95) return 'סופת רעמים';
  return 'מעונן';
};

export const extractPollTargetDate = (question?: string, createdAtMs?: number): string | undefined => {
  if (!question) return undefined;
  const m = question.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/);
  if (!m) return undefined;
  const day = Number(m[1]);
  const month = Number(m[2]);
  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined;

  const ref = createdAtMs ? new Date(createdAtMs) : new Date();
  let year = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : ref.getFullYear();
  if (!m[3]) {
    const candidate = new Date(year, month - 1, day);
    const diffDays = (candidate.getTime() - ref.getTime()) / 86_400_000;
    if (diffDays < -60) year += 1;
  }
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const check = new Date(year, month - 1, day);
  return check.getMonth() === month - 1 && check.getDate() === day ? iso : undefined;
};

