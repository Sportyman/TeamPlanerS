import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Person, Role } from '../../types';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { PersonEditorModal } from '../dashboard/PersonEditorModal';
import { useAppStore } from '../../store';
import { addPersonToClubCloud } from '../../services/syncService';
import { useWhatsAppPolls } from '../../hooks/useWhatsAppPolls';
import { sortAttendancePeople } from '../../services/whatsapp/rosterMerge';
import { SessionPollBar } from '../whatsapp/SessionPollBar';
import { VoteAlertsBanner } from '../whatsapp/VoteAlertsBanner';
import { RoleStreakSuggestionsBanner } from '../whatsapp/RoleStreakSuggestionsBanner';
import { AttendancePersonCard } from './AttendancePersonCard';
import { AttendanceToolbar, SortType } from './AttendanceToolbar';

type WhatsAppHookState = ReturnType<typeof useWhatsAppPolls>;

interface AttendanceListProps {
  people: Person[];
  presentIds: string[];
  whatsappState: WhatsAppHookState;
  onToggle: (id: string) => void;
  onBulkSelect: (ids: string[], label?: string) => void;
  onNext: () => void;
}

export const AttendanceList: React.FC<AttendanceListProps> = ({
  people, presentIds, whatsappState, onToggle, onBulkSelect, onNext,
}) => {
  const { clubSettings, activeClub, attendanceHistories, undoAttendance, addNotification } = useAppStore();
  const [sortBy, setSortBy] = useState<SortType>('ATTENDANCE');
  const [search, setSearch] = useState('');
  const [showUnchecked, setShowUnchecked] = useState(false);
  const [isAddingQuickly, setIsAddingQuickly] = useState(false);
  const [sectionFlash, setSectionFlash] = useState(false);
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());
  const prevAlertIdRef = useRef<string | null>(null);

  const {
    polls, unmatchedPolls, activePoll, setSelectedPollId, summary, clubConfig, availableGroups, effectiveClubPeople,
    mappings, syncCandidates, voteAlerts, dismissAlert, clearAlerts, isLoading: isPollLoading, error: pollError,
    retry: retryPolls, applyPollAttendance, linkVoterToPerson, addGuestFromVoter, linkClubGroup,
    confirmSyncCandidate, importRosterMembers, updateMemberRole, pollManageActions,
    roleSuggestions, acceptRoleSuggestion, dismissRoleSuggestion,
  } = whatsappState;

  useEffect(() => {
    const newestId = voteAlerts[0]?.id || null;
    if (!newestId) return;
    if (prevAlertIdRef.current === newestId) return;
    prevAlertIdRef.current = newestId;
    const ids = new Set(voteAlerts.slice(0, 4).map((a) => a.personId).filter((id): id is string => Boolean(id)));
    setFlashIds(ids);
    setSectionFlash(true);
    const t = setTimeout(() => { setSectionFlash(false); setFlashIds(new Set()); }, 2000);
    return () => clearTimeout(t);
  }, [voteAlerts]);

  const displayPeople = useMemo(() => (effectiveClubPeople.length > 0 ? effectiveClubPeople : people), [people, effectiveClubPeople]);

  const sortList = (list: Person[]) => {
    const copy = [...list];
    if (sortBy === 'NAME') return copy.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    if (sortBy === 'RANK') return copy.sort((a, b) => (b.rank - a.rank) || a.name.localeCompare(b.name, 'he'));
    if (sortBy === 'ROLE') {
      const order: Record<Role, number> = { [Role.INSTRUCTOR]: 0, [Role.VOLUNTEER]: 1, [Role.MEMBER]: 2, [Role.GUEST]: 3, [Role.UNASSIGNED]: 4 };
      return copy.sort((a, b) => (order[a.role] - order[b.role]) || a.name.localeCompare(b.name, 'he'));
    }
    return sortAttendancePeople(copy);
  };

  const { checkedPeople, uncheckedPeople } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? displayPeople.filter((p) => p.name.toLowerCase().includes(q) || (p.phone || '').includes(q)) : displayPeople;
    const presentSet = new Set(presentIds);
    return { checkedPeople: sortList(filtered.filter((p) => presentSet.has(p.id))), uncheckedPeople: sortList(filtered.filter((p) => !presentSet.has(p.id))) };
  }, [displayPeople, search, presentIds, sortBy]);

  const isUncheckedVisible = showUnchecked || checkedPeople.length === 0 || search.trim().length > 0;
  const stats = {
    vols: displayPeople.filter((p) => presentIds.includes(p.id) && (p.role === Role.VOLUNTEER || p.role === Role.INSTRUCTOR)).length,
    mems: displayPeople.filter((p) => presentIds.includes(p.id) && p.role === Role.MEMBER).length,
    skippers: displayPeople.filter((p) => presentIds.includes(p.id) && p.isSkipper).length,
  };
  const boatDefs = activeClub ? (clubSettings[activeClub]?.boatDefinitions || []) : [];
  const clubHist = activeClub ? (attendanceHistories[activeClub] || []) : [];
  const lastUndoLabel = clubHist.length > 0 ? clubHist[clubHist.length - 1].label : undefined;

  const handleUndo = () => {
    const label = undoAttendance();
    if (label) addNotification(`בוטלה פעולה אחרונה: ${label}`, 'INFO');
  };

  const handleQuickSaveNew = async (p: Person) => {
    if (activeClub) { await addPersonToClubCloud(activeClub, p); setIsAddingQuickly(false); }
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
      <VoteAlertsBanner alerts={voteAlerts} presentIds={presentIds} onTogglePerson={onToggle} onDismiss={dismissAlert} onClearAll={clearAlerts} />

      <AttendanceToolbar
        stats={stats} presentCount={presentIds.length} totalCount={displayPeople.length}
        sortBy={sortBy} search={search} canUndo={clubHist.length > 0} undoLabel={lastUndoLabel}
        onSortChange={setSortBy} onSearchChange={setSearch} onAddQuick={() => setIsAddingQuickly(true)}
        onSelectAll={() => onBulkSelect(displayPeople.map((p) => p.id), 'בחירת כל המשתתפים')}
        onClearAll={() => onBulkSelect([], 'ניקוי כל הבחירות')} onUndo={handleUndo}
      />

      {checkedPeople.length > 0 && (
        <div className={`space-y-2.5 rounded-2xl p-3 -mx-3 transition-colors duration-700 ${sectionFlash ? 'bg-sky-100 border border-sky-300 shadow-xs' : 'border border-transparent'}`}>
          <div className="flex items-center justify-between gap-2 text-xs font-bold text-slate-500 tabular-nums">
            <span>מסומנים להיום ({checkedPeople.length})</span>
            {sectionFlash && <span className="text-sky-700 font-extrabold">עודכן אוטומטית מהסקר</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {checkedPeople.map((person) => (
              <AttendancePersonCard key={person.id} person={person} isPresent isLiveFlash={flashIds.has(person.id)} pollStatus={summary?.personStatusMap[person.id]} onToggle={onToggle} onQuickSave={updateMemberRole} />
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
                <AttendancePersonCard key={person.id} person={person} isPresent={false} isLiveFlash={flashIds.has(person.id)} pollStatus={summary?.personStatusMap[person.id]} onToggle={onToggle} onQuickSave={updateMemberRole} />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={onNext} disabled={presentIds.length === 0} className="w-full md:w-auto bg-brand-600 disabled:opacity-50 hover:bg-brand-500 text-white px-10 py-4 rounded-2xl font-black text-xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95">
          הבא: ציוד <ArrowLeft size={24} />
        </button>
      </div>

      {isAddingQuickly && <PersonEditorModal allPeople={displayPeople} boatDefinitions={boatDefs} onClose={() => setIsAddingQuickly(false)} onSave={handleQuickSaveNew} />}
    </div>
  );
};
