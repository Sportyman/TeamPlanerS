import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Compass, Info, MapPin, RefreshCw, Settings2, Thermometer, Waves, Wind,
} from 'lucide-react';
import { Club } from '../../types';
import { ClubWeatherConfig } from '../../types/weather';
import { useClubWeatherForecast } from '../../hooks/useClubWeatherForecast';
import { formatWindUnitLabel, getCompassDirectionHe, toWindUnitValue } from '../../services/weather/weatherDefaults';
import { SeaHourlyStrip } from './SeaHourlyStrip';

interface SeaForecastBannerProps {
  club?: Club | null;
  isAdmin?: boolean;
  dateOverride?: string;
  timeOverride?: string;
  configOverride?: ClubWeatherConfig;
  compact?: boolean;
  hideSettingsLink?: boolean;
}

const STATUS_STYLE = {
  SAFE: { wrap: 'border-emerald-200 bg-emerald-50/70', badge: 'bg-emerald-600 text-white', title: 'text-emerald-950', body: 'text-emerald-900', icon: CheckCircle2 },
  CAUTION: { wrap: 'border-amber-300 bg-amber-50/90', badge: 'bg-amber-600 text-white', title: 'text-amber-950', body: 'text-amber-900', icon: AlertTriangle },
  EXCEEDED: { wrap: 'border-red-300 bg-red-50/95', badge: 'bg-red-600 text-white', title: 'text-red-950', body: 'text-red-900', icon: AlertTriangle },
  OUT_OF_RANGE: { wrap: 'border-slate-200 bg-slate-50', badge: 'bg-slate-600 text-white', title: 'text-slate-900', body: 'text-slate-600', icon: Info },
  UNAVAILABLE: { wrap: 'border-slate-200 bg-slate-50', badge: 'bg-slate-500 text-white', title: 'text-slate-900', body: 'text-slate-600', icon: Info },
} as const;

