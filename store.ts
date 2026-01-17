
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Person, Role, SessionState, Team, BoatInventory, BoatType, ClubID, UserPermission, 
  Gender, ClubSettings, BoatDefinition, Club, SyncStatus, RoleColor, Participant, ClubMembership
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
  
  // Actions
  loginWithGoogle: () => Promise<boolean>;
  loginDev: (email: string) => boolean;
  logout: () => Promise<void>;
  setActiveClub: (clubId: ClubID) => void;
  setSyncStatus: (status: SyncStatus) => void;
  
  // Super Admin Actions (Restricted for God Mode)
  addClub: (label: string) => void;
  removeClub: (id: string) => void;
  addSuperAdmin: (email: string) => void;
  removeSuperAdmin: (email: string) => void;
  addPermission: (email: string, clubId: ClubID) => void;
  removePermission: (email: string, clubId: ClubID) => void;
  
  // Identity & Membership Actions
  addParticipant: (p: Omit<Participant, 'id' | 'createdAt' | 'memberships'>) => string;
  updateParticipant: (p: Partial<Participant> & { id: string }) => void;
  addMemberToClub: (participantId: string, clubId: ClubID, membership: Omit<ClubMembership, 'joinedClubAt' | 'participationDates'>) => void;
  removeMemberFromClub: (participantId: string, clubId: ClubID) => void;
  
  // Session Actions
  toggleAttendance: (id: string) => void;
  setBulkAttendance: (ids: string[]) => void;
  updateInventory: (inventory: BoatInventory) => void;
  runPairing: () => void;
  resetSession: () => void;

  // Settings
  updateRoleColor: (role: Role, color: RoleColor) => void;
  saveBoatDefinitions: (defs: BoatDefinition[]) => void;
  
  setCloudData: (data: any) => void;
  restoreDemoData: () => void;
  
  // Reorder/Manual UI Helpers
  reorderSessionMembers: (sourceTeamId: string, sourceIndex: number, destTeamId: string, destIndex: number) => void;
  swapMembers: (teamAId: string, indexA: number, teamBId: string, indexB: number) => void;
  updateTeamBoatType: (teamId: string, boatType: BoatType) => void;
  undo: () => void;
  redo: () => void;
}

