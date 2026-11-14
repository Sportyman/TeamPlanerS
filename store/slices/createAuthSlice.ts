import { StateCreator } from 'zustand';
import { AppState } from '../store';
import { auth, googleProvider } from '../../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { getUserProfile, getUserMemberships } from '../../services/profileService';
import { fetchGlobalConfig } from '../../services/syncService';
import { UserProfile, ClubMembership, UserPermission, ClubID, Gender, MembershipStatus, AccessLevel } from '../../types';

export interface AuthSlice {
  user: { uid: string; email: string; isAdmin: boolean; photoURL?: string; isDev?: boolean } | null;
  userProfile: UserProfile | null;
  memberships: ClubMembership[];
  superAdmins: string[];
  protectedAdmins: string[];
  permissions: UserPermission[];
  authInitialized: boolean;
  isLoadingResources: boolean;
  authError: string | null;

  loginWithGoogle: () => Promise<boolean>;
  loginDev: (email: string, isAdmin: boolean) => boolean;
  logout: () => Promise<void>;
  setUserProfile: (profile: UserProfile) => void;
  loadUserResources: (uid: string) => Promise<void>;
  setAuthInitialized: (initialized: boolean) => void;
  setAuthError: (error: string | null) => void;
  refreshMemberships: () => Promise<void>;
  addSuperAdmin: (email: string) => void;
  removeSuperAdmin: (email: string) => void;
  addPermission: (email: string, clubId: ClubID, level: AccessLevel) => void;
  removePermission: (email: string, clubId: ClubID) => void;
}

export const createAuthSlice: StateCreator<AppState, [], [], AuthSlice> = (set, get) => ({
  user: null,
  userProfile: null,
  memberships: [],
  superAdmins: [],
  protectedAdmins: [],
  permissions: [],
  authInitialized: false,
  isLoadingResources: false,
  authError: null,

  loginWithGoogle: async () => {
    set({ authError: null, isLoadingResources: true });
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email?.toLowerCase().trim() || '';
      const uid = result.user.uid;
      await fetchGlobalConfig();
      const { superAdmins, protectedAdmins } = get();
      const isSuperAdmin = superAdmins.some(a => a.toLowerCase() === email) || protectedAdmins.some(a => a.toLowerCase() === email);

      set({ user: { uid, email, isAdmin: isSuperAdmin, photoURL: result.user.photoURL || undefined, isDev: false }, isLoadingResources: true });
      await get().loadUserResources(uid);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      set({ authError: 'התחברות בוטלה או נכשלה.', isLoadingResources: false });
      return false;
    }
  },

  loginDev: (email, isAdmin) => {
    set({ authError: null, isLoadingResources: false });
    const uid = 'dev-user-' + Date.now();
    const devEmail = email || 'dev@example.com';
    const { activeClub } = get();

    const mockProfile: UserProfile = {
      uid, firstName: 'מפתח', lastName: 'מערכת', email: devEmail, contactEmail: devEmail,
      gender: Gender.MALE, birthDate: '1990-01-01', primaryPhone: '050-000-0000',
      emergencyContacts: [], medicalNotes: 'חשבון פיתוח - כניסה מהירה',
      certifications: [], isSkipper: true, joinedSystemDate: new Date().toISOString(),
    };
    const mockMemberships: ClubMembership[] = activeClub ? [{
      uid, clubId: activeClub, role: (isAdmin ? 'INSTRUCTOR' : 'VOLUNTEER') as any,
      status: MembershipStatus.ACTIVE, joinedClubDate: new Date().toISOString(), rank: 5,
    }] : [];

    set({ user: { uid, email: devEmail, isAdmin, isDev: true }, userProfile: mockProfile, memberships: mockMemberships, authInitialized: true });
    return true;
  },

  logout: async () => {
    try { await signOut(auth); } catch {}
    set({ user: null, userProfile: null, memberships: [], activeClub: null, isLoadingResources: false });
  },

  setUserProfile: (profile) => set({ userProfile: profile }),

  loadUserResources: async (uid) => {
    if (uid.startsWith('dev-user-')) return;
    set({ isLoadingResources: true });
    try {
      await fetchGlobalConfig();
      const [profile, memberships] = await Promise.all([getUserProfile(uid), getUserMemberships(uid)]);
      const { user, superAdmins, protectedAdmins } = get();
      const email = user?.email?.toLowerCase() || '';
      const isSuperAdmin = superAdmins.some(a => a.toLowerCase() === email) || protectedAdmins.some(a => a.toLowerCase() === email);
      set({
        userProfile: profile,
        memberships,
        user: user ? { ...user, isAdmin: isSuperAdmin } : user,
        isLoadingResources: false,
      });
    } catch (e) {
      console.error("Resource loading failed", e);
      set({ isLoadingResources: false });
    }
  },

  setAuthInitialized: (val) => set({ authInitialized: val }),
  setAuthError: (err) => set({ authError: err }),

  refreshMemberships: async () => {
    const { user } = get();
    if (user && !user.isDev) {
      const ms = await getUserMemberships(user.uid);
      set({ memberships: ms });
    }
  },

  addSuperAdmin: (email) => set(state => {
    const normalized = email.toLowerCase().trim();
    if (state.superAdmins.includes(normalized)) return state;
    return { superAdmins: [...state.superAdmins, normalized] };
  }),

  removeSuperAdmin: (email) => set(state => {
    const normalized = email.toLowerCase().trim();
    if (state.protectedAdmins.includes(normalized)) return state;
    return { superAdmins: state.superAdmins.filter(a => a.toLowerCase() !== normalized) };
  }),

  addPermission: (email, clubId, level) => set(state => {
    const normalizedEmail = email.toLowerCase().trim();
    const filtered = state.permissions.filter(p => !(p.email.toLowerCase() === normalizedEmail && p.clubId === clubId));
    return { permissions: [...filtered, { email: normalizedEmail, clubId, accessLevel: level }] };
  }),

  removePermission: (email, clubId) => set(state => {
    const normalizedEmail = email.toLowerCase().trim();
    return { permissions: state.permissions.filter(p => !(p.email.toLowerCase() === normalizedEmail && p.clubId === clubId)) };
  }),
});
