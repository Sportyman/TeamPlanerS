
import { StateCreator } from 'zustand';
import { AppState, EMPTY_SESSION, createInventoryFromDefs } from '../store';
import { Club, ClubID, Person, ClubSettings, SyncStatus, BoatDefinition, UserPermission } from '../../types';
import { DEFAULT_CLUBS, KAYAK_DEFINITIONS, SAILING_DEFINITIONS } from '../../mockData';

const defaultBoatsForClub = (clubId: string, label = ''): BoatDefinition[] => {
  const combined = `${clubId} ${label}`.toLowerCase();
  if (clubId === 'SAILING' || combined.includes('שייט') || combined.includes('sailing')) return SAILING_DEFINITIONS;
  return KAYAK_DEFINITIONS;
};

export interface GlobalSlice {
  clubs: Club[];
  activeClub: ClubID | null;
  clubSettings: Record<ClubID, ClubSettings>;
  people: Person[];
  syncStatus: SyncStatus;
  isInitialLoading: boolean;
  _hasHydrated: boolean; 

  setActiveClub: (clubId: ClubID) => void;
  setClubBoatDefinitions: (clubId: ClubID, defs: BoatDefinition[]) => void;
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

  setActiveClub: (clubId) => set((state) => {
    const hasDefs = (state.clubSettings[clubId]?.boatDefinitions?.length || 0) > 0;
    if (hasDefs) return { activeClub: clubId };
    const clubLabel = state.clubs.find((c) => c.id === clubId)?.label || '';
    const defs = defaultBoatsForClub(clubId, clubLabel);
    return {
      activeClub: clubId,
      clubSettings: { ...state.clubSettings, [clubId]: { boatDefinitions: defs } },
      sessions: {
        ...state.sessions,
        [clubId]: state.sessions[clubId] || { ...EMPTY_SESSION, inventory: createInventoryFromDefs(defs) },
      },
    };
  }),
  setClubBoatDefinitions: (clubId, defs) => set((state) => ({
    clubSettings: { ...state.clubSettings, [clubId]: { boatDefinitions: defs } },
  })),
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
    const defs = defaultBoatsForClub(newId, label);
    return {
        clubs: [...state.clubs, { id: newId, label }],
        clubSettings: { ...state.clubSettings, [newId]: { boatDefinitions: defs } },
        sessions: { ...state.sessions, [newId]: { ...EMPTY_SESSION, inventory: createInventoryFromDefs(defs) } }
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
