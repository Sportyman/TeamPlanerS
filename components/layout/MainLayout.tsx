
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../../store';
import { usePermissions } from '../../hooks/usePermissions';
import { Waves, LogOut, Menu, X, Ship, LayoutGrid, Calendar, Shield, Sparkles, Home, ChevronLeft, Cloud, RefreshCw, AlertOctagon, Bell, User } from 'lucide-react';

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

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, activeClub, clubs, syncStatus, user, userProfile } = useAppStore();
  const { isSuperAdmin, isClubAdmin } = usePermissions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
      if(confirm('האם להתנתק מהמערכת?')) {
        logout();
        navigate('/');
      }
  };

  const currentClub = clubs.find(c => c.id === activeClub);
  const displayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : (user?.email?.split('@')[0] || 'משתמש');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-300"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <aside className={`fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out flex flex-col ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
            <button onClick={() => setIsMenuOpen(false)} className="p-2 text-slate-400 rounded-full hover:bg-slate-200 transition-colors shrink-0">
                <X size={24} />
            </button>
            <div className="text-brand-600 shrink-0">
                <Bell size={24} />
            </div>
            <div className="flex items-center gap-3 overflow-hidden">
                 <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white shadow-lg shrink-0">
                    {activeClub === 'SAILING' ? <Ship size={16} /> : <Waves size={16} />}
                 </div>
                 <div className="font-black text-slate-800 leading-tight truncate">
                    <div className="text-sm">אתגרים</div>
                    <div className="text-[9px] text-slate-400 uppercase tracking-widest truncate">{currentClub?.label}</div>
                 </div>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-3 mb-2">תפריט ראשי</div>
            <NavLink to="/app" icon={<Calendar size={20} />} text="ניהול אימון" className="p-4" />
            
            {isClubAdmin && (
              <>
                <NavLink to="/app/manage" icon={<LayoutGrid size={20} />} text="ניהול חוג" className="p-4" />
                <NavLink to="/app/manage?view=INVITES" icon={<Sparkles size={20} />} text="לינקים וצירוף" className="p-4" />
              </>
            )}
            
            {isSuperAdmin && (
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
            <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 font-bold transition-all rounded-lg">
                <LogOut size={20} />
                <span>התנתקות</span>
            </button>
        </div>
      </aside>

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm safe-area-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-between h-16 items-center">
            
            {/* Right: Menu + Bell */}
            <div className="flex items-center gap-2">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors">
                  {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
                <button className="p-2 text-slate-400 hover:text-brand-600 transition-colors relative">
                    <Bell size={24} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white shadow-sm"></span>
                </button>
            </div>
            
            {/* Center: Club Info + Sync */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                 <div className="flex items-center gap-2 justify-center">
                    {activeClub === 'SAILING' ? <Ship className="text-sky-600" size={18} /> : <Waves className="text-brand-600" size={18} />}
                    <span className="font-black text-slate-800 text-sm hidden sm:inline">{currentClub?.label || 'TeamPlaner'}</span>
                 </div>
                 <div className="flex items-center justify-center gap-1 h-3 mt-0.5">
                    <div className="w-3">
                        {syncStatus === 'SYNCING' && <RefreshCw size={8} className="text-brand-500 animate-spin" />}
                        {syncStatus === 'SYNCED' && <Cloud size={8} className="text-green-500" />}
                        {syncStatus === 'ERROR' && <AlertOctagon size={8} className="text-red-500 animate-pulse" />}
                    </div>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">
                        {syncStatus === 'SYNCED' ? 'Cloud' : syncStatus === 'SYNCING' ? 'Sync' : 'Local'}
                    </span>
                 </div>
            </div>

            {/* Left: User Info */}
            <div className="flex items-center gap-3">
                <div className="text-left hidden xs:block">
                    <div className="text-[9px] text-slate-400 font-black uppercase leading-none">שלום,</div>
                    <div className="text-xs font-black text-slate-800 leading-tight truncate max-w-[100px]">{displayName}</div>
                </div>
                {user?.photoURL ? (
                    <img src={user.photoURL} alt="User" className="w-9 h-9 rounded-full border-2 border-slate-100 shadow-sm" />
                ) : (
                    <div className="w-9 h-9 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center border border-slate-200">
                        <User size={20} />
                    </div>
                )}
            </div>

          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};
