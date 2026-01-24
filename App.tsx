
import React, { useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import { Dashboard } from './components/Dashboard';
import { SessionManager } from './components/SessionManager';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { PublicPairingView } from './components/PublicPairingView';
import { ProfileSetup } from './components/profile/ProfileSetup';
import { RegistrationStatus } from './components/profile/RegistrationStatus';
import { InviteLanding } from './components/invites/InviteLanding';
import { AuthGuard } from './components/auth/AuthGuard';
import { DebugOverlay } from './components/debug/DebugOverlay';
import { MainLayout } from './components/layout/MainLayout';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { AccessLevel } from './types';
import { fetchFromCloud, fetchGlobalConfig, addLog } from './services/syncService';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AppContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeClub, isInitialLoading } = useAppStore();
  
  useEffect(() => {
    if (user && activeClub && !user.isDev) {
        fetchFromCloud(activeClub);
    }
  }, [user, activeClub]);

  if (activeClub && isInitialLoading) {
      return <MainLayout><LoadingScreen message="מסנכרן נתוני מועדון..." /></MainLayout>;
  }

  return <MainLayout>{children}</MainLayout>;
};

const App: React.FC = () => {
  const { loadUserResources, setAuthInitialized, _hasHydrated, authInitialized } = useAppStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    fetchGlobalConfig();
    addLog("System starting v5.6.0...", 'INFO');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        const state = useAppStore.getState();
        if (firebaseUser) {
            const email = firebaseUser.email?.toLowerCase().trim() || '';
            const isSuperAdmin = state.superAdmins.some(a => a.toLowerCase() === email) || 
                               state.protectedAdmins.some(a => a.toLowerCase() === email);
            
            useAppStore.setState({ 
                user: { uid: firebaseUser.uid, email, isAdmin: isSuperAdmin, photoURL: firebaseUser.photoURL || undefined, isDev: false } 
            });
            await loadUserResources(firebaseUser.uid);
        } else {
            useAppStore.setState({ user: null, userProfile: null, memberships: [] });
        }
        setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  if (!_hasHydrated || !authInitialized) {
    return <LoadingScreen message="מתחבר למערכת..." />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/join/:token" element={<InviteLanding />} />
        <Route path="/share" element={<PublicPairingView />} />
        <Route path="/registration-status" element={<AuthGuard requireProfile={false} requiredLevel={AccessLevel.NONE}><RegistrationStatus /></AuthGuard>} />
        <Route path="/profile-setup" element={<AuthGuard requireProfile={false} requiredLevel={AccessLevel.NONE}><ProfileSetup /></AuthGuard>} />
        <Route path="/super-admin" element={<AuthGuard requiredLevel={AccessLevel.SUPER_ADMIN}><AppContent><SuperAdminDashboard /></AppContent></AuthGuard>} />
        <Route path="/app" element={<AuthGuard requiredLevel={AccessLevel.STAFF}><AppContent><SessionManager /></AppContent></AuthGuard>} />
        <Route path="/app/manage" element={<AuthGuard requiredLevel={AccessLevel.CLUB_ADMIN}><AppContent><Dashboard /></AppContent></AuthGuard>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <DebugOverlay />
    </Router>
  );
};
export default App;
