
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';
import { usePermissions } from '../../hooks/usePermissions';
import { AccessLevel } from '../../types';

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
  const { user, userProfile, activeClub } = useAppStore();
  const { level, isSuperAdmin } = usePermissions();
  const location = useLocation();

  // 1. Direct Bypass for Super Admin Emergency
  if (isSuperAdmin && location.pathname === '/super-admin') {
    return <>{children}</>;
  }

  // 2. Authenticated? (App.tsx ensures authInitialized is true here)
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Require Profile Check
  if (requireProfile && !userProfile && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }

  // 4. Check Permissions Level
  if (level < requiredLevel && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
