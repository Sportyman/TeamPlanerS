import { useCallback } from 'react';
import { ClubID } from '../types';
import { ClubWhatsAppConfig, PollEvent } from '../types/whatsapp';
import { deleteWhatsAppPollsBatch } from '../services/whatsapp/pollDeleteService';
import { saveClubWhatsAppConfig } from '../services/whatsapp/whatsappMutations';
import { addLog } from '../services/syncService';

interface UsePollDeleteActionsParams {
  activeClub: ClubID | null;
  clubConfig: ClubWhatsAppConfig;
  onNotify: (msg: string, type?: 'INFO' | 'SUCCESS' | 'WARN') => void;
}

export const usePollDeleteActions = ({
  activeClub,
  clubConfig,
  onNotify,
}: UsePollDeleteActionsParams) => {
  const hidePollsFromSite = useCallback(async (pollsToHide: PollEvent[]) => {
    if (!activeClub || pollsToHide.length === 0) return;
    const hideIds = new Set(pollsToHide.map((p) => p.pollId));
    const nextHidden = Array.from(new Set([...(clubConfig.hiddenPollIds || []), ...hideIds]));
    const clearActive = clubConfig.activePollId && hideIds.has(clubConfig.activePollId);

    await saveClubWhatsAppConfig({
      ...clubConfig,
      clubId: activeClub,
      hiddenPollIds: nextHidden,
      activePollId: clearActive ? undefined : clubConfig.activePollId,
    });

    addLog(`Hidden ${pollsToHide.length} poll(s) from site view only (kept in Firebase)`, 'SYNC');
    onNotify(
      pollsToHide.length === 1
        ? `הסקר "${pollsToHide[0].question}" הוסר מהאתר ונשמר בתיעוד ב-Firebase`
        : `${pollsToHide.length} סקרים הוסרו מהאתר ונשמרו בתיעוד ב-Firebase`,
      'INFO'
    );
  }, [activeClub, clubConfig, onNotify]);

  const restoreHiddenPolls = useCallback(async (pollIds: string[]) => {
    if (!activeClub || pollIds.length === 0) return;
    const restoreSet = new Set(pollIds);
    const nextHidden = (clubConfig.hiddenPollIds || []).filter((id) => !restoreSet.has(id));

    await saveClubWhatsAppConfig({
      ...clubConfig,
      clubId: activeClub,
      hiddenPollIds: nextHidden,
    });

    addLog(`Restored ${pollIds.length} archived poll(s) to site view`, 'SYNC');
    onNotify(
      pollIds.length === 1 ? 'הסקר הוחזר לתצוגה באתר' : `${pollIds.length} סקרים הוחזרו לתצוגה באתר`,
      'SUCCESS'
    );
  }, [activeClub, clubConfig, onNotify]);

  const deletePollsPermanently = useCallback(async (pollsToDelete: PollEvent[]) => {
    if (pollsToDelete.length === 0) return;
    await deleteWhatsAppPollsBatch(pollsToDelete);

    if (activeClub) {
      const deletedSet = new Set(pollsToDelete.map((p) => p.pollId));
      const nextHidden = (clubConfig.hiddenPollIds || []).filter((id) => !deletedSet.has(id));
      const nextColors = { ...(clubConfig.pollColors || {}) };
      const nextOverrides = { ...(clubConfig.pollRoleOverrides || {}) };
      let changedConfig = nextHidden.length !== (clubConfig.hiddenPollIds || []).length;

      deletedSet.forEach((id) => {
        if (nextColors[id]) { delete nextColors[id]; changedConfig = true; }
        if (nextOverrides[id]) { delete nextOverrides[id]; changedConfig = true; }
      });
      if (clubConfig.activePollId && deletedSet.has(clubConfig.activePollId)) {
        changedConfig = true;
      }

      if (changedConfig) {
        await saveClubWhatsAppConfig({
          ...clubConfig,
          clubId: activeClub,
          hiddenPollIds: nextHidden,
          pollColors: nextColors,
          pollRoleOverrides: nextOverrides,
          activePollId: clubConfig.activePollId && deletedSet.has(clubConfig.activePollId)
            ? undefined
            : clubConfig.activePollId,
        }).catch(() => {});
      }
    }

    onNotify(
      pollsToDelete.length === 1
        ? `הסקר "${pollsToDelete[0].question}" נמחק מהאתר ומ-Firebase`
        : `${pollsToDelete.length} סקרים נמחקו לצמיתות מהאתר ומ-Firebase`,
      'INFO'
    );
  }, [activeClub, clubConfig, onNotify]);

  return { hidePollsFromSite, restoreHiddenPolls, deletePollsPermanently };
};
