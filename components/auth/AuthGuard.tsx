
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';
import { usePermissions } from '../../hooks/usePermissions';
import { AccessLevel } from '../../types';
import { Loader2 } from 'lucide-react';

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
  const { user, userProfile, authInitialized, activeClub, clubs } = useAppStore();
  const { level, isSuperAdmin } = usePermissions();
  const location = useLocation();

  // 1. Fail-Safe: Wait for Auth initialization
  if (!authInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-brand-600 mb-4" size={48} />
        <h2 className="text-xl font-bold text-slate-800">מאמת זהות...</h2>
      </div>
    );
  }

  // 2. Direct Bypass for Super Admin Emergency
  if (isSuperAdmin && location.pathname === '/super-admin') {
    return <>{children}</>;
  }

  // 3. Authenticated?
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 4. Require Profile Check (Skip if Super Admin and path is profile-setup)
  if (requireProfile && !userProfile && location.pathname !== '/profile-setup') {
    return <Navigate to="/profile-setup" replace />;
  }

  // 5. Check Permissions Level
  if (level < requiredLevel && !isSuperAdmin) {
    // If they have no access at all or active club is missing, send to landing
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
