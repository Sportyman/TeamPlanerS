
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../../store';
import { usePermissions } from '../../hooks/usePermissions';
import { Waves, LogOut, Menu, X, Ship, LayoutGrid, Calendar, Shield, Sparkles, Home, ChevronLeft, Cloud, RefreshCw, Bell, User, Clock } from 'lucide-react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { ensureAdminMembership } from '../../services/syncService';

const NavLink: React.FC<{ to: string; icon: React.ReactNode; text: string; onClick?: () => void; className?: string }> = ({ to, icon, text, onClick, className }) => {
  const location = useLocation();
  const isActive = location.pathname + location.search === to;
  return (
    <Link to={to} onClick={onClick} className={`rounded-lg font-bold flex items-center gap-3 transition-all ${className} ${isActive ? 'text-brand-600 bg-brand-50 shadow-sm' : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'}`}>
      <div className={`${isActive ? 'text-brand-600' : 'text-slate-400'}`}>{icon}</div>
      <span>{text}</span>
      {isActive && <ChevronLeft size={14} className="mr-auto" />}
    </Link>
  );
}

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, activeClub, clubs, syncStatus, user, userProfile, addNotification, clearUnread, notifications, unreadCount } = useAppStore();
  const { isSuperAdmin, isClubAdmin } = usePermissions();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const initialLoadRef = useRef(true);

  useEffect(() => { setIsMenuOpen(false); }, [location]);

  // Ensure Admin Presence in participant lists
  useEffect(() => {
    if (user && user.isAdmin && activeClub) {
        ensureAdminMembership(activeClub, user);
    }
  }, [user, activeClub]);

  // Real-time notifications from Firestore
  useEffect(() => {
      if (!activeClub || !user) return;
      const q = query(
          collection(db, 'notifications'),
          where('clubId', '==', activeClub),
          orderBy('timestamp', 'desc'),
          limit(15)
      );
      const unsubscribe = onSnapshot(q, (snap) => {
          if (initialLoadRef.current) {
              initialLoadRef.current = false;
              return;
          }
          snap.docChanges().forEach((change) => {
              if (change.type === "added") {
                  const data = change.doc.data();
                  addNotification(data.message, data.type);
              }
          });
      });
      return () => unsubscribe();
  }, [activeClub, user]);

  const handleLogout = () => {
      if(confirm('האם להתנתק מהמערכת?')) {
        logout();
        navigate('/');
      }
  };

  const currentClub = clubs.find(c => c.id === activeClub);
  const firstName = userProfile?.firstName || (user?.email?.split('@')[0] || 'משתמש');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {isMenuOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in" onClick={() => setIsMenuOpen(false)} />}
      <aside className={`fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-[60] transform transition-transform duration-300 ease-in-out flex flex-col ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
            <button onClick={() => setIsMenuOpen(false)} className="p-2 text-slate-400 rounded-full hover:bg-slate-200 shrink-0"><X size={24} /></button>
            <div className="font-black text-slate-800 leading-tight truncate"><div className="text-sm">אתגרים</div><div className="text-[9px] text-slate-400 uppercase tracking-widest truncate">{currentClub?.label}</div></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <NavLink to="/app" icon={<Calendar size={20} />} text="ניהול אימון" className="p-4" />
            {isClubAdmin && <><NavLink to="/app/manage" icon={<LayoutGrid size={20} />} text="ניהול חוג" className="p-4" /><NavLink to="/app/manage?view=INVITES" icon={<Sparkles size={20} />} text="לינקים וצירוף" className="p-4" /></>}
            {isSuperAdmin && <><div className="h-px bg-slate-100 my-4" /><NavLink to="/super-admin" icon={<Shield size={20} />} text="ניהול מערכת" className="p-4" /></>}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50">
            <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 p-4 text-slate-600 hover:text-brand-600 font-bold transition-all rounded-lg mb-2"><Home size={20} /><span>דף הבית</span></button>
            <button onClick={handleLogout} className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 font-bold transition-all rounded-lg"><LogOut size={20} /><span>התנתקות</span></button>
        </div>
      </aside>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm safe-area-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"><Menu size={28} /></button>
                <div className="relative">
                    <button onClick={() => { setIsNotifOpen(!isNotifOpen); if (!isNotifOpen) clearUnread(); }} className="p-2 text-slate-400 hover:text-brand-600 transition-colors relative">
                        <Bell size={24} />
                        {unreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow-sm animate-bounce"></span>}
                    </button>
                    {isNotifOpen && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 z-[70]">
                            <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center"><span className="text-xs font-black text-slate-400 uppercase tracking-widest">התראות</span><button onClick={() => setIsNotifOpen(false)}><X size={14} className="text-slate-300"/></button></div>
                            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                                {notifications.length === 0 ? <div className="p-8 text-center text-slate-400 text-xs">אין התראות חדשות</div> : notifications.map(n => (
                                    <div key={n.id} className="p-4 hover:bg-slate-50 transition-colors"><p className="text-sm font-bold text-slate-700 leading-tight">{n.message}</p><div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-medium"><Clock size={10}/> {new Date(n.timestamp).toLocaleTimeString('he-IL')}</div></div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-60">
                {syncStatus === 'SYNCING' ? <RefreshCw size={10} className="animate-spin text-brand-500" /> : <Cloud size={10} className="text-green-500" />}
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{syncStatus}</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-left hidden sm:block"><div className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">שלום,</div><div className="text-xs font-black text-slate-800 leading-tight truncate max-w-[100px]">{firstName}</div></div>
                {user?.photoURL ? <img src={user.photoURL} alt="User" className="w-9 h-9 rounded-full border-2 border-slate-100 shadow-sm" /> : <div className="w-9 h-9 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center border border-slate-200"><User size={20} /></div>}
            </div>
          </div>
        </div>
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">{children}</main>
    </div>
  );
};
