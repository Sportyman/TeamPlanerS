import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWhatsAppPolls } from '../../hooks/useWhatsAppPolls';
import { useAppStore } from '../../store';
import { usePermissions } from '../../hooks/usePermissions';
import { PollSelectorDropdown } from './PollSelectorDropdown';
import { VoteAlertsBanner } from './VoteAlertsBanner';
import { PollSummaryTab } from './PollSummaryTab';
import { VoterMappingTab } from './VoterMappingTab';
import { WhatsAppSettingsTab } from './WhatsAppSettingsTab';
import { formatFirestoreErrorMessage } from '../../services/whatsapp/pollFormatting';
import { ArrowRight, Calendar, Download, RefreshCw } from 'lucide-react';

type TabId = 'SUMMARY' | 'MAPPING' | 'SETTINGS';

export const WhatsAppDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { activeClub, sessions, toggleAttendance } = useAppStore();
  const { isClubAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabId>('SUMMARY');

  const {
    polls, activePoll, setSelectedPollId, summary, clubConfig, clubPeople, mappings,
    availableGroups, voteAlerts, dismissAlert, clearAlerts, isLoading, error, retry,
    applyPollAttendance, linkVoterToPerson, unlinkVoter, addGuestFromVoter, saveConfig, setPollColor,
  } = useWhatsAppPolls();

  const presentIds = activeClub ? sessions[activeClub]?.presentPersonIds || [] : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <button type="button" onClick={() => navigate(isClubAdmin ? '/app/manage' : '/app')} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800">
            <ArrowRight size={15} />
            <span>{isClubAdmin ? 'חזרה לניהול החוג' : 'חזרה לאימון'}</span>
          </button>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">סקרי וואטסאפ ומיפוי משתתפים</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {summary && summary.attendingPersonIds.length > 0 && (
            <button type="button" onClick={() => { applyPollAttendance('MERGE'); navigate('/app?step=1'); }} className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 whitespace-nowrap min-h-[44px]">
              <Download size={15} />
              <span>טען לנוכחות ועבור לאימון ({summary.attendingPersonIds.length})</span>
            </button>
          )}
          <button type="button" onClick={() => navigate('/app?step=1')} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-2 whitespace-nowrap min-h-[44px]">
            <Calendar size={15} />
            <span>מסך נוכחות</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 rounded-xl p-4 flex items-center justify-between gap-4 text-sm text-red-900 flex-wrap">
          <div className="min-w-0">
            <div className="font-bold">שגיאה בטעינת נתוני הסקרים מ-Firestore.</div>
            <div className="text-xs text-red-700 font-mono mt-0.5 break-all" dir="ltr">{formatFirestoreErrorMessage(error)}</div>
          </div>
          <button type="button" onClick={retry} className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-xs font-bold flex items-center gap-1">
            <RefreshCw size={14} /> נסה שוב
          </button>
        </div>
      )}

      {!isLoading && polls.length > 0 && activePoll && (
        <div className="border border-slate-200 rounded-2xl bg-white p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <PollSelectorDropdown polls={polls} activePoll={activePoll} onSelectPoll={setSelectedPollId} onChangeColor={setPollColor} />
            {summary && (
              <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600 tabular-nums">
                <span className="font-bold text-emerald-700">מגיעים: {summary.counts.totalAttending}</span>
                <span aria-hidden="true">·</span>
                <span>מתנדבים: {summary.counts.volunteers + summary.counts.instructors}</span>
                <span aria-hidden="true">·</span>
                <span>חברים: {summary.counts.members}</span>
                <span aria-hidden="true">·</span>
                <span>אורחים: {summary.counts.guests}</span>
                <span aria-hidden="true">·</span>
                <span className="text-red-700">לא מגיעים: {summary.counts.declining}</span>
              </div>
            )}
          </div>
          <VoteAlertsBanner alerts={voteAlerts} presentIds={presentIds} onTogglePerson={toggleAttendance} onDismiss={dismissAlert} onClearAll={clearAlerts} />
        </div>
      )}

      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button type="button" onClick={() => setActiveTab('SUMMARY')} className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap ${activeTab === 'SUMMARY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>סיכום סקר ומצביעים</button>
        <button type="button" onClick={() => setActiveTab('MAPPING')} className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap ${activeTab === 'MAPPING' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>שיוך מצביעים ({mappings.length})</button>
        <button type="button" onClick={() => setActiveTab('SETTINGS')} className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap ${activeTab === 'SETTINGS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>הגדרות קבוצות ומילות מפתח</button>
      </div>

      {isLoading ? (
        <div className="border border-slate-200 rounded-2xl bg-white p-8 animate-pulse space-y-3">
          <div className="h-5 w-48 bg-slate-100 rounded" />
          <div className="h-24 w-full bg-slate-100 rounded" />
        </div>
      ) : (
        <>
          {activeTab === 'SUMMARY' && summary && (
            <PollSummaryTab summary={summary} people={clubPeople} voteAlerts={voteAlerts} onLinkVoter={linkVoterToPerson} onAddGuest={addGuestFromVoter} />
          )}
          {activeTab === 'SUMMARY' && !summary && (
            <div className="border border-slate-200 rounded-2xl bg-white p-10 text-center text-sm text-slate-500">
              עדיין לא נקלטו סקרים ב-Firestore. ברגע שסקר יישלח בקבוצת הוואטסאפ המקושרת הוא יופיע כאן.
            </div>
          )}
          {activeTab === 'MAPPING' && (
            <VoterMappingTab voters={summary?.voters || []} mappings={mappings} people={clubPeople} onLinkVoter={linkVoterToPerson} onUnlinkVoter={unlinkVoter} onAddGuest={addGuestFromVoter} />
          )}
          {activeTab === 'SETTINGS' && (
            <WhatsAppSettingsTab config={clubConfig} availableGroups={availableGroups} onSave={saveConfig} />
          )}
        </>
      )}
    </div>
  );
};
