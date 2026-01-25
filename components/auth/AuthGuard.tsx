
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';
import { usePermissions } from '../../hooks/usePermissions';
import { AccessLevel, MembershipStatus } from '../../types';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredLevel?: AccessLevel;
  requireProfile?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredLevel = AccessLevel.STAFF,
  requireProfile = true 
}) => {
  const { user, userProfile, activeClub, memberships } = useAppStore();
  const { level, isSuperAdmin } = usePermissions();
  const location = useLocation();

  // 1. Authenticated?
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Direct Bypass for Super Admin
  if (isSuperAdmin) {
    // Super Admins should always fill profile if missing, but they are never "Pending"
    if (requireProfile && !userProfile && location.pathname !== '/profile-setup') {
        return <Navigate to="/profile-setup" replace />;
    }
    return <>{children}</>;
  }

  // 3. Require Profile Check - Must fill details before anything else
  if (requireProfile && !userProfile && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }

  // 4. Check Membership Status for PENDING users
  // If user is PENDING, they MUST be on registration-status page
  const currentMembership = activeClub ? memberships.find(ms => ms.clubId === activeClub) : memberships[0];
  const isPending = currentMembership?.status === MembershipStatus.PENDING;

  if (isPending && location.pathname !== '/registration-status') {
    return <Navigate to="/registration-status" replace />;
  }

  // 5. Check Permission Level
  if (level < requiredLevel) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
