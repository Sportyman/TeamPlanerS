import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Edit2, MapPin, Settings2 } from 'lucide-react';
import { Club } from '../../types';
import { computeNextClubSession } from '../../services/scheduleService';
import { SessionOverrideModal } from './SessionOverrideModal';

interface UpcomingSessionBannerProps {
  club?: Club | null;
  canEdit?: boolean;
}

export const UpcomingSessionBanner: React.FC<UpcomingSessionBannerProps> = ({
  club,
  canEdit = false,
}) => {
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  const upcoming = useMemo(() => computeNextClubSession(club), [club]);

  if (!club) return null;

  if (!upcoming) {
    if (!canEdit) return null;
    return (
      <div className="border border-slate-200 bg-slate-50 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap text-xs print:hidden">
        <div className="flex items-center gap-2 text-slate-600 font-semibold">
          <Calendar size={15} className="text-slate-400 shrink-0" />
          <span>טרם הוגדרו יום, שעה ומיקום קבועים לחוג זה.</span>
        </div>
        <Link
          to="/app/manage?view=SCHEDULE"
          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-brand-400 text-brand-700 font-bold flex items-center gap-1.5 whitespace-nowrap"
        >
          <Settings2 size={13} />
          <span>הגדר לו״ז ומיקום קבוע</span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div
        className={`rounded-2xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          upcoming.isOverridden
            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm font-bold">
          <div className="flex items-center gap-1.5 text-slate-900">
            <Calendar size={15} className="text-brand-600 shrink-0" />
            <span>האימון הקרוב: {upcoming.dayName}, {upcoming.displayDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-700 tabular-nums">
            <Clock size={14} className="text-slate-400 shrink-0" />
            <span>{upcoming.endTime ? `${upcoming.startTime}–${upcoming.endTime}` : upcoming.startTime}</span>
          </div>
          {upcoming.locationName && (
            <div className="flex items-center gap-1.5 text-slate-700">
              <MapPin size={14} className="text-emerald-600 shrink-0" />
              <span>{upcoming.locationName}</span>
            </div>
          )}
          {upcoming.isOverridden && (
            <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 text-[11px] font-black">
              שינוי זמני
            </span>
          )}
          {upcoming.note && (
            <span className="text-xs font-semibold text-amber-900">· {upcoming.note}</span>
          )}
        </div>

        {canEdit && (
          <div className="flex items-center gap-2 shrink-0 print:hidden">
            <button
              type="button"
              onClick={() => setShowOverrideModal(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Edit2 size={13} />
              <span>עדכון זמני</span>
            </button>
          </div>
        )}
      </div>

      {showOverrideModal && (
        <SessionOverrideModal
          club={club}
          upcoming={upcoming}
          onClose={() => setShowOverrideModal(false)}
        />
      )}
    </>
  );
};
