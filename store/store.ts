
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createAuthSlice, AuthSlice } from './slices/createAuthSlice';
import { createGlobalSlice, GlobalSlice } from './slices/createGlobalSlice';
import { createSessionSlice, SessionSlice } from './slices/createSessionSlice';
import { createPairingSlice, PairingSlice } from './slices/createPairingSlice';
import { createInviteSlice, InviteSlice } from './slices/createInviteSlice';
import { createNotificationSlice, NotificationSlice } from './slices/createNotificationSlice';
import {
  migratePersistedAppState,
  partializeAppState,
  STORE_PERSIST_VERSION,
  STORE_STORAGE_KEY,
} from './storagePersistence';
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
      name: STORE_STORAGE_KEY,
      version: STORE_PERSIST_VERSION,
      migrate: (persistedState: unknown) => migratePersistedAppState(persistedState),
      onRehydrateStorage: () => (state) => {
          if (state) {
              state.setHasHydrated(true);
          }
      },
      partialize: (state) => partializeAppState(state),
    }
  )
);
