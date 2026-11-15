import React, { useState } from 'react';
import { Check, Edit2, Trash2, Waves, X, Calendar, MapPin } from 'lucide-react';
import { Club, ClubSchedule } from '../../types';
import { DAY_NAMES_HE } from '../../services/scheduleService';
import { DEFAULT_SCHEDULE_DRAFT, ScheduleFieldsForm } from '../schedule/ScheduleFieldsForm';

interface ClubCardItemProps {
  club: Club;
  onSave: (id: string, label: string, schedule?: ClubSchedule) => Promise<void>;
  onDelete: (id: string, label: string) => Promise<void>;
}

export const ClubCardItem: React.FC<ClubCardItemProps> = ({ club, onSave, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(club.label);
  const [schedule, setSchedule] = useState<ClubSchedule>(club.defaultSchedule || DEFAULT_SCHEDULE_DRAFT);

  const startEdit = () => {
    setLabel(club.label);
    setSchedule(club.defaultSchedule || DEFAULT_SCHEDULE_DRAFT);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!label.trim()) return;
    await onSave(club.id, label.trim(), schedule);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="p-5 bg-white border-2 border-brand-300 rounded-3xl shadow-md space-y-4 col-span-1 md:col-span-2 lg:col-span-3">
        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="שם החוג..."
            className="flex-1 px-3 py-2 text-sm font-black bg-slate-50 border border-brand-300 rounded-xl focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
          >
            <Check size={15} />
            <span>שמור</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <X size={16} />
          </button>
        </div>
        <ScheduleFieldsForm value={schedule} onChange={setSchedule} compact />
      </div>
    );
  }

  const sched = club.defaultSchedule;
  const timeText = sched ? (sched.endTime ? `${sched.startTime}–${sched.endTime}` : sched.startTime) : '';

  return (
    <div className="group p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl flex flex-col justify-between gap-3 hover:bg-white hover:border-brand-200 transition-all hover:shadow-lg">
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 shrink-0 transition-colors">
            <Waves size={22} />
          </div>
          <span className="font-black text-base text-slate-800 truncate">{club.label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={startEdit}
            title="ערוך חוג, יום, שעה ומיקום"
            aria-label="ערוך חוג"
            className="p-2 rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
          >
            <Edit2 size={17} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(club.id, club.label)}
            title="מחק חוג"
            aria-label="מחק חוג"
            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      {sched ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-600 border-t border-slate-200/70 pt-2.5">
          <span className="flex items-center gap-1">
            <Calendar size={13} className="text-brand-600" />
            יום {DAY_NAMES_HE[sched.dayOfWeek]} · {timeText}
          </span>
          {sched.locationName && (
            <span className="flex items-center gap-1">
              <MapPin size={13} className="text-emerald-600" />
              {sched.locationName}
            </span>
          )}
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 border-t border-slate-200/70 pt-2">
          טרם הוגדרו יום, שעה ומיקום קבועים (לחץ על עריכה)
        </div>
      )}
    </div>
  );
};
