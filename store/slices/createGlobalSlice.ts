
import { StateCreator } from 'zustand';
import { AppState, EMPTY_SESSION } from '../store';
import { Club, ClubID, Person, ClubSettings, SyncStatus, BoatDefinition, UserPermission } from '../../types';
import { DEFAULT_CLUBS, KAYAK_DEFINITIONS, SAILING_DEFINITIONS } from '../../mockData';

export interface GlobalSlice {
  clubs: Club[];
  activeClub: ClubID | null;
  clubSettings: Record<ClubID, ClubSettings>;
  people: Person[];
  syncStatus: SyncStatus;
  isInitialLoading: boolean;
  _hasHydrated: boolean; 

  setActiveClub: (clubId: ClubID) => void;
  setPeople: (people: Person[]) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setGlobalConfig: (config: { superAdmins: string[], protectedAdmins?: string[], permissions?: UserPermission[] }) => void;
  addClub: (label: string) => void;
  removeClub: (id: string) => void;
  setCloudData: (data: any) => void;
  hardReset: () => void;
  setInitialLoading: (isLoading: boolean) => void;
  setHasHydrated: (val: boolean) => void;
}

export const createGlobalSlice: StateCreator<AppState, [], [], GlobalSlice> = (set) => ({
  clubs: DEFAULT_CLUBS,
  activeClub: null,
  clubSettings: {
    'KAYAK': { boatDefinitions: KAYAK_DEFINITIONS },
    'SAILING': { boatDefinitions: SAILING_DEFINITIONS },
  },
  people: [], 
  syncStatus: 'OFFLINE',
  isInitialLoading: false,
  _hasHydrated: false,

  setActiveClub: (clubId) => set({ activeClub: clubId }),
  setPeople: (people) => set({ people }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setInitialLoading: (isLoading) => set({ isInitialLoading: isLoading }),
  setHasHydrated: (val) => set({ _hasHydrated: val }),
  
  setGlobalConfig: (config) => set({ 
      superAdmins: config.superAdmins.map(a => a.toLowerCase().trim()),
      protectedAdmins: (config.protectedAdmins || []).map(a => a.toLowerCase().trim()),
      permissions: config.permissions || [],
      syncStatus: 'SYNCED'
  }),

  addClub: (label) => set(state => {
    const newId = 'CLUB-' + Date.now();
    return {
        clubs: [...state.clubs, { id: newId, label }],
        clubSettings: { ...state.clubSettings, [newId]: { boatDefinitions: [] } },
        sessions: { ...state.sessions, [newId]: { ...EMPTY_SESSION } }
    };
  }),

  removeClub: (id) => set(state => ({
    clubs: state.clubs.filter(c => c.id !== id),
    activeClub: state.activeClub === id ? null : state.activeClub
  })),

  setCloudData: (data) => set((state) => ({
    sessions: { ...state.sessions, ...data.sessions },
    clubSettings: { ...state.clubSettings, ...data.settings },
    snapshots: data.snapshots ? { ...state.snapshots, ...data.snapshots } : state.snapshots,
    syncStatus: 'SYNCED',
    isInitialLoading: false
  })),

  hardReset: () => {
      localStorage.removeItem('etgarim-storage');
      window.location.reload();
  }
});
