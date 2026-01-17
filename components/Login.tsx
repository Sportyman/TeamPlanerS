
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { ShieldCheck, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { APP_VERSION } from '../types';

export const Login: React.FC = () => {
  const { login, user, activeClub, clubs } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const isAdminLogin = searchParams.get('admin') === 'true';
  const currentClubLabel = activeClub ? clubs.find(c => c.id === activeClub)?.label : '';

  // ניתוב אוטומטי לאחר התחברות מוצלחת
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
          if (isAdminLogin && user.isAdmin) {
              navigate('/super-admin');
          } else {
              navigate('/app');
          }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [user, navigate, isAdminLogin]);

  const handleGoogleLogin = async () => {
      if (isLoading) return;
      
      setIsLoading(true);
      setErrorMsg('');
      
      try {
        const success = await login();
        
        if (!success) {
            setErrorMsg(isAdminLogin 
              ? 'גישת מנהל נדחתה. ודא שאתה משתמש באימייל המורשה.'
              : 'אין לך הרשאות ניהול לחוג זה.');
            setIsLoading(false);
        }
      } catch (error) {
        console.error("Login attempt failed:", error);
        setErrorMsg("ההתחברות נכשלה. ודא שחלונות קופצים מאושרים בדפדפן ונסה שוב.");
        setIsLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 md:p-10 space-y-8 border border-slate-100">
        
        {/* Header Section */}
        <div className="text-center relative">
          <button 
             onClick={() => navigate('/')} 
             className="absolute -right-2 -top-2 p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-all"
             title="חזרה לדף הראשי"
          >
              <ArrowRight size={24} />
          </button>
          
          <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-3 shadow-inner">
            <ShieldCheck size={40} />
          </div>
          
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              {isAdminLogin ? 'ניהול מערכת' : 'כניסת מנהל חוג'}
          </h1>
          <p className="text-slate-500 mt-3 text-base">
              {isAdminLogin 
                ? 'גישה להגדרות הליבה של האפליקציה' 
                : `ניהול שיבוצים עבור ${currentClubLabel}`}
          </p>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
            <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl text-sm font-medium border border-red-100 animate-in shake duration-300">
                <AlertTriangle size={20} className="shrink-0" />
                {errorMsg}
            </div>
        )}

        {/* Primary Action */}
        <div className="space-y-4">
            <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className={`
                    w-full flex items-center justify-center gap-4 py-4 px-6 rounded-2xl font-bold text-lg
                    transition-all duration-300 transform active:scale-[0.98] shadow-md
                    ${isLoading 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                        : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-brand-500 hover:bg-slate-50 hover:shadow-lg'}
                `}
            >
                {isLoading ? (
                    <Loader2 size={24} className="animate-spin" />
                ) : (
                    <img 
                        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                        className="w-6 h-6" 
                        alt="Google" 
                    />
                )}
                <span>{isLoading ? 'מתחבר...' : 'התחבר עם Google'}</span>
            </button>
            
            <p className="text-center text-xs text-slate-400 font-medium">
                המערכת תשתמש בחשבון ה-Google שלך כדי לאמת את זהותך
            </p>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-slate-100 text-center">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                Authorized Access Only
            </div>
        </div>

      </div>
      
      {/* Credits / Metadata */}
      <div className="mt-10 text-center space-y-1">
         <p className="text-slate-400 text-xs font-mono">Build v{APP_VERSION}</p>
         <p className="text-slate-300 text-[10px]">Architecture by @Shay.A.i</p>
      </div>
    </div>
  );
};
