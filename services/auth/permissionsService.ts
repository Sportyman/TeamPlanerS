
import { AccessLevel, Role, ClubMembership, ClubID } from '../../types';

/**
 * Calculates the effective access level for a user in a specific club.
 * Handles backward compatibility by mapping old Roles to AccessLevels.
 */
export const calculateEffectiveAccess = (
  userEmail: string,
  isSuperAdmin: boolean,
  memberships: ClubMembership[],
  activeClubId: ClubID | null
): AccessLevel => {
  // Rule 1: Super Admin bypass
  if (isSuperAdmin) return AccessLevel.SUPER_ADMIN;

  if (!activeClubId) return AccessLevel.NONE;

  // Rule 2: Find membership for active club
  const membership = memberships.find(m => m.clubId === activeClubId && m.status === 'ACTIVE');
  if (!membership) return AccessLevel.NONE;

  // Rule 3: Use explicit access level if present (v5.0.0+)
  if (membership.accessLevel !== undefined) {
    return membership.accessLevel;
  }

  // Rule 4: Backward compatibility mapping
  switch (membership.role) {
    case Role.INSTRUCTOR:
    case Role.VOLUNTEER:
      return AccessLevel.STAFF;
    case Role.MEMBER:
      return AccessLevel.MEMBER;
    default:
      return AccessLevel.NONE;
  }
};

/**
 * Checks if an access level is sufficient for a required level.
 */
export const hasAccess = (current: AccessLevel, required: AccessLevel): boolean => {
  return current >= required;
};
