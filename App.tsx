
// Fix: Import React as a default import instead of a named import to resolve compilation error.
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from './store';
import { Dashboard } from './components/Dashboard';
import { SessionManager } from './components/SessionManager';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { PublicPairingView } from './components/PublicPairingView';
import { ProfileSetup } from './components/profile/ProfileSetup';
import { InviteLanding } from './components/invites/InviteLanding';
import { Waves, LayoutDashboard, Calendar, LogOut, Menu, X, Ship, Users, ClipboardCheck, Settings, Cloud, CloudOff, RefreshCw, LayoutGrid, History as HistoryIcon, Clock, ChevronLeft, Home, Shield, Loader2, Sparkles } from 'lucide-react';
import { APP_VERSION } from './types';
import { triggerCloudSync, fetchFromCloud, fetchGlobalConfig } from './services/syncService';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

const ProtectedAppRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile, activeClub, clubs, authInitialized, memberships } = useAppStore();
  const location = useLocation();

  if (!authInitialized) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-brand-600" size={48} /></div>;
  if (!user) return <Navigate to="/login" />;
  
  if (!userProfile && location.pathname !== '/profile-setup') {
      return <Navigate to="/profile-setup" />;
  }

  // If user is not Super Admin, they MUST have a membership in the activeClub to access /app
  const clubExists = clubs.some(c => c.id === activeClub);
  const hasMembership = memberships.some(m => m.clubId === activeClub && m.status !== 'INACTIVE');
  
  if (!activeClub || !clubExists || (!user.isAdmin && !hasMembership)) {
      return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, userProfile, authInitialized } = useAppStore();
    const location = useLocation();

    if (!authInitialized) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-brand-600" size={48} /></div>;
    if (!user || !user.isAdmin) return <Navigate to="/" />; 
    if (!userProfile && location.pathname !== '/profile-setup') {
        return <Navigate to="/profile-setup" />;
    }
    return <>{children}</>;
};

