import React, { useState } from 'react';
import { PollEvent } from '../../types/whatsapp';
import { AlertTriangle, Link2, Trash2 } from 'lucide-react';

interface UnmatchedPollsNoticeProps {
  unmatchedPolls: PollEvent[];
  onLinkGroup: (groupKeyOrName: string) => Promise<void>;
  onDeletePoll?: (poll: PollEvent) => Promise<void>;
  compact?: boolean;
}

export const UnmatchedPollsNotice: React.FC<UnmatchedPollsNoticeProps> = ({
  unmatchedPolls,
  onLinkGroup,
  onDeletePoll,
  compact = false,
}) => {
  const [busyPollId, setBusyPollId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  if (unmatchedPolls.length === 0) return null;

  const topPolls = unmatchedPolls.slice(0, compact ? 2 : 4);

  const handleLink = async (poll: PollEvent) => {
    const target = poll.groupId || poll.group;
    if (!target || target === 'קבוצה כללית' || busyPollId) return;
    setBusyPollId(poll.pollId);
    try {
      await onLinkGroup(target);
    } finally {
      setBusyPollId(null);
    }
  };

  const handleDelete = async (poll: PollEvent) => {
    if (!onDeletePoll || busyPollId) return;
    setBusyPollId(poll.pollId);
    try {
      await onDeletePoll(poll);
      setConfirmDeleteId(null);
    } finally {
      setBusyPollId(null);
    }
  };

  return (
    <div className="border border-amber-200 bg-amber-50/60 rounded-2xl p-3.5 sm:p-4 space-y-2.5 text-right">
      <div className="flex items-start gap-2 text-xs text-amber-950">
        <AlertTriangle size={16} className="text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">
            נקלטו {unmatchedPolls.length} סקרים במערכת מקבוצות שאינן משויכות כרגע לחוג זה.
          </span>
          <span className="block text-amber-800 mt-0.5">
            אם פרסמת סקר בבוט והוא אינו מוצג כאן, ייתכן ששם הקבוצה השתנה או שהיא טרם צוותה לחוג:
          </span>
        </div>
      </div>

      <div className="divide-y divide-amber-200/70 border border-amber-200 rounded-xl bg-white">
        {topPolls.map((poll) => {
          const canLink = Boolean(poll.groupId || (poll.group && poll.group !== 'קבוצה כללית'));
          const isConfirming = confirmDeleteId === poll.pollId;
          return (
            <div key={poll.pollId} className="px-3 py-2.5 flex items-center justify-between gap-2.5 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">{poll.question}</div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 tabular-nums truncate">
                  <span className="font-semibold text-slate-700 truncate">{poll.group}</span>
                  <span aria-hidden="true">·</span>
                  <span>{poll.displayDate}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {canLink && !isConfirming && (
                  <button
                    type="button"
                    disabled={busyPollId !== null}
                    onClick={() => handleLink(poll)}
                    className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 min-h-[36px]"
                  >
                    <Link2 size={13} />
                    <span>{busyPollId === poll.pollId ? 'משייך...' : 'צוות קבוצה זו'}</span>
                  </button>
                )}
                {onDeletePoll && (
                  isConfirming ? (
                    <>
                      <button
                        type="button"
                        disabled={busyPollId !== null}
                        onClick={() => handleDelete(poll)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold min-h-[36px]"
                      >
                        {busyPollId === poll.pollId ? 'מוחק...' : 'אשר מחיקה'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 min-h-[36px]"
                      >
                        ביטול
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={busyPollId !== null}
                      onClick={() => setConfirmDeleteId(poll.pollId)}
                      title="מחק סקר"
                      className="p-2 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
