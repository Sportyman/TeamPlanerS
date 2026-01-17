
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore, ROOT_ADMIN_EMAIL } from '../store';
import { ShieldCheck, Mail, Zap, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { APP_VERSION } from '../types';

export const Login: React.FC = () => {
  const { loginWithGoogle, loginDev, user, activeClub, clubs } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const isAdminLogin = searchParams.get('admin') === 'true';
  const currentClubLabel = activeClub ? clubs.find(c => c.id === activeClub)?.label : '';

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
          if (isAdminLogin && user.isAdmin) {
              navigate('/super-admin');
          } else {
              navigate('/app');
          }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, navigate, isAdminLogin]);

  const handleGoogleLogin = async () => {
      setIsRedirecting(true);
      const success = await loginWithGoogle();
      if (!success) {
          setIsRedirecting(false);
          setErrorMsg('התחברות נכשלה או שאין לך הרשאות מתאימות.');
      }
  };

  const handleDevLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const success = loginDev(emailInput.trim());
      if (success) {
          setIsRedirecting(true);
      } else {
          setErrorMsg('אימייל זה אינו מורשה.');
      }
  };

  if (isRedirecting) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
              <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
                  <Loader2 size={48} className="text-brand-600 animate-spin mb-4" />
                  <h2 className="text-xl font-bold text-slate-800">מתחבר למערכת...</h2>
                  <p className="text-slate-500 text-sm mt-2">אנא המתן</p>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 animate-in fade-in duration-500">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
        
        <div className="text-center relative">
          <button 
             onClick={() => navigate('/')} 
             className="absolute right-0 top-0 text-slate-400 hover:text-slate-600"
             title="חזרה לדף הראשי"
          >
              <ArrowRight size={20} />
          </button>
          
          <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-800">
              {isAdminLogin ? 'ניהול מערכת (Super Admin)' : `כניסה - ${currentClubLabel}`}
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
              התחבר למערכת באמצעות חשבון Google
          </p>
        </div>

        {errorMsg && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                <AlertTriangle size={16} />
                {errorMsg}
            </div>
        )}

        {/* GOOGLE LOGIN BUTTON */}
        <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-lg transition-all shadow-sm"
        >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/action/google.svg" alt="Google" className="w-6 h-6" />
            התחברות עם Google
        </button>

        <div className="relative pt-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-400">או כניסה ללא סיסמה (פיתוח)</span>
            </div>
        </div>

        {/* Dev Mode Form */}
        <form onSubmit={handleDevLogin} className="space-y-4">
            <div>
                <input 
                    type="email" 
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                    placeholder="הכנס אימייל מורשה..."
                    value={emailInput}
                    onChange={e => setEmailInput(e.target.value)}
                    dir="ltr"
                />
            </div>
            <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors"
            >
                <Zap size={16} className="text-yellow-400" />
                כניסה מהירה (Dev Root)
            </button>
        </form>

      </div>
      
      <div className="mt-8 text-center text-xs text-slate-400" dir="ltr">
         <p>Version {APP_VERSION}</p>
         <p className="mt-1">Built by Shay Kalimi - @Shay.A.i</p>
      </div>
    </div>
  );
};
