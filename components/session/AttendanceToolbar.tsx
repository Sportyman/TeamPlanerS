import React from 'react';
import {
  ArrowDownAZ, ArrowUpNarrowWide, CheckSquare, Search,
  Shield, Square, TrendingUp, Undo2, UserPlus,
} from 'lucide-react';

export type SortType = 'ATTENDANCE' | 'ROLE' | 'NAME' | 'RANK';

interface AttendanceToolbarProps {
  stats: { vols: number; mems: number; skippers: number };
  presentCount: number;
  totalCount: number;
  sortBy: SortType;
  search: string;
  canUndo: boolean;
  undoLabel?: string;
  onSortChange: (sort: SortType) => void;
  onSearchChange: (val: string) => void;
  onAddQuick: () => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onUndo: () => void;
}

export const AttendanceToolbar: React.FC<AttendanceToolbarProps> = ({
  stats, presentCount, totalCount, sortBy, search, canUndo, undoLabel,
  onSortChange, onSearchChange, onAddQuick, onSelectAll, onClearAll, onUndo,
}) => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">מי הגיע היום?</h2>
          <button onClick={onAddQuick} className="bg-brand-100 text-brand-700 px-3 py-2 rounded-xl hover:bg-brand-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5 text-xs font-black">
            <UserPlus size={16} /> הוספת משתתף / אורח
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-bold text-slate-600 tabular-nums">
          <span className="text-orange-700">מתנדבים: {stats.vols}</span>
          <span aria-hidden="true">·</span>
          <span className="text-sky-700">חברים: {stats.mems}</span>
          {stats.skippers > 0 && (<><span aria-hidden="true">·</span><span className="text-blue-700">מפקדי סירה: {stats.skippers}</span></>)}
          <span aria-hidden="true">·</span>
          <span className="text-slate-900">סה"כ מסומנים: {presentCount} / {totalCount}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title={undoLabel ? `בטל: ${undoLabel}` : 'אין פעולה אחרונה לביטול'}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-60 border border-amber-200 disabled:border-slate-200 text-amber-900 rounded-xl transition-all font-bold text-sm"
        >
          <Undo2 size={15} /> ביטול פעולה אחרונה
        </button>
        <button onClick={onSelectAll} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-sm">
          <CheckSquare size={16} /> בחר הכל
        </button>
        <button onClick={onClearAll} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-sm">
          <Square size={16} /> נקה
        </button>
      </div>
    </div>

    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 flex-nowrap overflow-x-auto">
        <span className="shrink-0 ml-0.5">מיון:</span>
        <button onClick={() => onSortChange('ATTENDANCE')} title="מיון לפי תדירות הגעה וא-ב" className={`px-2 py-1.5 rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 transition-all ${sortBy === 'ATTENDANCE' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><TrendingUp size={12} /> תדירות</button>
        <button onClick={() => onSortChange('NAME')} className={`px-2 py-1.5 rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 transition-all ${sortBy === 'NAME' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><ArrowDownAZ size={12} /> א-ב</button>
        <button onClick={() => onSortChange('ROLE')} className={`px-2 py-1.5 rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 transition-all ${sortBy === 'ROLE' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><Shield size={12} /> תפקיד</button>
        <button onClick={() => onSortChange('RANK')} className={`px-2 py-1.5 rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 transition-all ${sortBy === 'RANK' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><ArrowUpNarrowWide size={12} /> דירוג</button>
      </div>
      <div className="relative w-full sm:w-64">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="חיפוש חבר ברשימה..." className="w-full pr-8 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
      </div>
    </div>
  </div>
);
