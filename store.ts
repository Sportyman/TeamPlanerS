
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Person, Role, SessionState, Team, BoatInventory, BoatType, ClubID, UserPermission, Gender, DefaultBoatTypes, ClubSettings, BoatDefinition, Club } from './types';
import { generateSmartPairings } from './services/pairingLogic';

export const ROOT_ADMIN_EMAIL = 'shaykashay@gmail.com';

// --- MOCK DATA FOR INIT ---
const DEFAULT_CLUBS: Club[] = [
    { id: 'KAYAK', label: 'מועדון הקיאקים' },
    { id: 'SAILING', label: 'מועדון השייט' }
];

const KAYAK_DEFINITIONS: BoatDefinition[] = [
  { id: DefaultBoatTypes.DOUBLE, label: 'קיאק זוגי', isStable: true, capacity: 2, defaultCount: 5 },
  { id: DefaultBoatTypes.SINGLE, label: 'קיאק יחיד', isStable: false, capacity: 1, defaultCount: 3 },
  { id: DefaultBoatTypes.PRIVATE, label: 'פרטי', isStable: false, capacity: 1, defaultCount: 0 },
];

const SAILING_DEFINITIONS: BoatDefinition[] = [
  { id: 'sonar', label: 'סונאר', isStable: true, capacity: 5, defaultCount: 2 },
  { id: 'hanse', label: 'הנזה', isStable: true, capacity: 2, defaultCount: 1 },
  { id: 'zodiac', label: 'סירת ליווי', isStable: false, capacity: 3, defaultCount: 1 },
];

const createInventoryFromDefs = (defs: BoatDefinition[]): BoatInventory => {
    const inv: BoatInventory = {};
    defs.forEach(d => inv[d.id] = d.defaultCount);
    return inv;
};

// --- INITIAL PEOPLE (DUMMY) ---
const INITIAL_PEOPLE: Person[] = [
    // Kayak - Volunteers
    { id: 'k1', clubId: 'KAYAK', name: 'דורון שמעוני', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 5, phone: '050-1111111', notes: 'מדריך ראשי', tags: ['מדריך'] },
    { id: 'k2', clubId: 'KAYAK', name: 'ענת לביא', gender: Gender.FEMALE, role: Role.VOLUNTEER, rank: 4, phone: '050-2222222', tags: [] },
    { id: 'k3', clubId: 'KAYAK', name: 'יואב גל', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 5, phone: '050-3333333', tags: ['חובש'] },
    { id: 'k4', clubId: 'KAYAK', name: 'מיכל אהרוני', gender: Gender.FEMALE, role: Role.VOLUNTEER, rank: 3, phone: '050-4444444', tags: [] },
    // Kayak - Members
    { id: 'k5', clubId: 'KAYAK', name: 'דניאל אברהמי', gender: Gender.MALE, role: Role.MEMBER, rank: 1, phone: '052-5555555', notes: 'צריך תמיכה בגב', tags: ['מנוף'] },
    { id: 'k6', clubId: 'KAYAK', name: 'רונית כהן', gender: Gender.FEMALE, role: Role.MEMBER, rank: 2, phone: '052-6666666', tags: [] },
    { id: 'k7', clubId: 'KAYAK', name: 'אבי לוי', gender: Gender.MALE, role: Role.MEMBER, rank: 3, phone: '052-7777777', tags: [] },
    { id: 'k8', clubId: 'KAYAK', name: 'שרה נתניהו', gender: Gender.FEMALE, role: Role.MEMBER, rank: 1, phone: '052-8888888', tags: ['מנוף', 'שומרת נגיעה'] },
    { id: 'k9', clubId: 'KAYAK', name: 'יוסי בניון', gender: Gender.MALE, role: Role.MEMBER, rank: 4, phone: '052-9999999', tags: ['חותר עצמאי'] },
    { id: 'k10', clubId: 'KAYAK', name: 'נועה קירל', gender: Gender.FEMALE, role: Role.MEMBER, rank: 2, phone: '053-1234567', tags: [] },

    // Sailing - Volunteers
    { id: 's1', clubId: 'SAILING', name: 'גיורא איילנד', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 5, phone: '054-1111111', tags: ['סקיפר'] },
    { id: 's2', clubId: 'SAILING', name: 'תמר זנדברג', gender: Gender.FEMALE, role: Role.VOLUNTEER, rank: 4, phone: '054-2222222', tags: ['סקיפר'] },
    { id: 's3', clubId: 'SAILING', name: 'עופר שלח', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 3, phone: '054-3333333', tags: ['איש צוות'] },
    { id: 's4', clubId: 'SAILING', name: 'מרב מיכאלי', gender: Gender.FEMALE, role: Role.VOLUNTEER, rank: 5, phone: '054-4444444', tags: ['סקיפר'] },
    // Sailing - Members
    { id: 's5', clubId: 'SAILING', name: 'נורית פלד', gender: Gender.FEMALE, role: Role.MEMBER, rank: 2, phone: '055-5555555', tags: [] },
    { id: 's6', clubId: 'SAILING', name: 'אמיר חצרוני', gender: Gender.MALE, role: Role.MEMBER, rank: 3, phone: '055-6666666', tags: [] },
    { id: 's7', clubId: 'SAILING', name: 'גלית גוטמן', gender: Gender.FEMALE, role: Role.MEMBER, rank: 1, phone: '055-7777777', tags: ['כסא גלגלים'] },
    { id: 's8', clubId: 'SAILING', name: 'אייל ברקוביץ', gender: Gender.MALE, role: Role.MEMBER, rank: 4, phone: '055-8888888', tags: ['חותר חזק'] },
    { id: 's9', clubId: 'SAILING', name: 'אופירה אסייג', gender: Gender.FEMALE, role: Role.MEMBER, rank: 2, phone: '055-9999999', tags: [] },
    { id: 's10', clubId: 'SAILING', name: 'רני רהב', gender: Gender.MALE, role: Role.MEMBER, rank: 1, phone: '058-1234567', tags: [] },
];

