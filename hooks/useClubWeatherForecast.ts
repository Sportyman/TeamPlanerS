import { useCallback, useEffect, useMemo, useState } from 'react';
import { Club } from '../types';
import { ClubWeatherConfig, SessionWeatherSummary } from '../types/weather';
import { useAppStore } from '../store';
import { fetchGlobalLocations } from '../services/scheduleService';
import { searchPlacesInIsrael } from '../services/geocodingService';
import { fetchOpenMeteoMarineForecast } from '../services/weather/openMeteoService';
import { evaluateSessionWeather, resolveSessionForecastTarget } from '../services/weather/seaConditionsEvaluator';
import { getDefaultWeatherConfig } from '../services/weather/weatherDefaults';

const geocodeFallbackCache = new Map<string, { lat: number; lng: number } | null>();

interface UseClubWeatherForecastOptions {
  club?: Club | null;
  dateOverride?: string;
  timeOverride?: string;
  configOverride?: ClubWeatherConfig;
}

export const useClubWeatherForecast = ({
  club,
  dateOverride,
  timeOverride,
  configOverride,
}: UseClubWeatherForecastOptions) => {
  const { locations, setLocations } = useAppStore();
  const [resolvedGeo, setResolvedGeo] = useState<{ key: string; lat: number; lng: number } | null>(null);
  const [summary, setSummary] = useState<SessionWeatherSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (locations.length === 0) {
      fetchGlobalLocations().then((locs) => {
        if (locs.length > 0) setLocations(locs);
      }).catch(() => {});
    }
  }, [locations.length, setLocations]);

  const effectiveConfig = useMemo<ClubWeatherConfig | null>(() => {
    if (!club) return null;
    return configOverride || club.weatherConfig || getDefaultWeatherConfig(club.id, club.label);
  }, [club, configOverride]);

  const baseTarget = useMemo(() => {
    if (!club) return null;
    return resolveSessionForecastTarget(club, locations, dateOverride, timeOverride);
  }, [club, locations, dateOverride, timeOverride]);

  // One-time Nominatim fallback when a location name exists without stored lat/lng
  useEffect(() => {
    if (!baseTarget || baseTarget.lat !== undefined || !baseTarget.locationName) return;
    const key = baseTarget.locationName.trim().toLowerCase();
    if (geocodeFallbackCache.has(key)) {
      const cached = geocodeFallbackCache.get(key);
      if (cached) setResolvedGeo({ key, lat: cached.lat, lng: cached.lng });
      return;
    }
    let cancelled = false;
    searchPlacesInIsrael(baseTarget.locationName).then((places) => {
      if (cancelled) return;
      const first = places[0];
      if (first) {
        geocodeFallbackCache.set(key, { lat: first.lat, lng: first.lng });
        setResolvedGeo({ key, lat: first.lat, lng: first.lng });
      } else {
        geocodeFallbackCache.set(key, null);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [baseTarget]);

  const targetWithCoords = useMemo(() => {
    if (!baseTarget) return null;
    if (baseTarget.lat !== undefined && baseTarget.lng !== undefined) return baseTarget;
    const key = baseTarget.locationName.trim().toLowerCase();
    if (resolvedGeo && resolvedGeo.key === key) {
      return { ...baseTarget, lat: resolvedGeo.lat, lng: resolvedGeo.lng };
    }
    return baseTarget;
  }, [baseTarget, resolvedGeo]);

  useEffect(() => {
    if (!effectiveConfig?.enabled || !targetWithCoords) {
      setSummary(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    if (targetWithCoords.lat === undefined || targetWithCoords.lng === undefined) {
      setSummary(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchOpenMeteoMarineForecast(targetWithCoords.lat, targetWithCoords.lng, reloadNonce > 0)
      .then((forecast) => {
        if (cancelled) return;
        const evaluated = evaluateSessionWeather({
          hourly: forecast.hourly,
          target: targetWithCoords,
          config: effectiveConfig,
          fetchedAtIso: forecast.fetchedAtIso,
        });
        setSummary(evaluated);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתוני תחזית');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [effectiveConfig, targetWithCoords, reloadNonce]);

  const refresh = useCallback(() => setReloadNonce((n) => n + 1), []);
  const missingLocation = Boolean(
    effectiveConfig?.enabled && targetWithCoords && (targetWithCoords.lat === undefined || targetWithCoords.lng === undefined)
  );

  return {
    summary,
    isLoading,
    error,
    missingLocation,
    target: targetWithCoords,
    effectiveConfig,
    refresh,
  };
};
