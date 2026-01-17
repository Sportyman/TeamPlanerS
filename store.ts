
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Person, Role, SessionState, Team, BoatInventory, BoatType, ClubID, UserPermission, 
  Gender, DefaultBoatTypes, ClubSettings, BoatDefinition, Club, SyncStatus, PersonSnapshot, RoleColor, Participant, ClubMembership
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

const DEFAULT_ROLE_COLORS: Record<Role, RoleColor> = {
    [Role.INSTRUCTOR]: 'cyan',
    [Role.VOLUNTEER]: 'orange',
    [Role.MEMBER]: 'purple',
    [Role.GUEST]: 'emerald'
};

interface AppState {
  user: { email: string; isAdmin: boolean; photoURL?: string } | null;
  activeClub: ClubID | null;
  pairingDirty: boolean; 
  syncStatus: SyncStatus;
  lastSyncTime: string | null;
  
  clubs: Club[];
  superAdmins: string[]; 
  permissions: UserPermission[];
  
  people: Participant[]; // Global identity pool
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
  
  // Participant & Club Membership Actions
  addPerson: (data: Omit<Person, 'clubId'>) => void;
  updatePerson: (person: Person) => void;
  removePersonFromClub: (personId: string, clubId: ClubID) => void;
  addExistingToClub: (personId: string, clubId: ClubID, defaults: Partial<ClubMembership>) => void;
  clearClubPeople: () => void;
  restoreDemoData: () => void;
  loadDemoForActiveClub: () => void;
  
  setCloudData: (data: any) => void;
  importClubData: (data: any) => void;
  
  // Snapshots
  saveSnapshot: (name: string) => void;
  loadSnapshot: (snapshotId: string) => void;
  deleteSnapshot: (snapshotId: string) => void;

  // Session Management
  toggleAttendance: (id: string) => void;
  setBulkAttendance: (ids: string[]) => void;
  updateInventory: (inventory: BoatInventory) => void;
  
