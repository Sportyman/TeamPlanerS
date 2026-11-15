import React, { useState } from 'react';
import { Calendar, RotateCcw, Save, X } from 'lucide-react';
import { Club, SessionOverride } from '../../types';
import { useAppStore } from '../../store';
import {
  UpcomingSessionInfo, formatScheduleSummary, saveSessionOverrideToCloud,
} from '../../services/scheduleService';
import { LocationPicker } from './LocationPicker';

interface SessionOverrideModalProps {
  club: Club;
  upcoming: UpcomingSessionInfo;
  onClose: () => void;
}

export const SessionOverrideModal: React.FC<SessionOverrideModalProps> = ({
  club,
  upcoming,
  onClose,
}) => {
  const { user, setClubSessionOverride, addNotification } = useAppStore();
  const [dateOverride, setDateOverride] = useState(upcoming.effectiveDate);
  const [startTime, setStartTime] = useState(upcoming.startTime);
  const [endTime, setEndTime] = useState(upcoming.endTime || '');
  const [locationName, setLocationName] = useState(upcoming.locationName);
  const [note, setNote] = useState(upcoming.note || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const override: SessionOverride = {
        targetDate: upcoming.defaultDate,
        dateOverride: dateOverride !== upcoming.defaultDate ? dateOverride : undefined,
        startTime: startTime.trim() || undefined,
        endTime: endTime.trim() || undefined,
        locationName: locationName.trim() || undefined,
        note: note.trim() || undefined,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email,
      };
      setClubSessionOverride(club.id, override);
      await saveSessionOverrideToCloud(club.id, override);
      addNotification('השינוי הזמני לאימון הקרוב נשמר', 'SUCCESS');
      onClose();
    } catch {
      addNotification('שגיאה בשמירת השינוי הזמני', 'WARN');
    } finally {
      setSaving(false);
    }
  };

  const handleClearOverride = async () => {
    if (saving) return;
    setSaving(true);
    try {
      setClubSessionOverride(club.id, null);
      await saveSessionOverrideToCloud(club.id, null);
      addNotification('האימון הקרוב חזר ללוח הזמנים הקבוע', 'INFO');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={19} className="text-brand-600" />
            <h3 className="text-lg font-black text-slate-900">שינוי זמני לאימון הקרוב</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="סגור" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-600">
          <span className="font-bold text-slate-800">ברירת מחדל קבועה: </span>
          {formatScheduleSummary(club.defaultSchedule)}
          <div className="text-[11px] text-slate-500 mt-0.5">
            שינוי זה חל על האימון הקרוב בלבד ויחזור אוטומטית לשגרה בשבוע הבא.
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">תאריך חלופי</label>
              <input
                type="date"
                value={dateOverride}
                onChange={(e) => setDateOverride(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">שעת התחלה</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">שעת סיום (אופציונלי)</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">מיקום לאימון זה</label>
            <LocationPicker
              value={locationName}
              onChange={(name) => setLocationName(name)}
              allowOneOffCustom
              compact
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">הערה למשתתפים (אופציונלי)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="למשל: הוקדם בחצי שעה עקב רוח צפונית..."
              className="w-full px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-white"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {upcoming.isOverridden ? (
              <button
                type="button"
                disabled={saving}
                onClick={handleClearOverride}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>חזור לברירת מחדל</span>
              </button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">
                ביטול
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Save size={14} />
                <span>{saving ? 'שומר...' : 'שמור שינוי זמני'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