const flattenParticipant = (p: Participant, clubId: ClubID): Person | null => {
    const membership = p.memberships[clubId];
    if (!membership) return null;
    return { ...membership, id: p.id, name: p.name, gender: p.gender, phone: p.phone, email: p.email, clubId };
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
      people: [],
      sessions: {
        'KAYAK': { ...EMPTY_SESSION, inventory: createInventoryFromDefs(KAYAK_DEFINITIONS) },
        'SAILING': { ...EMPTY_SESSION, inventory: createInventoryFromDefs(SAILING_DEFINITIONS) },
      },
      clubSettings: {
        'KAYAK': { boatDefinitions: KAYAK_DEFINITIONS, roleColors: { ...DEFAULT_ROLE_COLORS } },
        'SAILING': { boatDefinitions: SAILING_DEFINITIONS, roleColors: { ...DEFAULT_ROLE_COLORS } },
      },

      setActiveClub: (clubId) => set({ activeClub: clubId }),
      setSyncStatus: (status) => set({ syncStatus: status }),

      loginWithGoogle: async () => {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          const email = (result.user.email || '').toLowerCase().trim();
          const { activeClub, permissions, superAdmins } = get();
          const isSuperAdmin = email === ROOT_ADMIN_EMAIL.toLowerCase() || superAdmins.some(a => a.toLowerCase() === email);
          const userPerm = permissions.find(p => p.email.toLowerCase() === email);
          const hasClubAccess = userPerm && activeClub && userPerm.allowedClubs.includes(activeClub);

          if (isSuperAdmin || hasClubAccess) {
            set({ user: { email, isAdmin: isSuperAdmin, photoURL: result.user.photoURL || undefined } });
            return true;
          }
          await signOut(auth);
          alert('אין לך הרשאות גישה.');
          return false;
        } catch (error) { return false; }
      },

      loginDev: (email) => {
        const normalized = email.toLowerCase().trim();
        const isSuperAdmin = normalized === ROOT_ADMIN_EMAIL.toLowerCase() || get().superAdmins.some(a => a.toLowerCase() === normalized);
        set({ user: { email: normalized, isAdmin: isSuperAdmin } });
        return true;
      },

      logout: async () => { await signOut(auth); set({ user: null }); },

      addSuperAdmin: (email) => set(state => ({ superAdmins: Array.from(new Set([...state.superAdmins, email.toLowerCase().trim()])) })),
      removeSuperAdmin: (email) => set(state => {
          if (email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase()) {
              alert("לא ניתן להסיר את מנהל העל הראשי.");
              return state;
          }
          return { superAdmins: state.superAdmins.filter(a => a.toLowerCase() !== email.toLowerCase()) };
      }),

      addClub: (label) => set(state => {
          const newId = 'CLUB-' + Date.now();
          return {
              clubs: [...state.clubs, { id: newId, label }],
              clubSettings: { ...state.clubSettings, [newId]: { boatDefinitions: [], roleColors: { ...DEFAULT_ROLE_COLORS } } },
              sessions: { ...state.sessions, [newId]: { ...EMPTY_SESSION } }
          };
      }),

      removeClub: (id) => set(state => ({ clubs: state.clubs.filter(c => c.id !== id) })),

      addPermission: (email, clubId) => set(state => {
          const existing = state.permissions.find(p => p.email === email);
          const newPerms = existing 
            ? state.permissions.map(p => p.email === email ? { ...p, allowedClubs: Array.from(new Set([...p.allowedClubs, clubId])) } : p)
            : [...state.permissions, { email, allowedClubs: [clubId] }];
          return { permissions: newPerms };
      }),

      removePermission: (email, clubId) => set(state => ({
          permissions: state.permissions.map(p => p.email === email ? { ...p, allowedClubs: p.allowedClubs.filter(c => c !== clubId) } : p).filter(p => p.allowedClubs.length > 0)
      })),

      addParticipant: (data) => {
          const id = Date.now().toString();
          const newP: Participant = { ...data, id, createdAt: new Date().toISOString(), memberships: {} };
          set(state => ({ people: [...state.people, newP] }));
          return id;
      },

      updateParticipant: (update) => set(state => ({
          people: state.people.map(p => p.id === update.id ? { ...p, ...update } : p)
      })),

      addMemberToClub: (pId, clubId, membership) => set(state => ({
          people: state.people.map(p => p.id === pId ? {
              ...p, memberships: { ...p.memberships, [clubId]: { ...membership, joinedClubAt: new Date().toISOString(), participationDates: [] } }
          } : p)
      })),

      removeMemberFromClub: (pId, clubId) => set(state => ({
          people: state.people.map(p => {
              if (p.id === pId) {
                  const newM = { ...p.memberships };
                  delete newM[clubId];
                  return { ...p, memberships: newM };
              }
              return p;
          }).filter(p => Object.keys(p.memberships).length > 0)
      })),

      toggleAttendance: (id) => set(state => {
          const clubId = state.activeClub;
          if (!clubId) return state;
          const session = state.sessions[clubId];
          const isPresent = session.presentPersonIds.includes(id);
          const newPresent = isPresent ? session.presentPersonIds.filter(pid => pid !== id) : [...session.presentPersonIds, id];
          
          return {
              sessions: { ...state.sessions, [clubId]: { ...session, presentPersonIds: newPresent } }
          };
      }),

      runPairing: () => {
          const { activeClub, people, sessions, clubSettings } = get();
          if (!activeClub) return;
          const session = sessions[activeClub];
          const settings = clubSettings[activeClub];
          const presentPeople = people
            .filter(p => p.memberships[activeClub] && session.presentPersonIds.includes(p.id))
            .map(p => flattenParticipant(p, activeClub)!);
          
          const teams = generateSmartPairings(presentPeople, session.inventory, settings.boatDefinitions);
          
          // Log participation dates
          const today = new Date().toISOString().split('T')[0];
          const updatedPeople = people.map(p => {
              if (session.presentPersonIds.includes(p.id) && p.memberships[activeClub]) {
                  const m = p.memberships[activeClub];
                  if (!m.participationDates.includes(today)) {
                      return { ...p, memberships: { ...p.memberships, [activeClub]: { ...m, participationDates: [...m.participationDates, today], lastParticipation: today } } };
                  }
              }
              return p;
          });

          set(state => ({ 
              people: updatedPeople,
              sessions: { ...state.sessions, [activeClub]: { ...session, teams } },
              pairingDirty: false 
          }));
      },

      updateRoleColor: (role, color) => set(state => {
          if (!state.activeClub) return state;
          const clubId = state.activeClub;
          return { clubSettings: { ...state.clubSettings, [clubId]: { ...state.clubSettings[clubId], roleColors: { ...state.clubSettings[clubId].roleColors, [role]: color } } } };
      }),

      setCloudData: (data) => set(state => ({
          people: data.people || state.people,
          sessions: { ...state.sessions, ...data.sessions },
          clubSettings: { ...state.clubSettings, ...data.settings },
          syncStatus: 'SYNCED'
      })),

      restoreDemoData: () => set(() => {
          const participantsMap: Record<string, Participant> = {};
          INITIAL_PEOPLE.forEach(p => {
              if (!participantsMap[p.id]) {
                  participantsMap[p.id] = { id: p.id, name: p.name, gender: p.gender, phone: p.phone, createdAt: new Date().toISOString(), memberships: {} };
              }
              const { clubId, role, rank, isSkipper } = p;
              participantsMap[p.id].memberships[clubId] = { role, rank, isSkipper, joinedClubAt: new Date().toISOString(), participationDates: [] };
          });
          return { people: Object.values(participantsMap) };
      }),

      // Reorder/Manual Logic (Kept consistent with previous logic)
      reorderSessionMembers: (sId, sIdx, dId, dIdx) => {
         const clubId = get().activeClub;
         if (!clubId) return;
         const session = get().sessions[clubId];
         const newTeams = JSON.parse(JSON.stringify(session.teams));
         const sTeam = newTeams.find((t:any) => t.id === sId);
         const dTeam = newTeams.find((t:any) => t.id === dId);
         if(sTeam && dTeam) {
             const [moved] = sTeam.members.splice(sIdx, 1);
             dTeam.members.splice(dIdx, 0, moved);
             set(state => ({ sessions: { ...state.sessions, [clubId]: { ...session, teams: newTeams }} }));
         }
      },
      swapMembers: (tAId, iA, tBId, iB) => {
        const clubId = get().activeClub;
        if (!clubId) return;
        const session = get().sessions[clubId];
        const newTeams = JSON.parse(JSON.stringify(session.teams));
        const tA = newTeams.find((t:any) => t.id === tAId);
        const tB = newTeams.find((t:any) => t.id === tBId);
        if (tA && tB) {
            const temp = tA.members[iA];
            tA.members[iA] = tB.members[iB];
            tB.members[iB] = temp;
            set(state => ({ sessions: { ...state.sessions, [clubId]: { ...session, teams: newTeams }} }));
        }
      },
      updateTeamBoatType: (tId, bType) => {
         const clubId = get().activeClub;
         if (!clubId) return;
         const session = get().sessions[clubId];
         const newTeams = session.teams.map(t => t.id === tId ? { ...t, boatType: bType } : t);
         set(state => ({ sessions: { ...state.sessions, [clubId]: { ...session, teams: newTeams }} }));
      },
      resetSession: () => {
          const clubId = get().activeClub;
          if (!clubId) return;
          const settings = get().clubSettings[clubId];
          set(state => ({ sessions: { ...state.sessions, [clubId]: { inventory: createInventoryFromDefs(settings.boatDefinitions), presentPersonIds: [], teams: [] } } }));
      },
      updateInventory: (inventory) => set(state => {
          if (!state.activeClub) return state;
          return { sessions: { ...state.sessions, [state.activeClub]: { ...state.sessions[state.activeClub], inventory } } };
      }),
      saveBoatDefinitions: (defs) => set(state => {
          if (!state.activeClub) return state;
          return { clubSettings: { ...state.clubSettings, [state.activeClub]: { ...state.clubSettings[state.activeClub], boatDefinitions: defs } } };
      }),
      undo: () => {}, redo: () => {} // Historical UNDO can be added later if requested
    }),
    {
      name: 'etgarim-crm-storage',
      version: 35.0, 
      partialize: (state) => ({
        user: state.user,
        people: state.people,
        clubs: state.clubs,
        superAdmins: state.superAdmins,
        clubSettings: state.clubSettings,
        sessions: state.sessions
      })
    }
  )
);
