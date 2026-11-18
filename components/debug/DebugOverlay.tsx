import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { usePermissions } from '../../hooks/usePermissions';
import { useDebugMenu, DebugLogFilter } from '../../hooks/useDebugMenu';
import { APP_VERSION } from '../../config/version';
import { Terminal, Download, X, Bug, Cloud, RefreshCw, Trash2, Copy, Check, BookmarkPlus, Eraser } from 'lucide-react';

export const DebugOverlay: React.FC = () => {
  const { user, syncStatus, hardReset } = useAppStore();
  const { isSuperAdmin } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const { stats, filteredLogs, filter, setFilter, copied, downloadLogs, copyLogs, clearLogs, addMarker } = useDebugMenu(isOpen);

  if (!user || !isSuperAdmin) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[9999] print:hidden">
      {isOpen ? (
        <div className="bg-slate-900 text-white p-5 rounded-[2rem] shadow-2xl border border-slate-700 w-[min(92vw,360px)] max-h-[85vh] overflow-y-auto space-y-3.5 animate-in zoom-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bug size={18} className="text-brand-400" />
              <span className="font-black text-xs uppercase tracking-widest">Debug Menu · v{APP_VERSION}</span>
            </div>
            <button onClick={() => { setIsOpen(false); setConfirmReset(false); }} className="p-1 hover:bg-white/10 rounded-full">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
              <div className="text-[10px] text-slate-400 font-black uppercase mb-0.5">Sync</div>
              <div className="flex items-center gap-1.5 font-bold">
                {syncStatus === 'SYNCING' ? <RefreshCw size={13} className="animate-spin text-brand-400" /> : <Cloud size={13} className={syncStatus === 'SYNCED' ? 'text-green-400' : 'text-red-400'} />}
                <span>{syncStatus}</span>
              </div>
            </div>
            <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 tabular-nums">
              <div className="text-[10px] text-slate-400 font-black uppercase mb-0.5">Logs ({stats.total})</div>
              <div className="flex items-center gap-2 font-bold">
                <span className={stats.errors > 0 ? 'text-red-400' : 'text-slate-300'}>E:{stats.errors}</span>
                <span className={stats.warns > 0 ? 'text-amber-400' : 'text-slate-300'}>W:{stats.warns}</span>
              </div>
            </div>
          </div>

          <div className="bg-black/40 border border-white/10 rounded-xl p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
              {(['ALL', 'WA', 'ISSUES'] as DebugLogFilter[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`flex-1 py-1 rounded-md transition-colors ${filter === f ? 'bg-brand-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                >
                  {f === 'ALL' ? 'הכל' : f === 'WA' ? 'וואטסאפ' : 'שגיאות/אזהרות'}
                </button>
              ))}
            </div>
            <div className="max-h-44 overflow-y-auto space-y-1 text-[10px] font-mono leading-tight" dir="ltr">
              {filteredLogs.length === 0 ? (
                <div className="text-slate-500 text-center py-4">No matching log events</div>
              ) : (
                filteredLogs.map((entry) => (
                  <div key={entry.id} className="border-b border-white/5 pb-1 break-all">
                    <span className={entry.type === 'ERROR' ? 'text-red-400' : entry.type === 'WARN' ? 'text-amber-400' : entry.type === 'WA' ? 'text-emerald-400' : 'text-sky-400'}>
                      [{entry.type}]
                    </span>{' '}
                    <span className="text-slate-400">{entry.time.slice(11, 19)}</span>{' '}
                    <span className="text-slate-100">{entry.msg}</span>
                    {entry.meta && <div className="text-slate-400 pl-2">{entry.meta}</div>}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button onClick={downloadLogs} className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl font-bold transition-all active:scale-95">
              <Download size={15} /><span>הורד .log</span>
            </button>
            <button onClick={copyLogs} className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl font-bold transition-all active:scale-95">
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              <span>{copied ? 'הועתק' : 'העתק לוג'}</span>
            </button>
            <button onClick={addMarker} className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 py-2 rounded-xl font-semibold transition-all">
              <BookmarkPlus size={14} /><span>סמן נקודה</span>
            </button>
            <button onClick={clearLogs} className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/15 py-2 rounded-xl font-semibold transition-all">
              <Eraser size={14} /><span>נקה לוג</span>
            </button>
          </div>

          {confirmReset ? (
            <div className="p-3 bg-red-950/80 border border-red-700 rounded-xl space-y-2">
              <p className="text-xs text-red-200 font-bold text-center">לאפס זיכרון דפדפן ולטעון מחדש?</p>
              <div className="flex gap-2">
                <button onClick={() => hardReset()} className="flex-1 bg-red-600 hover:bg-red-500 py-2 rounded-lg text-xs font-black">אשר</button>
                <button onClick={() => setConfirmReset(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-xs font-bold">ביטול</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmReset(true)} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95">
              <Trash2 size={15} /><span>ניקוי זיכרון (Hard Reset)</span>
            </button>
          )}

          <div className="text-[10px] text-slate-400 italic text-center">Super Admin only · PII masked in exported logs.</div>
        </div>
      ) : (
        <button onClick={() => setIsOpen(true)} className="bg-slate-900/80 backdrop-blur-md text-white p-4 rounded-full shadow-xl hover:bg-slate-900 transition-all group border border-white/10" title="Open Debug Tools">
          <Terminal size={24} className="group-hover:scale-110 transition-transform" />
        </button>
      )}
    </div>
  );
};
