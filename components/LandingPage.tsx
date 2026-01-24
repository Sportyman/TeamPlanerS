
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ClubID, APP_VERSION, Role, MembershipStatus, getRoleLabel } from '../types';
import { Waves, Ship, Settings, Anchor, User, Loader2, LogOut, Clock, ShieldAlert, X } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveClub, clubs, user, userProfile, memberships, authInitialized, logout } = useAppStore();
  const [authError, setAuthError] = useState<string | null>(null);

  const handleClubSelect = (clubId: ClubID) => {
    setAuthError(null);
    setActiveClub(clubId);

    if (user) {
        const membership = memberships.find(m => m.clubId === clubId);
        
        if (user.isAdmin) {
            navigate('/app');
            return;
        }

        if (membership) {
            if (membership.status === MembershipStatus.ACTIVE) {
                const isStaff = (membership.role === Role.INSTRUCTOR || membership.role === Role.VOLUNTEER);
                if (isStaff) navigate('/app');
            }
            return; 
        }

        setAuthError("אין לך הרשאת גישה לחוג זה. הצטרפות מתבצעת דרך לינק הזמנה בלבד.");
    } else {
        navigate(`/login?club=${clubId}`);
    }
  };

  const handleSuperAdmin = () => {
    if (user && user.isAdmin) navigate('/super-admin');
    else navigate('/login?admin=true');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col items-center justify-between p-4">
      <div className="w-full max-w-7xl flex justify-between items-center p-2">
           <div className="flex items-center gap-2">
                <div className="bg-brand-600 text-white p-2 rounded-lg shadow-md"><Waves size={20} /></div>
                <span className="font-black text-slate-800 tracking-tighter">TeamPlaner</span>
           </div>

           {!authInitialized ? (
               <Loader2 className="animate-spin text-slate-300" size={20} />
           ) : user ? (
               <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200 shadow-sm">
                        <div className="text-right hidden sm:block">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">שלום,</div>
                            <div className="text-xs font-bold text-slate-700">{userProfile ? userProfile.firstName : user.email?.split('@')[0]}</div>
                        </div>
                        {user.photoURL ? <img src={user.photoURL} alt="U" className="w-8 h-8 rounded-full border shadow-sm" /> : <div className="w-8 h-8 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center"><User size={16} /></div>}
                    </div>
                    <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-all hover:bg-white rounded-lg"><LogOut size={20} /></button>
               </div>
           ) : null}
      </div>

      <div className="w-full flex-1 flex flex-col items-center justify-center">
          <div className="max-w-4xl w-full space-y-8 animate-in fade-in duration-700">
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tight">אתגרים: שיבוץ חכם</h1>
              <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">מערכת הניהול והשיבוץ למועדוני ספורט</p>
            </div>

            {authError && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-top-4 max-w-2xl mx-auto shadow-sm">
                    <div className="flex items-center gap-3 text-red-700 font-bold"><ShieldAlert size={24} /><span>{authError}</span></div>
                    <button onClick={() => setAuthError(null)}><X size={20} /></button>
                </div>
            )}

            <div className="bg-white/40 backdrop-blur-md p-6 md:p-10 rounded-[2.5rem] border border-white/50 shadow-xl max-w-2xl mx-auto w-full">
                {user && (memberships.length > 0 || user.isAdmin) ? (
                    <div className="space-y-6">
                        <div className="grid gap-4">
                            {user.isAdmin && clubs.map(club => (
                                <div key={club.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors"><Ship size={24} /></div>
                                        <div><h3 className="font-bold text-slate-800">{club.label}</h3><span className="text-[10px] bg-slate-800 text-white px-2 py-0.5 rounded-full font-bold uppercase">ADMIN</span></div>
                                    </div>
                                    <button onClick={() => handleClubSelect(club.id)} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-sm font-black transition-all">כניסה</button>
                                </div>
                            ))}
                            {!user.isAdmin && memberships.map(m => {
                                const club = clubs.find(c => c.id === m.clubId);
                                const isActive = m.status === MembershipStatus.ACTIVE;
                                return (
                                    <div key={m.clubId} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center"><Waves size={24} /></div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">{club?.label}</h3>
                                                <div className="flex gap-2 items-center mt-1">
                                                    <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-500">{getRoleLabel(m.role, userProfile?.gender || 'MALE' as any)}</span>
                                                    {!isActive && <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1"><Clock size={10} /> ממתין לאישור מנהל</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {isActive && (m.role === Role.INSTRUCTOR || m.role === Role.VOLUNTEER) && (
                                            <button onClick={() => handleClubSelect(m.clubId)} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-2xl text-sm font-black transition-all shadow-lg shadow-brand-100">ניהול</button>
                                        )}
                                        {!isActive && <div className="text-[10px] text-slate-400 italic font-medium px-4">בטיפול</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4 md:gap-6">
                            {clubs.map((club) => (
                                <button key={club.id} onClick={() => handleClubSelect(club.id)} className="group bg-white rounded-3xl p-6 shadow-sm hover:shadow-2xl border-2 border-transparent hover:border-brand-500 transition-all duration-500 flex flex-col items-center justify-center gap-4 aspect-square">
                                    <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Anchor size={32} /></div>
                                    <h2 className="text-lg font-bold text-slate-800 text-center leading-tight">{club.label}</h2>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="text-center"><button onClick={handleSuperAdmin} className="text-slate-400 hover:text-brand-600 text-xs font-bold flex items-center justify-center gap-2 mx-auto transition-colors py-2 px-4 rounded-full hover:bg-white/50"><Settings size={14} /> ניהול מערכת</button></div>
          </div>
      </div>
      <footer className="w-full py-6 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]" dir="ltr">TeamPlaner v{APP_VERSION} • Developed by Shay Kalimi</footer>
    </div>
  );
};
