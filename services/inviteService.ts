
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { ClubInvite, UserProfile, Role, MembershipStatus, Person } from '../types';
import { joinClub } from './profileService';
import { addPersonToClubCloud, sendNotificationToClub } from './syncService';

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

/**
 * Handles the full invitation completion logic.
 * Should only be called when the user has a valid profile.
 */
export const completeInviteFlow = async (
    user: { uid: string; email: string },
    profile: UserProfile,
    invite: ClubInvite
): Promise<void> => {
    const fullName = `${profile.firstName} ${profile.lastName}`;
    
    // 1. Create the membership document
    // This MUST happen first so the user is part of the club for security rules
    const membership = {
        uid: user.uid,
        clubId: invite.clubId,
        role: invite.role,
        accessLevel: invite.accessLevel || (invite.role === Role.INSTRUCTOR ? 3 : 2),
        status: invite.autoApprove ? MembershipStatus.ACTIVE : MembershipStatus.PENDING,
        joinedClubDate: new Date().toISOString(),
        rank: 3 
    };
    await joinClub(membership);

    // 2. Handle notifications and sync
    if (invite.autoApprove) {
        const personData: Person = {
            id: user.uid,
            clubId: invite.clubId,
            name: fullName,
            firstName: profile.firstName,
            lastName: profile.lastName,
            gender: profile.gender,
            phone: profile.primaryPhone,
            role: invite.role,
            rank: 3,
            isSkipper: profile.isSkipper || false,
            notes: profile.medicalNotes || ''
        };
        await addPersonToClubCloud(invite.clubId, personData);
        // Pass senderId for security rules compliance
        await sendNotificationToClub(invite.clubId, `חבר חדש הצטרף אוטומטית: ${fullName}`, 'SUCCESS', user.uid);
    } else {
        // Send a "New Request" notification with the real name and senderId
        await sendNotificationToClub(invite.clubId, `בקשת הצטרפות חדשה מ: ${fullName}`, 'SUCCESS', user.uid);
    }

    // 3. Increment the invite usage counter
    await incrementInviteUsage(invite.id);
};
