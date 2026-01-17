
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from './store';
import { Dashboard } from './components/Dashboard';
import { SessionManager } from './components/SessionManager';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { PublicPairingView } from './components/PublicPairingView';
import { Waves, LayoutDashboard, Calendar, LogOut, Menu, X, Ship, Users, ClipboardCheck, Settings, Cloud, CloudOff, RefreshCw, LayoutGrid, History as HistoryIcon, Clock, ChevronLeft, Home, Palette } from 'lucide-react';
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
      className={`rounded-xl font-bold flex items-center gap-3 transition-all ${className} ${
        isActive 
          ? 'text-brand-600 bg-brand-50 shadow-inner' 
          : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'
      }`}
    >
      <div className={`${isActive ? 'text-brand-600' : 'text-slate-400'}`}>{icon}</div>
      <span>{text}</span>
    </Link>
  );
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, user, activeClub, setActiveClub, clubs, syncStatus, lastSyncTime, people, sessions, clubSettings } = useAppStore();
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

  const handleLogout = () => {
      logout();
      navigate('/');
  };

  const handleClubSwitch = (id: string) => {
      setActiveClub(id);
      setIsMenuOpen(false);
      navigate('/app');
  };

  const currentClub = clubs.find(c => c.id === activeClub);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* MOBILE DRAWER OVERLAY */}
      {isMenuOpen && (
          <div 
            className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsMenuOpen(false)}
          />
      )}

      {/* MOBILE DRAWER SIDEBAR */}
      <aside className={`fixed inset-y-0 right-0 z-[70] w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                  <Waves className="text-brand-600" size={24} />
                  <span className="font-black text-slate-800 tracking-tighter">TeamPlaner</span>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24} /></button>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2">ניווט מהיר</div>
              <NavLink to="/app" icon={<Calendar size={20} />} text="אימון נוכחי" onClick={() => setIsMenuOpen(false)} className="p-4" />
              <NavLink to="/app/manage" icon={<LayoutGrid size={20} />} text="ניהול מועדון" onClick={() => setIsMenuOpen(false)} className="p-4" />
              <NavLink to="/app/manage?view=SETTINGS" icon={<Palette size={20} />} text="הגדרות מראה" onClick={() => setIsMenuOpen(false)} className="p-4" />
              
              <div className="pt-8 pb-2">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2">החלף חוג</div>
                  <div className="space-y-1">
                      {clubs.map(club => (
                          <button 
                            key={club.id} 
                            onClick={() => handleClubSwitch(club.id)}
                            className={`w-full p-4 rounded-xl font-bold text-right flex items-center justify-between transition-all ${activeClub === club.id ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                              <div className="flex items-center gap-3">
                                  {club.id === 'SAILING' ? <Ship size={18} /> : <Waves size={18} />}
                                  {club.label}
                              </div>
                              {activeClub === club.id && <div className="w-1.5 h-1.5 bg-brand-600 rounded-full" />}
                          </button>
                      ))}
                  </div>
              </div>
          </nav>

          <div className="p-4 border-t bg-slate-50">
              <button onClick={handleLogout} className="w-full p-4 rounded-xl font-black text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
                  <LogOut size={20} /> יציאה מהמערכת
              </button>
          </div>
      </aside>

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-between h-16 items-center">
            <div className="flex items-center gap-4 z-20">
              <button 
                onClick={() => setIsMenuOpen(true)} 
                className={`p-2 rounded-xl text-slate-600 hover:text-brand-600 hover:bg-slate-50 transition-all focus:outline-none ${isMenuOpen ? 'bg-slate-100 ring-2 ring-brand-500/20' : ''}`}
              >
                <Menu size={28} />
              </button>
              <div className="hidden lg:flex space-x-2 space-x-reverse">
                <NavLink to="/app" icon={<Calendar size={18} />} text="אימון" className="px-4 py-2 text-sm" />
                <NavLink to="/app/manage" icon={<LayoutGrid size={18} />} text="ניהול" className="px-4 py-2 text-sm" />
              </div>
            </div>
            
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
               <button onClick={() => navigate('/app')} className="flex flex-col items-center hover:opacity-80 transition-all active:scale-95">
                 <div className="flex items-center gap-2">
                    {activeClub === 'SAILING' ? <Ship className="text-sky-600" size={20} /> : <Waves className="text-brand-600" size={20} />}
                    <span className="font-black text-sm md:text-xl text-slate-800 whitespace-nowrap tracking-tight">
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
                 </div>
               </button>
            </div>

            <div className="flex items-center gap-3 z-20">
              <button onClick={() => navigate('/')} className="text-slate-400 hover:text-brand-600 p-2 hidden sm:block"><Home size={22} /></button>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2"><LogOut size={22} /></button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="py-8 text-center border-t border-slate-100 mt-auto bg-white/50" dir="ltr">
         <div className="text-xs text-slate-400 opacity-70 font-medium">Built by Shay Kalimi - @Shay.A.i</div>
         <div className="text-[10px] font-black text-slate-300 mt-2 uppercase tracking-[0.4em]">v{APP_VERSION}</div>
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
