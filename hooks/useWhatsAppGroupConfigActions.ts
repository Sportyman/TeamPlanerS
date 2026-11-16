import { useCallback, useEffect, useRef } from 'react';
import { ClubID } from '../types';
import { ClubWhatsAppConfig } from '../types/whatsapp';
import {
  buildLinkGroupConfigPatch,
  buildUnlinkGroupConfigPatch,
  computeGroupConfigSyncPatch,
  WhatsAppGroupEntry,
} from '../services/whatsapp/groupCatalog';
import { saveClubWhatsAppConfig } from '../services/whatsapp/whatsappMutations';

interface UseWhatsAppGroupConfigActionsParams {
  activeClub: ClubID | null;
  userId?: string;
  isDev?: boolean;
  isLoading: boolean;
  clubConfig: ClubWhatsAppConfig;
  groupCatalog: WhatsAppGroupEntry[];
  onNotify: (msg: string, type?: 'INFO' | 'SUCCESS' | 'WARN') => void;
}

export const useWhatsAppGroupConfigActions = ({
  activeClub,
  userId,
  isDev,
  isLoading,
  clubConfig,
  groupCatalog,
  onNotify,
}: UseWhatsAppGroupConfigActionsParams) => {
  const syncedConfigKeyRef = useRef<string>('');

  useEffect(() => {
    if (!activeClub || !userId || isDev || isLoading) return;
    const patch = computeGroupConfigSyncPatch(clubConfig, groupCatalog);
    if (!patch) return;
    const sig = `${activeClub}|${(patch.linkedGroupIds || []).join(',')}|${patch.linkedGroups.join(',')}`;
    if (syncedConfigKeyRef.current === sig) return;
    syncedConfigKeyRef.current = sig;
    saveClubWhatsAppConfig({ ...patch, clubId: activeClub }).catch(() => {});
  }, [activeClub, userId, isDev, isLoading, clubConfig, groupCatalog]);

  const linkClubGroup = useCallback(async (groupInput: string) => {
    if (!activeClub || !groupInput.trim()) return;
    const { nextConfig, displayName } = buildLinkGroupConfigPatch(clubConfig, groupInput, groupCatalog);
    await saveClubWhatsAppConfig({ ...nextConfig, clubId: activeClub });
    onNotify(`קבוצת "${displayName}" שויכה לחוג`, 'SUCCESS');
  }, [activeClub, clubConfig, groupCatalog, onNotify]);

  const unlinkClubGroup = useCallback(async (groupKeyOrName: string) => {
    if (!activeClub || !groupKeyOrName.trim()) return;
    const nextConfig = buildUnlinkGroupConfigPatch(clubConfig, groupKeyOrName, groupCatalog);
    await saveClubWhatsAppConfig({ ...nextConfig, clubId: activeClub });
    onNotify('ציוות הקבוצה הוסר מהחוג', 'INFO');
  }, [activeClub, clubConfig, groupCatalog, onNotify]);

  const saveConfig = useCallback(async (nextConfig: ClubWhatsAppConfig) => {
    await saveClubWhatsAppConfig(nextConfig);
    onNotify('הגדרות וואטסאפ של החוג נשמרו', 'SUCCESS');
  }, [onNotify]);

  const setPollColor = useCallback(async (pollId: string, colorId: string) => {
    if (!activeClub) return;
    await saveClubWhatsAppConfig({
      ...clubConfig,
      clubId: activeClub,
      pollColors: { ...(clubConfig.pollColors || {}), [pollId]: colorId },
    });
  }, [activeClub, clubConfig]);

  return { linkClubGroup, unlinkClubGroup, saveConfig, setPollColor };
};
