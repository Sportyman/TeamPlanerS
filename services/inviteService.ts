
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { AccessLevel, ClubInvite, MembershipStatus, Role, UserProfile } from '../types';
import { joinClub } from './profileService';
import { sendNotificationToClub } from './syncService';

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
 * Handles the invitation join request.
 * All joins strictly enter PENDING status until explicitly approved by a club admin.
 */
export const completeInviteFlow = async (
    user: { uid: string; email: string },
    profile: UserProfile,
    invite: ClubInvite
): Promise<void> => {
    const fullName = `${profile.firstName} ${profile.lastName}`.trim();

    const membership = {
        uid: user.uid,
        clubId: invite.clubId,
        role: invite.role || Role.MEMBER,
        accessLevel: AccessLevel.NONE,
        status: MembershipStatus.PENDING,
        displayName: fullName,
        firstName: profile.firstName,
        lastName: profile.lastName,
        gender: profile.gender,
        phone: profile.primaryPhone,
        isSkipper: Boolean(profile.isSkipper),
        joinedClubDate: new Date().toISOString(),
        rank: 3
    };
    await joinClub(membership);
    await sendNotificationToClub(invite.clubId, `בקשת הצטרפות חדשה מ: ${fullName}`, 'SUCCESS', user.uid);
    await incrementInviteUsage(invite.id);
};