interface AppState {
  user: { email: string; isAdmin: boolean } | null;
  activeClub: ClubID | null;
  
  // System Configuration
  clubs: Club[];
  superAdmins: string[]; // List of emails with super-admin access
  permissions: UserPermission[];
  
  // Data
  people: Person[];
  sessions: Record<ClubID, SessionState>;
  clubSettings: Record<ClubID, ClubSettings>;
  histories: Record<ClubID, Team[][]>;
  futures: Record<ClubID, Team[][]>;
  
  // Actions
  login: (email: string) => boolean;
  logout: () => void;
  setActiveClub: (clubId: ClubID) => void;
  
  // Super Admin Actions
  addClub: (label: string) => void;
  removeClub: (id: string) => void;
  addSuperAdmin: (email: string) => void;
  removeSuperAdmin: (email: string) => void;
  
  addPermission: (email: string, clubId: ClubID) => void;
  removePermission: (email: string, clubId: ClubID) => void;
  
  // Person Management
  addPerson: (person: Omit<Person, 'clubId'>) => void;
  updatePerson: (person: Person) => void;
  removePerson: (id: string) => void;
  restoreDemoData: () => void;
  
  // Session Management
  toggleAttendance: (id: string) => void;
  setBulkAttendance: (ids: string[]) => void;
  updateInventory: (inventory: BoatInventory) => void;
  
  // Boat Definitions
  addBoatDefinition: (def: BoatDefinition) => void;
  updateBoatDefinition: (def: BoatDefinition) => void;
  removeBoatDefinition: (boatId: string) => void;
  saveBoatDefinitions: (defs: BoatDefinition[]) => void; // BULK SAVE

  // Pairing Logic
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

const EMPTY_SESSION = { inventory: {}, presentPersonIds: [], teams: [] };

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      activeClub: null,
      
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

      histories: { 'KAYAK': [], 'SAILING': [] },
      futures: { 'KAYAK': [], 'SAILING': [] },

      setActiveClub: (clubId) => set({ activeClub: clubId }),

