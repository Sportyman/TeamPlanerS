import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWhatsAppPolls } from '../../hooks/useWhatsAppPolls';
import { useAppStore } from '../../store';
import { usePermissions } from '../../hooks/usePermissions';
import { ClubGroupPairingCard } from './ClubGroupPairingCard';
import { PollSelectorDropdown } from './PollSelectorDropdown';
import { VoteAlertsBanner } from './VoteAlertsBanner';
import { PollSummaryTab } from './PollSummaryTab';
import { VoterMappingTab } from './VoterMappingTab';
import { WhatsAppSettingsTab } from './WhatsAppSettingsTab';
import { formatFirestoreErrorMessage } from '../../services/whatsapp/pollFormatting';
import { ArrowRight, Calendar, Download, RefreshCw } from 'lucide-react';
import { forceFullSync } from '../../services/syncService';

type TabId = 'SUMMARY' | 'MAPPING' | 'SETTINGS';

export const WhatsAppDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeClub, clubs, sessions, toggleAttendance } = useAppStore();
  const { isClubAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabId>('SUMMARY');

  const {
    polls, activePoll, setSelectedPollId, summary, clubConfig, clubPeople, mappings, syncCandidates,
    availableGroups, voteAlerts, dismissAlert, clearAlerts, isLoading, error, retry,
    applyPollAttendance, linkVoterToPerson, confirmSyncCandidate, importRosterMembers,
    unlinkVoter, addGuestFromVoter, saveConfig, setPollColor, linkClubGroup, updateMemberRole,
  } = useWhatsAppPolls();

  const presentIds = activeClub ? sessions[activeClub]?.presentPersonIds || [] : [];
  const clubName = clubs.find((c) => c.id === activeClub)?.label || activeClub || 'החוג';

  const handleRefresh = () => {
    forceFullSync(user?.uid, activeClub);
    retry();
  };

  const handleUnlinkGroup = async (groupName: string) => {
    if (!activeClub) return;
    await saveConfig({
      ...clubConfig,
      clubId: activeClub,
      linkedGroups: clubConfig.linkedGroups.filter((g) => g !== groupName),
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 pb-20">
      <header className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate(isClubAdmin ? '/app/manage' : '/app')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 min-h-[44px] pl-2"
          >
            <ArrowRight size={16} />
            <span>{isClubAdmin ? 'חזרה לניהול החוג' : 'חזרה לאימון'}</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap min-h-[44px]"
          >
            <RefreshCw size={15} />
            <span>רענן סנכרון</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">ניהול וואטסאפ וסקרים</h1>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{clubName}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            {summary && summary.attendingPersonIds.length > 0 && (
              <button
                type="button"
                onClick={() => { applyPollAttendance('MERGE'); navigate('/app?step=1'); }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap min-h-[48px]"
              >
                <Download size={16} />
                <span>טען לנוכחות ועבור לאימון ({summary.attendingPersonIds.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/app?step=1')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 whitespace-nowrap min-h-[44px]"
            >
              <Calendar size={16} />
              <span>מסך נוכחות</span>
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="border border-red-200 bg-red-50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-red-900">
          <div className="min-w-0">
            <div className="font-bold">שגיאה בטעינת נתוני הסקרים מ-Firestore.</div>
            <div className="text-xs text-red-700 font-mono mt-0.5 break-all" dir="ltr">{formatFirestoreErrorMessage(error)}</div>
          </div>
          <button type="button" onClick={retry} className="px-4 py-2 rounded-xl bg-white border border-red-200 text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px] shrink-0">
            <RefreshCw size={14} /> נסה שוב
          </button>
        </div>
      )}

      {!isLoading && activeClub && (
        <ClubGroupPairingCard
          clubName={clubName}
          linkedGroups={clubConfig.linkedGroups}
          availableGroups={availableGroups}
          onLinkGroup={linkClubGroup}
          onUnlinkGroup={handleUnlinkGroup}
          onRefresh={handleRefresh}
        />
      )}

      {!isLoading && polls.length > 0 && activePoll && (
        <div className="border border-slate-200 rounded-2xl bg-white p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <PollSelectorDropdown polls={polls} activePoll={activePoll} onSelectPoll={setSelectedPollId} onChangeColor={setPollColor} />
            {summary && (
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-600 tabular-nums">
                <span className="font-bold text-emerald-700">מגיעים: {summary.counts.totalAttending}</span>
                <span aria-hidden="true">·</span>
                <span>מתנדבים: {summary.counts.volunteers + summary.counts.instructors}</span>
                <span aria-hidden="true">·</span>
                <span>חברים: {summary.counts.members}</span>
                <span aria-hidden="true">·</span>
                <span>אורחים: {summary.counts.guests}</span>
                {summary.counts.skippers > 0 && (<><span aria-hidden="true">·</span><span className="font-semibold text-blue-700">מפקדי סירה: {summary.counts.skippers}</span></>)}
                <span aria-hidden="true">·</span>
                <span className="text-red-700">לא מגיעים: {summary.counts.declining}</span>
              </div>
            )}
          </div>
          <VoteAlertsBanner alerts={voteAlerts} presentIds={presentIds} onTogglePerson={toggleAttendance} onDismiss={dismissAlert} onClearAll={clearAlerts} />
        </div>
      )}

      <nav aria-label="לשוניות וואטסאפ" className="grid grid-cols-3 sm:inline-grid sm:grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
        <button type="button" onClick={() => setActiveTab('SUMMARY')} className={`px-2 sm:px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap min-h-[44px] ${activeTab === 'SUMMARY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>סקר ומצביעים</button>
        <button type="button" onClick={() => setActiveTab('MAPPING')} className={`px-2 sm:px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap min-h-[44px] tabular-nums ${activeTab === 'MAPPING' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>שיוך ({mappings.length})</button>
        <button type="button" onClick={() => setActiveTab('SETTINGS')} className={`px-2 sm:px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap min-h-[44px] ${activeTab === 'SETTINGS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>הגדרות</button>
      </nav>

      {isLoading ? (
        <div className="border border-slate-200 rounded-2xl bg-white p-8 animate-pulse space-y-3">
          <div className="h-5 w-48 bg-slate-100 rounded" />
          <div className="h-24 w-full bg-slate-100 rounded" />
        </div>
      ) : (
        <>
          {activeTab === 'SUMMARY' && summary && (
            <PollSummaryTab summary={summary} people={clubPeople} voteAlerts={voteAlerts} onLinkVoter={linkVoterToPerson} onAddGuest={addGuestFromVoter} onUpdatePersonRole={updateMemberRole} />
          )}
          {activeTab === 'SUMMARY' && !summary && (
            <div className="border border-slate-200 rounded-2xl bg-white p-6 sm:p-8 text-center text-sm text-slate-500">
              {clubConfig.linkedGroups.length === 0
                ? 'לאחר ציוות קבוצת הוואטסאפ של החוג למעלה, הסקרים האחרונים יופיעו כאן אוטומטית.'
                : 'עדיין לא נקלטו סקרים מקבוצת הוואטסאפ של חוג זה.'}
            </div>
          )}
          {activeTab === 'MAPPING' && activeClub && (
            <VoterMappingTab
              activeClub={activeClub} linkedGroups={clubConfig.linkedGroups} availableGroups={availableGroups}
              voters={summary?.voters || []} mappings={mappings} people={clubPeople} syncCandidates={syncCandidates}
              onLinkVoter={linkVoterToPerson} onUnlinkVoter={unlinkVoter} onAddGuest={addGuestFromVoter}
              onConfirmCandidate={confirmSyncCandidate} onImportRoster={importRosterMembers}
              onUpdatePersonRole={updateMemberRole} onLinkGroup={linkClubGroup}
            />
          )}
          {activeTab === 'SETTINGS' && (
            <WhatsAppSettingsTab config={clubConfig} availableGroups={availableGroups} onSave={saveConfig} />
          )}
        </>
      )}
    </div>
  );
};
