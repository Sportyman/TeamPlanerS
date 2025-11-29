
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Person, Role, SessionState, Team, BoatInventory, BoatType, ClubID, UserPermission, Gender } from './types';
import { generateSmartPairings } from './services/pairingLogic';

export const SUPER_ADMIN_EMAIL = 'shaykashay@gmail.com';

// --- MOCK DATA FOR KAYAK CLUB ---
const MOCK_KAYAK_PEOPLE: Partial<Person>[] = [
  { id: 'k1', name: 'דורון שמעוני', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 5, notes: 'מדריך ראשי', tags: ['מדריך'] },
  { id: 'k2', name: 'ענת לביא', gender: Gender.FEMALE, role: Role.VOLUNTEER, rank: 4, tags: [] },
  { id: 'k3', name: 'אורן בר', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 3, tags: [] },
  { id: 'k4', name: 'יעל גולן', gender: Gender.FEMALE, role: Role.VOLUNTEER, rank: 5, notes: 'יכולה לחתור בקיאק יחיד', tags: ['קיאק יחיד'] },
  { id: 'k5', name: 'רוני ספקטור', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 4, tags: [] },
  { id: 'k6', name: 'דניאל אברהמי', gender: Gender.MALE, role: Role.MEMBER, rank: 1, notes: 'צריך תמיכה בגב', tags: ['מנוף'] },
  { id: 'k7', name: 'שירה כהן', gender: Gender.FEMALE, role: Role.MEMBER, rank: 2, tags: [] },
  { id: 'k8', name: 'איתי לוי', gender: Gender.MALE, role: Role.MEMBER, rank: 3, tags: [] },
  { id: 'k9', name: 'נועם פרי', gender: Gender.MALE, role: Role.GUEST, rank: 1, notes: 'פעם ראשונה בחוג', tags: [] },
  { id: 'k10', name: 'מאיה שדה', gender: Gender.FEMALE, role: Role.MEMBER, rank: 4, tags: [] },
  { id: 'k11', name: 'יונתן הראל', gender: Gender.MALE, role: Role.MEMBER, rank: 2, tags: [] },
  { id: 'k12', name: 'אביבית צור', gender: Gender.FEMALE, role: Role.MEMBER, rank: 1, tags: ['מנוף'] },
];

// --- MOCK DATA FOR SAILING CLUB ---
const MOCK_SAILING_PEOPLE: Partial<Person>[] = [
  { id: 's1', name: 'גיורא איילנד', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 5, notes: 'סקיפר מנוסה', tags: ['סקיפר'] },
  { id: 's2', name: 'תמר זיו', gender: Gender.FEMALE, role: Role.VOLUNTEER, rank: 4, tags: ['עוזר סקיפר'] },
  { id: 's3', name: 'אמיר גלבוע', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 3, tags: [] },
  { id: 's4', name: 'רמי קליין', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 5, tags: ['סקיפר'] },
  { id: 's5', name: 'נורית פלד', gender: Gender.FEMALE, role: Role.MEMBER, rank: 2, notes: 'חוששת ממים עמוקים', tags: [] },
  { id: 's6', name: 'יוסי בניון', gender: Gender.MALE, role: Role.MEMBER, rank: 3, tags: [] },
  { id: 's7', name: 'גילה אלמגור', gender: Gender.FEMALE, role: Role.MEMBER, rank: 1, notes: 'להושיב במקום יציב', tags: ['מנוף'] },
  { id: 's8', name: 'ארז טל', gender: Gender.MALE, role: Role.GUEST, rank: 1, tags: [] },
  { id: 's9', name: 'מירי מסיקה', gender: Gender.FEMALE, role: Role.MEMBER, rank: 2, tags: [] },
  { id: 's10', name: 'שלמה ארצי', gender: Gender.MALE, role: Role.MEMBER, rank: 4, tags: [] },
];

const DEFAULT_INVENTORY_VALUES: BoatInventory = {
  doubles: 4,
  singles: 2,
  privates: 0
};

interface AppState {
  user: { email: string; isAdmin: boolean } | null;
  activeClub: ClubID | null;
  
  permissions: UserPermission[];
  
  // Data is now shared but filtered by clubId
  people: Person[];
  
  // Per-Club State Maps
  sessions: Record<ClubID, SessionState>;
  defaultInventories: Record<ClubID, BoatInventory>;
  histories: Record<ClubID, Team[][]>;
  futures: Record<ClubID, Team[][]>;
  
  // Actions
  setActiveClub: (clubId: ClubID) => void;
  login: (email: string) => boolean; // Returns success/fail based on permissions
  logout: () => void;
  
  // Admin Actions
  addPermission: (email: string, clubId: ClubID) => void;
  removePermission: (email: string, clubId: ClubID) => void;
  
