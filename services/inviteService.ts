
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { ClubInvite } from '../types';

export const validateInviteToken = async (token: string): Promise<ClubInvite | null> => {
    try {
        const q = query(collection(db, 'invites'), where('token', '==', token), where('isActive', '==', true));
        const snap = await getDocs(q);
        if (snap.empty) return null;
        return snap.docs[0].data() as ClubInvite;
    } catch (err) {
        console.error("Token validation error:", err);
        return null;
    }
};

export const incrementInviteUsage = async (inviteId: string): Promise<void> => {
    try {
        const docRef = doc(db, 'invites', inviteId);
        await updateDoc(docRef, {
            usageCount: increment(1)
        });
    } catch (err) {
        console.error("Error incrementing invite usage:", err);
    }
};
