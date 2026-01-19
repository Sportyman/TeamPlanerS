
import { StateCreator } from 'zustand';
import { AppState } from '../store';
import { ClubInvite, ClubID, Role } from '../../types';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

export interface InviteSlice {
  invites: ClubInvite[];
  isLoadingInvites: boolean;

  fetchClubInvites: (clubId: ClubID) => Promise<void>;
  createClubInvite: (clubId: ClubID, role: Role, autoApprove: boolean) => Promise<string | null>;
  deleteClubInvite: (inviteId: string) => Promise<void>;
}

export const createInviteSlice: StateCreator<AppState, [], [], InviteSlice> = (set, get) => ({
  invites: [],
  isLoadingInvites: false,

  fetchClubInvites: async (clubId) => {
    set({ isLoadingInvites: true });
    try {
      const q = query(collection(db, 'invites'), where('clubId', '==', clubId));
      const snap = await getDocs(q);
      const invites = snap.docs.map(d => d.data() as ClubInvite);
      set({ invites, isLoadingInvites: false });
    } catch (err) {
      console.error("Error fetching invites:", err);
      set({ isLoadingInvites: false });
    }
  },

  createClubInvite: async (clubId, role, autoApprove) => {
    const { user } = get();
    if (!user) return null;

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const newInvite: ClubInvite = {
      id: doc(collection(db, 'invites')).id,
      clubId,
      role,
      autoApprove,
      token,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
      isActive: true
    };

    try {
      await setDoc(doc(db, 'invites', newInvite.id), newInvite);
      set(state => ({ invites: [newInvite, ...state.invites] }));
      return token;
    } catch (err) {
      console.error("Error creating invite:", err);
      return null;
    }
  },

  deleteClubInvite: async (inviteId) => {
    try {
      await deleteDoc(doc(db, 'invites', inviteId));
      set(state => ({ invites: state.invites.filter(i => i.id !== inviteId) }));
    } catch (err) {
      console.error("Error deleting invite:", err);
    }
  },
});
