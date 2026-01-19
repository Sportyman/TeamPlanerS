
import { StateCreator } from 'zustand';
import { AppState } from '../store';
import { auth, googleProvider } from '../../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { getUserProfile, getUserMemberships } from '../../services/profileService';
import { UserProfile, ClubMembership, UserPermission, ClubID } from '../../types';

export interface AuthSlice {
  user: { uid: string; email: string; isAdmin: boolean; photoURL?: string } | null;
  userProfile: UserProfile | null;
  memberships: ClubMembership[];
  superAdmins: string[];
  protectedAdmins: string[];
  permissions: UserPermission[];
  authInitialized: boolean;

  loginWithGoogle: () => Promise<boolean>;
  loginDev: (email: string, isAdmin: boolean) => boolean;
  logout: () => Promise<void>;
  setUserProfile: (profile: UserProfile) => void;
  loadUserResources: (uid: string) => Promise<void>;
  setAuthInitialized: (initialized: boolean) => void;
  refreshMemberships: () => Promise<void>;
  addSuperAdmin: (email: string) => void;
  removeSuperAdmin: (email: string) => void;
  addPermission: (email: string, clubId: ClubID) => void;
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

  loginWithGoogle: async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email?.toLowerCase().trim() || '';
      const uid = result.user.uid;
      const { superAdmins, protectedAdmins } = get();

      const isSuperAdmin = superAdmins.some(a => a.toLowerCase() === email) || 
                         protectedAdmins.some(a => a.toLowerCase() === email);

      set({ user: { uid, email, isAdmin: isSuperAdmin, photoURL: result.user.photoURL || undefined } });
      await get().loadUserResources(uid);
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  },

  loginDev: (email, isAdmin) => {
    const uid = 'dev-' + Date.now();
    set({ user: { uid, email: email || 'dev@example.com', isAdmin, photoURL: undefined }, authInitialized: true });
    return true;
  },

  logout: async () => {
    await signOut(auth);
    set({ user: null, userProfile: null, memberships: [], activeClub: null });
  },

  setUserProfile: (profile) => set({ userProfile: profile }),

  loadUserResources: async (uid) => {
    try {
      const profile = await getUserProfile(uid);
      const memberships = await getUserMemberships(uid);
      set({ userProfile: profile, memberships });
    } catch (e) {
      console.error("Resource loading failed", e);
    }
  },

  setAuthInitialized: (val) => set({ authInitialized: val }),

  refreshMemberships: async () => {
    const { user } = get();
    if (user) {
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
    if (state.protectedAdmins.includes(normalized)) {
      alert('Root account cannot be removed.');
      return state;
    }
    return { superAdmins: state.superAdmins.filter(a => a.toLowerCase() !== normalized) };
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
});
