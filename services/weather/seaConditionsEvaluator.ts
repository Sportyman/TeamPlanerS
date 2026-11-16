import { Club, ClubLocation } from '../../types';
import { ClubWeatherConfig, HourlyMarinePoint, SeaAlertEvaluation, SessionWeatherSummary } from '../../types/weather';
import { COASTAL_PRESET_COORDS, formatWindUnitLabel, getWmoWeatherLabelHe, toWindUnitValue } from './weatherDefaults';
import { computeNextClubSession, formatDisplayDateHe } from '../scheduleService';

export interface ResolvedForecastTarget {
  targetDate: string;
  displayDate: string;
  startTime: string;
  endTime?: string;
  locationName: string;
  lat?: number;
  lng?: number;
  isOneOffLocation: boolean;
}

const findCatalogLocation = (locations: ClubLocation[], locationId?: string, name?: string): ClubLocation | undefined => {
  if (locationId) {
    const byId = locations.find((l) => l.id === locationId);
    if (byId) return byId;
  }
  const q = (name || '').trim().toLowerCase();
  if (!q) return undefined;
  return locations.find((l) => l.name.trim().toLowerCase() === q);
};

const findPresetCoords = (text: string): { lat: number; lng: number } | undefined => {
  const q = text.trim().toLowerCase();
  if (!q) return undefined;
  const hit = COASTAL_PRESET_COORDS.find((p) => p.keywords.some((kw) => q.includes(kw.toLowerCase())));
  return hit ? { lat: hit.lat, lng: hit.lng } : undefined;
};

export const resolveSessionForecastTarget = (
  club: Club,
  locations: ClubLocation[],
  dateOverride?: string,
  timeOverride?: string
): ResolvedForecastTarget | null => {
  const upcoming = computeNextClubSession(club);
  const targetDate = dateOverride || upcoming?.effectiveDate;
  const startTime = timeOverride || upcoming?.startTime || club.defaultSchedule?.startTime;
  const endTime = upcoming?.endTime || club.defaultSchedule?.endTime;
  if (!targetDate || !startTime) return null;

  const sched = club.defaultSchedule;
  const ov = upcoming?.isOverridden ? club.sessionOverride : null;
  const isOneOffLocation = Boolean(ov?.locationName && ov.locationName !== sched?.locationName);
  const locationName = (ov?.locationName || sched?.locationName || '').trim();

  let lat = isOneOffLocation ? ov?.lat : sched?.lat;
  let lng = isOneOffLocation ? ov?.lng : sched?.lng;

  if (lat === undefined || lng === undefined) {
    const loc = findCatalogLocation(locations, isOneOffLocation ? ov?.locationId : sched?.locationId, locationName);
    if (loc?.lat !== undefined && loc?.lng !== undefined) { lat = loc.lat; lng = loc.lng; }
  }
  if (lat === undefined || lng === undefined) {
    const preset = findPresetCoords(`${locationName} ${club.label}`);
    if (preset) { lat = preset.lat; lng = preset.lng; }
  }

  return {
    targetDate, displayDate: formatDisplayDateHe(targetDate), startTime, endTime,
    locationName: locationName || club.label, lat, lng, isOneOffLocation,
  };
};

const hourNum = (hhmm?: string, fallback = 8): number => {
  const h = Number((hhmm || '').split(':')[0]);
  return Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : fallback;
};

const maxNum = (vals: Array<number | null>): number | null => {
  const nums = vals.filter((v): v is number => v !== null && Number.isFinite(v));
  return nums.length ? Math.max(...nums) : null;
};

const avgNum = (vals: Array<number | null>): number | null => {
  const nums = vals.filter((v): v is number => v !== null && Number.isFinite(v));
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;
};

