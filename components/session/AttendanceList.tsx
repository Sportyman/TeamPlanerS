import React, { useMemo, useState } from 'react';
import { Person, Role } from '../../types';
import { CheckSquare, Square, Shield, ArrowDownAZ, ArrowUpNarrowWide, ArrowLeft, UserPlus, TrendingUp, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { PersonEditorModal } from '../dashboard/PersonEditorModal';
import { useAppStore } from '../../store';
import { addPersonToClubCloud } from '../../services/syncService';
import { useWhatsAppPolls } from '../../hooks/useWhatsAppPolls';
import { sortAttendancePeople } from '../../services/whatsapp/rosterMerge';
import { SessionPollBar } from '../whatsapp/SessionPollBar';
import { VoteAlertsBanner } from '../whatsapp/VoteAlertsBanner';
import { RoleStreakSuggestionsBanner } from '../whatsapp/RoleStreakSuggestionsBanner';
import { AttendancePersonCard } from './AttendancePersonCard';

type SortType = 'ATTENDANCE' | 'ROLE' | 'NAME' | 'RANK';

type WhatsAppHookState = ReturnType<typeof useWhatsAppPolls>;

interface AttendanceListProps {
  people: Person[];
  presentIds: string[];
  whatsappState: WhatsAppHookState;
  onToggle: (id: string) => void;
  onBulkSelect: (ids: string[]) => void;
  onNext: () => void;
}

export const AttendanceList: React.FC<AttendanceListProps> = ({
  people, presentIds, whatsappState, onToggle, onBulkSelect, onNext,
}) => {
  const { clubSettings, activeClub } = useAppStore();
  const [sortBy, setSortBy] = useState<SortType>('ATTENDANCE');
  const [search, setSearch] = useState('');
  const [showUnchecked, setShowUnchecked] = useState(false);
  const [isAddingQuickly, setIsAddingQuickly] = useState(false);

  const {
    polls, unmatchedPolls, activePoll, setSelectedPollId, summary, clubConfig, availableGroups, effectiveClubPeople,
    mappings, syncCandidates, voteAlerts, dismissAlert, clearAlerts, isLoading: isPollLoading, error: pollError,
    retry: retryPolls, applyPollAttendance, linkVoterToPerson, addGuestFromVoter, linkClubGroup,
    confirmSyncCandidate, importRosterMembers, updateMemberRole, pollManageActions,
    roleSuggestions, acceptRoleSuggestion, dismissRoleSuggestion,
  } = whatsappState;

  const displayPeople = useMemo(
    () => (effectiveClubPeople.length > 0 ? effectiveClubPeople : people),
    [people, effectiveClubPeople]
  );

  const sortList = (list: Person[]) => {
    const copy = [...list];
    switch (sortBy) {
      case 'NAME':
        return copy.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      case 'RANK':
        return copy.sort((a, b) => (b.rank - a.rank) || a.name.localeCompare(b.name, 'he'));
      case 'ROLE': {
        const order: Record<Role, number> = {
          [Role.INSTRUCTOR]: 0, [Role.VOLUNTEER]: 1, [Role.MEMBER]: 2, [Role.GUEST]: 3, [Role.UNASSIGNED]: 4,
        };
        return copy.sort((a, b) => (order[a.role] - order[b.role]) || a.name.localeCompare(b.name, 'he'));
      }
      default:
        return sortAttendancePeople(copy);
    }
  };

  const { checkedPeople, uncheckedPeople } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? displayPeople.filter((p) => p.name.toLowerCase().includes(q) || (p.phone || '').includes(q))
      : displayPeople;
    const presentSet = new Set(presentIds);
    return {
      checkedPeople: sortList(filtered.filter((p) => presentSet.has(p.id))),
      uncheckedPeople: sortList(filtered.filter((p) => !presentSet.has(p.id))),
    };
  }, [displayPeople, search, presentIds, sortBy]);

  const isUncheckedVisible = showUnchecked || checkedPeople.length === 0 || search.trim().length > 0;

  const stats = {
    vols: displayPeople.filter((p) => presentIds.includes(p.id) && (p.role === Role.VOLUNTEER || p.role === Role.INSTRUCTOR)).length,
    mems: displayPeople.filter((p) => presentIds.includes(p.id) && p.role === Role.MEMBER).length,
    skippers: displayPeople.filter((p) => presentIds.includes(p.id) && p.isSkipper).length,
  };

  const boatDefs = activeClub ? (clubSettings[activeClub]?.boatDefinitions || []) : [];

  const handleQuickSaveNew = async (p: Person) => {
    if (activeClub) {
      await addPersonToClubCloud(activeClub, p);
      setIsAddingQuickly(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-5">
      <SessionPollBar
        activeClub={activeClub || ''} polls={polls} unmatchedPolls={unmatchedPolls} activePoll={activePoll} summary={summary} people={displayPeople}
        presentIds={presentIds} linkedGroups={clubConfig.linkedGroups} availableGroups={availableGroups}
        mappings={mappings} syncCandidates={syncCandidates} isLoading={isPollLoading} error={pollError}
        onSelectPoll={setSelectedPollId} onLinkGroup={linkClubGroup} onApplyAttendance={applyPollAttendance}
        onLinkVoter={linkVoterToPerson} onAddGuest={addGuestFromVoter} onConfirmCandidate={confirmSyncCandidate}
        onImportRoster={importRosterMembers} onUpdatePersonRole={updateMemberRole} pollManage={pollManageActions} onRetry={retryPolls}
      />
      <RoleStreakSuggestionsBanner suggestions={roleSuggestions} onAccept={acceptRoleSuggestion} onDismiss={dismissRoleSuggestion} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">מי הגיע היום?</h2>
              <button onClick={() => setIsAddingQuickly(true)} className="bg-brand-100 text-brand-700 px-3 py-2 rounded-xl hover:bg-brand-600 hover:text-white transition-all shadow-sm flex items-center gap-1.5 text-xs font-black">
                <UserPlus size={16} /> הוספת משתתף / אורח
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-bold text-slate-600 tabular-nums">
              <span className="text-orange-700">מתנדבים: {stats.vols}</span>
              <span aria-hidden="true">·</span>
              <span className="text-sky-700">חברים: {stats.mems}</span>
              {stats.skippers > 0 && (<><span aria-hidden="true">·</span><span className="text-blue-700">מפקדי סירה: {stats.skippers}</span></>)}
              <span aria-hidden="true">·</span>
              <span className="text-slate-900">סה"כ מסומנים: {presentIds.length} / {displayPeople.length}</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => onBulkSelect(displayPeople.map((p) => p.id))} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-sm"><CheckSquare size={16} /> בחר הכל</button>
            <button onClick={() => onBulkSelect([])} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-sm"><Square size={16} /> נקה</button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 flex-nowrap overflow-x-auto">
            <span className="shrink-0 ml-0.5">מיון:</span>
            <button onClick={() => setSortBy('ATTENDANCE')} title="מיון לפי תדירות הגעה וא-ב" className={`px-2 py-1.5 rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 transition-all ${sortBy === 'ATTENDANCE' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><TrendingUp size={12} /> תדירות</button>
            <button onClick={() => setSortBy('NAME')} className={`px-2 py-1.5 rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 transition-all ${sortBy === 'NAME' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><ArrowDownAZ size={12} /> א-ב</button>
            <button onClick={() => setSortBy('ROLE')} className={`px-2 py-1.5 rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 transition-all ${sortBy === 'ROLE' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><Shield size={12} /> תפקיד</button>
            <button onClick={() => setSortBy('RANK')} className={`px-2 py-1.5 rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 transition-all ${sortBy === 'RANK' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><ArrowUpNarrowWide size={12} /> דירוג</button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש חבר ברשימה..." className="w-full pr-8 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
          </div>
        </div>
      </div>

      {checkedPeople.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-slate-500 tabular-nums">מסומנים להיום ({checkedPeople.length})</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {checkedPeople.map((person) => (
              <AttendancePersonCard
                key={person.id} person={person} isPresent pollStatus={summary?.personStatusMap[person.id]}
                onToggle={onToggle} onQuickSave={updateMemberRole}
              />
            ))}
          </div>
        </div>
      )}

      {uncheckedPeople.length > 0 && (
        <div className="space-y-3">
          {checkedPeople.length > 0 && (
            <button type="button" onClick={() => setShowUnchecked((v) => !v)} className="w-full flex items-center gap-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 group">
              <div className="h-px bg-slate-200 flex-1 group-hover:bg-slate-300" />
              <span className="flex items-center gap-1 whitespace-nowrap tabular-nums">
                {isUncheckedVisible ? `הסתר משתתפים שלא אישרו הגעה (${uncheckedPeople.length})` : `משתתפים שלא אישרו הגעה (${uncheckedPeople.length})`}
                {isUncheckedVisible ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </span>
              <div className="h-px bg-slate-200 flex-1 group-hover:bg-slate-300" />
            </button>
          )}
          {isUncheckedVisible && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {uncheckedPeople.map((person) => (
                <AttendancePersonCard
                  key={person.id} person={person} isPresent={false} pollStatus={summary?.personStatusMap[person.id]}
                  onToggle={onToggle} onQuickSave={updateMemberRole}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <VoteAlertsBanner alerts={voteAlerts} presentIds={presentIds} onTogglePerson={onToggle} onDismiss={dismissAlert} onClearAll={clearAlerts} />

      <div className="mt-6 flex justify-end">
        <button onClick={onNext} disabled={presentIds.length === 0} className="w-full md:w-auto bg-brand-600 disabled:opacity-50 hover:bg-brand-500 text-white px-10 py-4 rounded-2xl font-black text-xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95">
          הבא: ציוד <ArrowLeft size={24} />
        </button>
      </div>

      {isAddingQuickly && (
        <PersonEditorModal allPeople={displayPeople} boatDefinitions={boatDefs} onClose={() => setIsAddingQuickly(false)} onSave={handleQuickSaveNew} />
      )}
    </div>
  );
};