  // Club Data Actions
  addPerson: (person: Omit<Person, 'clubId'>) => void;
  updatePerson: (person: Person) => void;
  removePerson: (id: string) => void;
  restoreDemoData: () => void; // Manually restore mock data
  
  toggleAttendance: (id: string) => void;
  setBulkAttendance: (ids: string[]) => void;
  updateInventory: (inventory: BoatInventory) => void;
  updateDefaultInventory: (inventory: BoatInventory) => void;
  runPairing: () => void;
  resetSession: () => void;
  
  // Board Actions
  addManualTeam: () => void;
  removeTeam: (teamId: string) => void;
  addGuestToTeam: (teamId: string, name: string) => void;
  moveMemberToTeam: (personId: string, targetTeamId: string) => void;
  reorderSessionMembers: (sourceTeamId: string, sourceIndex: number, destTeamId: string, destIndex: number) => void;
  swapMembers: (teamAId: string, indexA: number, teamBId: string, indexB: number) => void;
  updateTeamBoatType: (teamId: string, boatType: BoatType) => void;
  
  // History Actions
  undo: () => void;
  redo: () => void;
}

const EMPTY_SESSION: SessionState = {
  inventory: DEFAULT_INVENTORY_VALUES,
  presentPersonIds: [],
  teams: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      activeClub: null,
      permissions: [], // Start empty, Super Admin is hardcoded
      people: [], // Will be migrated
      
      // Initialize maps for all clubs
      sessions: {
        [ClubID.KAYAK]: EMPTY_SESSION,
        [ClubID.SAILING]: EMPTY_SESSION,
      },
      defaultInventories: {
        [ClubID.KAYAK]: DEFAULT_INVENTORY_VALUES,
        [ClubID.SAILING]: DEFAULT_INVENTORY_VALUES,
      },
      histories: {
        [ClubID.KAYAK]: [],
        [ClubID.SAILING]: [],
      },
      futures: {
        [ClubID.KAYAK]: [],
        [ClubID.SAILING]: [],
      },

      setActiveClub: (clubId) => set({ activeClub: clubId }),

      login: (email) => {
        const { activeClub, permissions } = get();
        const isSuperAdmin = email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

        // 1. Super Admin always allowed
        if (isSuperAdmin) {
          set({ user: { email, isAdmin: true } });
          return true;
        }

        // 2. Check Permissions for Active Club
        if (!activeClub) return false;

        const userPerm = permissions.find(p => p.email.toLowerCase() === email.toLowerCase());
        if (userPerm && userPerm.allowedClubs.includes(activeClub)) {
          set({ user: { email, isAdmin: false } }); // Normal admin
          return true;
        }

        return false;
      },

      logout: () => set({ user: null }),

      // Admin Management
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
        ).filter(p => p.allowedClubs.length > 0) // Remove user if no clubs left
      })),

      addPerson: (personData) => set((state) => {
        if (!state.activeClub) return state;
        const newPerson: Person = { ...personData, clubId: state.activeClub };
        return { people: [...state.people, newPerson] };
      }),
      
      updatePerson: (updatedPerson) => set((state) => ({
        people: state.people.map(p => p.id === updatedPerson.id ? updatedPerson : p)
      })),

      removePerson: (id) => set((state) => ({ 
        people: state.people.filter(p => p.id !== id) 
      })),

      restoreDemoData: () => set((state) => {
        const kayakPeople = MOCK_KAYAK_PEOPLE.map(p => ({ ...p, clubId: ClubID.KAYAK } as Person));
        const sailingPeople = MOCK_SAILING_PEOPLE.map(p => ({ ...p, clubId: ClubID.SAILING } as Person));
        
        // Combine keeping existing non-mock people if we wanted, but for restore we just wipe and set mock
        const allPeople = [...kayakPeople, ...sailingPeople];
        
        return { people: allPeople };
      }),

      toggleAttendance: (id) => set((state) => {
        const { activeClub } = state;
        if (!activeClub) return state;
        
        const currentSession = state.sessions[activeClub];
        const isPresent = currentSession.presentPersonIds.includes(id);
        const newPresent = isPresent
          ? currentSession.presentPersonIds.filter(pid => pid !== id)
          : [...currentSession.presentPersonIds, id];
        
        return { 
          sessions: { 
            ...state.sessions, 
            [activeClub]: { ...currentSession, presentPersonIds: newPresent } 
          } 
        };
      }),

      setBulkAttendance: (ids) => set((state) => {
        const { activeClub } = state;
        if (!activeClub) return state;
        return {
          sessions: {
            ...state.sessions,
            [activeClub]: { ...state.sessions[activeClub], presentPersonIds: ids }
          }
        };
      }),

      updateInventory: (inventory) => set((state) => {
        const { activeClub } = state;
        if (!activeClub) return state;
        return {
          sessions: {
            ...state.sessions,
            [activeClub]: { ...state.sessions[activeClub], inventory }
          }
        };
      }),

      updateDefaultInventory: (inventory) => set((state) => {
        const { activeClub } = state;
        if (!activeClub) return state;
        
        return {
          defaultInventories: {
            ...state.defaultInventories,
            [activeClub]: inventory
          }
        };
      }),

      runPairing: () => {
        const { people, activeClub, sessions } = get();
        if (!activeClub) return;
        
        const currentSession = sessions[activeClub];

        // Reset history for this club
        set((state) => ({
          histories: { ...state.histories, [activeClub]: [] },
          futures: { ...state.futures, [activeClub]: [] }
        }));

        const presentPeople = people.filter(p => 
          p.clubId === activeClub && 
          currentSession.presentPersonIds.includes(p.id)
        );

        const teams = generateSmartPairings(presentPeople, currentSession.inventory);
        
        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeClub]: { ...state.sessions[activeClub], teams }
          }
        }));
      },

      resetSession: () => {
        const { activeClub, defaultInventories } = get();
        if (!activeClub) return;

        set((state) => ({
          histories: { ...state.histories, [activeClub]: [] },
          futures: { ...state.futures, [activeClub]: [] },
          sessions: {
            ...state.sessions,
            [activeClub]: {
              inventory: defaultInventories[activeClub],
              presentPersonIds: [],
              teams: []
            }
          }
        }));
      },

      addManualTeam: () => {
        const { activeClub, sessions } = get();
        if (!activeClub) return;
        const currentSession = sessions[activeClub];

        const newTeam: Team = {
            id: Date.now().toString(),
            members: [],
            boatType: BoatType.DOUBLE, // Default
            boatCount: 1
        };

        set((state) => ({
             histories: { 
                 ...state.histories, 
                 [activeClub]: [...state.histories[activeClub], currentSession.teams] 
             },
             futures: { ...state.futures, [activeClub]: [] },
             sessions: {
                 ...state.sessions,
                 [activeClub]: { ...currentSession, teams: [newTeam, ...currentSession.teams] }
             }
        }));
      },

      removeTeam: (teamId) => {
        const { activeClub, sessions } = get();
        if (!activeClub) return;
        const currentSession = sessions[activeClub];

        set((state) => ({
            histories: { 
                 ...state.histories, 
                 [activeClub]: [...state.histories[activeClub], currentSession.teams] 
             },
             futures: { ...state.futures, [activeClub]: [] },
             sessions: {
                 ...state.sessions,
                 [activeClub]: { 
                     ...currentSession, 
                     teams: currentSession.teams.filter(t => t.id !== teamId) 
                 }
             }
        }));
      },

      addGuestToTeam: (teamId, name) => {
        const { activeClub, sessions, people } = get();
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

        const newTeams = currentSession.teams.map(t => {
            if (t.id === teamId) {
                return { ...t, members: [...t.members, newGuest] };
            }
            return t;
        });

        set((state) => ({
             people: [...state.people, newGuest],
             histories: { 
                 ...state.histories, 
                 [activeClub]: [...state.histories[activeClub], currentSession.teams] 
             },
             futures: { ...state.futures, [activeClub]: [] },
             sessions: {
                 ...state.sessions,
                 [activeClub]: { 
                     ...currentSession, 
                     presentPersonIds: [...currentSession.presentPersonIds, newGuest.id],
                     teams: newTeams 
                 }
             }
        }));
      },

      moveMemberToTeam: (personId, targetTeamId) => {
        const { activeClub, sessions, people } = get();
        if (!activeClub) return;
        
        const currentSession = sessions[activeClub];

        set((state) => ({
           histories: { 
             ...state.histories, 
             [activeClub]: [...state.histories[activeClub], currentSession.teams] 
           },
           futures: { ...state.futures, [activeClub]: [] }
        }));

        const person = people.find(p => p.id === personId);
        if (!person) return;

        let newTeams = [...currentSession.teams];
        newTeams = newTeams.map(t => ({
          ...t,
          members: t.members.filter(m => m.id !== personId)
        }));
        newTeams = newTeams.map(t => {
          if (t.id === targetTeamId) {
            return { ...t, members: [...t.members, person] };
          }
          return t;
        });

        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeClub]: { ...currentSession, teams: newTeams }
          }
        }));
      },

      reorderSessionMembers: (sourceTeamId, sourceIndex, destTeamId, destIndex) => {
        const { activeClub, sessions } = get();
        if (!activeClub) return;
        
        const currentSession = sessions[activeClub];

        set((state) => ({
           histories: { 
             ...state.histories, 
             [activeClub]: [...state.histories[activeClub], currentSession.teams] 
           },
           futures: { ...state.futures, [activeClub]: [] }
        }));

        const newTeams = JSON.parse(JSON.stringify(currentSession.teams));
        const sourceTeam = newTeams.find((t: Team) => t.id === sourceTeamId);
        const destTeam = newTeams.find((t: Team) => t.id === destTeamId);

        if (!sourceTeam || !destTeam) return;

        const [movedMember] = sourceTeam.members.splice(sourceIndex, 1);
        destTeam.members.splice(destIndex, 0, movedMember);

        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeClub]: { ...currentSession, teams: newTeams }
          }
        }));
      },

      swapMembers: (teamAId, indexA, teamBId, indexB) => {
        const { activeClub, sessions } = get();
        if (!activeClub) return;
        const currentSession = sessions[activeClub];

        set((state) => ({
           histories: { 
             ...state.histories, 
             [activeClub]: [...state.histories[activeClub], currentSession.teams] 
           },
           futures: { ...state.futures, [activeClub]: [] }
        }));

        const newTeams = JSON.parse(JSON.stringify(currentSession.teams));
        const teamA = newTeams.find((t: Team) => t.id === teamAId);
        const teamB = newTeams.find((t: Team) => t.id === teamBId);

        if (!teamA || !teamB) return;

        const memberA = teamA.members[indexA];
        const memberB = teamB.members[indexB];
        teamA.members[indexA] = memberB;
        teamB.members[indexB] = memberA;

        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeClub]: { ...currentSession, teams: newTeams }
          }
        }));
      },

      updateTeamBoatType: (teamId, boatType) => {
        const { activeClub, sessions } = get();
        if (!activeClub) return;
        const currentSession = sessions[activeClub];

        set((state) => ({
           histories: { 
             ...state.histories, 
             [activeClub]: [...state.histories[activeClub], currentSession.teams] 
           },
           futures: { ...state.futures, [activeClub]: [] }
        }));

        const newTeams = currentSession.teams.map(t => 
          t.id === teamId ? { ...t, boatType } : t
        );

        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeClub]: { ...currentSession, teams: newTeams }
          }
        }));
      },

      undo: () => {
        const { activeClub, histories, futures, sessions } = get();
        if (!activeClub) return;
        const clubHistory = histories[activeClub];
        
        if (clubHistory.length === 0) return;

        const previous = clubHistory[clubHistory.length - 1];
        const newHistory = clubHistory.slice(0, -1);
        
        set((state) => ({
            sessions: {
                ...state.sessions,
                [activeClub]: { ...state.sessions[activeClub], teams: previous }
            },
            histories: { ...state.histories, [activeClub]: newHistory },
            futures: { 
                ...state.futures, 
                [activeClub]: [sessions[activeClub].teams, ...state.futures[activeClub]] 
            }
        }));
      },

      redo: () => {
         const { activeClub, histories, futures, sessions } = get();
        if (!activeClub) return;
        const clubFuture = futures[activeClub];

        if (clubFuture.length === 0) return;

        const next = clubFuture[0];
        const newFuture = clubFuture.slice(1);

         set((state) => ({
            sessions: {
                ...state.sessions,
                [activeClub]: { ...state.sessions[activeClub], teams: next }
            },
            histories: { 
                ...state.histories, 
                [activeClub]: [...state.histories[activeClub], sessions[activeClub].teams]
            },
            futures: { ...state.futures, [activeClub]: newFuture }
        }));
      }
    }),
    {
      name: 'etgarim-storage',
      version: 5.3, // Bumped to 5.3 to add tags
      migrate: (persistedState: any, version: number) => {
        if (version < 5.3) {
            const kayakPeople = MOCK_KAYAK_PEOPLE.map(p => ({ ...p, clubId: ClubID.KAYAK } as Person));
            const sailingPeople = MOCK_SAILING_PEOPLE.map(p => ({ ...p, clubId: ClubID.SAILING } as Person));
            const allPeople = [...kayakPeople, ...sailingPeople];

            return {
                ...persistedState,
                people: allPeople,
                sessions: persistedState.sessions || {
                    [ClubID.KAYAK]: { inventory: DEFAULT_INVENTORY_VALUES, presentPersonIds: [], teams: [] },
                    [ClubID.SAILING]: { inventory: DEFAULT_INVENTORY_VALUES, presentPersonIds: [], teams: [] },
                },
                defaultInventories: persistedState.defaultInventories || {
                    [ClubID.KAYAK]: DEFAULT_INVENTORY_VALUES,
                    [ClubID.SAILING]: DEFAULT_INVENTORY_VALUES,
                },
            } as AppState;
        }
        return persistedState as AppState;
      },
      partialize: (state) => ({
        user: state.user,
        people: state.people,
        sessions: state.sessions,
        defaultInventories: state.defaultInventories,
        permissions: state.permissions
      })
    }
  )
);
