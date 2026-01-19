
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createAuthSlice, AuthSlice } from './slices/createAuthSlice';
import { createGlobalSlice, GlobalSlice } from './slices/createGlobalSlice';
import { createSessionSlice, SessionSlice } from './slices/createSessionSlice';
import { createPairingSlice, PairingSlice } from './slices/createPairingSlice';
import { BoatDefinition, BoatInventory } from '../types';
import { KAYAK_DEFINITIONS, SAILING_DEFINITIONS } from '../mockData';

export type AppState = AuthSlice & GlobalSlice & SessionSlice & PairingSlice;

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
    }),
    {
      name: 'etgarim-storage',
      version: 43.0, 
      partialize: (state) => ({
        user: state.user,
        userProfile: state.userProfile,
        memberships: state.memberships,
        people: state.people,
        sessions: state.sessions,
        clubSettings: state.clubSettings,
        permissions: state.permissions,
        clubs: state.clubs,
        superAdmins: state.superAdmins,
        protectedAdmins: state.protectedAdmins,
        pairingDirty: state.pairingDirty,
        snapshots: state.snapshots
      })
    }
  )
);
