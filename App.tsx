import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from './store';
import { Dashboard } from './components/Dashboard';
import { SessionManager } from './components/SessionManager';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { PublicPairingView } from './components/PublicPairingView';
import { Waves, LayoutDashboard, Calendar, LogOut, Menu, X, Ship } from 'lucide-react';
import { APP_VERSION, ClubLabel, ClubID } from './types';

// Guard: Must be logged in AND have an active club selected
const ProtectedAppRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeClub } = useAppStore();
  if (!user) return <Navigate to="/" />;
  if (!activeClub) return <Navigate to="/" />;
  return <>{children}</>;
};

// Guard: Must be logged in as Super Admin
const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAppStore();
    // In real app, check isAdmin flag or specific email
    if (!user) return <Navigate to="/" />; 
    return <>{children}</>;
};

const NavLink: React.FC<{ to: string; icon: React.ReactNode; text: string; onClick?: () => void }> = ({ to, icon, text, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
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
  const { logout, user, activeClub } = useAppStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
      logout();
      navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-between h-16 items-center">
            
            {/* Right: Mobile Menu & Desktop Nav */}
            <div className="flex items-center gap-2 md:gap-8">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              
              <div className="hidden md:flex space-x-4 space-x-reverse">
                <NavLink to="/app" icon={<Calendar size={18} />} text="אימון חדש" />
                <NavLink to="/app/manage" icon={<LayoutDashboard size={18} />} text="משתתפים" />
              </div>
            </div>

            {/* Center: Logo & Club Name */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
               <button 
                 onClick={() => navigate('/app')}
                 className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                 title="דף הבית"
               >
                 {activeClub === ClubID.SAILING ? <Ship className="text-sky-600" size={24} /> : <Waves className="text-brand-600" size={24} />}
                 <span className="font-bold text-lg hidden xs:inline text-slate-800">
                     {activeClub ? ClubLabel[activeClub] : 'TeamPlaner'}
                 </span>
               </button>
            </div>
            
            {/* Left: User & Logout */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs md:text-sm text-slate-500">{user?.email}</span>
                  <span className="text-[10px] text-slate-300">v{APP_VERSION}</span>
              </div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2" title="התנתק ויציאה">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 animate-in slide-in-from-top-5">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <NavLink 
                to="/app" 
                icon={<Calendar size={18} />} 
                text="אימון חדש" 
                onClick={() => setIsMenuOpen(false)}
              />
              <NavLink 
                to="/app/manage" 
                icon={<LayoutDashboard size={18} />} 
                text="ניהול משתתפים" 
                onClick={() => setIsMenuOpen(false)}
              />
              <div className="pt-2 border-t border-slate-100 mt-2 flex justify-between items-center px-3 py-2">
                 <div className="text-xs text-slate-400">
                    {user?.email}
                 </div>
                 <div className="text-xs text-slate-300 font-mono">
                    v{APP_VERSION}
                 </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {children}
      </main>
    </div>
  );
};

// Admin Layout (Simple)
const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { logout, user } = useAppStore();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-100">
             <nav className="bg-slate-800 text-white p-4 shadow-md">
                 <div className="max-w-7xl mx-auto flex justify-between items-center">
                     <div className="font-bold text-xl">אתגרים: ניהול על</div>
                     <div className="flex gap-4 items-center">
                         <span className="text-sm opacity-70">{user?.email}</span>
                         <button onClick={() => { logout(); navigate('/'); }} className="hover:text-red-300"><LogOut size={18} /></button>
                     </div>
                 </div>
             </nav>
             <main className="p-4">
                 {children}
             </main>
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

        {/* Protected App Routes */}
        <Route path="/app" element={<ProtectedAppRoute><Layout><SessionManager /></Layout></ProtectedAppRoute>} />
        <Route path="/app/manage" element={<ProtectedAppRoute><Layout><Dashboard /></Layout></ProtectedAppRoute>} />

        {/* Super Admin Route */}
        <Route path="/super-admin" element={<SuperAdminRoute><AdminLayout><SuperAdminDashboard /></AdminLayout></SuperAdminRoute>} />
        
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;