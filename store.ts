import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Person, SessionState, ClubID, UserPermission, 
  ClubSettings, BoatDefinition, Club, SyncStatus,
  UserProfile, ClubMembership, PersonSnapshot, Team
} from './types';
import { generateSmartPairings } from './services/pairingLogic';
import { DEFAULT_CLUBS, INITIAL_PEOPLE, KAYAK_DEFINITIONS, SAILING_DEFINITIONS } from './mockData';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { getUserProfile, getUserMemberships } from './services/profileService';

const EMPTY_SESSION = { inventory: {}, presentPersonIds: [], teams: [] };

// הגדרה מדויקת יותר כדי למנוע שגיאות TS ברכיבים הישנים
interface AppState {
  // --- Auth & User ---
  user: { uid: string; email: string; isAdmin: boolean; photoURL?: string } | null;
  userProfile: UserProfile | null;
  memberships: ClubMembership[];
  authInitialized: boolean;
  
  // --- Global State ---
  activeClub: ClubID | null;
  syncStatus: SyncStatus;
  clubs: Club[];
  superAdmins: string[]; 
  protectedAdmins: string[]; 
  permissions: UserPermission[];
  
  // --- Data ---
  people: Person[];
  snapshots: Record<ClubID, PersonSnapshot[]>;
  sessions: Record<ClubID, SessionState>;
  clubSettings: Record<ClubID, ClubSettings>;
  pairingDirty: boolean;

  // --- Actions: Auth ---
  loginWithGoogle: () => Promise<boolean>;
  loginDev: (email?: string, isAdmin?: boolean) => Promise<void>; // תוקן לקבלת פרמטרים
  logout: () => Promise<void>;
  loadUserResources: (uid: string) => Promise<void>;
  setAuthInitialized: (isAuth: boolean) => void;
  setUserProfile: (profile: UserProfile) => void;
  isManagerOf: (clubId: ClubID) => boolean;
  
  // --- Actions: Global ---
  setActiveClub: (clubId: ClubID) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setGlobalConfig: (config: { superAdmins: string[], protectedAdmins?: string[] }) => void;
  setCloudData: (data: any) => void;

  // --- Actions: Permissions & Admin ---
  addPermission: (email: string, clubId: ClubID) => void;
  removePermission: (email: string, clubId: ClubID) => void;
  addClub: (name: string, id?: string) => void; // תוקן: id אופציונלי
  removeClub: (id: string) => void;
  addSuperAdmin: (email: string) => void;
  removeSuperAdmin: (email: string) => void;
  
  // --- Actions: People ---
  addPerson: (person: Omit<Person, 'clubId'>) => void;
  updatePerson: (person: Person) => void;
  removePerson: (id: string) => void;
  
  // --- Actions: Session & Inventory ---
  toggleAttendance: (id: string) => void;
  setBulkAttendance: (ids: string[]) => void;
  updateInventory: (inventoryOrType: any, count?: number) => void; // תוקן: תמיכה בשתי השיטות
  saveBoatDefinitions: (defs: BoatDefinition[]) => void;
  resetSession: () => void;
  
  // --- Actions: Pairing Logic ---
  runPairing: () => void;
  addManualTeam: () => void;
  removeTeam: (teamId: string) => void;
  addGuestToTeam: (teamId: string, guestName: string) => void;
  assignMemberToTeam: (personId: string, teamId: string) => void;
  removeMemberFromTeam: (teamId: string, memberId: string) => void;
  swapMembers: (teamId: string, memberId: string, targetTeamId: string) => void;
  reorderSessionMembers: (sId: string, sIdx: number, dId: string, dIdx: number) => void;
  updateTeamBoatType: (teamId: string, boatType: string) => void;

  // --- History (Dummy for compatibility) ---
  histories: any[];
  futures: any[];
  undo: () => void;
  redo: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // --- Initial State ---
      user: null, userProfile: null, memberships: [], activeClub: null,
      syncStatus: 'OFFLINE', authInitialized: false,
      clubs: DEFAULT_CLUBS, superAdmins: [], protectedAdmins: [], permissions: [], 
      people: INITIAL_PEOPLE,
      snapshots: {},
      sessions: {
        'KAYAK': { ...EMPTY_SESSION, inventory: { 'DOUBLE': 5, 'SINGLE': 3 } },
        'SAILING': { ...EMPTY_SESSION, inventory: { 'sonar': 2, 'hanse': 1 } },
      },
      clubSettings: {
        'KAYAK': { boatDefinitions: KAYAK_DEFINITIONS },
        'SAILING': { boatDefinitions: SAILING_DEFINITIONS },
      },
      pairingDirty: false,
      histories: [], futures: [],

