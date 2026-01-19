
import { StateCreator } from 'zustand';
import { AppState } from '../store';
import { ClubID, SessionState, BoatInventory, BoatDefinition, PersonSnapshot } from '../../types';

export interface SessionSlice {
  sessions: Record<ClubID, SessionState>;
  snapshots: Record<ClubID, PersonSnapshot[]>;

  toggleAttendance: (id: string) => void;
  setBulkAttendance: (ids: string[]) => void;
  updateInventory: (inventory: BoatInventory) => void;
  addBoatDefinition: (def: BoatDefinition) => void;
  updateBoatDefinition: (def: BoatDefinition) => void;
  removeBoatDefinition: (boatId: string) => void;
  saveSnapshot: (name: string) => void;
  loadSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;
}

export const createSessionSlice: StateCreator<AppState, [], [], SessionSlice> = (set, get) => ({
  sessions: {},
  snapshots: {},

  toggleAttendance: (id) => set((state) => {
    const { activeClub } = state;
    if (!activeClub) return state;
    const currentSession = state.sessions[activeClub];
    const isPresent = currentSession.presentPersonIds.includes(id);
    const newPresent = isPresent ? currentSession.presentPersonIds.filter(pid => pid !== id) : [...currentSession.presentPersonIds, id];
    return { sessions: { ...state.sessions, [activeClub]: { ...currentSession, presentPersonIds: newPresent } } };
  }),

  setBulkAttendance: (ids) => set((state) => {
    const { activeClub } = state;
    if (!activeClub) return state;
    return { sessions: { ...state.sessions, [activeClub]: { ...state.sessions[activeClub], presentPersonIds: ids } } };
  }),

  updateInventory: (inventory) => set((state) => {
    const { activeClub } = state;
    if (!activeClub) return state;
    return { sessions: { ...state.sessions, [activeClub]: { ...state.sessions[activeClub], inventory } } };
  }),

  addBoatDefinition: (def) => set((state) => {
    const { activeClub } = state;
    if (!activeClub) return state;
    const currentSettings = state.clubSettings[activeClub];
    const newDefs = [...currentSettings.boatDefinitions, def];
    const currentSession = state.sessions[activeClub];
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
    const currentSession = state.sessions[activeClub];
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
