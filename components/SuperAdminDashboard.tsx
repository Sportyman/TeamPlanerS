
import React, { useState } from 'react';
import { useAppStore, ROOT_ADMIN_EMAIL } from '../store';
import { Shield, Trash2, UserCheck, Home, Waves, Plus } from 'lucide-react';
// Fix: Added Navigate to the imports from react-router-dom
import { useNavigate, Navigate } from 'react-router-dom';

export const SuperAdminDashboard: React.FC = () => {
  const { user, clubs, superAdmins, addClub, removeClub, addSuperAdmin, removeSuperAdmin } = useAppStore();
  const navigate = useNavigate();
  
  const [newEmail, setNewEmail] = useState('');
  const [newClubName, setNewClubName] = useState('');

  if (!user || !user.isAdmin) return <Navigate to="/" />;

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    addSuperAdmin(newEmail.toLowerCase().trim());
    setNewEmail('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
       <div className="flex justify-between items-center border-b pb-6">
           <div className="flex items-center gap-4">
                <div className="bg-slate-800 p-3 rounded-2xl text-white shadow-lg"><Shield size={32} /></div>
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">ניהול על הארגון</h1>
                    <p className="text-slate-500 font-bold">מנהל מחובר: {user.email}</p>
                </div>
           </div>
           <button onClick={() => navigate('/')} className="p-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-brand-600 transition-all"><Home size={28} /></button>
       </div>

       <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm">
           <h2 className="font-black text-xl mb-6 flex items-center gap-2 text-slate-800"><UserCheck size={24} className="text-brand-600" /> מנהלי מערכת</h2>
           
           <form onSubmit={handleAddAdmin} className="flex gap-3 mb-8">
               <input 
                 type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                 className="flex-1 px-5 py-3.5 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-brand-500/10 outline-none"
                 placeholder="מייל להוספה..." dir="ltr"
               />
               <button type="submit" className="bg-slate-800 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl transition-all">הוסף מנהל</button>
           </form>

           <div className="space-y-3">
               {superAdmins.map(email => {
                   const isGod = email.toLowerCase() === ROOT_ADMIN_EMAIL.toLowerCase();
                   return (
                       <div key={email} className="p-4 border-2 border-slate-50 rounded-2xl flex justify-between items-center bg-slate-50 hover:bg-white transition-all">
                           <span className={`font-bold ${isGod ? 'text-brand-600' : 'text-slate-700'}`}>{email}</span>
                           <div className="flex items-center gap-3">
                               {isGod ? (
                                   <span className="text-[10px] font-black bg-brand-600 text-white px-3 py-1.5 rounded-full uppercase tracking-widest">God Mode</span>
                               ) : (
                                   <button onClick={() => removeSuperAdmin(email)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={20} /></button>
                               )}
                           </div>
                       </div>
                   );
               })}
           </div>
       </div>
    </div>
  );
};