      // --- Auth Actions ---
      setAuthInitialized: (val) => set({ authInitialized: val }),
      
      loginWithGoogle: async () => {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          const email = result.user.email?.toLowerCase().trim() || '';
          const uid = result.user.uid;
          const { superAdmins, protectedAdmins } = get();
          const isSuper = superAdmins.some(a => a.toLowerCase() === email) || protectedAdmins.some(a => a.toLowerCase() === email);
          set({ user: { uid, email, isAdmin: isSuper, photoURL: result.user.photoURL || undefined } });
          await get().loadUserResources(uid);
          return true;
        } catch (error) { return false; }
      },

      loginDev: async (email = 'dev@local', isAdmin = true) => { 
        console.warn("Dev login active");
        set({ user: { uid: 'dev-uid', email, isAdmin } });
      }, 

      loadUserResources: async (uid) => {
          const profile = await getUserProfile(uid);
          const memberships = await getUserMemberships(uid);
          set({ userProfile: profile, memberships });
      },

      setUserProfile: (profile) => set({ userProfile: profile }),

      isManagerOf: (clubId) => {
          const { user, permissions } = get();
          if (!user) return false;
          if (user.isAdmin) return true;
          return permissions.some(p => p.email.toLowerCase() === user.email.toLowerCase() && p.allowedClubs.includes(clubId));
      },

      logout: async () => {
        await signOut(auth);
        set({ user: null, userProfile: null, memberships: [], activeClub: null });
      },

      // --- Global Actions ---
      setActiveClub: (clubId) => set({ activeClub: clubId }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      setGlobalConfig: (config) => set({ 
          superAdmins: config.superAdmins.map(a => a.toLowerCase().trim()),
          protectedAdmins: (config.protectedAdmins || []).map(a => a.toLowerCase().trim())
      }),

      setCloudData: (data) => set((state) => ({
        people: data.people || state.people,
        snapshots: { ...state.snapshots, ...data.snapshots },
        sessions: { ...state.sessions, ...data.sessions },
        clubSettings: { ...state.clubSettings, ...data.settings },
        syncStatus: 'SYNCED'
      })),

      // --- Admin Actions ---
      addPermission: (email, clubId) => set(state => {
        const existing = state.permissions.find(p => p.email === email);
        if (existing) {
            return { permissions: state.permissions.map(p => p.email === email ? { ...p, allowedClubs: Array.from(new Set([...p.allowedClubs, clubId])) } : p) };
        }
        return { permissions: [...state.permissions, { email, allowedClubs: [clubId] }] };
      }),

      removePermission: (email, clubId) => set(state => ({
        permissions: state.permissions.map(p => p.email === email ? { ...p, allowedClubs: p.allowedClubs.filter(c => c !== clubId) } : p).filter(p => p.allowedClubs.length > 0)
      })),

      addClub: (nameOrId, optionalId) => set(state => {
          const id = optionalId || nameOrId.toUpperCase().replace(/\s+/g, '_');
          const name = optionalId ? nameOrId : nameOrId; 
          return { clubs: [...state.clubs, { id, name, label: name }] }; // הוספנו label
      }),

      removeClub: (id) => set(state => ({ clubs: state.clubs.filter(c => c.id !== id) })),
      addSuperAdmin: (email) => set(state => ({ superAdmins: [...state.superAdmins, email] })),
      removeSuperAdmin: (email) => set(state => ({ superAdmins: state.superAdmins.filter(e => e !== email) })),

      // --- People Actions ---
      addPerson: (data) => set(state => ({ people: [...state.people, { ...data, clubId: state.activeClub! }] })),
      updatePerson: (p) => set(state => ({ people: state.people.map(old => old.id === p.id ? p : old) })),
      removePerson: (id) => set(state => ({ people: state.people.filter(p => p.id !== id) })),

      // --- Session Logic ---
      toggleAttendance: (id) => set(state => {
        const { activeClub, sessions } = state;
        if (!activeClub) return {};
        const session = sessions[activeClub];
        const isPresent = session.presentPersonIds.includes(id);
        const newPresent = isPresent 
          ? session.presentPersonIds.filter(pid => pid !== id)
          : [...session.presentPersonIds, id];
        return { sessions: { ...sessions, [activeClub]: { ...session, presentPersonIds: newPresent } } };
      }),

      setBulkAttendance: (ids) => set(state => {
         const { activeClub } = state;
         if (!activeClub) return {};
         return { sessions: { ...state.sessions, [activeClub]: { ...state.sessions[activeClub], presentPersonIds: ids } } };
      }),

      // תיקון קריטי: תמיכה גם באובייקט מלא וגם ב-(type, count)
      updateInventory: (inventoryOrType, count) => set(state => {
        const { activeClub } = state;
        if (!activeClub) return {};
        
        let newInventory;
        if (typeof inventoryOrType === 'object') {
             // הרכיב שלח אובייקט מלא
             newInventory = inventoryOrType;
        } else {
             // הרכיב שלח type, count
             newInventory = { ...state.sessions[activeClub].inventory, [inventoryOrType]: count };
        }

        return { 
          sessions: { 
            ...state.sessions, 
            [activeClub]: { ...state.sessions[activeClub], inventory: newInventory } 
          } 
        };
      }),

      saveBoatDefinitions: (defs) => set(state => {
          const clubId = state.activeClub!;
          return { clubSettings: { ...state.clubSettings, [clubId]: { boatDefinitions: defs } } };
      }),

      // --- Pairing Logic ---
      runPairing: () => {
        const { people, activeClub, sessions, clubSettings } = get();
        if (!activeClub) return;
        const session = sessions[activeClub];
        const settings = clubSettings[activeClub];
        const present = people.filter(p => p.clubId === activeClub && session.presentPersonIds.includes(p.id));
        const teams = generateSmartPairings(present, session.inventory, settings.boatDefinitions);
        set(state => ({ sessions: { ...state.sessions, [activeClub]: { ...session, teams } }, pairingDirty: false }));
      },

      resetSession: () => {
        const { activeClub } = get();
        if (!activeClub) return;
        set(state => ({ sessions: { ...state.sessions, [activeClub]: { inventory: {}, presentPersonIds: [], teams: [] } } }));
      },

      addManualTeam: () => set(state => {
        const { activeClub } = state;
        if (!activeClub) return {};
        // הוספנו boatCount: 1 כדי למנוע קריסה
        const newTeam: Team = { id: crypto.randomUUID(), boatType: 'MANUAL', members: [], boatCount: 1 };
        const session = state.sessions[activeClub];
        return { sessions: { ...state.sessions, [activeClub]: { ...session, teams: [...session.teams, newTeam] } } };
      }),

      removeTeam: (teamId) => set(state => {
        const { activeClub } = state;
        if (!activeClub) return {};
        const session = state.sessions[activeClub];
        return { sessions: { ...state.sessions, [activeClub]: { ...session, teams: session.teams.filter(t => t.id !== teamId) } } };
      }),

      addGuestToTeam: (teamId, guestName) => { /* Placeholder */ },
      assignMemberToTeam: (personId, teamId) => { /* Placeholder */ },
      removeMemberFromTeam: (teamId, memberId) => { /* Placeholder */ },
      swapMembers: (t1, m1, t2) => { /* Placeholder */ },

      reorderSessionMembers: (sId, sIdx, dId, dIdx) => {
         const { activeClub, sessions } = get();
         if (!activeClub) return;
         const session = sessions[activeClub];
         const newTeams = JSON.parse(JSON.stringify(session.teams));
         const sTeam = newTeams.find((t:any) => t.id === sId);
         const dTeam = newTeams.find((t:any) => t.id === dId);
         if(sTeam && dTeam) {
             const [moved] = sTeam.members.splice(sIdx, 1);
             dTeam.members.splice(dIdx, 0, moved);
             set(state => ({ sessions: { ...state.sessions, [activeClub]: { ...session, teams: newTeams } } }));
         }
      },

      updateTeamBoatType: (tId, bType) => {
         const { activeClub, sessions } = get();
         if (!activeClub) return;
         const session = sessions[activeClub];
         const newTeams = session.teams.map(t => t.id === tId ? { ...t, boatType: bType } : t);
         set(state => ({ sessions: { ...state.sessions, [activeClub]: { ...session, teams: newTeams } } }));
      },

      // --- Undo/Redo ---
      undo: () => {},
      redo: () => {},
    }),
    {
      name: 'etgarim-storage',
      version: 43.0,
      partialize: (state) => ({
        user: state.user, userProfile: state.userProfile, memberships: state.memberships,
        people: state.people, snapshots: state.snapshots, sessions: state.sessions, clubSettings: state.clubSettings,
        permissions: state.permissions, clubs: state.clubs, superAdmins: state.superAdmins
      })
    }
  )
);