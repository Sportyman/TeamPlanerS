import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Person } from '../../types';
import { PollEvent, ResolvedPollSummary, VoteChangeAlert } from '../../types/whatsapp';
import { PollSelectorDropdown } from './PollSelectorDropdown';
import { VoteAlertsBanner } from './VoteAlertsBanner';
import { VoterLinkModal } from './VoterLinkModal';
import { AlertCircle, Download, MessageSquare, RefreshCw, Settings2, UserCheck } from 'lucide-react';

interface SessionPollBarProps {
  polls: PollEvent[];
  activePoll: PollEvent | null;
  summary: ResolvedPollSummary | null;
  people: Person[];
  presentIds: string[];
  voteAlerts: VoteChangeAlert[];
  isLoading: boolean;
  error: string | null;
  onSelectPoll: (pollId: string) => void;
  onApplyAttendance: (mode: 'REPLACE' | 'MERGE') => void;
  onTogglePerson: (personId: string) => void;
  onLinkVoter: (voter: any, personId: string) => Promise<void>;
  onAddGuest: (voter: any, persistToClub: boolean) => Promise<any>;
  onDismissAlert: (id: string) => void;
  onClearAlerts: () => void;
  onRetry: () => void;
}

export const SessionPollBar: React.FC<SessionPollBarProps> = ({
  polls, activePoll, summary, people, presentIds, voteAlerts, isLoading, error,
  onSelectPoll, onApplyAttendance, onTogglePerson, onLinkVoter, onAddGuest, onDismissAlert, onClearAlerts, onRetry,
}) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showModeChoice, setShowModeChoice] = useState(false);

  if (isLoading) {
    return (
      <div className="border border-slate-200 rounded-2xl p-4 bg-white animate-pulse space-y-3">
        <div className="h-5 w-56 bg-slate-100 rounded" />
        <div className="h-4 w-80 bg-slate-100 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50/60 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-sm text-red-900">
          <AlertCircle size={18} className="text-red-600 shrink-0" />
          <span>לא ניתן לטעון סקרי וואטסאפ כרגע. בדוק את הרשאות Firestore או החיבור.</span>
        </div>
        <button type="button" onClick={onRetry} className="px-3 py-2 rounded-lg bg-white border border-red-200 text-xs font-bold text-red-800 hover:bg-red-100 flex items-center gap-1.5 whitespace-nowrap">
          <RefreshCw size={14} /> <span>נסה שוב</span>
        </button>
      </div>
    );
  }

  if (polls.length === 0 || !activePoll || !summary) {
    return (
      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5 text-sm text-slate-600">
          <MessageSquare size={18} className="text-slate-400 shrink-0" />
          <span>עדיין לא התקבלו סקרי וואטסאפ מקושרים לחוג זה.</span>
        </div>
        <Link to="/app/whatsapp" className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1.5 whitespace-nowrap">
          <Settings2 size={14} /> <span>הגדר קבוצות וואטסאפ</span>
        </Link>
      </div>
    );
  }

  const { counts } = summary;
  const handleLoadClick = () => {
    if (presentIds.length > 0) setShowModeChoice((v) => !v);
    else onApplyAttendance('REPLACE');
  };

  return (
    <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 bg-white space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <MessageSquare size={14} className="text-emerald-600" />
            <span>סנכרון סקר וואטסאפ</span>
            <span aria-hidden="true">·</span>
            <Link to="/app/whatsapp" className="text-brand-600 hover:underline whitespace-nowrap">מסך ניהול ומיפוי</Link>
          </div>
          <PollSelectorDropdown polls={polls} activePoll={activePoll} onSelectPoll={onSelectPoll} />
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {counts.unmappedAttending > 0 && (
            <button type="button" onClick={() => setShowLinkModal(true)} className="px-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-bold flex items-center gap-1.5 min-h-[44px] whitespace-nowrap">
              <UserCheck size={15} /> <span>זהה לא משויכים ({counts.unmappedAttending})</span>
            </button>
          )}
          <button type="button" disabled={summary.attendingPersonIds.length === 0} onClick={handleLoadClick} className="px-4 py-2.5 rounded-xl bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 transition-colors min-h-[44px] whitespace-nowrap">
            <Download size={16} /> <span>טען הגעה מהסקר ({summary.attendingPersonIds.length})</span>
          </button>
        </div>
      </div>

      {showModeChoice && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 flex-wrap text-xs">
          <span className="font-semibold text-slate-700">כבר מסומנים {presentIds.length} משתתפים באימון. כיצד לטעון מהסקר?</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { onApplyAttendance('MERGE'); setShowModeChoice(false); }} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 font-bold text-slate-800 hover:bg-slate-100 whitespace-nowrap">הוסף לנוכחים הקיימים</button>
            <button type="button" onClick={() => { onApplyAttendance('REPLACE'); setShowModeChoice(false); }} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 whitespace-nowrap">החלף לפי הסקר בלבד</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 border-t border-slate-100 pt-3 tabular-nums">
        <span className="font-bold text-emerald-700">מגיעים בסקר: {counts.totalAttending}</span>
        <span aria-hidden="true">·</span>
        <span>מתנדבים: {counts.volunteers + counts.instructors}</span>
        <span aria-hidden="true">·</span>
        <span>חברים: {counts.members}</span>
        <span aria-hidden="true">·</span>
        <span>אורחים: {counts.guests}</span>
        <span aria-hidden="true">·</span>
        <span className="text-red-700">לא מגיעים: {counts.declining}</span>
        {counts.unmappedAttending > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-amber-800">ממתינים לזיהוי: {counts.unmappedAttending}</span>
          </>
        )}
      </div>

      <VoteAlertsBanner alerts={voteAlerts} presentIds={presentIds} onTogglePerson={onTogglePerson} onDismiss={onDismissAlert} onClearAll={onClearAlerts} />

      {showLinkModal && (
        <VoterLinkModal voters={summary.voters} people={people} onLink={onLinkVoter} onAddGuest={async (v, persist) => { await onAddGuest(v, persist); }} onClose={() => setShowLinkModal(false)} />
      )}
    </div>
  );
};
