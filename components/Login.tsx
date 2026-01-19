
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { ShieldCheck, Mail, Zap, AlertTriangle, ArrowRight, Loader2, ShieldAlert } from 'lucide-react';
import { APP_VERSION } from '../types';

export const Login: React.FC = () => {
  const { loginWithGoogle, loginDev, user, activeClub, clubs, authError, setAuthError } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [emailInput, setEmailInput] = useState('');
  const [localError, setLocalError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const isAdminLogin = searchParams.get('admin') === 'true';
  const currentClubLabel = activeClub ? clubs.find(c => c.id === activeClub)?.label : '';

  useEffect(() => {
    if (user) {
      if (isAdminLogin) {
          if (user.isAdmin) {
              navigate('/super-admin');
          } else {
              setLocalError('אינך מורשה לגשת למערכת הניהול הראשי.');
              setIsRedirecting(false);
          }
      } else {
          if (activeClub) {
             navigate('/app');
          } else {
             navigate('/');
          }
      }
    }
  }, [user, navigate, isAdminLogin, activeClub]);

  const handleGoogleLogin = async () => {
      setIsRedirecting(true);
      setLocalError('');
      setAuthError(null);
      const success = await loginWithGoogle();
      if (!success) {
          setIsRedirecting(false);
          // General errors are handled by localError, specific kick-outs are handled by authError
      }
  };

  const handleDevLogin = (e: React.FormEvent) => {
      e.preventDefault();
      setLocalError('');
      setAuthError(null);
      setIsRedirecting(true);
      const success = loginDev(emailInput.trim(), isAdminLogin);
      if (!success) {
          setIsRedirecting(false);
          setLocalError('שגיאה בתהליך ההתחברות.');
      }
  };

  if (isRedirecting && !localError && !authError) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
              <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
                  <Loader2 size={48} className="text-brand-600 animate-spin mb-4" />
                  <h2 className="text-xl font-bold text-slate-800">מתחבר למערכת...</h2>
                  <p className="text-slate-500 text-sm mt-2">בודק הרשאות כניסה</p>
              </div>
          </div>
      );
  }

  const combinedError = localError || authError;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-8 md:p-10 space-y-8 border border-slate-100">
        
        <div className="text-center relative">
          <button 
             onClick={() => { setAuthError(null); navigate('/'); }} 
             className="absolute right-0 -top-2 p-2 text-slate-400 hover:text-brand-600 hover:bg-slate-50 rounded-full transition-all"
             title="חזרה לדף הראשי"
          >
              <ArrowRight size={24} />
          </button>
          
          <div className="w-20 h-20 bg-brand-100 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner rotate-3">
            <ShieldCheck size={40} />
          </div>
          
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              {isAdminLogin ? 'ניהול מערכת' : `כניסה - ${currentClubLabel}`}
          </h1>
          <p className="text-slate-500 mt-3 text-sm font-medium">
              התחבר למערכת השיבוץ של אתגרים
          </p>
        </div>

        {combinedError && (
            <div className={`flex items-start gap-3 p-4 rounded-xl text-sm font-bold animate-in slide-in-from-top-2 ${authError ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {authError ? <ShieldAlert size={20} className="shrink-0" /> : <AlertTriangle size={20} className="shrink-0" />}
                <span>{combinedError}</span>
            </div>
        )}

        <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-4 bg-white border border-slate-200 hover:border-brand-300 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md group"
        >
            <div className="bg-white p-1 rounded-sm">
                <svg width="18" height="18" viewBox="0 0 18 18">
                    <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.12-.84 2.07-1.79 2.7l2.85 2.2c1.67-1.53 2.63-3.79 2.63-6.46z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.85-2.2c-.79.53-1.8.85-3.11.85-2.39 0-4.41-1.61-5.14-3.77L1.01 13.5C2.49 16.44 5.51 18 9 18z" fill="#34A853"/>
                    <path d="M3.86 10.74c-.19-.56-.3-1.15-.3-1.74s.11-1.18.3-1.74l-2.85-2.2c-.62 1.25-.98 2.67-.98 4.16s.36 2.91.98 4.16l2.85-2.24z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.51 0 2.49 1.56 1.01 4.5L3.86 6.74c.73-2.16 2.75-3.77 5.14-3.77z" fill="#EA4335"/>
                </svg>
            </div>
            המשך עם Google
        </button>

        <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-4 bg-white text-slate-400 font-bold uppercase tracking-widest">או כניסה חופשית למפתחים</span>
            </div>
        </div>

        <form onSubmit={handleDevLogin} className="space-y-4">
            <div className="relative group">
                <Mail className="absolute right-4 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                <input 
                    type="email" 
                    className="w-full pr-12 pl-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                    placeholder="אימייל (אופציונלי)..."
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    dir="ltr"
                />
            </div>
            <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-xl transition-all shadow-sm active:scale-95"
            >
                <Zap size={18} className="text-yellow-400 fill-current" />
                כניסה מהירה
            </button>
        </form>

      </div>
      
      <div className="mt-8 text-center text-xs text-slate-400" dir="ltr">
         <p className="font-bold">TeamPlaner Hybrid v{APP_VERSION}</p>
         <p className="mt-1 opacity-60">Built by Shay Kalimi - @Shay.A.i</p>
      </div>
    </div>
  );
};
