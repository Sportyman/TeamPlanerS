import React, { useMemo, useState } from 'react';
import { PollEvent, PollManageActions } from '../../types/whatsapp';
import { Archive, ArchiveRestore, CheckSquare, Square, Trash2, X } from 'lucide-react';

interface PollManageModalProps {
  manage: PollManageActions;
  onClose: () => void;
}

type DeleteMode = 'SITE_ONLY' | 'PERMANENT' | null;

export const PollManageModal: React.FC<PollManageModalProps> = ({ manage, onClose }) => {
  const { polls, unmatchedPolls, hiddenPolls, onHidePolls, onRestorePolls, onDeletePollsPermanent } = manage;
  const [view, setView] = useState<'ACTIVE' | 'ARCHIVE'>(polls.length + unmatchedPolls.length === 0 && hiddenPolls.length > 0 ? 'ARCHIVE' : 'ACTIVE');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmMode, setConfirmMode] = useState<DeleteMode>(null);
  const [busy, setBusy] = useState(false);

  const activeItems = useMemo(() => [
    ...polls.map((poll) => ({ poll, isUnmatched: false })),
    ...unmatchedPolls.map((poll) => ({ poll, isUnmatched: true })),
  ], [polls, unmatchedPolls]);

  const currentList: PollEvent[] = view === 'ACTIVE' ? activeItems.map((i) => i.poll) : hiddenPolls;
  const allSelected = currentList.length > 0 && currentList.every((p) => selectedIds.has(p.pollId));

  const toggleId = (pollId: string) => {
    setConfirmMode(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pollId)) next.delete(pollId);
      else next.add(pollId);
      return next;
    });
  };

  const toggleAll = () => {
    setConfirmMode(null);
    setSelectedIds(allSelected ? new Set() : new Set(currentList.map((p) => p.pollId)));
  };

  const selectedPolls = currentList.filter((p) => selectedIds.has(p.pollId));

  const switchTab = (nextView: 'ACTIVE' | 'ARCHIVE') => {
    setView(nextView);
    setSelectedIds(new Set());
    setConfirmMode(null);
  };

  const executeDelete = async () => {
    if (selectedPolls.length === 0 || !confirmMode || busy) return;
    setBusy(true);
    try {
      if (confirmMode === 'SITE_ONLY') await onHidePolls(selectedPolls);
      else await onDeletePollsPermanent(selectedPolls);
      setSelectedIds(new Set());
      setConfirmMode(null);
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (pollIds: string[]) => {
    if (pollIds.length === 0 || busy) return;
    setBusy(true);
    try {
      await onRestorePolls(pollIds);
      setSelectedIds(new Set());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden text-right" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900">ניהול ומחיקה מרובה של סקרים</h3>
            <p className="text-xs text-slate-500 mt-0.5">ניתן להסיר מתצוגת האתר (תוך שמירת תיעוד רשמי ב-Firebase) או למחוק לצמיתות.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="px-5 pt-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button type="button" onClick={() => switchTab('ACTIVE')} className={`px-3 py-1.5 rounded-lg ${view === 'ACTIVE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>
              סקרים באתר ({activeItems.length})
            </button>
            <button type="button" onClick={() => switchTab('ARCHIVE')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${view === 'ARCHIVE' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>
              <Archive size={13} />
              <span>ארכיון ב-Firebase ({hiddenPolls.length})</span>
            </button>
          </div>
          {currentList.length > 0 && (
            <button type="button" onClick={toggleAll} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
              {allSelected ? <CheckSquare size={14} className="text-brand-600" /> : <Square size={14} />}
              <span>{allSelected ? 'נקה בחירה' : `בחר הכל (${currentList.length})`}</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {currentList.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              {view === 'ACTIVE' ? 'אין סקרים מוצגים באתר כרגע.' : 'אין סקרים מוסתרים בארכיון.'}
            </div>
          ) : (
            currentList.map((poll) => {
              const checked = selectedIds.has(poll.pollId);
              const isUnmatched = view === 'ACTIVE' && unmatchedPolls.some((u) => u.pollId === poll.pollId);
              return (
                <div key={poll.pollId} onClick={() => toggleId(poll.pollId)} className={`px-5 py-3 flex items-center gap-3 cursor-pointer transition-colors ${checked ? 'bg-brand-50/50' : 'hover:bg-slate-50'}`}>
                  {checked ? <CheckSquare size={18} className="text-brand-600 shrink-0" /> : <Square size={18} className="text-slate-300 shrink-0" />}
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${poll.colorToken.dotClass}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 truncate">{poll.question}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 tabular-nums flex-wrap">
                      <span>{poll.displayDate}</span>
                      {poll.displayTime && (<><span aria-hidden="true">·</span><span>{poll.displayTime}</span></>)}
                      <span aria-hidden="true">·</span><span className="truncate">{poll.group}</span>
                      {isUnmatched && <span className="text-amber-700 font-semibold">· קבוצה לא משויכת</span>}
                    </div>
                  </div>
                  {view === 'ARCHIVE' && (
                    <button type="button" disabled={busy} onClick={(e) => { e.stopPropagation(); handleRestore([poll.pollId]); }} className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1 shrink-0">
                      <ArchiveRestore size={13} /><span>שחזר</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 space-y-2.5">
          {confirmMode && selectedPolls.length > 0 ? (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 flex-wrap ${confirmMode === 'PERMANENT' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-950'}`}>
              <span className="font-bold">
                {confirmMode === 'SITE_ONLY'
                  ? `להסיר ${selectedPolls.length} סקרים מהאתר בלבד? התיעוד וההצבעות יישמרו ב-Firebase בארכיון.`
                  : `למחוק לצמיתות ${selectedPolls.length} סקרים גם מהאתר וגם מ-Firebase (כולל כל ההצבעות)?`}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" disabled={busy} onClick={executeDelete} className={`px-3 py-1.5 rounded-lg text-white font-bold min-h-[34px] ${confirmMode === 'PERMANENT' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                  {busy ? 'מבצע...' : confirmMode === 'SITE_ONLY' ? 'אשר הסרה מהאתר' : 'אשר מחיקה מלאה'}
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirmMode(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold min-h-[34px]">ביטול</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-600 tabular-nums">
                {selectedPolls.length > 0 ? `נבחרו ${selectedPolls.length} סקרים` : 'סמן סקרים לביצוע פעולה מרובה'}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {view === 'ACTIVE' ? (
                  <button type="button" disabled={selectedPolls.length === 0 || busy} onClick={() => setConfirmMode('SITE_ONLY')} className="px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 text-amber-900 text-xs font-bold flex items-center gap-1.5 min-h-[38px]">
                    <Archive size={14} /><span>הסר מהאתר בלבד ({selectedPolls.length})</span>
                  </button>
                ) : (
                  <button type="button" disabled={selectedPolls.length === 0 || busy} onClick={() => handleRestore(selectedPolls.map((p) => p.pollId))} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 min-h-[38px]">
                    <ArchiveRestore size={14} /><span>החזר לאתר ({selectedPolls.length})</span>
                  </button>
                )}
                <button type="button" disabled={selectedPolls.length === 0 || busy} onClick={() => setConfirmMode('PERMANENT')} className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 min-h-[38px]">
                  <Trash2 size={14} /><span>מחק גם מ-Firebase ({selectedPolls.length})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
