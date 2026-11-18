
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createAuthSlice, AuthSlice } from './slices/createAuthSlice';
import { createGlobalSlice, GlobalSlice } from './slices/createGlobalSlice';
import { createSessionSlice, SessionSlice } from './slices/createSessionSlice';
import { createPairingSlice, PairingSlice } from './slices/createPairingSlice';
import { createInviteSlice, InviteSlice } from './slices/createInviteSlice';
import { createNotificationSlice, NotificationSlice } from './slices/createNotificationSlice';
import { BoatDefinition, BoatInventory } from '../types';

export type AppState = AuthSlice & GlobalSlice & SessionSlice & PairingSlice & InviteSlice & NotificationSlice;

export const EMPTY_SESSION = { inventory: {}, presentPersonIds: [], teams: [] };

export const createInventoryFromDefs = (defs: BoatDefinition[]): BoatInventory => {
    const inv: BoatInventory = {};
    defs.forEach(d => inv[d.id] = d.defaultCount);
    return inv;
};

export const useAppStore = create<AppState>()(
  persist(
    (...args) => ({
      ...createAuthSlice(...args),
      ...createGlobalSlice(...args),
      ...createSessionSlice(...args),
      ...createPairingSlice(...args),
      ...createInviteSlice(...args),
      ...createNotificationSlice(...args),
    }),
    {
      name: 'etgarim-storage',
      version: 50.0,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<AppState> | null;
        if (state && version < 48 && state.sessions) {
          const cleanedSessions: typeof state.sessions = {};
          Object.entries(state.sessions).forEach(([clubId, sess]) => {
            cleanedSessions[clubId] = { ...sess, presentPersonIds: [], teams: [] };
          });
          return { ...state, sessions: cleanedSessions };
        }
        return state;
      },
      onRehydrateStorage: () => (state) => {
          if (state) {
              state.setHasHydrated(true);
          }
      },
      partialize: (state) => ({
        user: state.user,
        userProfile: state.userProfile,
        activeClub: state.activeClub,
        memberships: state.memberships,
        people: state.people,
        sessions: state.sessions,
        clubSettings: state.clubSettings,
        permissions: state.permissions,
        clubs: state.clubs,
        superAdmins: state.superAdmins,
        protectedAdmins: state.protectedAdmins,
        pairingDirty: state.pairingDirty,
        snapshots: state.snapshots,
        invites: state.invites,
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        seenNotificationKeys: state.seenNotificationKeys
      })
    }
  )
);