  // Settings
  addBoatDefinition: (def: BoatDefinition) => void;
  updateBoatDefinition: (def: BoatDefinition) => void;
  removeBoatDefinition: (boatId: string) => void;
  saveBoatDefinitions: (defs: BoatDefinition[]) => void;
  updateRoleColor: (role: Role, color: RoleColor) => void;

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

/**
 * Utility to convert the complex Participant model back to the flat Person model used in UI
 */
const flattenParticipant = (p: Participant, clubId: ClubID): Person | null => {
    const membership = p.memberships[clubId];
    if (!membership) return null;
    return {
        ...membership,
        id: p.id,
        name: p.name,
        gender: p.gender,
        phone: p.phone,
        clubId
    };
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      activeClub: null,
      pairingDirty: false,
      syncStatus: 'OFFLINE',
      lastSyncTime: null,
      
      clubs: DEFAULT_CLUBS,
      superAdmins: [ROOT_ADMIN_EMAIL],
      permissions: [], 
      people: [], // Participant Pool
      
      sessions: {
        'KAYAK': { ...EMPTY_SESSION, inventory: createInventoryFromDefs(KAYAK_DEFINITIONS) },
        'SAILING': { ...EMPTY_SESSION, inventory: createInventoryFromDefs(SAILING_DEFINITIONS) },
      },
      
      clubSettings: {
        'KAYAK': { boatDefinitions: KAYAK_DEFINITIONS, roleColors: { ...DEFAULT_ROLE_COLORS } },
        'SAILING': { boatDefinitions: SAILING_DEFINITIONS, roleColors: { ...DEFAULT_ROLE_COLORS } },
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
        const { superAdmins } = get();
        const isSuperAdmin = normalizedEmail === ROOT_ADMIN_EMAIL.toLowerCase() || superAdmins.some(a => a.toLowerCase() === normalizedEmail);
        set({ user: { email: normalizedEmail, isAdmin: isSuperAdmin } });
        return true;
      },

      logout: async () => {
        await signOut(auth);
        set({ user: null });
      },

      addClub: (label) => set(state => {
          const newId = 'CLUB-' + Date.now();
          const newClub: Club = { id: newId, label };
          return {
              clubs: [...state.clubs, newClub],
              clubSettings: { ...state.clubSettings, [newId]: { boatDefinitions: [], roleColors: { ...DEFAULT_ROLE_COLORS } } },
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

      addPerson: (data) => set((state) => {
        const clubId = state.activeClub;
        if (!clubId) return state;
        
        const existingParticipant = state.people.find(p => p.phone && p.phone === data.phone);
        
        if (existingParticipant) {
            // Check if already in this club
            if (existingParticipant.memberships[clubId]) {
                alert('משתתף עם מספר טלפון זה כבר קיים במועדון.');
                return state;
            }
            // Add membership to existing participant
            const updatedPeople = state.people.map(p => 
                p.id === existingParticipant.id 
                ? { ...p, memberships: { ...p.memberships, [clubId]: { ...data } } } 
                : p
            );
            return { people: updatedPeople, pairingDirty: true };
        }

        // Create new global participant
        const newParticipant: Participant = {
            id: data.id || Date.now().toString(),
            name: data.name,
            gender: data.gender,
            phone: data.phone,
            createdAt: new Date().toISOString(),
            memberships: {
                [clubId]: { ...data }
            }
        };
        
        return { 
          people: [...state.people, newParticipant],
          pairingDirty: true 
        };
      }),
      
      updatePerson: (person) => set((state) => {
        const clubId = state.activeClub;
        if (!clubId) return state;
        
        const updatedPeople = state.people.map(p => {
            if (p.id === person.id) {
                return {
                    ...p,
                    name: person.name,
                    gender: person.gender,
                    phone: person.phone,
                    memberships: {
                        ...p.memberships,
                        [clubId]: {
                            ...p.memberships[clubId],
                            role: person.role,
                            rank: person.rank,
                            isSkipper: person.isSkipper,
                            tags: person.tags,
                            notes: person.notes,
                            preferredBoatType: person.preferredBoatType,
                            genderConstraint: person.genderConstraint
                        }
                    }
                };
            }
            return p;
        });
        
        return { people: updatedPeople, pairingDirty: true };
      }),

      removePersonFromClub: (personId, clubId) => set((state) => {
        const updatedPeople = state.people.map(p => {
            if (p.id === personId) {
                const newMemberships = { ...p.memberships };
                delete newMemberships[clubId];
                return { ...p, memberships: newMemberships };
            }
            return p;
        }).filter(p => Object.keys(p.memberships).length > 0); // Cleanup if no clubs left
        
        return { 
          people: updatedPeople,
          pairingDirty: true
        };
      }),

      addExistingToClub: (personId, clubId, defaults) => set(state => {
          const participant = state.people.find(p => p.id === personId);
          if (!participant) return state;
          
          const newMembership: ClubMembership = {
              role: Role.MEMBER,
              rank: 3,
              ...defaults
          };
          
          const updatedPeople = state.people.map(p => 
            p.id === personId ? { ...p, memberships: { ...p.memberships, [clubId]: newMembership } } : p
          );
          
          return { people: updatedPeople, pairingDirty: true };
      }),

      clearClubPeople: () => set(state => {
          const clubId = state.activeClub;
          if (!clubId) return state;
          const updatedPeople = state.people.map(p => {
              const newMemberships = { ...p.memberships };
              delete newMemberships[clubId];
              return { ...p, memberships: newMemberships };
          }).filter(p => Object.keys(p.memberships).length > 0);
          
          return { people: updatedPeople, pairingDirty: true };
      }),

      restoreDemoData: () => set(() => {
          // Flatten mock data into Participant format
          const participantsMap: Record<string, Participant> = {};
          INITIAL_PEOPLE.forEach(p => {
              if (!participantsMap[p.id]) {
                  participantsMap[p.id] = {
                      id: p.id, name: p.name, gender: p.gender, phone: p.phone, createdAt: new Date().toISOString(),
                      memberships: {}
                  };
              }
              const { id, name, gender, phone, clubId, ...membership } = p;
              participantsMap[id].memberships[clubId] = membership;
          });

        return { 
          clubs: DEFAULT_CLUBS,
          people: Object.values(participantsMap),
          clubSettings: {
             'KAYAK': { boatDefinitions: KAYAK_DEFINITIONS, roleColors: { ...DEFAULT_ROLE_COLORS } },
             'SAILING': { boatDefinitions: SAILING_DEFINITIONS, roleColors: { ...DEFAULT_ROLE_COLORS } }
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
          
          const demoPeopleForClub = INITIAL_PEOPLE.filter(p => p.clubId === clubId);
          const currentPeople = [...state.people];
          
          demoPeopleForClub.forEach(dp => {
              const existingIdx = currentPeople.findIndex(p => p.id === dp.id);
              const { id, name, gender, phone, clubId: cid, ...membership } = dp;
              if (existingIdx !== -1) {
                  currentPeople[existingIdx].memberships[cid] = membership;
              } else {
                  currentPeople.push({
                      id, name, gender, phone, createdAt: new Date().toISOString(),
                      memberships: { [cid]: membership }
                  });
              }
          });
          
          return { people: currentPeople, pairingDirty: true };
      }),

      setCloudData: (data) => set((state) => {
          // Cloud Data is expected to provide Participants
          return {
            people: data.people || state.people,
            sessions: { ...state.sessions, ...data.sessions },
            clubSettings: { ...state.clubSettings, ...data.settings },
            snapshots: data.snapshots ? { ...state.snapshots, ...data.snapshots } : state.snapshots,
            lastSyncTime: data.lastUpdated || state.lastSyncTime,
            syncStatus: 'SYNCED'
          };
      }),

      toggleAttendance: (id) => set((state) => {
        const clubId = state.activeClub;
        if (!clubId) return state;
        const currentSession = state.sessions[clubId];
        const isPresent = currentSession.presentPersonIds.includes(id);
        const newPresent = isPresent ? currentSession.presentPersonIds.filter(pid => pid !== id) : [...currentSession.presentPersonIds, id];
        
        const updatedPeople = state.people.map(p => {
            if (p.id === id && p.memberships[clubId]) {
                return {
                    ...p,
                    memberships: {
                        ...p.memberships,
                        [clubId]: { ...p.memberships[clubId], lastParticipation: new Date().toISOString() }
                    }
                };
            }
            return p;
        });

        return { 
            people: updatedPeople,
            sessions: { ...state.sessions, [clubId]: { ...currentSession, presentPersonIds: newPresent } } 
        };
      }),

      runPairing: () => {
        const { people, activeClub, sessions, clubSettings } = get();
        if (!activeClub) return;
        const currentSession = sessions[activeClub];
        const settings = clubSettings[activeClub];
        
        // Convert to flat Persons for the algorithm
        const presentPersons = people
            .filter(p => p.memberships[activeClub] && currentSession.presentPersonIds.includes(p.id))
            .map(p => flattenParticipant(p, activeClub))
            .filter((p): p is Person => p !== null);

        set((state) => ({ histories: { ...state.histories, [activeClub]: [] }, futures: { ...state.futures, [activeClub]: [] } }));
        const teams = generateSmartPairings(presentPersons, currentSession.inventory, settings.boatDefinitions);
        set((state) => ({ sessions: { ...state.sessions, [activeClub]: { ...state.sessions[activeClub], teams } }, pairingDirty: false }));
      },

      // Rest of actions (Manual manipulation, Inventory, etc.) stay largely same but use people.find for identity
      updateTeamBoatType: (tId, bType) => {
         const clubId = get().activeClub;
         if (!clubId) return;
         const currentSession = get().sessions[clubId];
         const newTeams = currentSession.teams.map(t => t.id === tId ? { ...t, boatType: bType } : t);
         set(state => ({
             histories: { ...state.histories, [clubId]: [...(state.histories[clubId]||[]), currentSession.teams]},
             sessions: { ...state.sessions, [clubId]: { ...currentSession, teams: newTeams }}
         }));
      },

      addGuestToTeam: (teamId, name) => {
        const clubId = get().activeClub;
        if (!clubId) return;
        const currentSession = get().sessions[clubId];
        
        const guestId = 'guest-' + Date.now();
        const guestParticipant: Participant = {
            id: guestId,
            name,
            gender: Gender.MALE,
            createdAt: new Date().toISOString(),
            memberships: {
                [clubId]: { role: Role.GUEST, rank: 1, isSkipper: false, notes: 'אורח זמני' }
            }
        };
        
        const guestPerson = flattenParticipant(guestParticipant, clubId)!;
        const newTeams = currentSession.teams.map(t => t.id === teamId ? { ...t, members: [...t.members, guestPerson] } : t);
        
        set((state) => ({
             people: [...state.people, guestParticipant],
             sessions: { ...state.sessions, [clubId]: { ...currentSession, presentPersonIds: [...currentSession.presentPersonIds, guestId], teams: newTeams } }
        }));
      },

      assignMemberToTeam: (teamId, personId) => {
        const clubId = get().activeClub;
        if (!clubId) return;
        const currentSession = get().sessions[clubId];
        const p = get().people.find(part => part.id === personId);
        if (!p) return;
        
        const person = flattenParticipant(p, clubId);
        if (!person) return;

        const newTeams = currentSession.teams.map(t => t.id === teamId ? { ...t, members: [...t.members, person] } : t);
        set((state) => ({
             sessions: { ...state.sessions, [clubId]: { ...currentSession, presentPersonIds: Array.from(new Set([...currentSession.presentPersonIds, personId])), teams: newTeams } }
        }));
      },
      
      // ... all other actions stay same or slightly adjusted
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
      updateRoleColor: (role, color) => set((state) => {
          const clubId = state.activeClub;
          if (!clubId) return state;
          const currentSettings = state.clubSettings[clubId];
          const newColors: Record<Role, RoleColor> = { 
              ...(currentSettings.roleColors || DEFAULT_ROLE_COLORS), 
              [role]: color 
          };
          return {
              clubSettings: { 
                  ...state.clubSettings, 
                  [clubId]: { 
                      ...currentSettings, 
                      roleColors: newColors 
                  } 
              }
          };
      }),
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
        const p = people.find(part => part.id === personId);
        if (!p) return;
        const person = flattenParticipant(p, activeClub);
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
      },
      saveSnapshot: (name) => set(state => {
          const clubId = state.activeClub;
          if (!clubId) return state;
          const currentPeople = state.people
            .filter(p => p.memberships[clubId])
            .map(p => flattenParticipant(p, clubId)!);
            
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
          
          const currentPeople = [...state.people];
          snap.people.forEach(sp => {
              const { id, name, gender, phone, clubId: cid, ...membership } = sp;
              const existingIdx = currentPeople.findIndex(p => p.id === id);
              if (existingIdx !== -1) {
                  currentPeople[existingIdx].memberships[clubId] = membership;
              } else {
                  currentPeople.push({
                      id, name, gender, phone, createdAt: new Date().toISOString(),
                      memberships: { [clubId]: membership }
                  });
              }
          });
          
          return { people: currentPeople, pairingDirty: true };
      }),
      deleteSnapshot: (snapshotId) => set(state => {
          const clubId = state.activeClub;
          if (!clubId) return state;
          const clubSnaps = state.snapshots[clubId] || [];
          return {
              snapshots: { ...state.snapshots, [clubId]: clubSnaps.filter(s => s.id !== snapshotId) }
          };
      }),
      importClubData: (data: any) => set((state) => {
          if (!state.activeClub) return state;
          const currentClubId = state.activeClub;
          if (!data || !data.clubId || data.clubId !== currentClubId) {
             alert("קובץ זה אינו תואם לחוג הנוכחי.");
             return state;
          }
          const currentPeople = [...state.people];
          (data.people || []).forEach((sp: Person) => {
               const { id, name, gender, phone, clubId: cid, ...membership } = sp;
               const existingIdx = currentPeople.findIndex(p => p.id === id);
               if (existingIdx !== -1) {
                   currentPeople[existingIdx].memberships[currentClubId] = membership;
               } else {
                   currentPeople.push({
                       id, name, gender, phone, createdAt: new Date().toISOString(),
                       memberships: { [currentClubId]: membership }
                   });
               }
          });
          
          return {
              people: currentPeople,
              clubSettings: { ...state.clubSettings, [currentClubId]: data.settings || { boatDefinitions: [], roleColors: { ...DEFAULT_ROLE_COLORS } } },
              sessions: { ...state.sessions, [currentClubId]: data.session || EMPTY_SESSION },
              snapshots: data.snapshots ? { ...state.snapshots, [currentClubId]: data.snapshots } : state.snapshots,
              pairingDirty: true
          };
      }),
    }),
    {
      name: 'etgarim-storage',
      version: 24.0, 
      partialize: (state) => ({
        user: state.user,
        people: state.people,
        sessions: state.sessions,
        clubSettings: state.clubSettings,
        permissions: state.permissions,
        clubs: state.clubs,
        superAdmins: state.superAdmins,
        pairingDirty: state.pairingDirty,
        snapshots: state.snapshots,
        lastSyncTime: state.lastSyncTime
      })
    }
  )
);
