
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore, ROOT_ADMIN_EMAIL } from '../store';
import { ShieldCheck, Mail, Zap, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { APP_VERSION } from '../types';

export const Login: React.FC = () => {
  const { login, user, activeClub, clubs } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const isAdminLogin = searchParams.get('admin') === 'true';
  const currentClubLabel = activeClub ? clubs.find(c => c.id === activeClub)?.label : '';

  // Watch for changes in user state and redirect
  useEffect(() => {
    if (user) {
      // Small delay to allow the "Success" spinner to be seen and prevent flickering
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

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const success = login(emailInput.trim());
      
      if (success) {
          setIsRedirecting(true); // Trigger loading view
      } else {
          setErrorMsg(isAdminLogin 
            ? 'אימייל זה אינו מורשה כמנהל על.'
            : 'אימייל זה אינו מורשה לניהול חוג זה.');
            setIsRedirecting(false);
      }
  };

  // Allow Super Admin shortcut for demo
  const handleDevLogin = () => {
    const success = login(ROOT_ADMIN_EMAIL);
    if (success) setIsRedirecting(true);
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
        
        {/* Header */}
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
              הזן את כתובת האימייל המורשית שלך
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">אימייל</label>
                <div className="relative">
                    <Mail className="absolute right-3 top-3 text-slate-400" size={20} />
                    <input 
                        type="email" 
                        required
                        className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        placeholder="your@email.com"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        dir="ltr"
                    />
                </div>
            </div>

            {errorMsg && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                    <AlertTriangle size={16} />
                    {errorMsg}
                </div>
            )}

            <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
                התחבר
            </button>
        </form>

        {/* Dev Mode Shortcut */}
        <div className="relative pt-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-400">אפשרויות פיתוח</span>
            </div>
        </div>

        <button
            onClick={handleDevLogin}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium py-3 px-4 rounded-lg transition-colors"
        >
            <Zap size={16} className="text-yellow-400" />
            כניסה ללא סיסמה (Dev Root)
        </button>

      </div>
      
      {/* Credits Footer */}
      <div className="mt-8 text-center text-xs text-slate-400" dir="ltr">
         <p>Version {APP_VERSION}</p>
         <p className="mt-1">Built by Shay Kalimi - @Shay.A.i</p>
      </div>
    </div>
  );
};
