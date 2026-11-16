import React, { useState } from 'react';
import { PollEvent } from '../../types/whatsapp';
import { POLL_COLOR_PALETTE } from '../../config/whatsappDefaults';
import { ChevronDown, Palette } from 'lucide-react';

interface PollSelectorDropdownProps {
  polls: PollEvent[];
  activePoll: PollEvent | null;
  onSelectPoll: (pollId: string) => void;
  onChangeColor?: (pollId: string, colorId: string) => void;
}

export const PollSelectorDropdown: React.FC<PollSelectorDropdownProps> = ({
  polls,
  activePoll,
  onSelectPoll,
  onChangeColor,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showColors, setShowColors] = useState(false);

  if (!activePoll) return null;

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
            <div className={`text-sm font-bold truncate sm:max-w-[360px] ${activePoll.colorToken.textClass}`}>
              {activePoll.question}
            </div>
            <div className="text-xs text-slate-600 flex items-center gap-1.5 tabular-nums min-w-0">
              <span className="shrink-0">{activePoll.displayDate}</span>
              {activePoll.displayTime && (
                <>
                  <span aria-hidden="true" className="shrink-0">·</span>
                  <span className="shrink-0">{activePoll.displayTime}</span>
                </>
              )}
              <span aria-hidden="true" className="shrink-0">·</span>
              <span className="truncate">{activePoll.group}</span>
            </div>
          </div>
          <ChevronDown size={16} className="text-slate-500 shrink-0" />
        </button>

        {onChangeColor && (
          <button
            type="button"
            title="שנה צבע סקר"
            onClick={() => setShowColors((v) => !v)}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors min-h-[48px] min-w-[44px] flex items-center justify-center shrink-0"
          >
            <Palette size={17} />
          </button>
        )}
      </div>

      {showColors && onChangeColor && (
        <div className="mt-2 p-2.5 bg-white border border-slate-200 rounded-xl shadow-md flex items-center gap-2 flex-wrap z-30 relative">
          <span className="text-xs font-semibold text-slate-600 ml-1">צבע סקר:</span>
          {POLL_COLOR_PALETTE.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onChangeColor(activePoll.pollId, c.id);
                setShowColors(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap ${
                activePoll.colorToken.id === c.id ? 'border-slate-900 bg-slate-100 text-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${c.dotClass}`} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-full sm:w-96 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-40 divide-y divide-slate-100">
          {polls.map((poll) => {
            const isSelected = poll.pollId === activePoll.pollId;
            return (
              <button
                key={poll.pollId}
                type="button"
                onClick={() => {
                  onSelectPoll(poll.pollId);
                  setIsOpen(false);
                }}
                className={`w-full p-3 text-right flex items-start gap-3 transition-colors ${
                  isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${poll.colorToken.dotClass}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900 truncate">{poll.question}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 tabular-nums">
                    <span>{poll.displayDate}</span>
                    {poll.displayTime && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{poll.displayTime}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{poll.group}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
