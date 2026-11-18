
import { StateCreator } from 'zustand';
import { AppState } from '../store';
import { ClubID, SessionState, BoatInventory, BoatDefinition, PersonSnapshot } from '../../types';
import { KAYAK_DEFINITIONS, SAILING_DEFINITIONS } from '../../mockData';

export interface AttendanceHistoryEntry {
  ids: string[];
  label: string;
}

export interface SessionSlice {
  sessions: Record<ClubID, SessionState>;
  snapshots: Record<ClubID, PersonSnapshot[]>;
  attendanceHistories: Record<ClubID, AttendanceHistoryEntry[]>;

  toggleAttendance: (id: string) => void;
  setBulkAttendance: (ids: string[], label?: string) => void;
  undoAttendance: () => string | null;
  updateInventory: (inventory: BoatInventory) => void;
  addBoatDefinition: (def: BoatDefinition) => void;
  updateBoatDefinition: (def: BoatDefinition) => void;
  removeBoatDefinition: (boatId: string) => void;
  saveSnapshot: (name: string) => void;
  loadSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;
}

// Helper to create initial inventory for default clubs
const createInitialInventory = (defs: BoatDefinition[]): BoatInventory => {
    const inv: BoatInventory = {};
    defs.forEach(d => inv[d.id] = d.defaultCount);
    return inv;
};

const INITIAL_EMPTY_SESSION = { inventory: {}, presentPersonIds: [], teams: [] };

