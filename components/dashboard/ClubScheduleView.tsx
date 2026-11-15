import React, { useState } from 'react';
import { ArrowRight, CalendarClock, Save } from 'lucide-react';
import { Club, ClubSchedule } from '../../types';
import { useAppStore } from '../../store';
import {
  computeNextClubSession, saveClubScheduleToCloud,
} from '../../services/scheduleService';
import { DEFAULT_SCHEDULE_DRAFT, ScheduleFieldsForm } from '../schedule/ScheduleFieldsForm';
import { UpcomingSessionBanner } from '../schedule/UpcomingSessionBanner';

interface ClubScheduleViewProps {
  club: Club;
  onBack: () => void;
}

export const ClubScheduleView: React.FC<ClubScheduleViewProps> = ({ club, onBack }) => {
  const { updateClub, addNotification } = useAppStore();
  const [schedule, setSchedule] = useState<ClubSchedule>(club.defaultSchedule || DEFAULT_SCHEDULE_DRAFT);
  const [saving, setSaving] = useState(false);

  const upcoming = computeNextClubSession({ ...club, defaultSchedule: schedule });

  const handleSavePermanent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      updateClub(club.id, club.label, schedule);
      await saveClubScheduleToCloud(club.id, club.label, schedule);
      addNotification('לוח הזמנים והמיקום הקבועים נשמרו בהצלחה', 'SUCCESS');
      onBack();
    } catch {
      addNotification('שגיאה בשמירת לוח הזמנים', 'WARN');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm">
        <ArrowRight size={18} /> חזרה לתפריט ניהול החוג
      </button>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          <CalendarClock size={26} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900">לו״ז ומיקום קבוע — {club.label}</h2>
          <p className="text-xs text-slate-500">
            הגדרת ברירת המחדל השבועית של החוג. המערכת תחשב אוטומטית את תאריך האימון הקרוב הבא.
          </p>
        </div>
      </div>

      {upcoming && <UpcomingSessionBanner club={{ ...club, defaultSchedule: schedule }} canEdit />}

      <form onSubmit={handleSavePermanent} className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-800">עריכת ברירת מחדל קבועה של החוג</h3>
        <ScheduleFieldsForm value={schedule} onChange={setSchedule} />
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
            ביטול
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2"
          >
            <Save size={16} />
            <span>{saving ? 'שומר...' : 'שמור הגדרות קבועות'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
