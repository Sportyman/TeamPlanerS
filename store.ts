
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Person, Role, SessionState, Team, BoatInventory, ClubID, UserPermission, 
  Gender, ClubSettings, BoatDefinition, Club, SyncStatus,
  UserProfile, ClubMembership, PersonSnapshot
} from './types';
import { generateSmartPairings } from './services/pairingLogic';
import { DEFAULT_CLUBS, INITIAL_PEOPLE, KAYAK_DEFINITIONS, SAILING_DEFINITIONS } from './mockData';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { getUserProfile, getUserMemberships } from './services/profileService';

const EMPTY_SESSION = { inventory: {}, presentPersonIds: [], teams: [] };

interface AppState {
  user: { uid: string; email: string; isAdmin: boolean; photoURL?: string } | null;
  userProfile: UserProfile | null;
  memberships: ClubMembership[];
  activeClub: ClubID | null;
  syncStatus: SyncStatus;
  authInitialized: boolean;
  
  clubs: Club[];
  superAdmins: string[]; 
  protectedAdmins: string[]; 
  permissions: UserPermission[];
  
  people: Person[];
  // Added snapshots property to track historical data per club
  snapshots: Record<ClubID, PersonSnapshot[]>;
  sessions: Record<ClubID, SessionState>;
  clubSettings: Record<ClubID, ClubSettings>;
  
  // Auth & Permissions
  loginWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  loadUserResources: (uid: string) => Promise<void>;
  isManagerOf: (clubId: ClubID) => boolean;
  
  // App Actions
  setActiveClub: (clubId: ClubID) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setGlobalConfig: (config: { superAdmins: string[], protectedAdmins?: string[] }) => void;
  addPermission: (email: string, clubId: ClubID) => void;
  removePermission: (email: string, clubId: ClubID) => void;
  
  // Data actions
  setCloudData: (data: any) => void;
  addPerson: (person: Omit<Person, 'clubId'>) => void;
  updatePerson: (person: Person) => void;
  removePerson: (id: string) => void;
  saveBoatDefinitions: (defs: BoatDefinition[]) => void;
  runPairing: () => void;
  resetSession: () => void;
  
  // Session Board (DND etc)
  reorderSessionMembers: (sId: string, sIdx: number, dId: string, dIdx: number) => void;
  updateTeamBoatType: (teamId: string, boatType: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null, userProfile: null, memberships: [], activeClub: null,
      syncStatus: 'OFFLINE', authInitialized: false,
      clubs: DEFAULT_CLUBS, superAdmins: [], protectedAdmins: [], permissions: [], 
      people: INITIAL_PEOPLE,
      // Initialized snapshots record
      snapshots: {},
      sessions: {
        'KAYAK': { ...EMPTY_SESSION, inventory: { 'DOUBLE': 5, 'SINGLE': 3 } },
        'SAILING': { ...EMPTY_SESSION, inventory: { 'sonar': 2, 'hanse': 1 } },
      },
      clubSettings: {
        'KAYAK': { boatDefinitions: KAYAK_DEFINITIONS },
        'SAILING': { boatDefinitions: SAILING_DEFINITIONS },
      },

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

      loadUserResources: async (uid) => {
          const profile = await getUserProfile(uid);
          const memberships = await getUserMemberships(uid);
          set({ userProfile: profile, memberships });
      },

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

      setActiveClub: (clubId) => set({ activeClub: clubId }),
      setSyncStatus: (status) => set({ syncStatus: status }),
      setGlobalConfig: (config) => set({ 
          superAdmins: config.superAdmins.map(a => a.toLowerCase().trim()),
          protectedAdmins: (config.protectedAdmins || []).map(a => a.toLowerCase().trim())
      }),

      setCloudData: (data) => set((state) => ({
        people: data.people || state.people,
        // Merging in snapshots from cloud data
        snapshots: { ...state.snapshots, ...data.snapshots },
        sessions: { ...state.sessions, ...data.sessions },
        clubSettings: { ...state.clubSettings, ...data.settings },
        syncStatus: 'SYNCED'
      })),

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

      addPerson: (data) => set(state => ({ people: [...state.people, { ...data, clubId: state.activeClub! }] })),
      updatePerson: (p) => set(state => ({ people: state.people.map(old => old.id === p.id ? p : old) })),
      removePerson: (id) => set(state => ({ people: state.people.filter(p => p.id !== id) })),

      saveBoatDefinitions: (defs) => set(state => {
          const clubId = state.activeClub!;
          return { clubSettings: { ...state.clubSettings, [clubId]: { boatDefinitions: defs } } };
      }),

      runPairing: () => {
        const { people, activeClub, sessions, clubSettings } = get();
        if (!activeClub) return;
        const session = sessions[activeClub];
        const settings = clubSettings[activeClub];
        const present = people.filter(p => p.clubId === activeClub && session.presentPersonIds.includes(p.id));
        const teams = generateSmartPairings(present, session.inventory, settings.boatDefinitions);
        set(state => ({ sessions: { ...state.sessions, [activeClub]: { ...session, teams } } }));
      },

      resetSession: () => {
        const { activeClub, clubSettings } = get();
        if (!activeClub) return;
        set(state => ({ sessions: { ...state.sessions, [activeClub]: { inventory: {}, presentPersonIds: [], teams: [] } } }));
      },

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
      }
    }),
    {
      name: 'etgarim-storage',
      version: 42.0,
      partialize: (state) => ({
        user: state.user, userProfile: state.userProfile, memberships: state.memberships,
        people: state.people, snapshots: state.snapshots, sessions: state.sessions, clubSettings: state.clubSettings,
        permissions: state.permissions, clubs: state.clubs, superAdmins: state.superAdmins
      })
    }
  )
);
