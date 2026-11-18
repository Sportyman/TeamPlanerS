import React, { useState } from 'react';
import { getRoleLabel } from '../../types';
import { RoleStreakSuggestion } from '../../services/activityHistoryService';
import { Check, Sparkles, X } from 'lucide-react';

interface RoleStreakSuggestionsBannerProps {
  suggestions: RoleStreakSuggestion[];
  onAccept: (suggestion: RoleStreakSuggestion) => Promise<void>;
  onDismiss: (suggestion: RoleStreakSuggestion) => Promise<void>;
}

export const RoleStreakSuggestionsBanner: React.FC<RoleStreakSuggestionsBannerProps> = ({
  suggestions,
  onAccept,
  onDismiss,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  if (suggestions.length === 0) return null;

  const handleAction = async (s: RoleStreakSuggestion, accept: boolean) => {
    if (busyId) return;
    setBusyId(s.person.id);
    try {
      if (accept) await onAccept(s);
      else await onDismiss(s);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="border-2 border-indigo-200 bg-indigo-50/80 rounded-2xl p-3.5 sm:p-4 space-y-2.5 text-right">
      <div className="flex items-center gap-2 text-xs font-black text-indigo-950">
        <Sparkles size={16} className="text-indigo-600 shrink-0" />
        <span>המלצה חכמה לעדכון תואר בחוג ({suggestions.length})</span>
      </div>
      <div className="divide-y divide-indigo-200/70 bg-white border border-indigo-200 rounded-xl">
        {suggestions.map((s) => {
          const baseLabel = getRoleLabel(s.currentBaseRole, s.person.gender);
          const nextLabel = getRoleLabel(s.suggestedRole, s.person.gender);
          const isBusy = busyId === s.person.id;
          return (
            <div key={s.person.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="text-xs text-slate-800 leading-relaxed">
                <strong className="text-slate-950 text-sm">{s.person.name}</strong> רשום/ה בחוג כ<strong>{baseLabel}</strong>, אך הגיע/ה ב-<strong>{s.streakCount}</strong> פעילויות רצופות כ<strong>{nextLabel}</strong>. האם לשנות את התואר הקבוע בחוג?
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button" disabled={busyId !== null} onClick={() => handleAction(s, true)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 min-h-[36px]"
                >
                  <Check size={14} /><span>{isBusy ? 'מעדכן...' : `עדכן ל${nextLabel}`}</span>
                </button>
                <button
                  type="button" disabled={busyId !== null} onClick={() => handleAction(s, false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 min-h-[36px]"
                >
                  <X size={14} /><span>השאר כ{baseLabel}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
