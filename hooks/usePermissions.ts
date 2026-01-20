
import { useMemo } from 'react';
import { useAppStore } from '../store';
import { calculateEffectiveAccess, hasAccess } from '../services/auth/permissionsService';
import { AccessLevel } from '../types';

export const usePermissions = () => {
  const { user, memberships, activeClub } = useAppStore();

  const effectiveLevel = useMemo(() => {
    if (!user) return AccessLevel.NONE;
    return calculateEffectiveAccess(
      user.email,
      !!user.isAdmin,
      memberships,
      activeClub
    );
  }, [user, memberships, activeClub]);

  return {
    level: effectiveLevel,
    isSuperAdmin: effectiveLevel === AccessLevel.SUPER_ADMIN,
    isClubAdmin: hasAccess(effectiveLevel, AccessLevel.CLUB_ADMIN),
    isStaff: hasAccess(effectiveLevel, AccessLevel.STAFF),
    isMember: hasAccess(effectiveLevel, AccessLevel.MEMBER),
    canManageInventory: hasAccess(effectiveLevel, AccessLevel.CLUB_ADMIN),
    canManagePeople: hasAccess(effectiveLevel, AccessLevel.CLUB_ADMIN),
    canEditPairings: hasAccess(effectiveLevel, AccessLevel.STAFF),
    canAccessDashboard: hasAccess(effectiveLevel, AccessLevel.STAFF),
  };
};
