import { db } from '../firebase';
import { doc, getDoc, getDocFromServer, setDoc, collection, query, where, getDocs, getDocsFromServer, updateDoc } from 'firebase/firestore';
import { UserProfile, ClubMembership, MembershipStatus } from '../types';
import { sendNotificationToClub } from './syncService';

export const getMembershipId = (clubId: string, uid: string) => `${clubId}_${uid}`;

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
        const docRef = doc(db, 'profiles', uid);
        const docSnap = await getDocFromServer(docRef).catch(() => getDoc(docRef));
        return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
    } catch (error) {
        console.error("Error fetching profile:", error);
        return null;
    }
};

export const saveUserProfile = async (profile: UserProfile): Promise<void> => {
    try {
        const docRef = doc(db, 'profiles', profile.uid);
        await setDoc(docRef, profile, { merge: true });
    } catch (error) {
        console.error("Error saving profile:", error);
        throw error;
    }
};

export const getUserMemberships = async (uid: string): Promise<ClubMembership[]> => {
    try {
        const q = query(collection(db, 'memberships'), where('uid', '==', uid));
        const querySnapshot = await getDocsFromServer(q).catch(() => getDocs(q));
        return querySnapshot.docs.map(d => d.data() as ClubMembership);
    } catch (error) {
        console.error("Error fetching memberships:", error);
        return [];
    }
};

export const joinClub = async (membership: ClubMembership): Promise<void> => {
    try {
        const membershipId = getMembershipId(membership.clubId, membership.uid);
        const docRef = doc(db, 'memberships', membershipId);
        await setDoc(docRef, membership, { merge: true });
    } catch (error) {
        console.error("Error joining club:", error);
        throw error;
    }
};

export const approveMembership = async (membershipId: string, updates: Partial<ClubMembership> = {}): Promise<void> => {
    try {
        const docRef = doc(db, 'memberships', membershipId);
        await updateDoc(docRef, {
            ...updates,
            status: MembershipStatus.ACTIVE,
            approvedAt: new Date().toISOString()
        });
        const snap = await getDocFromServer(docRef);
        if (snap.exists()) {
            const data = snap.data();
            await sendNotificationToClub(data.clubId, `חבר חדש אושר והצטרף לחוג`, 'SUCCESS');
        }
    } catch (error) {
        console.error("Error in approveMembership service:", error);
        throw error;
    }
};
