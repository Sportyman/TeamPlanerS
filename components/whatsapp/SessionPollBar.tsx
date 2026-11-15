import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClubID, Person, Role } from '../../types';
import { MatchCandidate, PollEvent, ResolvedPollSummary, WhatsAppMemberMapping } from '../../types/whatsapp';
import { PollSelectorDropdown } from './PollSelectorDropdown';
import { VoterLinkModal } from './VoterLinkModal';
import { WhatsAppRosterModal } from './WhatsAppRosterModal';
import { formatFirestoreErrorMessage } from '../../services/whatsapp/pollFormatting';
import { AlertCircle, Download, MessageSquare, RefreshCw, Settings2, UserCheck, Users } from 'lucide-react';

interface SessionPollBarProps {
  activeClub: ClubID;
  polls: PollEvent[];
  activePoll: PollEvent | null;
  summary: ResolvedPollSummary | null;
  people: Person[];
  presentIds: string[];
  linkedGroups: string[];
  availableGroups: string[];
  mappings: WhatsAppMemberMapping[];
  syncCandidates: MatchCandidate[];
  isLoading: boolean;
  error: string | null;
  onSelectPoll: (pollId: string) => void;
  onLinkGroup: (groupName: string) => Promise<void>;
  onApplyAttendance: (mode: 'REPLACE' | 'MERGE') => void;
  onLinkVoter: (voter: any, personId: string) => Promise<void>;
  onAddGuest: (voter: any, persistToClub: boolean) => Promise<any>;
  onConfirmCandidate: (c: MatchCandidate, role?: Role) => Promise<void>;
  onImportRoster: (entries: Array<{ mapping: WhatsAppMemberMapping; role: Role; isSkipper?: boolean }>) => Promise<number>;
  onUpdatePersonRole: (person: Person, role: Role, isSkipper?: boolean) => Promise<void>;
  onRetry: () => void;
}

export const SessionPollBar: React.FC<SessionPollBarProps> = ({
  activeClub, polls, activePoll, summary, people, presentIds, linkedGroups, availableGroups,
  mappings, syncCandidates, isLoading, error,
  onSelectPoll, onLinkGroup, onApplyAttendance, onLinkVoter, onAddGuest,
  onConfirmCandidate, onImportRoster, onUpdatePersonRole, onRetry,
}) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showModeChoice, setShowModeChoice] = useState(false);

  if (isLoading) {
    return (
      <div className="border border-slate-200 rounded-2xl p-4 bg-white animate-pulse space-y-3">
        <div className="h-5 w-56 bg-slate-100 rounded" /><div className="h-4 w-80 bg-slate-100 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-red-200 bg-red-50/60 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2.5 text-sm text-red-900 min-w-0">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-bold">לא ניתן לטעון סקרי וואטסאפ כרגע. בדוק את הרשאות Firestore או החיבור.</div>
            <div className="text-xs text-red-700 font-mono mt-0.5 break-all" dir="ltr">{formatFirestoreErrorMessage(error)}</div>
          </div>
        </div>
        <button type="button" onClick={onRetry} className="px-3 py-2 rounded-lg bg-white border border-red-200 text-xs font-bold text-red-800 hover:bg-red-100 flex items-center gap-1.5 whitespace-nowrap">
          <RefreshCw size={14} /> <span>נסה שוב</span>
        </button>
      </div>
    );
  }

  if (linkedGroups.length === 0) {
    return (
      <div className="border border-amber-200 rounded-2xl p-4 bg-amber-50/60 space-y-2.5">
        <div className="flex items-center justify-between gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <MessageSquare size={16} className="text-amber-700 shrink-0" />
            <span>כדי להציג סקרים וחברים רק עבור חוג זה, יש לשייך קבוצת וואטסאפ לחוג:</span>
          </div>
          <Link to="/app/whatsapp" className="text-brand-700 font-bold hover:underline flex items-center gap-1">
            <Settings2 size={13} /> <span>הגדרות וואטסאפ</span>
          </Link>
        </div>
        {availableGroups.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {availableGroups.map((g) => (
              <button key={g} type="button" onClick={() => onLinkGroup(g)} className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-amber-900 hover:bg-amber-100">
                + שייך לחוג: {g}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (polls.length === 0 || !activePoll || !summary) {
    return (
      <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5 text-sm text-slate-600">
          <MessageSquare size={18} className="text-slate-400 shrink-0" />
          <span>עדיין לא התקבלו סקרים מהקבוצות המקושרות ({linkedGroups.join(', ')}).</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowRosterModal(true)} className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5">
            <Users size={13} /> <span>חברי הקבוצה ({mappings.length})</span>
          </button>
          <Link to="/app/whatsapp" className="text-xs font-bold text-brand-700 hover:text-brand-800 flex items-center gap-1.5 whitespace-nowrap">
            <Settings2 size={14} /> <span>ניהול וואטסאפ</span>
          </Link>
        </div>
        {showRosterModal && (
          <WhatsAppRosterModal activeClub={activeClub} linkedGroups={linkedGroups} mappings={mappings} people={people} syncCandidates={syncCandidates} onConfirmCandidate={onConfirmCandidate} onImportEntries={onImportRoster} onUpdatePersonRole={onUpdatePersonRole} onClose={() => setShowRosterModal(false)} />
        )}
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
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
            <MessageSquare size={14} className="text-emerald-600" />
            <span>סנכרון סקר וואטסאפ</span>
            <span aria-hidden="true">·</span>
            <Link to="/app/whatsapp" className="text-brand-600 hover:underline whitespace-nowrap">מסך ניהול ומיפוי</Link>
            <button type="button" onClick={onRetry} className="text-slate-500 hover:text-slate-900 flex items-center gap-1 mr-1" title="רענן נתוני סקר">
              <RefreshCw size={12} /><span>רענן</span>
            </button>
          </div>
          <PollSelectorDropdown polls={polls} activePoll={activePoll} onSelectPoll={onSelectPoll} />
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button type="button" onClick={() => setShowRosterModal(true)} className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 min-h-[44px] whitespace-nowrap">
            <Users size={15} /> <span>חברי הקבוצה ({mappings.length})</span>
          </button>
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
        <span aria-hidden="true">·</span><span>מתנדבים: {counts.volunteers + counts.instructors}</span>
        <span aria-hidden="true">·</span><span>חברים: {counts.members}</span>
        <span aria-hidden="true">·</span><span>אורחים: {counts.guests}</span>
        <span aria-hidden="true">·</span><span className="text-red-700">לא מגיעים: {counts.declining}</span>
        {counts.unmappedAttending > 0 && (<><span aria-hidden="true">·</span><span className="font-semibold text-amber-800">ממתינים לזיהוי: {counts.unmappedAttending}</span></>)}
      </div>

      {showLinkModal && (
        <VoterLinkModal voters={summary.voters} people={people} onLink={onLinkVoter} onAddGuest={async (v, persist) => { await onAddGuest(v, persist); }} onClose={() => setShowLinkModal(false)} />
      )}
      {showRosterModal && (
        <WhatsAppRosterModal activeClub={activeClub} linkedGroups={linkedGroups} mappings={mappings} people={people} syncCandidates={syncCandidates} onConfirmCandidate={onConfirmCandidate} onImportEntries={onImportRoster} onUpdatePersonRole={onUpdatePersonRole} onClose={() => setShowRosterModal(false)} />
      )}
    </div>
  );
};
