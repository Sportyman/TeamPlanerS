import React, { useMemo, useState } from 'react';
import { Person, Role, getRoleLabel } from '../../types';
import { CheckSquare, Square, Shield, ArrowDownAZ, ArrowUpNarrowWide, CheckCircle2, Circle, ShipWheel, ArrowLeft, UserPlus, TrendingUp, Search } from 'lucide-react';
import { PersonEditorModal } from '../dashboard/PersonEditorModal';
import { useAppStore } from '../../store';
import { addPersonToClubCloud } from '../../services/syncService';
import { useWhatsAppPolls } from '../../hooks/useWhatsAppPolls';
import { sortAttendancePeople } from '../../services/whatsapp/rosterMerge';
import { SessionPollBar } from '../whatsapp/SessionPollBar';
import { WhatsAppAvatar } from '../whatsapp/WhatsAppAvatar';

type SortType = 'ATTENDANCE' | 'ROLE' | 'NAME' | 'RANK';

interface AttendanceListProps {
  people: Person[];
  presentIds: string[];
  onToggle: (id: string) => void;
  onBulkSelect: (ids: string[]) => void;
  onNext: () => void;
}

export const AttendanceList: React.FC<AttendanceListProps> = ({
  people, presentIds, onToggle, onBulkSelect, onNext,
}) => {
  const { clubSettings, activeClub } = useAppStore();
  const [sortBy, setSortBy] = useState<SortType>('ATTENDANCE');
  const [search, setSearch] = useState('');
  const [isAddingQuickly, setIsAddingQuickly] = useState(false);

  const {
    polls, activePoll, setSelectedPollId, summary, clubConfig, availableGroups, effectiveClubPeople,
    mappings, syncCandidates, voteAlerts, dismissAlert, clearAlerts, isLoading: isPollLoading, error: pollError,
    retry: retryPolls, applyPollAttendance, linkVoterToPerson, addGuestFromVoter, linkClubGroup,
    confirmSyncCandidate, importRosterMembers, updateMemberRole,
  } = useWhatsAppPolls();

  const displayPeople = useMemo(() => {
    if (effectiveClubPeople.length > 0) return effectiveClubPeople;
    return people;
  }, [people, effectiveClubPeople]);

  const sortedPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? displayPeople.filter((p) => p.name.toLowerCase().includes(q) || (p.phone || '').includes(q))
      : displayPeople;
    const copy = [...filtered];
    switch (sortBy) {
      case 'NAME':
        return copy.sort((a, b) => a.name.localeCompare(b.name, 'he'));
      case 'RANK':
        return copy.sort((a, b) => (b.rank - a.rank) || a.name.localeCompare(b.name, 'he'));
      case 'ROLE':
        return copy.sort((a, b) => {
          const roleOrder = { [Role.INSTRUCTOR]: -1, [Role.VOLUNTEER]: 0, [Role.MEMBER]: 1, [Role.GUEST]: 2 };
          if (roleOrder[a.role] !== roleOrder[b.role]) return roleOrder[a.role] - roleOrder[b.role];
          return a.name.localeCompare(b.name, 'he');
        });
      default:
        return sortAttendancePeople(copy);
    }
  }, [displayPeople, search, sortBy]);

  const stats = {
    vols: displayPeople.filter((p) => presentIds.includes(p.id) && (p.role === Role.VOLUNTEER || p.role === Role.INSTRUCTOR)).length,
    mems: displayPeople.filter((p) => presentIds.includes(p.id) && p.role === Role.MEMBER).length,
    skippers: displayPeople.filter((p) => presentIds.includes(p.id) && p.isSkipper).length,
  };

  const getCardStyle = (role: Role, isPresent: boolean) => {
    const base = 'flex items-center justify-between gap-3 p-3.5 rounded-2xl border text-right transition-all duration-200 select-none shadow-sm group';
    if (!isPresent) return `${base} border-slate-200 bg-white text-slate-600 hover:border-slate-300 opacity-85 hover:opacity-100`;
    switch (role) {
      case Role.INSTRUCTOR: return `${base} border-cyan-500 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-500/20`;
      case Role.VOLUNTEER: return `${base} border-orange-500 bg-orange-50 text-orange-900 ring-2 ring-orange-500/20`;
      case Role.MEMBER: return `${base} border-sky-500 bg-sky-50 text-sky-900 ring-2 ring-sky-500/20`;
      default: return `${base} border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20`;
    }
  };

  const boatDefs = activeClub ? (clubSettings[activeClub]?.boatDefinitions || []) : [];

  const handleQuickSave = async (p: Person) => {
    if (activeClub) {
      await addPersonToClubCloud(activeClub, p);
      setIsAddingQuickly(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6">
      <SessionPollBar
        activeClub={activeClub || ''} polls={polls} activePoll={activePoll} summary={summary} people={displayPeople}
        presentIds={presentIds} linkedGroups={clubConfig.linkedGroups} availableGroups={availableGroups}
        mappings={mappings} syncCandidates={syncCandidates} voteAlerts={voteAlerts}
        isLoading={isPollLoading} error={pollError} onSelectPoll={setSelectedPollId} onLinkGroup={linkClubGroup}
        onApplyAttendance={applyPollAttendance} onTogglePerson={onToggle} onLinkVoter={linkVoterToPerson}
        onAddGuest={addGuestFromVoter} onConfirmCandidate={confirmSyncCandidate} onImportRoster={importRosterMembers}
        onUpdatePersonRole={updateMemberRole} onDismissAlert={dismissAlert} onClearAlerts={clearAlerts} onRetry={retryPolls}
      />

      <div className="flex flex-col gap-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
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
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 flex-wrap">
            <span>מיון:</span>
            <button onClick={() => setSortBy('ATTENDANCE')} className={`px-3 py-1.5 rounded-lg border flex items-center gap-1 transition-all ${sortBy === 'ATTENDANCE' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><TrendingUp size={12} /> תדירות וא-ב</button>
            <button onClick={() => setSortBy('NAME')} className={`px-3 py-1.5 rounded-lg border flex items-center gap-1 transition-all ${sortBy === 'NAME' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><ArrowDownAZ size={12} /> א-ב</button>
            <button onClick={() => setSortBy('ROLE')} className={`px-3 py-1.5 rounded-lg border flex items-center gap-1 transition-all ${sortBy === 'ROLE' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><Shield size={12} /> תפקיד</button>
            <button onClick={() => setSortBy('RANK')} className={`px-3 py-1.5 rounded-lg border flex items-center gap-1 transition-all ${sortBy === 'RANK' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 hover:bg-slate-50'}`}><ArrowUpNarrowWide size={12} /> דירוג</button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש חבר ברשימה..." className="w-full pr-8 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {sortedPeople.map((person) => {
          const isPresent = presentIds.includes(person.id);
          const pollStatus = summary?.personStatusMap[person.id];
          return (
            <button key={person.id} onClick={() => onToggle(person.id)} className={getCardStyle(person.role, isPresent)}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <WhatsAppAvatar name={person.name} src={person.photoURL} sizeClass="w-11 h-11 text-sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-base leading-tight truncate">{person.name}</span>
                    {person.isSkipper && <ShipWheel size={15} className={isPresent ? 'text-brand-600 shrink-0' : 'text-slate-400 shrink-0'} />}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] flex-wrap text-slate-600 tabular-nums">
                    <span className="font-bold">{getRoleLabel(person.role, person.gender)}</span>
                    {(person.attendanceCount || 0) > 0 && <span>· {person.attendanceCount} אימונים</span>}
                    {person.isWhatsAppGroupOnly && <span>· קבוצת וואטסאפ</span>}
                    {pollStatus && (
                      <span className={`font-bold ${pollStatus.intent === 'ATTENDING' ? 'text-emerald-700' : pollStatus.intent === 'DECLINING' ? 'text-red-700' : 'text-amber-700'}`}>
                        · {pollStatus.intent === 'ATTENDING' ? 'אישר בסקר' : pollStatus.intent === 'DECLINING' ? 'לא מגיע' : 'אולי'}
                        {pollStatus.updatedRecently ? ' (שונה)' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="shrink-0">
                {isPresent ? <CheckCircle2 className="text-brand-600" size={28} /> : <Circle className="text-slate-300" size={28} />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={onNext} disabled={presentIds.length === 0} className="w-full md:w-auto bg-brand-600 disabled:opacity-50 hover:bg-brand-500 text-white px-10 py-4 rounded-2xl font-black text-xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95">
          הבא: ציוד <ArrowLeft size={24} />
        </button>
      </div>

      {isAddingQuickly && (
        <PersonEditorModal allPeople={displayPeople} boatDefinitions={boatDefs} onClose={() => setIsAddingQuickly(false)} onSave={handleQuickSave} />
      )}
    </div>
  );
};
