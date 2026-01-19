
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store';
import { AdminGuard } from './components/guards/AdminGuard';
import { Dashboard } from './components/Dashboard';
import { SessionManager } from './components/SessionManager';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { PublicPairingView } from './components/PublicPairingView';
import { RegistrationForm } from './components/registration/RegistrationForm';
import { RegistrationSuccess } from './components/registration/RegistrationSuccess';
import { Waves, LogOut, Menu, X, Ship, Users, ShipWheel, Settings, ChevronLeft, Home, Shield, Loader2, Calendar, LayoutGrid } from 'lucide-react';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { fetchGlobalConfig } from './services/syncService';

// Layout Split Components
const SidebarLink: React.FC<{ to: string; icon: React.ReactNode; text: string; active?: boolean }> = ({ to, icon, text, active }) => (
    <a href={`#${to}`} className={`rounded-lg font-bold flex items-center gap-3 p-4 transition-all ${active ? 'text-brand-600 bg-brand-50' : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'}`}>
        <div className={active ? 'text-brand-600' : 'text-slate-400'}>{icon}</div>
        <span>{text}</span>
        {active && <ChevronLeft size={14} className="mr-auto" />}
    </a>
);

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { logout, activeClub, clubs } = useAppStore();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const club = clubs.find(c => c.id === activeClub);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {isMenuOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setIsMenuOpen(false)} />}
            <aside className={`fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-[60] transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <div className="font-black text-slate-800">אתגרים | {club?.label || 'מערכת'}</div>
                    <button onClick={() => setIsMenuOpen(false)}><X size={24} /></button>
                </div>
                <div className="p-4 space-y-2">
                    <SidebarLink to="/app" icon={<Calendar size={20}/>} text="ניהול אימון" active={location.pathname === '/app'} />
                    <SidebarLink to="/app/manage" icon={<LayoutGrid size={20}/>} text="ניהול חוג" active={location.pathname.includes('/manage')} />
                    <SidebarLink to="/super-admin" icon={<Shield size={20}/>} text="ניהול על" active={location.pathname === '/super-admin'} />
                    <div className="h-px bg-slate-100 my-4" />
                    <button onClick={logout} className="w-full flex items-center gap-3 p-4 text-red-500 font-bold hover:bg-red-50 rounded-lg"><LogOut size={20}/> התנתקות</button>
                </div>
            </aside>
            <nav className="bg-white border-b sticky top-0 z-40 px-4 h-16 flex items-center justify-between shadow-sm">
                <button onClick={() => setIsMenuOpen(true)} className="p-2"><Menu size={28} /></button>
                <div className="font-bold">{club?.label || 'TeamPlaner'}</div>
                <div className="w-10 h-10 bg-brand-600 rounded-lg flex items-center justify-center text-white"><Waves size={20}/></div>
            </nav>
            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">{children}</main>
        </div>
    );
};

const App: React.FC = () => {
    const { loadUserResources, setAuthInitialized } = useAppStore();

    useEffect(() => {
        fetchGlobalConfig();
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            if (fbUser) {
                useAppStore.setState({ user: { uid: fbUser.uid, email: fbUser.email!, isAdmin: false, photoURL: fbUser.photoURL || undefined } });
                await loadUserResources(fbUser.uid);
            } else {
                useAppStore.setState({ user: null, userProfile: null, memberships: [] });
            }
            setAuthInitialized(true);
        });
        return () => unsubscribe();
    }, []);

    return (
        <Router>
            <Routes>
                {/* Public & Registration Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register/:clubId" element={<RegistrationForm />} />
                <Route path="/registration-success" element={<RegistrationSuccess />} />
                <Route path="/share" element={<PublicPairingView />} />

                {/* Protected Admin App Routes */}
                <Route path="/app" element={<AdminGuard><AppLayout><SessionManager /></AppLayout></AdminGuard>} />
                <Route path="/app/manage" element={<AdminGuard><AppLayout><Dashboard /></AppLayout></AdminGuard>} />
                <Route path="/super-admin" element={<AdminGuard><AppLayout><SuperAdminDashboard /></AppLayout></AdminGuard>} />
                
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
};
export default App;
