
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from './store';
import { Dashboard } from './components/Dashboard';
import { SessionManager } from './components/SessionManager';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { PublicPairingView } from './components/PublicPairingView';
import { Waves, LayoutDashboard, Calendar, LogOut, Menu, X, Ship, Users, ClipboardCheck, Settings, Cloud, CloudOff, RefreshCw, LayoutGrid, History as HistoryIcon, Clock } from 'lucide-react';
import { APP_VERSION } from './types';
import { triggerCloudSync, fetchFromCloud } from './services/syncService';

const ProtectedAppRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeClub, clubs } = useAppStore();
  if (!user) return <Navigate to="/" />;
  const clubExists = clubs.some(c => c.id === activeClub);
  if (!activeClub || !clubExists) return <Navigate to="/" />;
  return <>{children}</>;
};

const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAppStore();
    if (!user) return <Navigate to="/" />; 
    return <>{children}</>;
};

const NavLink: React.FC<{ to: string; icon: React.ReactNode; text: string; onClick?: () => void; className?: string }> = ({ to, icon, text, onClick, className }) => {
  const location = useLocation();
  const isActive = location.pathname + location.search === to;
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`rounded-lg font-medium flex items-center gap-3 transition-colors ${className} ${
        isActive 
          ? 'text-brand-600 bg-brand-50' 
          : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'
      }`}
    >
      {icon}
      <span>{text}</span>
    </Link>
  );
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, user, activeClub, clubs, syncStatus, lastSyncTime, people, sessions, clubSettings } = useAppStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

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

  const handleLogout = () => {
      logout();
      navigate('/');
  };

  const currentClub = clubs.find(c => c.id === activeClub);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-between h-16 items-center">
            <div className="flex items-center gap-4 z-20">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none">
                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
              <div className="hidden lg:flex space-x-4 space-x-reverse">
                <NavLink to="/app" icon={<Calendar size={18} />} text="אימון" className="px-3 py-2 text-sm" />
                <NavLink to="/app/manage" icon={<LayoutGrid size={18} />} text="ניהול" className="px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
               <button onClick={() => navigate('/app')} className="flex flex-col items-center hover:opacity-80 transition-opacity">
                 <div className="flex items-center gap-2">
                    {activeClub === 'SAILING' ? <Ship className="text-sky-600" size={20} /> : <Waves className="text-brand-600" size={20} />}
                    <span className="font-bold text-sm md:text-lg text-slate-800 whitespace-nowrap">
                        {currentClub ? currentClub.label : 'TeamPlaner'}
                    </span>
                 </div>
                 <div className="flex flex-col items-center mt-0.5">
                    <div className="flex items-center gap-1">
                        {syncStatus === 'SYNCING' && <RefreshCw size={10} className="text-brand-500 animate-spin" />}
                        {syncStatus === 'SYNCED' && <Cloud size={10} className="text-green-500" />}
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                            {syncStatus === 'SYNCED' ? 'Cloud Saved' : syncStatus === 'SYNCING' ? 'Syncing...' : 'Local'}
                        </span>
                    </div>
                    {lastSyncTime && syncStatus === 'SYNCED' && (
                        <div className="text-[7px] text-slate-300 font-medium flex items-center gap-0.5">
                            <Clock size={8} /> {new Date(lastSyncTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                 </div>
               </button>
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
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/share" element={<PublicPairingView />} />
        <Route path="/super-admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
        <Route path="/app" element={<ProtectedAppRoute><Layout><SessionManager /></Layout></ProtectedAppRoute>} />
        <Route path="/app/manage" element={<ProtectedAppRoute><Layout><Dashboard /></Layout></ProtectedAppRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};
export default App;
