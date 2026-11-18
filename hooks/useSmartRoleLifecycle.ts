import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ClubID, Person, Role, getRoleLabel } from '../types';
import { ResolvedPollSummary } from '../types/whatsapp';
import { AddNotificationOptions, NotificationAction } from '../store/slices/createNotificationSlice';
import { getRoleStreakSuggestion, RoleStreakSuggestion } from '../services/activityHistoryService';
import { dismissRoleStreakPrompt, promoteClubBaseRole } from '../services/roleStreakService';
import { updateClubPersonRole } from '../services/whatsapp/whatsappMutations';
import { addLog } from '../services/syncService';
import { useAppStore } from '../store';

interface UseSmartRoleLifecycleParams {
  activeClub: ClubID | null;
  clubPeople: Person[];
  summary: ResolvedPollSummary | null;
  onNotify: (msg: string, type?: 'INFO' | 'SUCCESS' | 'WARN', action?: NotificationAction, options?: AddNotificationOptions) => void;
}

export const useSmartRoleLifecycle = ({
  activeClub,
  clubPeople,
  summary,
  onNotify,
}: UseSmartRoleLifecycleParams) => {
  const attemptedFirstRoleRef = useRef<Set<string>>(new Set());
  const notifiedStreakRef = useRef<Set<string>>(new Set());

  // 1. First poll vote sets the participant's initial base role in this club (if UNASSIGNED)
  useEffect(() => {
    if (!activeClub || !summary) return;
    summary.voters.forEach((voter) => {
      const person = voter.person;
      const detectedRole = voter.pollRole;
      if (!person || person.isWhatsAppGroupOnly || person.role !== Role.UNASSIGNED) return;
      if (!detectedRole || detectedRole === Role.UNASSIGNED) return;

      const key = `${activeClub}:${person.id}`;
      if (attemptedFirstRoleRef.current.has(key)) return;
      attemptedFirstRoleRef.current.add(key);

      updateClubPersonRole(activeClub, person, detectedRole, voter.detectedIsSkipper || person.isSkipper)
        .then((updated) => {
          const current = useAppStore.getState().people;
          useAppStore.getState().setPeople(
            current.map((p) => (p.clubId === activeClub && p.id === updated.id ? updated : p))
          );
          addLog(`Locked initial club base role for ${person.name} (${activeClub}) -> ${detectedRole}`, 'STATE');
          onNotify(
            `נקבע תואר ראשוני בחוג ל${person.name}: ${getRoleLabel(detectedRole, person.gender)}`,
            'INFO',
            { to: `/app/manage?view=PEOPLE&highlight=${encodeURIComponent(person.id)}`, label: 'צפה בכרטיס' }
          );
        })
        .catch(() => {});
    });
  }, [activeClub, summary, onNotify]);

  // 2. Detect 7+ consecutive activities with a different role -> suggest base role update to admin
  const roleSuggestions = useMemo<RoleStreakSuggestion[]>(() => {
    if (!activeClub) return [];
    return clubPeople
      .filter((p) => p.clubId === activeClub)
      .map((p) => getRoleStreakSuggestion(p, 7))
      .filter((s): s is RoleStreakSuggestion => Boolean(s));
  }, [activeClub, clubPeople]);

  useEffect(() => {
    if (!activeClub || roleSuggestions.length === 0) return;
    roleSuggestions.forEach((s) => {
      const sig = `${activeClub}:${s.person.id}:${s.suggestedRole}:${s.streakCount}`;
      if (notifiedStreakRef.current.has(sig)) return;
      notifiedStreakRef.current.add(sig);
      const roleLabel = getRoleLabel(s.suggestedRole, s.person.gender);
      onNotify(
        `דפוס חוזר: ${s.person.name} הגיע/ה ${s.streakCount} פעילויות רצופות כ${roleLabel} — לעדכן תואר קבוע?`,
        'WARN',
        { to: `/app/manage?view=PEOPLE&highlight=${encodeURIComponent(s.person.id)}`, label: 'לניהול משתתפים' },
        { dedupeKey: `streak:${sig}` }
      );
    });
  }, [activeClub, roleSuggestions, onNotify]);

  const acceptRoleSuggestion = useCallback(async (suggestion: RoleStreakSuggestion) => {
    if (!activeClub) return;
    await promoteClubBaseRole(activeClub, suggestion.person, suggestion.suggestedRole);
    const label = getRoleLabel(suggestion.suggestedRole, suggestion.person.gender);
    onNotify(`התואר הקבוע של ${suggestion.person.name} בחוג עודכן ל${label}`, 'SUCCESS');
  }, [activeClub, onNotify]);

  const dismissRoleSuggestion = useCallback(async (suggestion: RoleStreakSuggestion) => {
    if (!activeClub) return;
    await dismissRoleStreakPrompt(activeClub, suggestion.person, suggestion.suggestedRole, suggestion.streakCount);
    addLog(`Dismissed role streak suggestion for ${suggestion.person.name} (${activeClub})`, 'STATE', { suggestedRole: suggestion.suggestedRole, streakCount: suggestion.streakCount });
    onNotify(`התואר הקבוע של ${suggestion.person.name} נשאר ללא שינוי`, 'INFO');
  }, [activeClub, onNotify]);

  return { roleSuggestions, acceptRoleSuggestion, dismissRoleSuggestion };
};
