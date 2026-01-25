
import { StateCreator } from 'zustand';
import { AppState, EMPTY_SESSION, createInventoryFromDefs } from '../store';
import { Club, ClubID, Person, ClubSettings, SyncStatus, BoatDefinition, UserPermission } from '../../types';
import { DEFAULT_CLUBS, INITIAL_PEOPLE, KAYAK_DEFINITIONS, SAILING_DEFINITIONS } from '../../mockData';
import { addLog } from '../../services/syncService';

export interface GlobalSlice {
  clubs: Club[];
  activeClub: ClubID | null;
  clubSettings: Record<ClubID, ClubSettings>;
  people: Person[];
  syncStatus: SyncStatus;
  isInitialLoading: boolean;
  _hasHydrated: boolean; 

  setActiveClub: (clubId: ClubID) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setGlobalConfig: (config: { superAdmins: string[], protectedAdmins?: string[], permissions?: UserPermission[] }) => void;
  addClub: (label: string) => void;
  removeClub: (id: string) => void;
  setCloudData: (data: any) => void;
  addPerson: (person: Omit<Person, 'clubId'>) => void;
  updatePerson: (person: Person) => void;
  removePerson: (id: string) => void;
  clearClubPeople: () => void;
  restoreDemoData: () => void;
  hardReset: () => void;
  importClubData: (data: any) => void;
  saveBoatDefinitions: (defs: BoatDefinition[]) => void;
  loadSampleGroup: () => void;
  setInitialLoading: (isLoading: boolean) => void;
  setHasHydrated: (val: boolean) => void;
}

export const createGlobalSlice: StateCreator<AppState, [], [], GlobalSlice> = (set, get) => ({
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
    const newClub: Club = { id: newId, label };
    return {
        clubs: [...state.clubs, newClub],
        clubSettings: { ...state.clubSettings, [newId]: { boatDefinitions: [] } },
        sessions: { ...state.sessions, [newId]: { ...EMPTY_SESSION } },
        histories: { ...state.histories, [newId]: [] },
        futures: { ...state.futures, [newId]: [] }
    };
  }),

  removeClub: (id) => set(state => {
    const isActive = state.activeClub === id;
    return {
        clubs: state.clubs.filter(c => c.id !== id),
        activeClub: isActive ? null : state.activeClub
    };
  }),

  setCloudData: (data) => set((state) => ({
    // Anti-ghosting: If cloud people is empty, ensure we clear local people
    people: data.people || [],
    sessions: { ...state.sessions, ...data.sessions },
    clubSettings: { ...state.clubSettings, ...data.settings },
    snapshots: data.snapshots ? { ...state.snapshots, ...data.snapshots } : state.snapshots,
    syncStatus: 'SYNCED',
    isInitialLoading: false
  })),

  addPerson: (personData) => set((state) => {
    if (!state.activeClub) return state;
    const newPerson: Person = { ...personData, clubId: state.activeClub } as Person;
    return { people: [...state.people, newPerson], pairingDirty: true };
  }),
  
  updatePerson: (updatedPerson) => set((state) => ({
    people: state.people.map(p => p.id === updatedPerson.id ? updatedPerson : p),
    pairingDirty: true
  })),

  removePerson: (id) => set((state) => ({ 
    people: state.people.filter(p => p.id !== id),
    pairingDirty: true
  })),

  clearClubPeople: () => set(state => {
    const clubId = state.activeClub;
    if (!clubId) return state;
    return { people: state.people.filter(p => p.clubId !== clubId), pairingDirty: true };
  }),

  restoreDemoData: () => set(() => ({ 
    clubs: DEFAULT_CLUBS,
    people: [], 
    clubSettings: { 'KAYAK': { boatDefinitions: KAYAK_DEFINITIONS }, 'SAILING': { boatDefinitions: SAILING_DEFINITIONS } },
    sessions: {
      'KAYAK': { ...EMPTY_SESSION, inventory: createInventoryFromDefs(KAYAK_DEFINITIONS) },
      'SAILING': { ...EMPTY_SESSION, inventory: createInventoryFromDefs(SAILING_DEFINITIONS) },
    },
    snapshots: {},
    pairingDirty: false
  })),

  hardReset: () => {
      localStorage.removeItem('etgarim-storage');
      window.location.reload();
  },

  importClubData: (data: any) => set((state) => {
    if (!state.activeClub) return state;
    const currentClubId = state.activeClub;
    if (!data || !data.clubId || data.clubId !== currentClubId) {
       alert("Data mismatch for this club.");
       return state;
    }
    const otherPeople = state.people.filter(p => p.clubId !== currentClubId);
    const importedPeople = (data.people || []).map((p: Person) => ({ ...p, clubId: currentClubId }));
    return {
        people: [...otherPeople, ...importedPeople],
        clubSettings: { ...state.clubSettings, [currentClubId]: data.settings || { boatDefinitions: [] } },
        sessions: { ...state.sessions, [currentClubId]: data.session || EMPTY_SESSION },
        snapshots: data.snapshots ? { ...state.snapshots, [currentClubId]: data.snapshots } : state.snapshots,
        pairingDirty: true
    };
  }),

  saveBoatDefinitions: (defs) => set((state) => {
    const { activeClub } = state;
    if (!activeClub) return state;
    const currentSettings = state.clubSettings[activeClub];
    const currentSession = state.sessions[activeClub];
    const newInventory: Record<string, number> = {};
    defs.forEach(d => {
        newInventory[d.id] = currentSession.inventory[d.id] !== undefined ? currentSession.inventory[d.id] : d.defaultCount;
    });
    return {
        clubSettings: { ...state.clubSettings, [activeClub]: { ...currentSettings, boatDefinitions: defs } },
        sessions: { ...state.sessions, [activeClub]: { ...currentSession, inventory: newInventory } },
        pairingDirty: true
    };
  }),

  loadSampleGroup: () => set(state => {
    const { activeClub, people } = state;
    if (!activeClub) return state;

    const clubType = activeClub.includes('SAILING') ? 'SAILING' : 'KAYAK';
    const samples = INITIAL_PEOPLE
        .filter(p => p.clubId === clubType)
        .map(p => ({
            ...p,
            id: `sample-${p.id}-${Date.now()}`,
            clubId: activeClub
        }));

    addLog(`Loaded ${samples.length} sample participants to ${activeClub}`, 'INFO');
    return {
        people: [...people, ...samples],
        pairingDirty: true
    };
  })
});
