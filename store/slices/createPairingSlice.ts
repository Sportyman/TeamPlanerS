
import { StateCreator } from 'zustand';
import { AppState } from '../store';
import { ClubID, Team, Role, Gender, BoatType, DefaultBoatTypes } from '../../types';
import { generateSmartPairings } from '../../services/pairingLogic';

export interface PairingSlice {
  pairingDirty: boolean;
  histories: Record<ClubID, Team[][]>;
  futures: Record<ClubID, Team[][]>;

  runPairing: () => void;
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

  runPairing: () => {
    const { people, activeClub, sessions, clubSettings } = get();
    if (!activeClub) return;
    const currentSession = sessions[activeClub];
    const settings = clubSettings[activeClub];
    set((state) => ({ histories: { ...state.histories, [activeClub]: [] }, futures: { ...state.futures, [activeClub]: [] } }));
    const presentPeople = people.filter(p => p.clubId === activeClub && currentSession.presentPersonIds.includes(p.id));
    const teams = generateSmartPairings(presentPeople, currentSession.inventory, settings.boatDefinitions);
    set((state) => ({ sessions: { ...state.sessions, [activeClub]: { ...state.sessions[activeClub], teams } }, pairingDirty: false }));
  },

  resetSession: () => {
    const { activeClub, clubSettings, sessions } = get();
    if (!activeClub) return;
    const settings = clubSettings[activeClub];
    const inv: Record<string, number> = {};
    settings.boatDefinitions.forEach(d => inv[d.id] = d.defaultCount);
    set((state) => ({
      histories: { ...state.histories, [activeClub]: [] },
      futures: { ...state.futures, [activeClub]: [] },
      sessions: { ...state.sessions, [activeClub]: { inventory: inv, presentPersonIds: [], teams: [] } },
      pairingDirty: false
    }));
  },

  addManualTeam: () => {
    const { activeClub, sessions, clubSettings } = get();
    if (!activeClub) return;
    const currentSession = sessions[activeClub];
    const defaultBoatDef = clubSettings[activeClub].boatDefinitions[0];
    const defaultBoatId = defaultBoatDef?.id || DefaultBoatTypes.DOUBLE;
    const newTeam: Team = { id: Date.now().toString(), members: [], boatType: defaultBoatId, boatCount: 1 };
    set((state) => ({
         histories: { ...state.histories, [activeClub]: [...(state.histories[activeClub] || []), currentSession.teams] },
         futures: { ...state.futures, [activeClub]: [] },
         sessions: { ...state.sessions, [activeClub]: { ...currentSession, teams: [newTeam, ...currentSession.teams] } }
    }));
  },

  removeTeam: (teamId) => {
    const { activeClub, sessions } = get();
    if (!activeClub) return;
    const currentSession = sessions[activeClub];
    set((state) => ({
        histories: { ...state.histories, [activeClub]: [...(state.histories[activeClub] || []), currentSession.teams] },
         futures: { ...state.futures, [activeClub]: [] },
         sessions: { ...state.sessions, [activeClub]: { ...currentSession, teams: currentSession.teams.filter(t => t.id !== teamId) } }
    }));
  },

  addGuestToTeam: (teamId, name) => {
    const { activeClub, sessions } = get();
    if (!activeClub) return;
    const currentSession = sessions[activeClub];
    const newGuest = {
        id: 'guest-' + Date.now(),
        clubId: activeClub,
        name: name,
        role: Role.GUEST,
        rank: 1,
        gender: Gender.MALE, 
        tags: [],
        notes: 'Manual'
    };
    const newTeams = currentSession.teams.map(t => t.id === teamId ? { ...t, members: [...t.members, newGuest] } : t);
    set((state) => ({
         people: [...state.people, newGuest],
         histories: { ...state.histories, [activeClub]: [...(state.histories[activeClub] || []), currentSession.teams] },
         futures: { ...state.futures, [activeClub]: [] },
         sessions: { ...state.sessions, [activeClub]: { ...currentSession, presentPersonIds: [...currentSession.presentPersonIds, newGuest.id], teams: newTeams } }
    }));
  },

  assignMemberToTeam: (teamId, personId) => {
    const { activeClub, sessions, people } = get();
    if (!activeClub) return;
    const currentSession = sessions[activeClub];
    const person = people.find(p => p.id === personId);
    if (!person) return;
    const newTeams = currentSession.teams.map(t => t.id === teamId ? { ...t, members: [...t.members, person] } : t);
    set((state) => ({
         histories: { ...state.histories, [activeClub]: [...(state.histories[activeClub] || []), currentSession.teams] },
         futures: { ...state.futures, [activeClub]: [] },
         sessions: { ...state.sessions, [activeClub]: { ...currentSession, presentPersonIds: Array.from(new Set([...currentSession.presentPersonIds, person.id])), teams: newTeams } }
    }));
  },

