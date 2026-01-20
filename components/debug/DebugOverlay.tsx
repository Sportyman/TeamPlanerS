
import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { Terminal, Download, X, Bug, Cloud, RefreshCw } from 'lucide-react';
import { downloadSystemLogs } from '../../services/syncService';

export const DebugOverlay: React.FC = () => {
  const { user, syncStatus } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);

  // Only show for Super Admins
  if (!user?.isAdmin) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[9999] print:hidden">
      {isOpen ? (
        <div className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-2xl border border-slate-700 w-72 animate-in zoom-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Bug size={18} className="text-brand-400" />
              <span className="font-black text-xs uppercase tracking-widest">Debug Menu</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded-full">
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="text-[10px] text-slate-400 font-black uppercase mb-1">Sync Status</div>
              <div className="flex items-center gap-2">
                {syncStatus === 'SYNCING' ? <RefreshCw size={14} className="animate-spin text-brand-400" /> : <Cloud size={14} className={syncStatus === 'SYNCED' ? 'text-green-400' : 'text-red-400'} />}
                <span className="font-bold text-sm">{syncStatus}</span>
              </div>
            </div>

            <button
              onClick={() => downloadSystemLogs()}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95"
            >
              <Download size={18} />
              הורד לוג מערכת (.log)
            </button>

            <div className="text-[10px] text-slate-500 italic text-center">
              Logs record all data sync, auth, and logic events.
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-slate-900/80 backdrop-blur-md text-white p-4 rounded-full shadow-xl hover:bg-slate-900 transition-all group border border-white/10"
          title="Open Debug Tools"
        >
          <Terminal size={24} className="group-hover:scale-110 transition-transform" />
        </button>
      )}
    </div>
  );
};
