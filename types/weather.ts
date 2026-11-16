export type WindUnit = 'KN' | 'KMH';

export type SeaAlertAction = 'RECOMMEND_CANCEL' | 'RECOMMEND_RELOCATE';

export interface ClubWeatherConfig {
  enabled: boolean;
  maxWaveCm: number;
  maxWindSpeed: number;
  windUnit: WindUnit;
  actionOnExceed: SeaAlertAction;
  fallbackLocationName?: string;
  fallbackLocationId?: string;
  fallbackAreaLabel?: string;
  fallbackLat?: number;
  fallbackLng?: number;
  customWarningNote?: string;
  updatedAt?: string;
}

export interface HourlyMarinePoint {
  isoHour: string; // YYYY-MM-DDTHH:00
  hourLabel: string; // HH:00
  waveHeightM: number | null;
  waveHeightCm: number | null;
  waveDirectionDeg: number | null;
  wavePeriodSec: number | null;
  windSpeedKmh: number | null;
  windGustsKmh: number | null;
  windDirectionDeg: number | null;
  temperatureC: number | null;
  weatherCode: number | null;
  precipProbPct: number | null;
}

export type SeaSafetyStatus = 'SAFE' | 'CAUTION' | 'EXCEEDED' | 'OUT_OF_RANGE' | 'UNAVAILABLE';

export interface SeaAlertEvaluation {
  status: SeaSafetyStatus;
  reasons: string[];
  recommendationTitle: string;
  recommendationBody: string;
  actionType?: SeaAlertAction;
  fallbackLocationName?: string;
}

export interface SessionWeatherSummary {
  targetDate: string;
  displayDate: string;
  startTime: string;
  endTime?: string;
  locationName: string;
  lat: number;
  lng: number;
  isOneOffLocation: boolean;
  isForecastLimitedRange: boolean;
  peakWaveCm: number | null;
  wavePeriodSec: number | null;
  waveDirectionDeg: number | null;
  peakWindKmh: number | null;
  peakGustsKmh: number | null;
  windDirectionDeg: number | null;
  avgTempC: number | null;
  maxPrecipProbPct: number | null;
  weatherLabel: string;
  hourlyWindow: HourlyMarinePoint[];
  evaluation: SeaAlertEvaluation;
  fetchedAtIso: string;
}