  removeMemberFromTeam: (teamId, personId) => {
    const { activeClub, sessions } = get();
    if (!activeClub) return;
    const currentSession = sessions[activeClub];
    const newTeams = currentSession.teams.map(t => t.id === teamId ? { ...t, members: t.members.filter(m => m.id !== personId) } : t);
    set((state) => ({
         histories: { ...state.histories, [activeClub]: [...(state.histories[activeClub] || []), currentSession.teams] },
         futures: { ...state.futures, [activeClub]: [] },
         sessions: { ...state.sessions, [activeClub]: { ...currentSession, teams: newTeams } }
    }));
  },

  moveMemberToTeam: (personId, targetTeamId) => {
    const { activeClub, sessions, people } = get();
    if (!activeClub) return;
    const currentSession = sessions[activeClub];
    const person = people.find(p => p.id === personId);
    if (!person) return;
    let newTeams = currentSession.teams.map(t => ({ ...t, members: t.members.filter(m => m.id !== personId) }));
    newTeams = newTeams.map(t => t.id === targetTeamId ? { ...t, members: [...t.members, person] } : t);
    set(state => ({
        histories: { ...state.histories, [activeClub]: [...(state.histories[activeClub]||[]), currentSession.teams]},
        sessions: { ...state.sessions, [activeClub]: { ...currentSession, teams: newTeams }}
    }));
  },

  reorderSessionMembers: (sId, sIdx, dId, dIdx) => {
     const { activeClub, sessions } = get();
     if (!activeClub) return;
     const currentSession = sessions[activeClub];
     const newTeams = JSON.parse(JSON.stringify(currentSession.teams));
     const sTeam = newTeams.find((t: any) => t.id === sId);
     const dTeam = newTeams.find((t: any) => t.id === dId);
     if(sTeam && dTeam) {
         const [moved] = sTeam.members.splice(sIdx, 1);
         dTeam.members.splice(dIdx, 0, moved);
         set(state => ({
             histories: { ...state.histories, [activeClub]: [...(state.histories[activeClub]||[]), currentSession.teams]},
             sessions: { ...state.sessions, [activeClub]: { ...currentSession, teams: newTeams }}
         }));
     }
  },

  swapMembers: (tAId, iA, tBId, iB) => {
    const { activeClub, sessions } = get();
    if (!activeClub) return;
    const currentSession = sessions[activeClub];
    const newTeams = JSON.parse(JSON.stringify(currentSession.teams));
    const tA = newTeams.find((t: any) => t.id === tAId);
    const tB = newTeams.find((t: any) => t.id === tBId);
    if (tA && tB) {
        const temp = tA.members[iA];
        tA.members[iA] = tB.members[iB];
        tB.members[iB] = temp;
        set(state => ({
             histories: { ...state.histories, [activeClub]: [...(state.histories[activeClub]||[]), currentSession.teams]},
             sessions: { ...state.sessions, [activeClub]: { ...currentSession, teams: newTeams }}
         }));
    }
  },

  updateTeamBoatType: (tId, bType) => {
     const { activeClub, sessions } = get();
     if (!activeClub) return;
     const currentSession = sessions[activeClub];
     const newTeams = currentSession.teams.map(t => t.id === tId ? { ...t, boatType: bType } : t);
     set(state => ({
         histories: { ...state.histories, [activeClub]: [...(state.histories[activeClub]||[]), currentSession.teams]},
         sessions: { ...state.sessions, [activeClub]: { ...currentSession, teams: newTeams }}
     }));
  },

  undo: () => {
     const { activeClub, histories, sessions } = get();
     if (!activeClub) return;
     const h = histories[activeClub] || [];
     if (h.length === 0) return;
     const prev = h[h.length - 1];
     set(state => ({
         sessions: { ...state.sessions, [activeClub]: { ...sessions[activeClub], teams: prev }},
         histories: { ...state.histories, [activeClub]: h.slice(0, -1) },
         futures: { ...state.futures, [activeClub]: [sessions[activeClub].teams, ...(state.futures[activeClub]||[])] }
     }));
  },

  redo: () => {
      const { activeClub, futures, sessions } = get();
     if (!activeClub) return;
     const f = futures[activeClub] || [];
     if (f.length === 0) return;
     const next = f[0];
     set(state => ({
         sessions: { ...state.sessions, [activeClub]: { ...sessions[activeClub], teams: next }},
         histories: { ...state.histories, [activeClub]: [...(state.histories[activeClub]||[]), sessions[activeClub].teams] },
         futures: { ...state.futures, [activeClub]: f.slice(1) }
     }));
  }
});
