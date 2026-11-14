import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';
import { usePermissions } from '../../hooks/usePermissions';
import { AccessLevel, MembershipStatus } from '../../types';
import { LoadingScreen } from '../layout/LoadingScreen';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredLevel?: AccessLevel;
  requireProfile?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredLevel = AccessLevel.STAFF,
  requireProfile = true,
}) => {
  const { user, userProfile, activeClub, memberships, isLoadingResources } = useAppStore();
  const { level, isSuperAdmin } = usePermissions();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isLoadingResources) {
    return <LoadingScreen message="מאמת פרופיל והרשאות מול השרת..." />;
  }

  if (isSuperAdmin) {
    if (requireProfile && !userProfile && location.pathname !== '/profile-setup') {
      return <Navigate to="/profile-setup" replace />;
    }
    return <>{children}</>;
  }

  if (requireProfile && !userProfile && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }

  const currentMembership = activeClub ? memberships.find((ms) => ms.clubId === activeClub) : memberships[0];
  const isPending = currentMembership?.status === MembershipStatus.PENDING;

  if (isPending && location.pathname !== '/registration-status') {
    return <Navigate to="/registration-status" replace />;
  }

  if (level < requiredLevel) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
