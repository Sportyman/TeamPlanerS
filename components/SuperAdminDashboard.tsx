
import React, { useState } from 'react';
import { useAppStore, ROOT_ADMIN_EMAIL } from '../store';
import { Shield, Trash2, UserCheck, Home, Waves, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SuperAdminDashboard: React.FC = () => {
  const { user, clubs, superAdmins, addClub, removeClub, addSuperAdmin, removeSuperAdmin } = useAppStore();
  const navigate = useNavigate();
  
  const [newEmail, setNewEmail] = useState('');
  const [newClubName, setNewClubName] = useState('');

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

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
       {/* Header with redesigned Back Button */}
       <div className="flex items-start justify-between border-b border-slate-200 pb-6">
           <div className="flex items-center gap-4">
                <div className="bg-slate-800 p-3 rounded-full text-white hidden sm:block">
                    <Shield size={32} />
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">ניהול על (Super Admin)</h1>
                    <p className="text-slate-500 text-sm md:text-base">ניהול חוגים ומנהלי מערכת</p>
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

       {/* CLUBS MANAGEMENT */}
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-800">
               <Waves size={24} className="text-brand-600" />
               ניהול חוגים
           </h2>
           
           {/* Form - Responsive Stack */}
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
                    className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-bold flex items-center justify-center gap-2 whitespace-nowrap"
               >
                   <Plus size={20} />
                   הוסף חוג
               </button>
           </form>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {clubs.map(club => (
                   <div key={club.id} className="p-4 border rounded-lg flex justify-between items-center bg-slate-50 hover:bg-white transition-colors">
                       <span className="font-bold text-lg truncate pr-2">{club.label}</span>
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
               {clubs.length === 0 && (
                   <p className="text-slate-400 italic">אין חוגים במערכת.</p>
               )}
           </div>
       </div>

       {/* ADMINS MANAGEMENT */}
       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
           <h2 className="font-bold text-xl mb-6 flex items-center gap-2 text-slate-800">
               <UserCheck size={24} className="text-brand-600" />
               ניהול מנהלי-על
           </h2>
           
           <form onSubmit={handleAddAdmin} className="flex flex-col sm:flex-row gap-3 mb-6">
               <input 
                 type="email" 
                 value={newEmail}
                 onChange={e => setNewEmail(e.target.value)}
                 className="w-full sm:flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                 placeholder="כתובת אימייל..."
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
               {superAdmins.map(email => (
                   <div key={email} className="p-3 border-b flex justify-between items-center last:border-0 hover:bg-slate-50 transition-colors rounded-lg">
                       <span className="font-mono text-slate-700 break-all">{email}</span>
                       {email.toLowerCase() !== ROOT_ADMIN_EMAIL.toLowerCase() ? (
                           <button 
                                type="button"
                                onClick={() => { if(confirm('להסיר גישת ניהול?')) removeSuperAdmin(email); }}
                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full ml-2 shrink-0"
                                title="הסר מנהל"
                           >
                               <Trash2 size={18} />
                           </button>
                       ) : (
                           <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded whitespace-nowrap ml-2">ראשי</span>
                       )}
                   </div>
               ))}
           </div>
       </div>
    </div>
  );
};
