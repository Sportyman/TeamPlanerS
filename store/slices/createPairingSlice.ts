import { StateCreator } from 'zustand';
import { AppState } from '../store';
import { BoatDefinition, BoatType, ClubID, DefaultBoatTypes, Gender, Person, Role, Team } from '../../types';
import { generateSmartPairings } from '../../services/pairingLogic';
import { KAYAK_DEFINITIONS, SAILING_DEFINITIONS } from '../../mockData';

const fallbackDefsFor = (clubId: ClubID, settings?: { boatDefinitions?: BoatDefinition[] }): BoatDefinition[] => {
  if (settings?.boatDefinitions && settings.boatDefinitions.length > 0) return settings.boatDefinitions;
  return clubId === 'SAILING' ? SAILING_DEFINITIONS : KAYAK_DEFINITIONS;
};

export interface PairingSlice {
  pairingDirty: boolean;
  histories: Record<ClubID, Team[][]>;
  futures: Record<ClubID, Team[][]>;

  runPairing: (peopleOverride?: Person[], defsOverride?: BoatDefinition[]) => void;
  resetSession: () => void;
  addManualTeam: () => void;
  removeTeam: (teamId: string) => void;
  addGuestToTeam: (teamId: string, name: string) => void;
  assignMemberToTeam: (teamId: string, personId: string) => void;
  removeMemberFromTeam: (teamId: string, personId: string) => void;
  moveMemberToTeam: (personId: string, targetTeamId: string) => void;
  reorderSessionMembers: (sourceTeamId: string, sourceIndex: number, destTeamId: string, destIndex: number) => void;
  swapMembers: (teamAId: string, indexA: number, teamBId: string, indexB: number) => void;
  updateTeamBoatType: (teamId: string, boatType: BoatType) => void;
  undo: () => void;
  redo: () => void;
}

