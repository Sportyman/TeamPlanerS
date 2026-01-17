
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Person, Role, SessionState, Team, BoatInventory, BoatType, ClubID, UserPermission, 
  Gender, DefaultBoatTypes, ClubSettings, BoatDefinition, Club, SyncStatus, PersonSnapshot 
} from './types';
import { generateSmartPairings } from './services/pairingLogic';
import { DEFAULT_CLUBS, INITIAL_PEOPLE, KAYAK_DEFINITIONS, SAILING_DEFINITIONS } from './mockData';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

export const ROOT_ADMIN_EMAIL = 'shaykashay@gmail.com';

const createInventoryFromDefs = (defs: BoatDefinition[]): BoatInventory => {
    const inv: BoatInventory = {};
    defs.forEach(d => inv[d.id] = d.defaultCount);
    return inv;
};

const EMPTY_SESSION = { inventory: {}, presentPersonIds: [], teams: [] };

interface AppState {
  user: { email: string; isAdmin: boolean; photoURL?: string } | null;
  activeClub: ClubID | null;
  pairingDirty: boolean; 
  syncStatus: SyncStatus;
  
  clubs: Club[];
  superAdmins: string[]; 
  permissions: UserPermission[];
  
  people: Person[];
  sessions: Record<ClubID, SessionState>;
  clubSettings: Record<ClubID, ClubSettings>;
  snapshots: Record<ClubID, PersonSnapshot[]>;
  histories: Record<ClubID, Team[][]>;
  futures: Record<ClubID, Team[][]>;
  
  // Actions
  loginWithGoogle: () => Promise<boolean>;
  loginDev: (email: string) => boolean;
  logout: () => Promise<void>;
  setActiveClub: (clubId: ClubID) => void;
  setSyncStatus: (status: SyncStatus) => void;
  
  // Super Admin Actions
  addClub: (label: string) => void;
  removeClub: (id: string) => void;
  addSuperAdmin: (email: string) => void;
  removeSuperAdmin: (email: string) => void;
  
  addPermission: (email: string, clubId: ClubID) => void;
  removePermission: (email: string, clubId: ClubID) => void;
  
  // Data actions
  setCloudData: (data: { people: Person[], sessions: Record<ClubID, SessionState>, settings: Record<ClubID, ClubSettings>, snapshots?: Record<ClubID, PersonSnapshot[]> }) => void;
  addPerson: (person: Omit<Person, 'clubId'>) => void;
  updatePerson: (person: Person) => void;
  removePerson: (id: string) => void;
  restoreDemoData: () => void;
  loadDemoForActiveClub: () => void;
  importClubData: (data: any) => void;
  
  // Snapshots
  saveSnapshot: (name: string) => void;
  loadSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;

  // Session Management
  toggleAttendance: (id: string) => void;
  setBulkAttendance: (ids: string[]) => void;
  updateInventory: (inventory: BoatInventory) => void;
  
  // Boat Definitions
  addBoatDefinition: (def: BoatDefinition) => void;
  updateBoatDefinition: (def: BoatDefinition) => void;
  removeBoatDefinition: (boatId: string) => void;
  saveBoatDefinitions: (defs: BoatDefinition[]) => void;

  runPairing: () => void;
  resetSession: () => void;
  
  // Board Manipulation
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      activeClub: null,
      pairingDirty: false,
      syncStatus: 'OFFLINE',
      
      clubs: DEFAULT_CLUBS,
      superAdmins: [ROOT_ADMIN_EMAIL],
      permissions: [], 
      people: INITIAL_PEOPLE,
      
      sessions: {
        'KAYAK': { ...EMPTY_SESSION, inventory: createInventoryFromDefs(KAYAK_DEFINITIONS) },
        'SAILING': { ...EMPTY_SESSION, inventory: createInventoryFromDefs(SAILING_DEFINITIONS) },
      },
      
      clubSettings: {
        'KAYAK': { boatDefinitions: KAYAK_DEFINITIONS },
        'SAILING': { boatDefinitions: SAILING_DEFINITIONS },
      },

      snapshots: {},
      histories: { 'KAYAK': [], 'SAILING': [] },
      futures: { 'KAYAK': [], 'SAILING': [] },

      setActiveClub: (clubId) => set({ activeClub: clubId }),
      setSyncStatus: (status) => set({ syncStatus: status }),

