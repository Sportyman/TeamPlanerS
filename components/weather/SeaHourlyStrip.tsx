import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { HourlyMarinePoint, WindUnit } from '../../types/weather';
import { toWindUnitValue } from '../../services/weather/weatherDefaults';

interface SeaHourlyStripProps {
  hourlyWindow: HourlyMarinePoint[];
  startTime: string;
  endTime?: string;
  windUnit: WindUnit;
  unitLabel: string;
}

export const SeaHourlyStrip: React.FC<SeaHourlyStripProps> = ({
  hourlyWindow,
  startTime,
  endTime,
  windUnit,
  unitLabel,
}) => {
  const [expanded, setExpanded] = useState(false);
  if (hourlyWindow.length === 0) return null;

  const sH = Number((startTime || '8').split(':')[0]);
  const eH = endTime ? Math.max(sH, Number(endTime.split(':')[0])) : Math.min(23, sH + 2);

  return (
    <div>
      <button type="button" onClick={() => setExpanded((v) => !v)} className="text-[11px] font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1 py-1">
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        <span>{expanded ? 'הסתר פירוט שעתי' : `פירוט שעתי לחלון הפעילות (${hourlyWindow.length} שעות)`}</span>
      </button>
      {expanded && (
        <div className="space-y-1.5 mt-1.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
            {hourlyWindow.map((pt) => {
              const w = toWindUnitValue(pt.windSpeedKmh, windUnit);
              const g = toWindUnitValue(pt.windGustsKmh, windUnit);
              const ptH = Number(pt.isoHour.slice(11, 13));
              const inSession = ptH >= sH && ptH <= eH;
              return (
                <div key={pt.isoHour} className={`rounded-xl border px-2.5 py-2 text-[11px] tabular-nums space-y-0.5 ${inSession ? 'bg-white border-sky-300 shadow-2xs' : 'bg-white/60 border-slate-200/80 opacity-80'}`}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-black text-slate-900">{pt.hourLabel}</span>
                    {inSession && <span className="text-[10px] font-bold text-sky-700">באימון</span>}
                  </div>
                  <div className="text-sky-700 font-semibold">{pt.waveHeightCm !== null ? `גלים: ${pt.waveHeightCm} ס"מ` : 'גלים: —'}</div>
                  <div className="text-slate-800 font-semibold">{w !== null ? `רוח: ${w} ${unitLabel}` : 'רוח: —'}</div>
                  {g !== null && <div className="text-slate-500">{`משבים: ${g} ${unitLabel}`}</div>}
                  {pt.temperatureC !== null && <div className="text-slate-400">{pt.temperatureC}°</div>}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500">בדיקת הסף מבוצעת לפי השעות המסומנות &quot;באימון&quot;; שאר השעות מוצגות למעקב לפני ואחרי הפעילות.</p>
        </div>
      )}
    </div>
  );
};