      login: (email) => {
        const { activeClub, permissions, superAdmins } = get();
        const normalizedEmail = email.toLowerCase().trim();
        
        // Check Super Admin
        if (normalizedEmail === ROOT_ADMIN_EMAIL.toLowerCase() || superAdmins.some(a => a.toLowerCase() === normalizedEmail)) {
          set({ user: { email: normalizedEmail, isAdmin: true } });
          return true;
        }
        
        // Check Club Permission
        if (!activeClub) return false;
        const userPerm = permissions.find(p => p.email.toLowerCase() === normalizedEmail);
        if (userPerm && userPerm.allowedClubs.includes(activeClub)) {
          set({ user: { email: normalizedEmail, isAdmin: false } }); 
          return true;
        }
        return false;
      },

      logout: () => set({ user: null }),

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
          // IMPORTANT: If we are deleting the active club, reset activeClub to null
          // to trigger the protected route redirect and prevent zombie state.
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
          if (email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) return state; // Protect Root
          return {
              superAdmins: state.superAdmins.filter(a => a.toLowerCase() !== email.toLowerCase())
          };
      }),

      // --- Permissions ---
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

      // --- Person Logic ---
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
          }
        };
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

      addBoatDefinition: (def) => set((state) => {
          const { activeClub } = state;
          if (!activeClub) return state;
          const currentSettings = state.clubSettings[activeClub];
          const newDefs = [...currentSettings.boatDefinitions, def];
          
          const currentSession = state.sessions[activeClub];
          const newInventory = { ...currentSession.inventory, [def.id]: def.defaultCount };

          return {
              clubSettings: { ...state.clubSettings, [activeClub]: { ...currentSettings, boatDefinitions: newDefs } },
              sessions: { ...state.sessions, [activeClub]: { ...currentSession, inventory: newInventory } }
          };
      }),

      updateBoatDefinition: (def) => set((state) => {
          const { activeClub } = state;
          if (!activeClub) return state;
          const currentSettings = state.clubSettings[activeClub];
          const newDefs = currentSettings.boatDefinitions.map(d => d.id === def.id ? def : d);
          
          return {
              clubSettings: { ...state.clubSettings, [activeClub]: { ...currentSettings, boatDefinitions: newDefs } }
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
              sessions: { ...state.sessions, [activeClub]: { ...currentSession, inventory: newInventory } }
          };
      }),

      saveBoatDefinitions: (defs) => set((state) => {
          const { activeClub } = state;
          if (!activeClub) return state;
          
          const currentSettings = state.clubSettings[activeClub];
          const currentSession = state.sessions[activeClub];
          
          // Rebuild inventory mapping
          // Keep existing values if ID exists, else use defaultCount
          const newInventory: BoatInventory = {};
          defs.forEach(d => {
              if (currentSession.inventory[d.id] !== undefined) {
                  newInventory[d.id] = currentSession.inventory[d.id];
              } else {
                  newInventory[d.id] = d.defaultCount;
              }
          });

          return {
              clubSettings: { ...state.clubSettings, [activeClub]: { ...currentSettings, boatDefinitions: defs } },
              sessions: { ...state.sessions, [activeClub]: { ...currentSession, inventory: newInventory } }
          };
      }),

      runPairing: () => {
        const { people, activeClub, sessions, clubSettings } = get();
        if (!activeClub) return;
        
        const currentSession = sessions[activeClub];
        const settings = clubSettings[activeClub];

        set((state) => ({
          histories: { ...state.histories, [activeClub]: [] },
          futures: { ...state.futures, [activeClub]: [] }
        }));

        const presentPeople = people.filter(p => 
          p.clubId === activeClub && 
          currentSession.presentPersonIds.includes(p.id)
        );

        const teams = generateSmartPairings(presentPeople, currentSession.inventory, settings.boatDefinitions);
        
        set((state) => ({
          sessions: {
            ...state.sessions,
            [activeClub]: { ...state.sessions[activeClub], teams }
          }
        }));
      },

      resetSession: () => {
        const { activeClub, clubSettings } = get();
        if (!activeClub) return;
        const settings = clubSettings[activeClub];
        const defaultInv = createInventoryFromDefs(settings.boatDefinitions);

        set((state) => ({
          histories: { ...state.histories, [activeClub]: [] },
          futures: { ...state.futures, [activeClub]: [] },
          sessions: {
            ...state.sessions,
            [activeClub]: {
              inventory: defaultInv,
              presentPersonIds: [],
              teams: []
            }
          }
        }));
      },

      addManualTeam: () => {
        const { activeClub, sessions, clubSettings } = get();
        if (!activeClub) return;
        const currentSession = sessions[activeClub];
        const defaultBoatDef = clubSettings[activeClub].boatDefinitions[0];
        const defaultBoatId = defaultBoatDef?.id || DefaultBoatTypes.DOUBLE;

        const newTeam: Team = {
            id: Date.now().toString(),
            members: [],
            boatType: defaultBoatId,
            boatCount: 1
        };

        set((state) => ({
             histories: { 
                 ...state.histories, 
                 [activeClub]: [...(state.histories[activeClub] || []), currentSession.teams] 
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
                 [activeClub]: [...(state.histories[activeClub] || []), currentSession.teams] 
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
                 [activeClub]: [...(state.histories[activeClub] || []), currentSession.teams] 
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

      assignMemberToTeam: (teamId, personId) => {
        const { activeClub, sessions, people } = get();
        if (!activeClub) return;
        const currentSession = sessions[activeClub];
        const person = people.find(p => p.id === personId);
        if (!person) return;

        const newTeams = currentSession.teams.map(t => {
            if (t.id === teamId) {
                return { ...t, members: [...t.members, person] };
            }
            return t;
        });

        set((state) => ({
             histories: { 
                 ...state.histories, 
                 [activeClub]: [...(state.histories[activeClub] || []), currentSession.teams] 
             },
             futures: { ...state.futures, [activeClub]: [] },
             sessions: {
                 ...state.sessions,
                 [activeClub]: { 
                     ...currentSession, 
                     presentPersonIds: Array.from(new Set([...currentSession.presentPersonIds, person.id])),
                     teams: newTeams 
                 }
             }
        }));
      },

      removeMemberFromTeam: (teamId, personId) => {
        const { activeClub, sessions } = get();
        if (!activeClub) return;
        const currentSession = sessions[activeClub];

        const newTeams = currentSession.teams.map(t => {
            if (t.id === teamId) {
                return { ...t, members: t.members.filter(m => m.id !== personId) };
            }
            return t;
        });

        set((state) => ({
             histories: { 
                 ...state.histories, 
                 [activeClub]: [...(state.histories[activeClub] || []), currentSession.teams] 
             },
             futures: { ...state.futures, [activeClub]: [] },
             sessions: {
                 ...state.sessions,
                 [activeClub]: { ...currentSession, teams: newTeams }
             }
        }));
      },

      moveMemberToTeam: (personId, targetTeamId) => {
        const { activeClub, sessions, people } = get();
        if (!activeClub) return;
        const currentSession = sessions[activeClub];
        const person = people.find(p => p.id === personId);
        if (!person) return;
        
        // Remove from source
        let newTeams = currentSession.teams.map(t => ({
            ...t, members: t.members.filter(m => m.id !== personId)
        }));
        // Add to target
        newTeams = newTeams.map(t => t.id === targetTeamId ? { ...t, members: [...t.members, person] } : t);

        set(state => ({
            histories: { ...state.histories, [activeClub]: [...(state.histories[activeClub]||[]), currentSession.teams]},
            sessions: { ...state.sessions, [activeClub]: { ...currentSession, teams: newTeams } }
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
      version: 12.0, // Force migration to load new people
      migrate: (persistedState: any, version: number) => {
        // Simple migration to ensure people list is populated if it was empty or old
        let state = persistedState as AppState;
        
        // If coming from old version, re-inject initial people if list is small or empty to ensure demo data
        if (version < 12) {
             state.people = INITIAL_PEOPLE; // Reset people to new demo data
        }
        
        return state;
      },
      partialize: (state) => ({
        user: state.user,
        people: state.people,
        sessions: state.sessions,
        clubSettings: state.clubSettings,
        permissions: state.permissions,
        clubs: state.clubs,
        superAdmins: state.superAdmins
      })
    }
  )
);
