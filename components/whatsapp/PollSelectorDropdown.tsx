import React, { useState } from 'react';
import { PollEvent, PollManageActions } from '../../types/whatsapp';
import { POLL_COLOR_PALETTE } from '../../config/whatsappDefaults';
import { Archive, ChevronDown, ListChecks, Palette, Trash2 } from 'lucide-react';

interface PollSelectorDropdownProps {
  polls: PollEvent[];
  activePoll: PollEvent | null;
  onSelectPoll: (pollId: string) => void;
  onChangeColor?: (pollId: string, colorId: string) => void;
  pollManage?: PollManageActions;
  onOpenManage?: () => void;
}

export const PollSelectorDropdown: React.FC<PollSelectorDropdownProps> = ({
  polls, activePoll, onSelectPoll, onChangeColor, pollManage, onOpenManage,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [confirmPollId, setConfirmPollId] = useState<string | null>(null);
  const [busyMode, setBusyMode] = useState<'SITE' | 'PERM' | null>(null);

  if (!activePoll) return null;
  const confirmPoll = confirmPollId ? polls.find((p) => p.pollId === confirmPollId) || null : null;

  const runAction = async (mode: 'SITE' | 'PERM') => {
    if (!confirmPoll || !pollManage || busyMode) return;
    setBusyMode(mode);
    try {
      if (mode === 'SITE') await pollManage.onHidePolls([confirmPoll]);
      else await pollManage.onDeletePollsPermanent([confirmPoll]);
      setConfirmPollId(null);
      setIsOpen(false);
    } finally {
      setBusyMode(null);
    }
  };

  return (
    <div className="relative w-full md:w-auto">
      <div className="flex items-stretch sm:items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className={`flex-1 md:flex-initial flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${activePoll.colorToken.borderClass} ${activePoll.colorToken.surfaceClass} hover:opacity-95 transition-opacity text-right min-h-[48px] min-w-0`}
        >
          <span className={`w-3 h-3 rounded-full shrink-0 ${activePoll.colorToken.dotClass}`} />
          <div className="text-right min-w-0 flex-1">
            <div className={`text-sm font-bold truncate sm:max-w-[360px] ${activePoll.colorToken.textClass}`}>{activePoll.question}</div>
            <div className="text-xs text-slate-600 flex items-center gap-1.5 tabular-nums min-w-0">
              <span className="shrink-0">{activePoll.displayDate}</span>
              {activePoll.displayTime && (<><span aria-hidden="true" className="shrink-0">·</span><span className="shrink-0">{activePoll.displayTime}</span></>)}
              <span aria-hidden="true" className="shrink-0">·</span>
              <span className="truncate">{activePoll.group}</span>
              {polls.length > 1 && (<span className="shrink-0 text-[11px] font-semibold text-slate-500">({polls.length} סקרים)</span>)}
            </div>
          </div>
          <ChevronDown size={16} className="text-slate-500 shrink-0" />
        </button>

        {onChangeColor && (
          <button type="button" title="שנה צבע סקר" onClick={() => setShowColors((v) => !v)} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors min-h-[48px] min-w-[44px] flex items-center justify-center shrink-0">
            <Palette size={17} />
          </button>
        )}

        {pollManage && (
          <button
            type="button" title="מחק / הסר סקר נוכחי"
            onClick={() => { setShowColors(false); setConfirmPollId((id) => (id === activePoll.pollId ? null : activePoll.pollId)); }}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors min-h-[48px] min-w-[44px] flex items-center justify-center shrink-0"
          >
            <Trash2 size={17} />
          </button>
        )}

        {onOpenManage && (
          <button
            type="button" title="מחיקה מרובה וארכיון סקרים"
            onClick={() => { setIsOpen(false); setConfirmPollId(null); onOpenManage(); }}
            className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 min-h-[48px] shrink-0 whitespace-nowrap"
          >
            <ListChecks size={16} />
            <span className="hidden sm:inline">מחיקה מרובה</span>
          </button>
        )}
      </div>

      {confirmPoll && pollManage && (
        <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 flex-wrap text-xs z-30 relative">
          <span className="font-bold text-slate-900 truncate max-w-[260px]">פעולה על "{confirmPoll.question}":</span>
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <button type="button" disabled={busyMode !== null} onClick={() => runAction('SITE')} className="px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 text-amber-900 font-bold flex items-center gap-1 min-h-[34px]">
              <Archive size={13} /><span>{busyMode === 'SITE' ? 'מסיר...' : 'מהאתר בלבד (שמור תיעוד)'}</span>
            </button>
            <button type="button" disabled={busyMode !== null} onClick={() => runAction('PERM')} className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold min-h-[34px]">
              {busyMode === 'PERM' ? 'מוחק...' : 'מחק גם מ-Firebase'}
            </button>
            <button type="button" onClick={() => setConfirmPollId(null)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-semibold min-h-[34px]">ביטול</button>
          </div>
        </div>
      )}

      {showColors && onChangeColor && (
        <div className="mt-2 p-2.5 bg-white border border-slate-200 rounded-xl shadow-md flex items-center gap-2 flex-wrap z-30 relative">
          <span className="text-xs font-semibold text-slate-600 ml-1">צבע סקר:</span>
          {POLL_COLOR_PALETTE.map((c) => (
            <button
              key={c.id} type="button"
              onClick={() => { onChangeColor(activePoll.pollId, c.id); setShowColors(false); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap ${
                activePoll.colorToken.id === c.id ? 'border-slate-900 bg-slate-100 text-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${c.dotClass}`} /><span>{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-full sm:w-96 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-40 divide-y divide-slate-100">
          {polls.map((poll) => {
            const isSelected = poll.pollId === activePoll.pollId;
            return (
              <div key={poll.pollId} className={`flex items-stretch transition-colors ${isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                <button type="button" onClick={() => { onSelectPoll(poll.pollId); setIsOpen(false); }} className="flex-1 p-3 text-right flex items-start gap-3 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${poll.colorToken.dotClass}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 truncate">{poll.question}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 tabular-nums">
                      <span>{poll.displayDate}</span>
                      {poll.displayTime && (<><span aria-hidden="true">·</span><span>{poll.displayTime}</span></>)}
                      <span aria-hidden="true">·</span><span className="truncate">{poll.group}</span>
                    </div>
                  </div>
                </button>
                {pollManage && (
                  <button type="button" title="מחק / הסר סקר" onClick={() => { setConfirmPollId(poll.pollId); setIsOpen(false); }} className="px-3 text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

