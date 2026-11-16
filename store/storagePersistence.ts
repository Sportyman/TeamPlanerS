import type { AppState } from './store';
import type { SessionState } from '../types';

export const STORE_STORAGE_KEY = 'etgarim-storage';
export const STORE_PERSIST_VERSION = 49;

const sanitizeSessionsForStorage = (
  sessions: Record<string, SessionState> | undefined
): Record<string, SessionState> => {
  if (!sessions || typeof sessions !== 'object') return {};
  const cleaned: Record<string, SessionState> = {};
  Object.entries(sessions).forEach(([clubId, sess]) => {
    cleaned[clubId] = {
      inventory: sess?.inventory && typeof sess.inventory === 'object' ? sess.inventory : {},
      presentPersonIds: [],
      teams: [],
    };
  });
  return cleaned;
};

export const partializeAppState = (state: AppState) => ({
  activeClub: state.activeClub,
  clubSettings: state.clubSettings,
  sessions: sanitizeSessionsForStorage(state.sessions),
});

export const migratePersistedAppState = (persistedState: unknown): Partial<AppState> => {
  const raw = (persistedState as Partial<AppState> | null) || {};
  return {
    activeClub: typeof raw.activeClub === 'string' ? raw.activeClub : null,
    clubSettings: raw.clubSettings && typeof raw.clubSettings === 'object' ? raw.clubSettings : undefined,
    sessions: sanitizeSessionsForStorage(raw.sessions),
  };
};

export const clearSensitiveBrowserStorage = (): void => {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('teamplaner_poll_sync_v1_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore storage access errors in restricted frames
  }
};
