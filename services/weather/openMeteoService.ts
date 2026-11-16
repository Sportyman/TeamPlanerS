import { HourlyMarinePoint } from '../../types/weather';

const CACHE_TTL_MS = 20 * 60 * 1000;
const SESSION_PREFIX = 'etgarim_wx_v1_';

interface CachedForecastEntry {
  fetchedAtMs: number;
  fetchedAtIso: string;
  hourly: HourlyMarinePoint[];
}

const memoryCache = new Map<string, CachedForecastEntry>();
const inflightRequests = new Map<string, Promise<CachedForecastEntry>>();

const cacheKeyForCoords = (lat: number, lng: number): string =>
  `${lat.toFixed(2)},${lng.toFixed(2)}`;

const readSessionCache = (key: string): CachedForecastEntry | null => {
  try {
    const raw = sessionStorage.getItem(`${SESSION_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedForecastEntry;
    if (Date.now() - parsed.fetchedAtMs < CACHE_TTL_MS && Array.isArray(parsed.hourly)) {
      return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return null;
};

const writeSessionCache = (key: string, entry: CachedForecastEntry): void => {
  try {
    sessionStorage.setItem(`${SESSION_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // ignore storage quota errors
  }
};

const fetchWithTimeout = async (url: string, timeoutMs = 9000): Promise<Response> => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
};

const mergeHourlyStreams = (atmosJson: any, marineJson: any): HourlyMarinePoint[] => {
  const times: string[] = atmosJson?.hourly?.time || marineJson?.hourly?.time || [];
  const marineTimeIdx = new Map<string, number>();
  (marineJson?.hourly?.time || []).forEach((t: string, idx: number) => marineTimeIdx.set(t, idx));

  const aHourly = atmosJson?.hourly || {};
  const mHourly = marineJson?.hourly || {};

  return times.map((isoHour, i) => {
    const mIdx = marineTimeIdx.get(isoHour);
    const rawWaveM = mIdx !== undefined ? mHourly.wave_height?.[mIdx] : null;
    const waveHeightM = typeof rawWaveM === 'number' && Number.isFinite(rawWaveM) ? rawWaveM : null;
    const waveHeightCm = waveHeightM !== null ? Math.round(waveHeightM * 100) : null;
    const numOrNull = (arr: any[] | undefined, idx: number | undefined): number | null =>
      idx !== undefined && typeof arr?.[idx] === 'number' && Number.isFinite(arr[idx]) ? arr[idx] : null;

    return {
      isoHour,
      hourLabel: isoHour.slice(11, 16) || isoHour,
      waveHeightM,
      waveHeightCm,
      waveDirectionDeg: numOrNull(mHourly.wave_direction, mIdx),
      wavePeriodSec: numOrNull(mHourly.wave_period, mIdx),
      windSpeedKmh: numOrNull(aHourly.wind_speed_10m, i),
      windGustsKmh: numOrNull(aHourly.wind_gusts_10m, i),
      windDirectionDeg: numOrNull(aHourly.wind_direction_10m, i),
      temperatureC: numOrNull(aHourly.temperature_2m, i),
      weatherCode: numOrNull(aHourly.weather_code, i),
      precipProbPct: numOrNull(aHourly.precipitation_probability, i),
    };
  });
};

export const fetchOpenMeteoMarineForecast = async (
  lat: number,
  lng: number,
  forceRefresh = false
): Promise<CachedForecastEntry> => {
  const key = cacheKeyForCoords(lat, lng);
  if (!forceRefresh) {
    const mem = memoryCache.get(key);
    if (mem && Date.now() - mem.fetchedAtMs < CACHE_TTL_MS) return mem;
    const sess = readSessionCache(key);
    if (sess) {
      memoryCache.set(key, sess);
      return sess;
    }
  }

  if (!forceRefresh && inflightRequests.has(key)) {
    return inflightRequests.get(key)!;
  }

  const promise = (async () => {
    const atmosUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
      `&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code,precipitation_probability` +
      `&wind_speed_unit=kmh&timezone=Asia%2FJerusalem&forecast_days=7`;

    const marineUrl =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
      `&hourly=wave_height,wave_direction,wave_period` +
      `&timezone=Asia%2FJerusalem&forecast_days=7`;

    const [atmosRes, marineRes] = await Promise.all([
      fetchWithTimeout(atmosUrl),
      fetchWithTimeout(marineUrl).catch(() => null),
    ]);

    if (!atmosRes.ok) {
      throw new Error(`Open-Meteo weather request failed (${atmosRes.status})`);
    }
    const atmosJson = await atmosRes.json();
    const marineJson = marineRes && marineRes.ok ? await marineRes.json().catch(() => null) : null;

    const entry: CachedForecastEntry = {
      fetchedAtMs: Date.now(),
      fetchedAtIso: new Date().toISOString(),
      hourly: mergeHourlyStreams(atmosJson, marineJson),
    };
    memoryCache.set(key, entry);
    writeSessionCache(key, entry);
    return entry;
  })();

  inflightRequests.set(key, promise);
  try {
    return await promise;
  } finally {
    inflightRequests.delete(key);
  }
};