      loginWithGoogle: async () => {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          const email = result.user.email?.toLowerCase() || '';
          const { activeClub, permissions, superAdmins } = get();

          const isSuperAdmin = email === ROOT_ADMIN_EMAIL.toLowerCase() || superAdmins.some(a => a.toLowerCase() === email);
          const userPerm = permissions.find(p => p.email.toLowerCase() === email);
          const hasClubAccess = userPerm && activeClub && userPerm.allowedClubs.includes(activeClub);

          if (isSuperAdmin || hasClubAccess) {
            set({ user: { email, isAdmin: isSuperAdmin, photoURL: result.user.photoURL || undefined } });
            return true;
          }
          
          await signOut(auth);
          alert('אין לך הרשאות גישה למועדון זה.');
          return false;
        } catch (error) {
          console.error("Login error:", error);
          return false;
        }
      },

      loginDev: (email) => {
        const normalizedEmail = email.toLowerCase().trim();
        const { activeClub, permissions, superAdmins } = get();
        const isSuperAdmin = normalizedEmail === ROOT_ADMIN_EMAIL.toLowerCase() || superAdmins.some(a => a.toLowerCase() === normalizedEmail);
        
        if (isSuperAdmin) {
          set({ user: { email: normalizedEmail, isAdmin: true } });
          return true;
        }

        if (!activeClub) return false;
        const userPerm = permissions.find(p => p.email.toLowerCase() === normalizedEmail);
        if (userPerm && userPerm.allowedClubs.includes(activeClub)) {
          set({ user: { email: normalizedEmail, isAdmin: false } }); 
          return true;
        }
        return false;
      },

      logout: async () => {
        await signOut(auth);
        set({ user: null });
      },

      setCloudData: (data) => set((state) => ({
        people: data.people || state.people,
        sessions: { ...state.sessions, ...data.sessions },
        clubSettings: { ...state.clubSettings, ...data.settings },
        snapshots: data.snapshots ? { ...state.snapshots, ...data.snapshots } : state.snapshots,
        syncStatus: 'SYNCED'
      })),

      // --- Super Admin Actions ---
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

      addSuperAdmin: (email) => set(state => ({
          superAdmins: [...state.superAdmins, email.trim()]
      })),

      removeSuperAdmin: (email) => set(state => {
          if (email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) return state;
          return {
              superAdmins: state.superAdmins.filter(a => a.toLowerCase() !== email.toLowerCase())
          };
      }),

      addPermission: (email, clubId) => set(state => {
        const existing = state.permissions.find(p => p.email === email);
        let newPermissions;
        if (existing) {
          if (existing.allowedClubs.includes(clubId)) return state;
          newPermissions = state.permissions.map(p => 
            p.email === email ? { ...p, allowedClubs: [...p.allowedClubs, clubId] } : p
          );
        } else {
          newPermissions = [...state.permissions, { email, allowedClubs: [clubId] }];
        }
        return { permissions: newPermissions };
      }),

      removePermission: (email, clubId) => set(state => ({
        permissions: state.permissions.map(p => 
          p.email === email 
            ? { ...p, allowedClubs: p.allowedClubs.filter(c => c !== clubId) }
            : p
        ).filter(p => p.allowedClubs.length > 0)
      })),

      addPerson: (personData) => set((state) => {
        if (!state.activeClub) return state;
        const newPerson: Person = { ...personData, clubId: state.activeClub };
        return { 
          people: [...state.people, newPerson],
          pairingDirty: true 
        };
      }),
      
      updatePerson: (updatedPerson) => set((state) => ({
        people: state.people.map(p => p.id === updatedPerson.id ? updatedPerson : p),
        pairingDirty: true
      })),

      removePerson: (id) => set((state) => ({ 
        people: state.people.filter(p => p.id !== id),
        pairingDirty: true
      })),

      restoreDemoData: () => set(() => {
        return { 
          clubs: DEFAULT_CLUBS,
          people: INITIAL_PEOPLE,
          clubSettings: {
             'KAYAK': { boatDefinitions: KAYAK_DEFINITIONS },
             'SAILING': { boatDefinitions: SAILING_DEFINITIONS }
          },
          sessions: {
            'KAYAK': { ...EMPTY_SESSION, inventory: createInventoryFromDefs(KAYAK_DEFINITIONS) },
            'SAILING': { ...EMPTY_SESSION, inventory: createInventoryFromDefs(SAILING_DEFINITIONS) },
          },
          snapshots: {},
          pairingDirty: false
        };
      }),

      loadDemoForActiveClub: () => set(state => {
          const clubId = state.activeClub;
          if (!clubId) return state;
          const otherPeople = state.people.filter(p => p.clubId !== clubId);
          const demoPeople = INITIAL_PEOPLE.filter(p => p.clubId === clubId);
          return {
              people: [...otherPeople, ...demoPeople],
              pairingDirty: true
          };
      }),

      importClubData: (data: any) => set((state) => {
          if (!state.activeClub) return state;
          const currentClubId = state.activeClub;
          if (!data || !data.clubId || data.clubId !== currentClubId) {
             alert("קובץ זה אינו תואם לחוג הנוכחי.");
             return state;
          }
          const otherPeople = state.people.filter(p => p.clubId !== currentClubId);
          const importedPeople = (data.people || []).map((p: Person) => ({
              ...p,
              clubId: currentClubId
          }));
          return {
              people: [...otherPeople, ...importedPeople],
              clubSettings: { ...state.clubSettings, [currentClubId]: data.settings || { boatDefinitions: [] } },
              sessions: { ...state.sessions, [currentClubId]: data.session || EMPTY_SESSION },
              snapshots: data.snapshots ? { ...state.snapshots, [currentClubId]: data.snapshots } : state.snapshots,
              pairingDirty: true
          };
      }),

      saveSnapshot: (name) => set(state => {
          const clubId = state.activeClub;
          if (!clubId) return state;
          const currentPeople = state.people.filter(p => p.clubId === clubId);
          const newSnapshot: PersonSnapshot = {
              id: Date.now().toString(),
              name,
              date: new Date().toISOString(),
              people: currentPeople
          };
          const currentSnapshots = state.snapshots[clubId] || [];
          return {
              snapshots: { ...state.snapshots, [clubId]: [newSnapshot, ...currentSnapshots] }
          };
      }),

      loadSnapshot: (snapshotId) => set(state => {
          const clubId = state.activeClub;
          if (!clubId) return state;
          const clubSnaps = state.snapshots[clubId] || [];
          const snap = clubSnaps.find(s => s.id === snapshotId);
          if (!snap) return state;
          
          const otherPeople = state.people.filter(p => p.clubId !== clubId);
          const restoredPeople = snap.people.map(p => ({ ...p, clubId }));
          
          return {
              people: [...otherPeople, ...restoredPeople],
              pairingDirty: true
          };
      }),

      deleteSnapshot: (snapshotId) => set(state => {
          const clubId = state.activeClub;
          if (!clubId) return state;
          const clubSnaps = state.snapshots[clubId] || [];
          return {
              snapshots: { ...state.snapshots, [clubId]: clubSnaps.filter(s => s.id !== snapshotId) }
          };
      }),

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

      saveBoatDefinitions: (defs) => set((state) => {
          const { activeClub } = state;
          if (!activeClub) return state;
          const currentSettings = state.clubSettings[activeClub];
          const currentSession = state.sessions[activeClub];
          const newInventory: BoatInventory = {};
          defs.forEach(d => {
              newInventory[d.id] = currentSession.inventory[d.id] !== undefined ? currentSession.inventory[d.id] : d.defaultCount;
          });
          return {
              clubSettings: { ...state.clubSettings, [activeClub]: { ...currentSettings, boatDefinitions: defs } },
              sessions: { ...state.sessions, [activeClub]: { ...currentSession, inventory: newInventory } },
              pairingDirty: true
          };
      }),

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
        const { activeClub, clubSettings } = get();
        if (!activeClub) return;
        const settings = clubSettings[activeClub];
        const defaultInv = createInventoryFromDefs(settings.boatDefinitions);
        set((state) => ({
          histories: { ...state.histories, [activeClub]: [] },
          futures: { ...state.futures, [activeClub]: [] },
          sessions: { ...state.sessions, [activeClub]: { inventory: defaultInv, presentPersonIds: [], teams: [] } },
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
        const newGuest: Person = {
            id: 'guest-' + Date.now(),
            clubId: activeClub,
            name: name,
            role: Role.GUEST,
            rank: 1,
            gender: Gender.MALE,
            tags: [],
            notes: 'הוסף ידנית'
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
         const sTeam = newTeams.find((t:Team) => t.id === sId);
         const dTeam = newTeams.find((t:Team) => t.id === dId);
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
        const tA = newTeams.find((t:Team) => t.id === tAId);
        const tB = newTeams.find((t:Team) => t.id === tBId);
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
    }),
    {
      name: 'etgarim-storage',
      version: 20.0, 
      partialize: (state) => ({
        user: state.user,
        people: state.people,
        sessions: state.sessions,
        clubSettings: state.clubSettings,
        permissions: state.permissions,
        clubs: state.clubs,
        superAdmins: state.superAdmins,
        pairingDirty: state.pairingDirty,
        snapshots: state.snapshots
      })
    }
  )
);
