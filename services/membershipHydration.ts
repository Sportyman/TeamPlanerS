import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Gender, Person, Role, UserProfile } from '../types';
import { isLegacyMockId } from './auth/superAdminService';

const profileMemCache = new Map<string, UserProfile | null>();

export const hydratePeopleFromMemberships = async (memberships: any[]): Promise<Person[]> => {
  const realMemberships = memberships.filter((ms: any) => !isLegacyMockId(String(ms.uid || '')));
  return Promise.all(
    realMemberships.map(async (ms: any) => {
      const uid = String(ms.uid || '');
      const skipProfileLookup = !uid || uid.startsWith('wa_') || uid.startsWith('guest_') || uid.includes('@');
      let profile: UserProfile | null = skipProfileLookup ? null : (profileMemCache.get(uid) ?? null);
      if (!skipProfileLookup && !profileMemCache.has(uid)) {
        try {
          const profileSnap = await getDoc(doc(db, 'profiles', uid));
          profile = profileSnap.exists() ? (profileSnap.data() as UserProfile) : null;
          profileMemCache.set(uid, profile);
        } catch {
          profile = null;
        }
      }
      const fallbackName = ms.displayName || (ms.firstName ? `${ms.firstName} ${ms.lastName || ''}`.trim() : '');
      const name = profile
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : fallbackName || (uid.includes('@') ? uid : 'משתמש ללא פרופיל');
      return {
        id: uid,
        clubId: ms.clubId,
        name,
        firstName: profile?.firstName || ms.firstName || '',
        lastName: profile?.lastName || ms.lastName || '',
        gender: profile?.gender || ms.gender || Gender.MALE,
        role: ms.role || Role.MEMBER,
        rank: ms.rank || 3,
        isSkipper: Boolean(profile?.isSkipper || ms.isSkipper),
        attendanceCount: typeof ms.attendanceCount === 'number' ? ms.attendanceCount : 0,
        lastAttendedAt: ms.lastAttendedAt || undefined,
        activityHistory: Array.isArray(ms.activityHistory) ? ms.activityHistory : [],
        dismissedRoleStreak: ms.dismissedRoleStreak || undefined,
        phone: profile?.primaryPhone || ms.phone || '',
        notes: profile?.medicalNotes || ms.notes || '',
        tags: Array.isArray(ms.tags) ? ms.tags : [],
        photoURL: profile?.photoURL || ms.photoURL || undefined,
        preferredBoatType: ms.preferredBoatType || undefined,
        genderConstraint: ms.genderConstraint || undefined,
        mustPairWith: ms.mustPairWith || [],
        preferPairWith: ms.preferPairWith || [],
        cannotPairWith: ms.cannotPairWith || [],
      } as Person;
    })
  );
};