const NavLink: React.FC<{ to: string; icon: React.ReactNode; text: string; onClick?: () => void; className?: string }> = ({ to, icon, text, onClick, className }) => {
  const location = useLocation();
  const isActive = location.pathname + location.search === to;
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`rounded-lg font-bold flex items-center gap-3 transition-all ${className} ${
        isActive 
          ? 'text-brand-600 bg-brand-50 shadow-sm' 
          : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'
      }`}
    >
      <div className={`${isActive ? 'text-brand-600' : 'text-slate-400'}`}>{icon}</div>
      <span>{text}</span>
      {isActive && <ChevronLeft size={14} className="mr-auto" />}
    </Link>
  );
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, user, activeClub, clubs, syncStatus, people, sessions, clubSettings } = useAppStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user && activeClub) {
      triggerCloudSync(activeClub);
    }
  }, [people, sessions, clubSettings, user, activeClub]);

  useEffect(() => {
    if (user && activeClub) {
        fetchFromCloud(activeClub);
    }
  }, [user, activeClub]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
      logout();
      navigate('/');
  };

  const currentClub = clubs.find(c => c.id === activeClub);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-300"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <aside className={`fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out flex flex-col ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    {activeClub === 'SAILING' ? <Ship size={20} /> : <Waves size={20} />}
                 </div>
                 <div className="font-black text-slate-800 leading-tight">
                    <div>אתגרים</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest">{currentClub?.label}</div>
                 </div>
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors">
                <X size={24} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-3 mb-2">תפריט ראשי</div>
            <NavLink to="/app" icon={<Calendar size={20} />} text="ניהול אימון" className="p-4" />
            <NavLink to="/app/manage" icon={<LayoutGrid size={20} />} text="ניהול חוג" className="p-4" />
            <NavLink to="/app/manage?view=PEOPLE" icon={<Users size={20} />} text="רשימת משתתפים" className="p-4" />
            <NavLink to="/app/manage?view=INVITES" icon={<Sparkles size={20} />} text="לינקים וצירוף חברים" className="p-4" />
            
            {user?.isAdmin && (
                <>
                    <div className="h-px bg-slate-100 my-4" />
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-3 mb-2">ניהול על</div>
                    <NavLink to="/super-admin" icon={<Shield size={20} />} text="ניהול מערכת" className="p-4" />
                </>
            )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
            <button 
                onClick={() => navigate('/')}
                className="w-full flex items-center gap-3 p-4 text-slate-600 hover:text-brand-600 font-bold transition-all rounded-lg mb-2"
            >
                <Home size={20} />
                <span>חזרה לדף הבית</span>
            </button>
            <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 font-bold transition-all rounded-lg"
            >
                <LogOut size={20} />
                <span>התנתקות מהמערכת</span>
            </button>
        </div>
      </aside>

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-between h-16 items-center">
            <div className="flex items-center gap-4 z-20">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className={`p-2 rounded-xl transition-all ${isMenuOpen ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
              >
                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
            
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 text-center">
                 <div className="flex items-center gap-2">
                    {activeClub === 'SAILING' ? <Ship className="text-sky-600" size={20} /> : <Waves className="text-brand-600" size={20} />}
                    <span className="font-bold text-sm md:text-lg text-slate-800 whitespace-nowrap">
                        {currentClub ? currentClub.label : 'TeamPlaner'}
                    </span>
                 </div>
                 <div className="flex items-center justify-center gap-1 mt-0.5">
                    {syncStatus === 'SYNCING' && <RefreshCw size={10} className="text-brand-500 animate-spin" />}
                    {syncStatus === 'SYNCED' && <Cloud size={10} className="text-green-500" />}
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                        {syncStatus === 'SYNCED' ? 'Cloud Saved' : syncStatus === 'SYNCING' ? 'Syncing...' : 'Local'}
                    </span>
                 </div>
            </div>

            <div className="flex items-center gap-3 z-20">
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2"><LogOut size={20} /></button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="py-8 text-center border-t border-slate-100 mt-auto bg-white/50" dir="ltr">
         <div className="text-xs text-slate-400 opacity-70 font-medium">Built by Shay Kalimi - @Shay.A.i</div>
         <div className="text-[10px] font-black text-slate-300 mt-2 uppercase tracking-[0.3em]">v{APP_VERSION}</div>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  const { loadUserResources, setAuthInitialized, superAdmins, protectedAdmins, user } = useAppStore();

  useEffect(() => {
    fetchGlobalConfig();
    
    // Auth Listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        // CRITICAL: If we have a Dev User manually logged in, DO NOT let Firebase wipe the session.
        const currentUser = useAppStore.getState().user;
        if (currentUser && currentUser.isDev) {
            setAuthInitialized(true);
            return;
        }

        if (firebaseUser) {
            const email = firebaseUser.email?.toLowerCase().trim() || '';
            const isSuperAdmin = superAdmins.some(a => a.toLowerCase() === email) || 
                               protectedAdmins.some(a => a.toLowerCase() === email);
                               
            useAppStore.setState({ 
                user: { 
                    uid: firebaseUser.uid, 
                    email: email, 
                    isAdmin: isSuperAdmin, 
                    photoURL: firebaseUser.photoURL || undefined,
                    isDev: false
                } 
            });
            await loadUserResources(firebaseUser.uid);
        } else {
            // Only clear if we are not in Dev Mode
            useAppStore.setState({ user: null, userProfile: null, memberships: [] });
        }
        setAuthInitialized(true);
    });

    return () => unsubscribe();
  }, [superAdmins, protectedAdmins]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/join/:token" element={<InviteLanding />} />
        <Route path="/share" element={<PublicPairingView />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route path="/super-admin" element={<SuperAdminRoute><Layout><SuperAdminDashboard /></Layout></SuperAdminRoute>} />
        <Route path="/app" element={<ProtectedAppRoute><Layout><SessionManager /></Layout></ProtectedAppRoute>} />
        <Route path="/app/manage" element={<ProtectedAppRoute><Layout><Dashboard /></Layout></ProtectedAppRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};
export default App;
