
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
import { InviteLanding } from './components/invites/InviteLanding';
import { AuthGuard } from './components/auth/AuthGuard';
import { DebugOverlay } from './components/debug/DebugOverlay';
import { MainLayout } from './components/layout/MainLayout';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { AccessLevel } from './types';
import { triggerCloudSync, fetchFromCloud, fetchGlobalConfig, addLog } from './services/syncService';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const AppContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeClub, isInitialLoading, syncStatus, people, sessions, clubSettings } = useAppStore();
  const lastObservedHash = useRef<string>('');

  // CRITICAL: Effects must be at the TOP level, before any conditional returns
  useEffect(() => {
    if (user && activeClub && !user.isDev) {
        addLog(`AppContent: Triggering fetchFromCloud for ${activeClub}`, 'SYNC');
        fetchFromCloud(activeClub);
    }
  }, [user, activeClub]);

  useEffect(() => {
    if (user && activeClub && !user.isDev && syncStatus === 'SYNCED') {
      const currentPeople = people.filter(p => p.clubId === activeClub);
      const hash = `${currentPeople.length}-${(sessions[activeClub]?.presentPersonIds || []).length}-${(sessions[activeClub]?.teams || []).length}`;
      if (hash !== lastObservedHash.current) {
        lastObservedHash.current = hash;
        triggerCloudSync(activeClub);
      }
    }
  }, [people, sessions, clubSettings, user, activeClub, syncStatus]);

  // Loading Guard after Effects
  if (activeClub && isInitialLoading) {
      return <MainLayout><LoadingScreen message="מסנכרן נתוני מועדון..." /></MainLayout>;
  }

  return <MainLayout>{children}</MainLayout>;
};

const App: React.FC = () => {
  const { loadUserResources, setAuthInitialized, _hasHydrated } = useAppStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    fetchGlobalConfig();
    addLog("System starting v5.2.2...", 'INFO');
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        const state = useAppStore.getState();
        if (state.user?.isDev) {
            setAuthInitialized(true);
            return;
        }

        if (firebaseUser) {
            const email = firebaseUser.email?.toLowerCase().trim() || '';
            const isSuperAdmin = state.superAdmins.some(a => a.toLowerCase() === email) || 
                               state.protectedAdmins.some(a => a.toLowerCase() === email);
            
            useAppStore.setState({ 
                user: { uid: firebaseUser.uid, email, isAdmin: isSuperAdmin, photoURL: firebaseUser.photoURL || undefined, isDev: false } 
            });
            await loadUserResources(firebaseUser.uid);
            addLog("Auth: User resources loaded", 'INFO');
        } else {
            if (!state.user?.isDev) {
                useAppStore.setState({ user: null, userProfile: null, memberships: [] });
                addLog("Auth: No user found", 'INFO');
            }
        }
        setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  // Hydration Guard: Don't boot the router until we've read from localStorage
  if (!_hasHydrated) {
    return <LoadingScreen message="מטעין הגדרות מקומיות..." />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/join/:token" element={<InviteLanding />} />
        <Route path="/share" element={<PublicPairingView />} />
        <Route path="/profile-setup" element={<AuthGuard requireProfile={false}><ProfileSetup /></AuthGuard>} />
        
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
