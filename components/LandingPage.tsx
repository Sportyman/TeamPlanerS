
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ClubID, APP_VERSION } from '../types';
import { Waves, Ship, Settings, Anchor, User, Loader2 } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveClub, clubs, user, userProfile, authInitialized } = useAppStore();

  const handleClubSelect = (clubId: ClubID) => {
    setActiveClub(clubId);
    if (user) {
        // If logged in, go straight to the app
        navigate('/app');
    } else {
        // Otherwise, ask for login
        navigate('/login');
    }
  };

  const handleSuperAdmin = () => {
    if (user && user.isAdmin) {
        navigate('/super-admin');
    } else {
        navigate('/login?admin=true');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col items-center justify-between p-4">
      {/* Background Auth Status */}
      <div className="w-full max-w-7xl flex justify-end p-2">
           {!authInitialized ? (
               <Loader2 className="animate-spin text-slate-300" size={20} />
           ) : user ? (
               <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                   <div className="text-right">
                       <div className="text-[10px] text-slate-400 font-bold uppercase">מחובר כרגע</div>
                       <div className="text-xs font-bold text-slate-700">{userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : user.email}</div>
                   </div>
                   {user.photoURL ? (
                       <img src={user.photoURL} alt="User" className="w-8 h-8 rounded-full border" />
                   ) : (
                       <div className="w-8 h-8 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center"><User size={16} /></div>
                   )}
               </div>
           ) : null}
      </div>

      <div className="w-full flex-1 flex flex-col items-center justify-center">
          <div className="max-w-4xl w-full space-y-8 md:space-y-12">
            
            {/* Header / Logo */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-3">
                 <div className="bg-brand-600 text-white p-4 rounded-2xl shadow-lg">
                    <Waves size={48} />
                 </div>
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight">
                אתגרים - מערכת שיבוץ
              </h1>
              <p className="text-lg md:text-xl text-slate-500 font-light">בחר חוג לכניסה</p>
            </div>

            {/* Dynamic Club Selection - Centered Flex Layout */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {clubs.map((club) => (
                  <button
                    key={club.id}
                    onClick={() => handleClubSelect(club.id)}
                    className="group relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl border-2 border-transparent hover:border-brand-500 transition-all duration-300 flex flex-col items-center justify-center gap-4 w-[45%] md:w-52 aspect-square"
                  >
                    <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      {club.label.includes('שייט') ? <Ship size={32} /> : 
                       club.label.includes('קיאק') ? <Waves size={32} /> :
                       <Anchor size={32} />}
                    </div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 text-center leading-tight">{club.label}</h2>
                    {user && (
                        <div className="absolute top-2 left-2 text-[8px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity">כניסה מהירה</div>
                    )}
                  </button>
              ))}
            </div>

            {/* Footer Admin Link */}
            <div className="text-center pt-8">
               <button 
                 onClick={handleSuperAdmin}
                 className="text-slate-400 hover:text-slate-600 text-sm flex items-center justify-center gap-2 mx-auto transition-colors"
               >
                 <Settings size={14} />
                 כניסה לניהול מערכת
               </button>
            </div>

          </div>
      </div>
      
      {/* Credits Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 opacity-60 flex flex-col gap-1" dir="ltr">
         <div>Built by Shay Kalimi - @Shay.A.i</div>
         <div className="text-[10px] font-black opacity-50 uppercase tracking-[0.2em]">v{APP_VERSION}</div>
      </footer>
    </div>
  );
};
