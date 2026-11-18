
import React, { useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import { Dashboard } from './components/Dashboard';
import { SessionManager } from './components/SessionManager';
import { WhatsAppDashboardView } from './components/whatsapp/WhatsAppDashboardView';
import { WhatsAppGroupPairingPage } from './pages/WhatsAppGroupPairingPage';
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
import { fetchGlobalConfig, addLog, subscribeToClubData } from './services/syncService';
import { installGlobalErrorListeners } from './services/logging/systemLogger';
import { APP_VERSION } from './config/version';
import { subscribeToClubBoatDefinitions } from './services/clubEquipmentService';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const AppContent: React.FC<{ children: React.ReactNode; skipClubLoading?: boolean }> = ({
  children,
  skipClubLoading = false,
}) => {
  const { user, activeClub, isInitialLoading } = useAppStore();

  useEffect(() => {
    let unsubData: (() => void) | undefined;
    let unsubBoats: (() => void) | undefined;
    if (user && activeClub) {
      const clubLabel = useAppStore.getState().clubs.find((c) => c.id === activeClub)?.label || '';
      unsubData = subscribeToClubData(activeClub);
      unsubBoats = subscribeToClubBoatDefinitions(activeClub, clubLabel);
    }
    return () => {
      if (unsubData) unsubData();
      if (unsubBoats) unsubBoats();
    };
  }, [user?.uid, activeClub]);

  if (!skipClubLoading && activeClub && isInitialLoading) {
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

    installGlobalErrorListeners();
    fetchGlobalConfig();
    addLog(`System starting v${APP_VERSION} (Reactive)`, 'INFO', { route: window.location.hash || '#/' });
    const onHashChange = () => addLog(`Route -> ${window.location.hash || '#/'}`, 'NAV');
    window.addEventListener('hashchange', onHashChange);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            if (!firebaseUser.emailVerified || !firebaseUser.email) {
              addLog('Unverified auth session rejected', 'WARN');
              await signOut(auth).catch(() => {});
              useAppStore.setState({
                user: null,
                userProfile: null,
                memberships: [],
                people: [],
                invites: [],
                superAdmins: [],
                protectedAdmins: [],
                permissions: [],
                authError: 'יש להתחבר באמצעות חשבון Google מאומת.',
                isLoadingResources: false,
              });
              setAuthInitialized(true);
              return;
            }
            await fetchGlobalConfig();
            const state = useAppStore.getState();
            const email = firebaseUser.email.toLowerCase().trim();
            const isSuperAdmin = state.superAdmins.some(a => a.toLowerCase() === email) || 
                               state.protectedAdmins.some(a => a.toLowerCase() === email);
            
            useAppStore.setState({ 
                user: { uid: firebaseUser.uid, email, isAdmin: isSuperAdmin, photoURL: firebaseUser.photoURL || undefined },
                isLoadingResources: true
            });
            addLog(`Auth signed in (${firebaseUser.email})`, 'INFO', { isSuperAdmin });
            await loadUserResources(firebaseUser.uid);
        } else {
            addLog('Auth state signed out', 'INFO');
            useAppStore.setState({
              user: null, userProfile: null, memberships: [], people: [], invites: [],
              superAdmins: [], protectedAdmins: [], permissions: [], isLoadingResources: false,
            });
        }
        setAuthInitialized(true);
    });

    return () => { unsubscribe(); window.removeEventListener('hashchange', onHashChange); };
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
        <Route path="/super-admin" element={<AuthGuard requiredLevel={AccessLevel.SUPER_ADMIN}><AppContent skipClubLoading><SuperAdminDashboard /></AppContent></AuthGuard>} />
        <Route path="/app" element={<AuthGuard requiredLevel={AccessLevel.STAFF}><AppContent><SessionManager /></AppContent></AuthGuard>} />
        <Route path="/app/whatsapp" element={<AuthGuard requiredLevel={AccessLevel.STAFF}><AppContent><WhatsAppDashboardView /></AppContent></AuthGuard>} />
        <Route path="/app/whatsapp/pairing" element={<AuthGuard requiredLevel={AccessLevel.STAFF}><AppContent><WhatsAppGroupPairingPage /></AppContent></AuthGuard>} />
        <Route path="/app/manage" element={<AuthGuard requiredLevel={AccessLevel.CLUB_ADMIN}><AppContent><Dashboard /></AppContent></AuthGuard>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <DebugOverlay />
    </Router>
  );
};
export default App;
