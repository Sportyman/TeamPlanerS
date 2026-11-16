import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Save, Sparkles, Waves } from 'lucide-react';
import { Club } from '../../types';
import { ClubWeatherConfig, SeaAlertAction, WindUnit } from '../../types/weather';
import { useAppStore } from '../../store';
import { saveClubWeatherConfigToCloud } from '../../services/scheduleService';
import { formatWindUnitLabel, getDefaultWeatherConfig } from '../../services/weather/weatherDefaults';
import { LocationPicker } from '../schedule/LocationPicker';
import { SeaForecastBanner } from '../weather/SeaForecastBanner';

interface ClubWeatherSettingsViewProps {
  club: Club;
  onBack: () => void;
}

export const ClubWeatherSettingsView: React.FC<ClubWeatherSettingsViewProps> = ({ club, onBack }) => {
  const { setClubWeatherConfig, addNotification } = useAppStore();
  const [draft, setDraft] = useState<ClubWeatherConfig>(() => club.weatherConfig || getDefaultWeatherConfig(club.id, club.label));
  const [saving, setSaving] = useState(false);

  const applyPreset = (type: 'SAILING' | 'KAYAK') => {
    if (type === 'SAILING') {
      setDraft((d) => ({ ...d, enabled: true, maxWaveCm: 90, maxWindSpeed: 15, windUnit: 'KN', actionOnExceed: 'RECOMMEND_CANCEL' }));
    } else {
      setDraft((d) => ({ ...d, enabled: true, maxWaveCm: 80, maxWindSpeed: 15, windUnit: 'KMH', actionOnExceed: 'RECOMMEND_RELOCATE', fallbackLocationName: d.fallbackLocationName || 'מרכז דניאל' }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const clean: ClubWeatherConfig = {
      ...draft,
      maxWaveCm: Math.max(10, Math.min(500, Number(draft.maxWaveCm) || 90)),
      maxWindSpeed: Math.max(3, Math.min(120, Number(draft.maxWindSpeed) || 15)),
      customWarningNote: draft.customWarningNote?.trim() || undefined,
    };
    setSaving(true);
    try {
      setClubWeatherConfig(club.id, clean);
      await saveClubWeatherConfigToCloud(club.id, clean);
      addNotification('הגדרות ניטור הים, הרוח והגלים נשמרו בהצלחה', 'SUCCESS');
      onBack();
    } catch {
      addNotification('שגיאה בשמירת הגדרות הניטור', 'WARN');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm min-h-[44px]">
        <ArrowRight size={18} /> חזרה לתפריט ניהול החוג
      </button>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
          <Waves size={26} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900">ניטור ים, רוח וגלים — {club.label}</h2>
          <p className="text-xs text-slate-500">
            התראות והמלצות מבוססות תחזית (Open-Meteo / ECMWF) לשעות האימון. המערכת ממליצה בלבד ואינה מבצעת ביטולים אוטומטיים.
          </p>
        </div>
      </div>

      <SeaForecastBanner club={club} configOverride={draft} isAdmin hideSettingsLink />

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">הפעלת ניטור והתראות לחוג</h3>
            <p className="text-xs text-slate-500">הצגת כרטיס תחזית והמלצות במסך האימון ובסיכום סקרי וואטסאפ</p>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none min-h-[44px]">
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) => setDraft((d) => ({ ...d, enabled: e.target.checked }))}
              className="w-5 h-5 accent-sky-600 rounded"
            />
            <span className="text-xs font-bold text-slate-800">{draft.enabled ? 'פעיל' : 'כבוי'}</span>
          </label>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin size={15} className="text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-800">מיקום בדיקה קבוע: </span>
              <span className="text-slate-600">{club.defaultSchedule?.locationName || 'לא הוגדר מיקום קבוע'}</span>
              {club.defaultSchedule?.lat !== undefined && (
                <span className="text-emerald-700 font-semibold mr-2">· GPS מוגדר</span>
              )}
            </div>
          </div>
          <Link to="/app/manage?view=SCHEDULE" className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-brand-400 text-brand-700 font-bold whitespace-nowrap">
            עדכן מיקום / לו״ז קבוע
          </Link>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <Sparkles size={14} className="text-sky-600" />
            <span>תבניות סף מוכנות למילוי מהיר:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => applyPreset('SAILING')} className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-200 text-xs font-bold text-slate-800 min-h-[44px]">
              שייט תחרותי (90 ס״מ · 15 קשר · המלצה לביטול)
            </button>
            <button type="button" onClick={() => applyPreset('KAYAK')} className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-200 text-xs font-bold text-slate-800 min-h-[44px]">
              קיאקים (80 ס״מ · 15 קמ״ש · העברה למרכז דניאל)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">סף גובה גלים מקסימלי (ס״מ)</label>
            <input type="number" min={10} max={500} step={5} value={draft.maxWaveCm} onChange={(e) => setDraft((d) => ({ ...d, maxWaveCm: Number(e.target.value) }))} className="w-full px-3.5 py-2.5 text-sm font-black border border-slate-200 rounded-xl tabular-nums" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">סף מהירות רוח מקסימלי</label>
            <input type="number" min={3} max={120} step={1} value={draft.maxWindSpeed} onChange={(e) => setDraft((d) => ({ ...d, maxWindSpeed: Number(e.target.value) }))} className="w-full px-3.5 py-2.5 text-sm font-black border border-slate-200 rounded-xl tabular-nums" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">יחידת מדידת רוח</label>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
              {(['KN', 'KMH'] as WindUnit[]).map((u) => (
                <button key={u} type="button" onClick={() => setDraft((d) => ({ ...d, windUnit: u }))} className={`py-2 rounded-lg text-xs font-bold min-h-[40px] ${draft.windUnit === u ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>
                  {formatWindUnitLabel(u)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-slate-700">המלצה מוצגת בעת חריגה מהסף (ללא פעולה אוטומטית):</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {([
              { id: 'RECOMMEND_CANCEL', title: 'המלץ על ביטול / דחייה', desc: 'מתאים לשייט תחרותי או יציאה לים פתוח' },
              { id: 'RECOMMEND_RELOCATE', title: 'המלץ על החלפת מיקום', desc: 'מתאים להעברת קיאקים למים שקטים (כגון מרכז דניאל)' },
            ] as Array<{ id: SeaAlertAction; title: string; desc: string }>).map((opt) => (
              <button key={opt.id} type="button" onClick={() => setDraft((d) => ({ ...d, actionOnExceed: opt.id }))} className={`p-3 rounded-2xl border text-right transition-all ${draft.actionOnExceed === opt.id ? 'border-sky-500 bg-sky-50/70' : 'border-slate-200 hover:border-slate-300'}`}>
                <div className="text-xs font-black text-slate-900">{opt.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {draft.actionOnExceed === 'RECOMMEND_RELOCATE' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">מיקום חלופי מומלץ בעת חריגה</label>
            <LocationPicker
              value={draft.fallbackLocationName || ''}
              locationId={draft.fallbackLocationId}
              onChange={(name, id, coords, areaLabel) => setDraft((d) => ({ ...d, fallbackLocationName: name, fallbackLocationId: id, fallbackAreaLabel: areaLabel, fallbackLat: coords?.lat, fallbackLng: coords?.lng }))}
              allowOneOffCustom
              compact
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">הנחיית מדריך נוספת להתראה (אופציונלי)</label>
          <input type="text" value={draft.customWarningNote || ''} onChange={(e) => setDraft((d) => ({ ...d, customWarningNote: e.target.value }))} placeholder="למשל: לתאם אישור טלפוני עם רכז הבטיחות לפני שינוי" className="w-full px-3.5 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onBack} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100">ביטול</button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 min-h-[44px]">
            <Save size={16} />
            <span>{saving ? 'שומר...' : 'שמור הגדרות ניטור'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
