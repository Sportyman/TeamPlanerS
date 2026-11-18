import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { usePermissions } from '../hooks/usePermissions';
import { useWhatsAppPolls } from '../hooks/useWhatsAppPolls';
import { ClubGroupPairingCard } from '../components/whatsapp/ClubGroupPairingCard';
import { UnmatchedPollsNotice } from '../components/whatsapp/UnmatchedPollsNotice';
import { PollManageModal } from '../components/whatsapp/PollManageModal';
import { formatFirestoreErrorMessage } from '../services/whatsapp/pollFormatting';
import { forceFullSync } from '../services/syncService';
import { ArrowRight, Calendar, MessageSquare, RefreshCw } from 'lucide-react';

export const WhatsAppGroupPairingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, activeClub, clubs } = useAppStore();
  const { isClubAdmin } = usePermissions();
  const [showManageModal, setShowManageModal] = useState(false);
  const {
    unmatchedPolls,
    groupCatalog,
    linkedGroupItems,
    isLoading,
    error,
    retry,
    linkClubGroup,
    unlinkClubGroup,
    pollManageActions,
  } = useWhatsAppPolls();

  const currentClubObj = clubs.find((c) => c.id === activeClub);
  const clubName = currentClubObj?.label || activeClub || 'החוג';

  const handleRefresh = () => {
    forceFullSync(user?.uid, activeClub);
    retry();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20">
      <header className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/app/whatsapp')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 min-h-[44px] pl-2"
            >
              <ArrowRight size={16} />
              <span>חזרה לניהול וואטסאפ</span>
            </button>
            {isClubAdmin && (
              <button
                type="button"
                onClick={() => navigate('/app/manage')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900 min-h-[44px] px-2"
              >
                ניהול חוג
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap min-h-[44px]"
          >
            <RefreshCw size={15} />
            <span>רענן רשימה</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              שיוך קבוצת וואטסאפ לחוג
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">חוג פעיל: {clubName}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/app/whatsapp')}
              className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-1.5 min-h-[44px]"
            >
              <MessageSquare size={15} />
              <span>מעבר לסקרים</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/app?step=1')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 min-h-[44px]"
            >
              <Calendar size={15} />
              <span>מסך נוכחות</span>
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="border border-red-200 bg-red-50 rounded-xl p-4 flex items-center justify-between gap-3 text-sm text-red-900">
          <div className="min-w-0">
            <div className="font-bold">שגיאה בטעינת קבוצות וואטסאפ.</div>
            <div className="text-xs text-red-700 font-mono mt-0.5 break-all" dir="ltr">
              {formatFirestoreErrorMessage(error)}
            </div>
          </div>
          <button
            type="button"
            onClick={retry}
            className="px-3.5 py-2 rounded-xl bg-white border border-red-200 text-xs font-bold shrink-0 min-h-[40px]"
          >
            נסה שוב
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="border border-slate-200 rounded-2xl bg-white p-8 animate-pulse space-y-3">
          <div className="h-5 w-48 bg-slate-100 rounded" />
          <div className="h-28 w-full bg-slate-100 rounded" />
        </div>
      ) : (
        <div className="space-y-4">
          {activeClub && (
            <ClubGroupPairingCard
              clubName={clubName}
              linkedItems={linkedGroupItems}
              groupCatalog={groupCatalog}
              alwaysOpen
              onLinkGroup={linkClubGroup}
              onUnlinkGroup={unlinkClubGroup}
              onRefresh={handleRefresh}
            />
          )}
          {unmatchedPolls.length > 0 && (
            <UnmatchedPollsNotice
              unmatchedPolls={unmatchedPolls}
              onLinkGroup={linkClubGroup}
              pollManage={pollManageActions}
              onOpenManage={() => setShowManageModal(true)}
            />
          )}
          {showManageModal && <PollManageModal manage={pollManageActions} onClose={() => setShowManageModal(false)} />}
        </div>
      )}
    </div>
  );
};
