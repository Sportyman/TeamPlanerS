
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

  // 1. Direct Bypass for Super Admin
  if (isSuperAdmin && location.pathname === '/super-admin') {
    return <>{children}</>;
  }

  // 2. Authenticated?
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Require Profile Check - Must fill details before anything else
  if (requireProfile && !userProfile && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }

  // 4. Check Permission Level
  if (!isSuperAdmin && level < requiredLevel) {
    return <Navigate to="/" replace />;
  }

  // 5. Check Membership Status for Staff/ClubAdmin
  // If user is accessing a club area but their status is not ACTIVE, send to home
  if (activeClub && !isSuperAdmin) {
      const m = memberships.find(ms => ms.clubId === activeClub);
      if (m && m.status !== MembershipStatus.ACTIVE) {
          return <Navigate to="/" replace />;
      }
  }

  return <>{children}</>;
};