export const evaluateSessionWeather = (params: {
  hourly: HourlyMarinePoint[];
  target: ResolvedForecastTarget;
  config: ClubWeatherConfig;
  fetchedAtIso: string;
}): SessionWeatherSummary => {
  const { hourly, target, config, fetchedAtIso } = params;
  const startH = hourNum(target.startTime, 8);
  const endH = target.endTime ? Math.max(startH, hourNum(target.endTime, startH + 2)) : Math.min(23, startH + 2);
  const dayPoints = hourly.filter((p) => p.isoHour.startsWith(target.targetDate));
  const windowPoints = dayPoints.filter((p) => {
    const h = Number(p.isoHour.slice(11, 13));
    return h >= startH && h <= endH;
  });

  if (dayPoints.length === 0 || windowPoints.length === 0) {
    return {
      targetDate: target.targetDate, displayDate: target.displayDate, startTime: target.startTime, endTime: target.endTime,
      locationName: target.locationName, lat: target.lat || 0, lng: target.lng || 0,
      isOneOffLocation: target.isOneOffLocation, isForecastLimitedRange: true,
      peakWaveCm: null, wavePeriodSec: null, waveDirectionDeg: null, peakWindKmh: null, peakGustsKmh: null,
      windDirectionDeg: null, avgTempC: null, maxPrecipProbPct: null, weatherLabel: 'מחוץ לטווח התחזית',
      hourlyWindow: [], fetchedAtIso,
      evaluation: {
        status: 'OUT_OF_RANGE', reasons: [],
        recommendationTitle: 'המועד עדיין מחוץ לטווח התחזית המפורטת (עד 7 ימים קדימה)',
        recommendationBody: 'הנתונים יוצגו אוטומטית כשהמועד יתקרב לטווח של שבוע.',
      },
    };
  }

  const peakWaveCm = maxNum(windowPoints.map((p) => p.waveHeightCm));
  const peakWindKmh = maxNum(windowPoints.map((p) => p.windSpeedKmh));
  const peakGustsKmh = maxNum(windowPoints.map((p) => p.windGustsKmh));
  const avgTempC = avgNum(windowPoints.map((p) => p.temperatureC));
  const maxPrecipProbPct = maxNum(windowPoints.map((p) => p.precipProbPct));
  const repPoint = windowPoints[Math.floor(windowPoints.length / 2)] || windowPoints[0];

  const unitLabel = formatWindUnitLabel(config.windUnit);
  const peakWindVal = toWindUnitValue(peakWindKmh, config.windUnit);
  const reasons: string[] = [];
  let exceeded = false;
  let caution = false;

  if (peakWaveCm !== null) {
    if (peakWaveCm > config.maxWaveCm) {
      exceeded = true;
      reasons.push(`גובה גלים צפוי ${peakWaveCm} ס"מ (מעל הסף: ${config.maxWaveCm} ס"מ)`);
    } else if (peakWaveCm >= config.maxWaveCm * 0.85) {
      caution = true;
      reasons.push(`גובה גלים מתקרב לסף: ${peakWaveCm} ס"מ`);
    }
  }

  if (peakWindVal !== null) {
    if (peakWindVal > config.maxWindSpeed) {
      exceeded = true;
      reasons.push(`מהירות רוח צפויה ${peakWindVal} ${unitLabel} (מעל הסף: ${config.maxWindSpeed} ${unitLabel})`);
    } else if (peakWindVal >= config.maxWindSpeed * 0.85) {
      caution = true;
      reasons.push(`רוח מתקרבת לסף: ${peakWindVal} ${unitLabel}`);
    }
  }

  const customSuffix = config.customWarningNote?.trim() ? ` · הערת מדריך: ${config.customWarningNote.trim()}` : '';
  const evaluation: SeaAlertEvaluation = exceeded
    ? config.actionOnExceed === 'RECOMMEND_RELOCATE'
      ? {
          status: 'EXCEEDED', reasons, actionType: 'RECOMMEND_RELOCATE',
          fallbackLocationName: config.fallbackLocationName || 'מיקום מוגן חלופי',
          recommendationTitle: `מומלץ להעביר את הפעילות אל ${config.fallbackLocationName || 'מיקום מוגן חלופי'}`,
          recommendationBody: `${reasons.join(' · ')}. זוהי המלצה בלבד — ניתן לבחור שינוי מיקום זמני לפי שיקול דעת המדריך.${customSuffix}`,
        }
      : {
          status: 'EXCEEDED', reasons, actionType: 'RECOMMEND_CANCEL',
          recommendationTitle: 'מומלץ לשקול ביטול או דחייה של הפעילות',
          recommendationBody: `${reasons.join(' · ')}. זוהי המלצה בלבד — לא בוצע ביטול אוטומטי.${customSuffix}`,
        }
    : caution
    ? {
        status: 'CAUTION', reasons,
        recommendationTitle: 'תנאים גבוליים — מומלץ לעקוב לפני היציאה לים',
        recommendationBody: `${reasons.join(' · ')}${customSuffix}`,
      }
    : {
        status: 'SAFE', reasons: [],
        recommendationTitle: 'תנאי הים בטווח הבטוח שהוגדר לחוג',
        recommendationBody: 'ניתן לקיים את הפעילות כמתוכנן בכפוף לבדיקת בטיחות בשטח.',
      };

  return {
    targetDate: target.targetDate, displayDate: target.displayDate, startTime: target.startTime, endTime: target.endTime,
    locationName: target.locationName, lat: target.lat || 0, lng: target.lng || 0,
    isOneOffLocation: target.isOneOffLocation, isForecastLimitedRange: false,
    peakWaveCm, wavePeriodSec: repPoint.wavePeriodSec, waveDirectionDeg: repPoint.waveDirectionDeg,
    peakWindKmh, peakGustsKmh, windDirectionDeg: repPoint.windDirectionDeg,
    avgTempC, maxPrecipProbPct, weatherLabel: getWmoWeatherLabelHe(repPoint.weatherCode),
    hourlyWindow: dayPoints.filter((p) => {
      const h = Number(p.isoHour.slice(11, 13));
      return h >= Math.max(5, startH - 1) && h <= Math.min(22, endH + 2);
    }),
    evaluation, fetchedAtIso,
  };
};

