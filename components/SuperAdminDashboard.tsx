
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Shield, Trash2, UserCheck, Home, Waves, Plus, Lock, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchGlobalConfig } from '../services/syncService';

export const SuperAdminDashboard: React.FC = () => {
  const { user, clubs, superAdmins, protectedAdmins, addClub, removeClub, addSuperAdmin, removeSuperAdmin } = useAppStore();
  const navigate = useNavigate();
  
  const [newEmail, setNewEmail] = useState('');
  const [newClubName, setNewClubName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Security Check
  if (!user || !user.isAdmin) {
    return (
        <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-red-500">אין גישה</h1>
            <button onClick={() => navigate('/')} className="mt-4 text-brand-600 underline">חזור לדף הבית</button>
        </div>
    );
  }

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    addSuperAdmin(newEmail);
    setNewEmail('');
  };

  const handleAddClub = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newClubName) return;
      addClub(newClubName);
      setNewClubName('');
  }

  const handleDeleteClub = (id: string, label: string) => {
      if(window.confirm(`האם למחוק את החוג "${label}"? פעולה זו אינה הפיכה.`)) {
          removeClub(id);
      }
  };

  const verifyConfig = async () => {
      setIsVerifying(true);
      await fetchGlobalConfig();
      setTimeout(() => setIsVerifying(false), 800);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
       {/* Header */}
       <div className="flex items-start justify-between border-b border-slate-200 pb-6">
           <div className="flex items-center gap-4">
                <div className="bg-slate-800 p-3 rounded-xl text-white hidden sm:block shadow-lg">
                    <Shield size={32} />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">ניהול מערכת (Super Admin)</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-500 text-sm md:text-base">הגדרות הרשאות וניהול חוגים גלובלי</span>
                        <div className="bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1 text-[10px] font-bold border border-green-200">
                            <ShieldCheck size={12} /> אבטחת שרת פעילה
                        </div>
                    </div>
                </div>
           </div>
           
           <button 
                onClick={() => navigate('/')} 
                className="flex flex-col items-center justify-center text-slate-500 hover:text-brand-600 transition-colors gap-1 px-2"
           >
               <Home size={32} />
               <span className="text-[10px] font-bold uppercase tracking-wide">דף הבית</span>
           </button>
       </div>

       {/* System Status Section */}
       <div className="bg-slate-900 text-white p-4 rounded-xl shadow-inner flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${protectedAdmins.length > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    <Shield size={20} />
                </div>
                <div>
                    <div className="text-sm font-bold">סטטוס הגנת Root</div>
                    <div className="text-[10px] opacity-70">
                        {protectedAdmins.length > 0 
                            ? `${protectedAdmins.length} מנהלים מוגנים ב-Firestore` 
                            : 'אזהרה: לא נמצאו מנהלים מוגנים!'}
                    </div>
                </div>
            </div>
            
            <button 
                onClick={verifyConfig}
                disabled={isVerifying}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
            >
                <RefreshCw size={14} className={isVerifying ? 'animate-spin' : ''} />
                {isVerifying ? 'בודק סנכרון...' : 'סנכרן הגדרות ענן'}
            </button>
       </div>

       {/* CLUBS MANAGEMENT */}
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-800">
               <Waves size={24} className="text-brand-600" />
               ניהול חוגים
           </h2>
           
           <form onSubmit={handleAddClub} className="flex flex-col sm:flex-row gap-3 mb-6">
               <input 
                 type="text" 
                 value={newClubName}
                 onChange={e => setNewClubName(e.target.value)}
                 className="w-full sm:flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                 placeholder="שם החוג החדש..."
               />
               <button 
                    type="submit" 
                    className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
               >
                   <Plus size={20} />
                   הוסף חוג
               </button>
           </form>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {clubs.map(club => (
                   <div key={club.id} className="p-4 border rounded-lg flex justify-between items-center bg-slate-50 hover:bg-white transition-colors group">
                       <span className="font-bold text-lg truncate pr-2 group-hover:text-brand-600 transition-colors">{club.label}</span>
                       <button 
                         type="button"
                         onClick={() => handleDeleteClub(club.id, club.label)}
                         className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors shrink-0"
                         title="מחק חוג"
                       >
                           <Trash2 size={20} />
                       </button>
                   </div>
               ))}
           </div>
       </div>

       {/* ADMINS MANAGEMENT */}
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="font-bold text-xl flex items-center gap-2 text-slate-800">
                        <UserCheck size={24} className="text-brand-600" />
                        ניהול מנהלי-על
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">כתובות אלו מורשות לגשת לניהול העל ולמחוק חוגים.</p>
                </div>
                {protectedAdmins.length > 0 && (
                    <div className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg border border-brand-100 flex items-center gap-2 text-xs font-bold animate-pulse">
                        <Lock size={14} /> הגנת שרת פעילה
                    </div>
                )}
           </div>
           
           <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-3 mb-6">
               <input 
                 type="email" 
                 value={newEmail}
                 onChange={e => setNewEmail(e.target.value)}
                 className="w-full sm:flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                 placeholder="כתובת אימייל מורשית..."
                 dir="ltr"
               />
               <button 
                    type="submit" 
                    className="w-full sm:w-auto bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap"
               >
                   <Plus size={20} />
                   הוסף מנהל
               </button>
           </form>

           <div className="space-y-2">
               {superAdmins.map(email => {
                   const normalized = email.toLowerCase().trim();
                   const isProtected = protectedAdmins.includes(normalized);
                   const isMe = user?.email.toLowerCase().trim() === normalized;

                   return (
                       <div key={email} className={`p-4 border-b flex justify-between items-center last:border-0 hover:bg-slate-50 transition-colors rounded-lg ${isProtected ? 'bg-brand-50/30 border-brand-100' : ''}`}>
                           <div className="flex items-center gap-3">
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${isProtected ? 'bg-brand-600' : 'bg-slate-400'}`}>
                                   {normalized.charAt(0).toUpperCase()}
                               </div>
                               <div>
                                   <div className="flex items-center gap-2">
                                       <span className={`font-mono font-bold break-all ${isMe ? 'text-brand-700 underline underline-offset-4' : 'text-slate-700'}`}>
                                           {email}
                                       </span>
                                       {isProtected && (
                                           <span className="bg-brand-100 text-brand-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm border border-brand-200">
                                               <Lock size={10} /> Root
                                           </span>
                                       )}
                                       {isMe && <span className="text-[10px] text-slate-400 font-bold">(זה אתה)</span>}
                                   </div>
                               </div>
                           </div>
                           <button 
                                type="button"
                                onClick={() => { 
                                    if(isProtected) return;
                                    if(confirm(`להסיר גישת ניהול עבור ${email}?`)) removeSuperAdmin(email); 
                                }}
                                disabled={isProtected}
                                className={`p-2 rounded-full ml-2 shrink-0 transition-all ${
                                    isProtected 
                                    ? 'text-slate-300 cursor-not-allowed bg-slate-100' 
                                    : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                                }`}
                                title={isProtected ? 'חשבון מוגן על ידי חוקי האבטחה של השרת' : 'הסר מנהל'}
                           >
                               {isProtected ? <Lock size={18} /> : <Trash2 size={18} />}
                           </button>
                       </div>
                   );
               })}
               {superAdmins.length === 0 && (
                   <div className="flex items-center gap-3 text-sm text-amber-600 font-bold bg-amber-50 p-4 rounded-xl border border-amber-200">
                       <AlertCircle size={20} />
                       שים לב: לא הוגדרו מנהלי על במסד הנתונים!
                   </div>
               )}
           </div>
       </div>

       {/* Security Warning Information */}
       <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={20} />
            <div className="text-xs text-blue-800 leading-relaxed">
                <p className="font-bold mb-1">כיצד לבדוק את אבטחת השרת:</p>
                <p>חשבונות המסומנים כ-<b>Root</b> מוגנים גם ברמת הקוד וגם ברמת ה-Security Rules של Firestore. כדי לוודא זאת, נסה למחוק חשבון Root - המערכת תחסום אותך ותציג שגיאת הרשאה.</p>
            </div>
       </div>
    </div>
  );
};
