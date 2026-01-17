
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { ClubID, APP_VERSION } from '../types';
import { Waves, Ship, Settings, Anchor } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveClub, clubs } = useAppStore();

  const handleClubSelect = (clubId: ClubID) => {
    setActiveClub(clubId);
    navigate('/login');
  };

  const handleSuperAdmin = () => {
    navigate('/login?admin=true');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col items-center justify-between p-4">
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
                 כניסה למנהל מערכת ראשי
               </button>
            </div>

          </div>
      </div>
      
      {/* Credits Footer with Version */}
      <footer className="w-full py-8 text-center" dir="ltr">
         <div className="text-xs text-slate-400 opacity-70">Built by Shay Kalimi - @Shay.A.i</div>
         <div className="text-[10px] font-bold text-slate-300 mt-1.5 uppercase tracking-[0.2em]">
            v{APP_VERSION}
         </div>
      </footer>
    </div>
  );
};
