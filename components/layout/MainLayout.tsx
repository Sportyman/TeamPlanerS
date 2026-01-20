
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../../store';
import { usePermissions } from '../../hooks/usePermissions';
import { Waves, LogOut, Menu, X, Ship, LayoutGrid, Calendar, Shield, Sparkles, Home, ChevronLeft, Cloud, RefreshCw, AlertOctagon } from 'lucide-react';

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
  const { logout, activeClub, clubs, syncStatus } = useAppStore();
  const { isSuperAdmin, isClubAdmin } = usePermissions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
            <button onClick={() => setIsMenuOpen(false)} className="p-2 text-slate-400 rounded-full hover:bg-slate-100 transition-colors">
                <X size={24} />
            </button>
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

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-between h-16 items-center">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-xl text-slate-600 hover:bg-slate-100">
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
            
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                 <div className="flex items-center gap-2">
                    {activeClub === 'SAILING' ? <Ship className="text-sky-600" size={20} /> : <Waves className="text-brand-600" size={20} />}
                    <span className="font-bold text-slate-800">{currentClub?.label || 'TeamPlaner'}</span>
                 </div>
                 <div className="flex items-center justify-center gap-1 h-4">
                    <div className="w-4">
                        {syncStatus === 'SYNCING' && <RefreshCw size={10} className="text-brand-500 animate-spin" />}
                        {syncStatus === 'SYNCED' && <Cloud size={10} className="text-green-500" />}
                        {syncStatus === 'ERROR' && <AlertOctagon size={10} className="text-red-500 animate-pulse" />}
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">
                        {syncStatus === 'SYNCED' ? 'Cloud Saved' : syncStatus === 'SYNCING' ? 'Syncing...' : 'Local'}
                    </span>
                 </div>
            </div>

            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};
