
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store';
import { Loader2 } from 'lucide-react';

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isManagerOf, activeClub, authInitialized } = useAppStore();
  const location = useLocation();

  if (!authInitialized) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="animate-spin text-brand-600" size={48} />
        </div>
      );
  }

  // No user -> login
  if (!user) return <Navigate to="/login" state={{ from: location }} />;

  // If we are trying to access a club app, check specific permission
  if (activeClub && !isManagerOf(activeClub)) {
      return <Navigate to="/access-denied" />;
  }

  // Global admin routes (super admin) should check isAdmin separately, 
  // but for general app access, being a club manager is enough.
  return <>{children}</>;
};
