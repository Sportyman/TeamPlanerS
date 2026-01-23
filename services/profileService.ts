
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { UserProfile, ClubMembership, ClubID, MembershipStatus } from '../types';

/**
 * Standardized way to generate membership document IDs
 */
export const getMembershipId = (clubId: string, uid: string) => `${clubId}_${uid}`;

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
        const docRef = doc(db, 'profiles', uid);
        const docSnap = await getDoc(docRef);
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
        // Query by uid field regardless of document ID format
        const q = query(collection(db, 'memberships'), where('uid', '==', uid));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data() as ClubMembership);
    } catch (error) {
        console.error("Error fetching memberships:", error);
        return [];
    }
};

export const joinClub = async (membership: ClubMembership): Promise<void> => {
    try {
        // FORCE standardized ID format: clubId_uid
        const membershipId = getMembershipId(membership.clubId, membership.uid);
        const docRef = doc(db, 'memberships', membershipId);
        await setDoc(docRef, membership, { merge: true });
    } catch (error) {
        console.error("Error joining club:", error);
        throw error;
    }
};

export const approveMembership = async (membershipId: string): Promise<void> => {
    try {
        const docRef = doc(db, 'memberships', membershipId);
        await updateDoc(docRef, {
            status: MembershipStatus.ACTIVE,
            approvedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error in approveMembership service:", error);
        throw error;
    }
};