export const createSessionSlice: StateCreator<AppState, [], [], SessionSlice> = (set, get) => ({
  // Initialize with default clubs' sessions to prevent 'Data missing' errors
  sessions: {
    'KAYAK': { ...INITIAL_EMPTY_SESSION, inventory: createInitialInventory(KAYAK_DEFINITIONS) },
    'SAILING': { ...INITIAL_EMPTY_SESSION, inventory: createInitialInventory(SAILING_DEFINITIONS) }
  },
  snapshots: {},
  attendanceHistories: {},

  toggleAttendance: (id) => set((state) => {
    const { activeClub } = state;
    if (!activeClub) return state;
    const currentSession = state.sessions[activeClub] || { ...INITIAL_EMPTY_SESSION };
    const isPresent = currentSession.presentPersonIds.includes(id);
    const newPresent = isPresent ? currentSession.presentPersonIds.filter(pid => pid !== id) : [...currentSession.presentPersonIds, id];
    const personName = state.people?.find((p) => p.id === id)?.name;
    const label = `${isPresent ? 'הסרת' : 'סימון'} ${personName || 'משתתף'}`;
    const prevHist = state.attendanceHistories?.[activeClub] || [];
    return {
      sessions: { ...state.sessions, [activeClub]: { ...currentSession, presentPersonIds: newPresent } },
      attendanceHistories: { ...(state.attendanceHistories || {}), [activeClub]: [...prevHist, { ids: currentSession.presentPersonIds, label }].slice(-25) },
    };
  }),

  setBulkAttendance: (ids, label = 'עדכון רשימת נוכחות') => set((state) => {
    const { activeClub } = state;
    if (!activeClub) return state;
    const currentSession = state.sessions[activeClub] || { ...INITIAL_EMPTY_SESSION };
    const prevIds = currentSession.presentPersonIds;
    const unchanged = prevIds.length === ids.length && prevIds.every((x) => ids.includes(x));
    if (unchanged) return state;
    const prevHist = state.attendanceHistories?.[activeClub] || [];
    return {
      sessions: { ...state.sessions, [activeClub]: { ...currentSession, presentPersonIds: ids } },
      attendanceHistories: { ...(state.attendanceHistories || {}), [activeClub]: [...prevHist, { ids: prevIds, label }].slice(-25) },
    };
  }),

  undoAttendance: () => {
    const { activeClub, attendanceHistories, sessions } = get();
    if (!activeClub) return null;
    const hist = attendanceHistories[activeClub] || [];
    if (hist.length === 0) return null;
    const last = hist[hist.length - 1];
    const currentSession = sessions[activeClub] || { ...INITIAL_EMPTY_SESSION };
    set({
      sessions: { ...sessions, [activeClub]: { ...currentSession, presentPersonIds: last.ids } },
      attendanceHistories: { ...attendanceHistories, [activeClub]: hist.slice(0, -1) },
    });
    return last.label;
  },

  updateInventory: (inventory) => set((state) => {
    const { activeClub } = state;
    if (!activeClub) return state;
    const currentSession = state.sessions[activeClub] || { ...INITIAL_EMPTY_SESSION };
    return { sessions: { ...state.sessions, [activeClub]: { ...currentSession, inventory } } };
  }),

  addBoatDefinition: (def) => set((state) => {
    const { activeClub } = state;
    if (!activeClub) return state;
    const currentSettings = state.clubSettings[activeClub];
    const newDefs = [...currentSettings.boatDefinitions, def];
    const currentSession = state.sessions[activeClub] || { ...INITIAL_EMPTY_SESSION };
    const newInventory = { ...currentSession.inventory, [def.id]: def.defaultCount };
    return {
        clubSettings: { ...state.clubSettings, [activeClub]: { ...currentSettings, boatDefinitions: newDefs } },
        sessions: { ...state.sessions, [activeClub]: { ...currentSession, inventory: newInventory } },
        pairingDirty: true
    };
  }),

  updateBoatDefinition: (def) => set((state) => {
    const { activeClub } = state;
    if (!activeClub) return state;
    const currentSettings = state.clubSettings[activeClub];
    const newDefs = currentSettings.boatDefinitions.map(d => d.id === def.id ? def : d);
    return {
        clubSettings: { ...state.clubSettings, [activeClub]: { ...currentSettings, boatDefinitions: newDefs } },
        pairingDirty: true
    };
  }),

  removeBoatDefinition: (boatId) => set((state) => {
    const { activeClub } = state;
    if (!activeClub) return state;
    const currentSettings = state.clubSettings[activeClub];
    const newDefs = currentSettings.boatDefinitions.filter(d => d.id !== boatId);
    const currentSession = state.sessions[activeClub] || { ...INITIAL_EMPTY_SESSION };
    const newInventory = { ...currentSession.inventory };
    delete newInventory[boatId];
    return {
        clubSettings: { ...state.clubSettings, [activeClub]: { ...currentSettings, boatDefinitions: newDefs } },
        sessions: { ...state.sessions, [activeClub]: { ...currentSession, inventory: newInventory } },
        pairingDirty: true
    };
  }),

  saveSnapshot: (name) => set(state => {
    const clubId = state.activeClub;
    if (!clubId) return state;
    const currentPeople = state.people.filter(p => p.clubId === clubId);
    const newSnapshot = { id: Date.now().toString(), name, date: new Date().toISOString(), people: currentPeople };
    const currentSnapshots = state.snapshots[clubId] || [];
    return { snapshots: { ...state.snapshots, [clubId]: [newSnapshot, ...currentSnapshots] } };
  }),

  loadSnapshot: (snapshotId) => set(state => {
    const clubId = state.activeClub;
    if (!clubId) return state;
    const clubSnaps = state.snapshots[clubId] || [];
    const snap = clubSnaps.find(s => s.id === snapshotId);
    if (!snap) return state;
    const otherPeople = state.people.filter(p => p.clubId !== clubId);
    const restoredPeople = snap.people.map(p => ({ ...p, clubId }));
    return { people: [...otherPeople, ...restoredPeople], pairingDirty: true };
  }),

  deleteSnapshot: (snapshotId) => set(state => {
    const clubId = state.activeClub;
    if (!clubId) return state;
    const clubSnaps = state.snapshots[clubId] || [];
    return { snapshots: { ...state.snapshots, [clubId]: clubSnaps.filter(s => s.id !== snapshotId) } };
  }),
});