export const SeaForecastBanner: React.FC<SeaForecastBannerProps> = ({
  club, isAdmin = false, dateOverride, timeOverride, configOverride, compact = false, hideSettingsLink = false,
}) => {
  const { summary, isLoading, error, missingLocation, target, effectiveConfig, refresh } = useClubWeatherForecast({
    club, dateOverride, timeOverride, configOverride,
  });

  if (!club || !effectiveConfig?.enabled || !target) return null;

  if (missingLocation) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <MapPin size={15} className="text-slate-400 shrink-0" />
          <span>ניטור ים פעיל עבור "{target.locationName || club.label}", אך חסרות קואורדינטות GPS לתחזית.</span>
        </div>
        {isAdmin && (
          <Link to="/app/manage?view=SCHEDULE" className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-brand-400 text-brand-700 font-bold">
            בחר מיקום מדויק על המפה
          </Link>
        )}
      </div>
    );
  }

  if (isLoading && !summary) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 animate-pulse flex items-center gap-3 print:hidden">
        <Waves size={18} className="text-sky-500 shrink-0" />
        <div className="text-xs font-bold text-slate-500">טוען תחזית ים ורוח ({target.displayDate} · {target.locationName})...</div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-3 text-xs print:hidden">
        <span className="font-bold text-red-800">{error}</span>
        <button type="button" onClick={refresh} className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 font-bold flex items-center gap-1.5">
          <RefreshCw size={13} /> נסה שוב
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const st = STATUS_STYLE[summary.evaluation.status];
  const StatusIcon = st.icon;
  const unitLabel = formatWindUnitLabel(effectiveConfig.windUnit);
  const windVal = toWindUnitValue(summary.peakWindKmh, effectiveConfig.windUnit);
  const gustVal = toWindUnitValue(summary.peakGustsKmh, effectiveConfig.windUnit);

  return (
    <section aria-label="תחזית ים, רוח וגלים" className={`rounded-2xl border p-3.5 sm:p-4 space-y-3 print:hidden ${st.wrap}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${st.badge}`}>
            <StatusIcon size={17} />
          </span>
          <div className="min-w-0 space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-sm font-black ${st.title}`}>{summary.evaluation.recommendationTitle}</h3>
              {summary.isOneOffLocation && (
                <span className="px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-950 text-[10px] font-black">מיקום זמני</span>
              )}
            </div>
            <p className={`text-xs leading-relaxed font-medium ${st.body}`}>{summary.evaluation.recommendationBody}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-600 font-semibold pt-0.5 tabular-nums">
              <span>מועד: {summary.displayDate} · {summary.endTime ? `${summary.startTime}–${summary.endTime}` : summary.startTime}</span>
              <span>מיקום: {summary.locationName}</span>
              <span className="text-slate-400">ECMWF / Open-Meteo</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
          {isAdmin && !hideSettingsLink && (
            <Link
              to="/app/manage?view=WEATHER"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold flex items-center gap-1 whitespace-nowrap min-h-[36px]"
            >
              <Settings2 size={13} />
              <span>הגדרות סף</span>
            </Link>
          )}
          <button
            type="button"
            onClick={refresh}
            disabled={isLoading}
            aria-label="רענן תחזית ים"
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 min-h-[36px]"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {!summary.isForecastLimitedRange && (
        <>
          <div className={`grid gap-2 ${compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 md:grid-cols-4'}`}>
            <div className="rounded-xl bg-white/90 border border-slate-200/80 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><Waves size={13} className="text-sky-600" /> גובה גלים</div>
              <div className="text-base font-black text-slate-900 tabular-nums mt-0.5">
                {summary.peakWaveCm !== null ? `${summary.peakWaveCm} ס"מ` : 'מי נהר / סגור'}
              </div>
              <div className="text-[11px] text-slate-500 tabular-nums">סף מקס׳: {effectiveConfig.maxWaveCm} ס"מ</div>
            </div>

            <div className="rounded-xl bg-white/90 border border-slate-200/80 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><Wind size={13} className="text-indigo-600" /> רוח צפויה</div>
              <div className="text-base font-black text-slate-900 tabular-nums mt-0.5">{windVal !== null ? `${windVal} ${unitLabel}` : '—'}</div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                {gustVal !== null ? `משבים ${gustVal} · סף ${effectiveConfig.maxWindSpeed}` : `סף: ${effectiveConfig.maxWindSpeed} ${unitLabel}`}
              </div>
            </div>

            <div className="rounded-xl bg-white/90 border border-slate-200/80 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><Compass size={13} className="text-emerald-600" /> כיוון ומחזור</div>
              <div className="text-sm font-black text-slate-900 mt-0.5 truncate">{getCompassDirectionHe(summary.windDirectionDeg)}</div>
              <div className="text-[11px] text-slate-500 tabular-nums">
                {summary.wavePeriodSec !== null ? `מחזור גל: ${summary.wavePeriodSec} שנ׳` : `כיוון גל: ${getCompassDirectionHe(summary.waveDirectionDeg)}`}
              </div>
            </div>

            <div className="rounded-xl bg-white/90 border border-slate-200/80 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500"><Thermometer size={13} className="text-orange-500" /> מזג אוויר</div>
              <div className="text-base font-black text-slate-900 tabular-nums mt-0.5">{summary.avgTempC !== null ? `${summary.avgTempC}°` : '—'}</div>
              <div className="text-[11px] text-slate-500 truncate tabular-nums">
                {summary.weatherLabel}{summary.maxPrecipProbPct ? ` · ${summary.maxPrecipProbPct}% גשם` : ''}
              </div>
            </div>
          </div>

          <SeaHourlyStrip
            hourlyWindow={summary.hourlyWindow}
            startTime={summary.startTime}
            endTime={summary.endTime}
            windUnit={effectiveConfig.windUnit}
            unitLabel={unitLabel}
          />
        </>
      )}
    </section>
  );
};


