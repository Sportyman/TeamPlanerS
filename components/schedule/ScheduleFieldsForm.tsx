import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { ClubSchedule } from '../../types';
import { DAY_NAMES_HE } from '../../services/scheduleService';
import { LocationPicker } from './LocationPicker';

interface ScheduleFieldsFormProps {
  value: ClubSchedule;
  onChange: (next: ClubSchedule) => void;
  compact?: boolean;
}

export const DEFAULT_SCHEDULE_DRAFT: ClubSchedule = {
  dayOfWeek: 3, // רביעי
  startTime: '08:00',
  endTime: undefined,
  locationName: '',
};

export const ScheduleFieldsForm: React.FC<ScheduleFieldsFormProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const hasEndTime = typeof value.endTime === 'string' && value.endTime.length > 0;

  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-3' : 'md:grid-cols-3'} gap-3`}>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">יום פעילות קבוע</label>
          <div className="relative">
            <Calendar size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={value.dayOfWeek}
              onChange={(e) => onChange({ ...value, dayOfWeek: Number(e.target.value) })}
              className={`w-full pr-9 pl-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-brand-500 ${
                compact ? 'py-2 text-xs' : 'py-2.5 text-sm'
              }`}
            >
              {DAY_NAMES_HE.map((day, idx) => (
                <option key={idx} value={idx}>יום {day}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 mb-1">שעת התחלה</label>
          <div className="relative">
            <Clock size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="time"
              value={value.startTime}
              onChange={(e) => onChange({ ...value, startTime: e.target.value })}
              className={`w-full pr-9 pl-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-brand-500 ${
                compact ? 'py-2 text-xs' : 'py-2.5 text-sm'
              }`}
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1 cursor-pointer">
            <input
              type="checkbox"
              checked={hasEndTime}
              onChange={(e) => onChange({ ...value, endTime: e.target.checked ? (value.endTime || '10:30') : undefined })}
              className="rounded border-slate-300"
            />
            <span>שעת סיום (אופציונלי)</span>
          </label>
          {hasEndTime ? (
            <input
              type="time"
              value={value.endTime || ''}
              onChange={(e) => onChange({ ...value, endTime: e.target.value || undefined })}
              className={`w-full px-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-brand-500 ${
                compact ? 'py-2 text-xs' : 'py-2.5 text-sm'
              }`}
            />
          ) : (
            <div className={`px-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 font-medium flex items-center ${
              compact ? 'py-2 text-xs' : 'py-2.5 text-xs'
            }`}>
              ללא שעת סיום
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-500 mb-1">מיקום הפעילות הקבוע</label>
        <LocationPicker
          value={value.locationName}
          locationId={value.locationId}
          onChange={(locationName, locationId, coords) =>
            onChange({
              ...value,
              locationName,
              locationId,
              lat: coords?.lat,
              lng: coords?.lng,
            })
          }
          compact={compact}
        />
      </div>
    </div>
  );
};
