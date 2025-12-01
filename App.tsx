
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from './store';
import { Dashboard } from './components/Dashboard';
import { SessionManager } from './components/SessionManager';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { PublicPairingView } from './components/PublicPairingView';
import { Waves, LayoutDashboard, Calendar, LogOut, Menu, X, Ship, Users, ClipboardCheck, Settings } from 'lucide-react';
import { APP_VERSION } from './types';

// Guard: Must be logged in AND have an active club selected AND the club must exist
const ProtectedAppRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, activeClub, clubs } = useAppStore();
  
  if (!user) return <Navigate to="/" />;
  
  // Critical Fix: Ensure the activeClub actually exists in the clubs list
  const clubExists = clubs.some(c => c.id === activeClub);
  if (!activeClub || !clubExists) {
      return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

// Guard: Must be logged in as Super Admin
const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAppStore();
    // In real app, check isAdmin flag or specific email
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
  const { logout, user, activeClub, clubs } = useAppStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

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
            
            {/* Right: Hamburger Menu & Desktop Nav Links */}
            <div className="flex items-center gap-4 z-20">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              >
                {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
              
              <div className="hidden md:flex space-x-4 space-x-reverse">
                <NavLink to="/app" icon={<Calendar size={18} />} text="אימון ראשי" className="px-3 py-2 text-sm" />
                <NavLink to="/app/manage?view=PEOPLE" icon={<Users size={18} />} text="משתתפים" className="px-3 py-2 text-sm" />
              </div>
            </div>

            {/* Center: Logo & Club Name - ALWAYS VISIBLE */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
               <button 
                 onClick={() => navigate('/app')}
                 className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                 title="דף הבית"
               >
                 {activeClub === 'SAILING' ? <Ship className="text-sky-600" size={24} /> : <Waves className="text-brand-600" size={24} />}
                 <span className="font-bold text-lg text-slate-800 whitespace-nowrap">
                     {currentClub ? currentClub.label : 'TeamPlaner'}
                 </span>
               </button>
            </div>
            
            {/* Left: User & Logout */}
            <div className="flex items-center gap-3 z-20">
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

        {/* Full Screen / Large Dropdown Menu */}
        {isMenuOpen && (
          <>
            {/* Backdrop to close menu when clicking outside */}
            <div 
              className="fixed inset-0 bg-black/25 z-40 backdrop-blur-sm" 
              onClick={() => setIsMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute top-16 inset-x-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xl z-50 animate-in slide-in-from-top-2">
              <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <div className="px-3 py-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                            אימון ושיבוץ
                        </div>
                        <div className="space-y-2">
                          <NavLink 
                              to="/app?step=1" 
                              icon={<ClipboardCheck size={24} />} 
                              text="בדיקת נוכחות" 
                              className="px-4 py-3 text-lg"
                              onClick={() => setIsMenuOpen(false)}
                          />
                          <NavLink 
                              to="/app?step=2" 
                              icon={<Ship size={24} />} 
                              text="הגדרת ציוד" 
                              className="px-4 py-3 text-lg"
                              onClick={() => setIsMenuOpen(false)}
                          />
                          <NavLink 
                              to="/app" 
                              icon={<Calendar size={24} />} 
                              text="לוח שיבוץ ראשי" 
                              className="px-4 py-3 text-lg"
                              onClick={() => setIsMenuOpen(false)}
                          />
                        </div>
                    </div>
                    
                    <div>
                        <div className="px-3 py-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                            ניהול שוטף
                        </div>
                        <div className="space-y-2">
                          <NavLink 
                              to="/app/manage?view=PEOPLE" 
                              icon={<Users size={24} />} 
                              text="ניהול משתתפים" 
                              className="px-4 py-3 text-lg"
                              onClick={() => setIsMenuOpen(false)}
                          />
                          <NavLink 
                              to="/app/manage?view=INVENTORY" 
                              icon={<Settings size={24} />} 
                              text="ניהול ציוד ומלאי" 
                              className="px-4 py-3 text-lg"
                              onClick={() => setIsMenuOpen(false)}
                          />
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-200 mt-6 pt-4 flex justify-between items-center px-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-600">{user?.email}</span>
                      <span className="text-xs text-slate-400">מחובר כרגע</span>
                    </div>
                    <div className="text-xs text-slate-300 font-mono">
                      v{APP_VERSION}
                    </div>
                </div>
              </div>
            </div>
          </>
        )}
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {children}
      </main>

      <footer className="py-6 text-center text-xs text-slate-400 print:hidden border-t border-slate-100 mt-auto" dir="ltr">
         Built by Shay Kalimi - @Shay.A.i
      </footer>
    </div>
  );
};

// Admin Layout (Simple)
const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { logout, user } = useAppStore();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col">
             <nav className="bg-slate-800 text-white p-4 shadow-md">
                 <div className="max-w-7xl mx-auto flex justify-between items-center">
                     <div className="font-bold text-xl hidden sm:block">אתגרים: ניהול על</div>
                     <div className="font-bold text-xl sm:hidden">ניהול על</div>
                     <div className="flex gap-4 items-center">
                         <span className="text-sm opacity-70 hidden sm:inline">{user?.email}</span>
                         <button onClick={() => { logout(); navigate('/'); }} className="hover:text-red-300"><LogOut size={18} /></button>
                     </div>
                 </div>
             </nav>
             <main className="p-4 flex-1 max-w-7xl mx-auto w-full">
                 {children}
             </main>
             <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200" dir="ltr">
                Built by Shay Kalimi - @Shay.A.i
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