export const createPairingSlice: StateCreator<AppState, [], [], PairingSlice> = (set, get) => ({
  pairingDirty: false,
  histories: {},
  futures: {},

  runPairing: (peopleOverride, defsOverride) => {
    const { people, activeClub, sessions, clubSettings } = get();
    if (!activeClub) return;
    const cur = sessions[activeClub];
    const sourcePeople = peopleOverride || people;
    const present = sourcePeople.filter((p) => p.clubId === activeClub && cur.presentPersonIds.includes(p.id));
    const defs = defsOverride && defsOverride.length > 0 ? defsOverride : fallbackDefsFor(activeClub, clubSettings[activeClub]);
    const teams = generateSmartPairings(present, cur.inventory, defs);
    set((s) => ({
      histories: { ...s.histories, [activeClub]: [] },
      futures: { ...s.futures, [activeClub]: [] },
      sessions: { ...s.sessions, [activeClub]: { ...s.sessions[activeClub], teams } },
      pairingDirty: false,
    }));
  },

  resetSession: () => {
    const { activeClub, clubSettings } = get();
    if (!activeClub) return;
    const inv: Record<string, number> = {};
    fallbackDefsFor(activeClub, clubSettings[activeClub]).forEach((d) => { inv[d.id] = d.defaultCount; });
    set((s) => ({
      histories: { ...s.histories, [activeClub]: [] },
      futures: { ...s.futures, [activeClub]: [] },
      sessions: { ...s.sessions, [activeClub]: { inventory: inv, presentPersonIds: [], teams: [] } },
      pairingDirty: false,
    }));
  },

  addManualTeam: () => {
    const { activeClub, sessions, clubSettings } = get();
    if (!activeClub) return;
    const cur = sessions[activeClub];
    const defaultBoatId = fallbackDefsFor(activeClub, clubSettings[activeClub])[0]?.id || DefaultBoatTypes.DOUBLE;
    const newTeam: Team = { id: Date.now().toString(), members: [], boatType: defaultBoatId, boatCount: 1 };
    set((s) => ({
      histories: { ...s.histories, [activeClub]: [...(s.histories[activeClub] || []), cur.teams] },
      futures: { ...s.futures, [activeClub]: [] },
      sessions: { ...s.sessions, [activeClub]: { ...cur, teams: [newTeam, ...cur.teams] } },
    }));
  },

  removeTeam: (teamId) => {
    const { activeClub, sessions } = get();
    if (!activeClub) return;
    const cur = sessions[activeClub];
    set((s) => ({
      histories: { ...s.histories, [activeClub]: [...(s.histories[activeClub] || []), cur.teams] },
      futures: { ...s.futures, [activeClub]: [] },
      sessions: { ...s.sessions, [activeClub]: { ...cur, teams: cur.teams.filter((t) => t.id !== teamId) } },
    }));
  },

  addGuestToTeam: (teamId, name) => {
    const { activeClub, sessions } = get();
    if (!activeClub) return;
    const cur = sessions[activeClub];
    const newGuest: Person = { id: 'guest-' + Date.now(), clubId: activeClub, name, role: Role.GUEST, rank: 1, gender: Gender.MALE, tags: [], notes: 'Manual' };
    const newTeams = cur.teams.map((t) => (t.id === teamId ? { ...t, members: [...t.members, newGuest] } : t));
    set((s) => ({
      people: [...s.people, newGuest],
      histories: { ...s.histories, [activeClub]: [...(s.histories[activeClub] || []), cur.teams] },
      futures: { ...s.futures, [activeClub]: [] },
      sessions: { ...s.sessions, [activeClub]: { ...cur, presentPersonIds: [...cur.presentPersonIds, newGuest.id], teams: newTeams } },
    }));
  },

  assignMemberToTeam: (teamId, personId) => {
    const { activeClub, sessions, people } = get();
    if (!activeClub) return;
    const cur = sessions[activeClub];
    const person = people.find((p) => p.id === personId);
    if (!person) return;
    const newTeams = cur.teams.map((t) => (t.id === teamId ? { ...t, members: [...t.members, person] } : t));
    set((s) => ({
      histories: { ...s.histories, [activeClub]: [...(s.histories[activeClub] || []), cur.teams] },
      futures: { ...s.futures, [activeClub]: [] },
      sessions: { ...s.sessions, [activeClub]: { ...cur, presentPersonIds: Array.from(new Set([...cur.presentPersonIds, person.id])), teams: newTeams } },
    }));
  },

  removeMemberFromTeam: (teamId, personId) => {
    const { activeClub, sessions } = get();
    if (!activeClub) return;
    const cur = sessions[activeClub];
    const newTeams = cur.teams.map((t) => (t.id === teamId ? { ...t, members: t.members.filter((m) => m.id !== personId) } : t));
    set((s) => ({
      histories: { ...s.histories, [activeClub]: [...(s.histories[activeClub] || []), cur.teams] },
      futures: { ...s.futures, [activeClub]: [] },
      sessions: { ...s.sessions, [activeClub]: { ...cur, teams: newTeams } },
    }));
  },

  moveMemberToTeam: (personId, targetTeamId) => {
    const { activeClub, sessions, people } = get();
    if (!activeClub) return;
    const cur = sessions[activeClub];
    const person = people.find((p) => p.id === personId);
    if (!person) return;
    const newTeams = cur.teams.map((t) => ({ ...t, members: t.members.filter((m) => m.id !== personId) })).map((t) => (t.id === targetTeamId ? { ...t, members: [...t.members, person] } : t));
    set((s) => ({ histories: { ...s.histories, [activeClub]: [...(s.histories[activeClub] || []), cur.teams] }, sessions: { ...s.sessions, [activeClub]: { ...cur, teams: newTeams } } }));
  },

  reorderSessionMembers: (sId, sIdx, dId, dIdx) => {
    const { activeClub, sessions } = get();
    if (!activeClub) return;
    const cur = sessions[activeClub];
    const newTeams: Team[] = JSON.parse(JSON.stringify(cur.teams));
    const sTeam = newTeams.find((t) => t.id === sId);
    const dTeam = newTeams.find((t) => t.id === dId);
    if (sTeam && dTeam) {
      const [moved] = sTeam.members.splice(sIdx, 1);
      dTeam.members.splice(dIdx, 0, moved);
      set((s) => ({ histories: { ...s.histories, [activeClub]: [...(s.histories[activeClub] || []), cur.teams] }, sessions: { ...s.sessions, [activeClub]: { ...cur, teams: newTeams } } }));
    }
  },

  swapMembers: (tAId, iA, tBId, iB) => {
    const { activeClub, sessions } = get();
    if (!activeClub) return;
    const cur = sessions[activeClub];
    const newTeams: Team[] = JSON.parse(JSON.stringify(cur.teams));
    const tA = newTeams.find((t) => t.id === tAId);
    const tB = newTeams.find((t) => t.id === tBId);
    if (tA && tB) {
      const temp = tA.members[iA];
      tA.members[iA] = tB.members[iB];
      tB.members[iB] = temp;
      set((s) => ({ histories: { ...s.histories, [activeClub]: [...(s.histories[activeClub] || []), cur.teams] }, sessions: { ...s.sessions, [activeClub]: { ...cur, teams: newTeams } } }));
    }
  },

  updateTeamBoatType: (tId, bType) => {
    const { activeClub, sessions } = get();
    if (!activeClub) return;
    const cur = sessions[activeClub];
    const newTeams = cur.teams.map((t) => (t.id === tId ? { ...t, boatType: bType } : t));
    set((s) => ({ histories: { ...s.histories, [activeClub]: [...(s.histories[activeClub] || []), cur.teams] }, sessions: { ...s.sessions, [activeClub]: { ...cur, teams: newTeams } } }));
  },

  undo: () => {
    const { activeClub, histories, sessions } = get();
    if (!activeClub) return;
    const h = histories[activeClub] || [];
    if (!h.length) return;
    set((s) => ({
      sessions: { ...s.sessions, [activeClub]: { ...sessions[activeClub], teams: h[h.length - 1] } },
      histories: { ...s.histories, [activeClub]: h.slice(0, -1) },
      futures: { ...s.futures, [activeClub]: [sessions[activeClub].teams, ...(s.futures[activeClub] || [])] },
    }));
  },

  redo: () => {
    const { activeClub, futures, sessions } = get();
    if (!activeClub) return;
    const f = futures[activeClub] || [];
    if (!f.length) return;
    set((s) => ({
      sessions: { ...s.sessions, [activeClub]: { ...sessions[activeClub], teams: f[0] } },
      histories: { ...s.histories, [activeClub]: [...(s.histories[activeClub] || []), sessions[activeClub].teams] },
      futures: { ...s.futures, [activeClub]: f.slice(1) },
    }));
  },
});
