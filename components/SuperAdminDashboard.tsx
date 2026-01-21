
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Shield, Trash2, UserCheck, Home, Waves, Plus, LayoutGrid } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminDashboardShell } from './admin/AdminDashboardShell';
import { fetchGlobalConfig, addLog } from '../services/syncService';

type AdminTab = 'CLUBS' | 'MANAGEMENT';

export const SuperAdminDashboard: React.FC = () => {
  const { user, clubs, addClub, removeClub } = useAppStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Persist tab state in URL
  const activeTab = (searchParams.get('tab') as AdminTab) || 'CLUBS';
  const [newClubName, setNewClubName] = useState('');

  // Refresh data on mount to ensure we have the latest admins list
  useEffect(() => {
    addLog("SuperAdmin: Refreshing global configuration on mount", 'SYNC');
    fetchGlobalConfig();
  }, []);

  if (!user || !user.isAdmin) {
    return (
        <div className="p-8 text-center">
            <h1 className="text-2xl font-bold text-red-500">אין גישה</h1>
            <button onClick={() => navigate('/')} className="mt-4 text-brand-600 underline">חזור לדף הבית</button>
        </div>
    );
  }

  const setActiveTab = (tab: AdminTab) => {
    setSearchParams({ tab });
  };

  const handleAddClub = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newClubName) return;
      addClub(newClubName);
      setNewClubName('');
  }

  const handleDeleteClub = (id: string, label: string) => {
      if(window.confirm(`האם למחוק את החוג "${label}"? פעולה זו אינה הפיכה!`)) {
          removeClub(id);
      }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 pb-24">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200 pb-8">
           <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl">
                    <Shield size={32} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">ניהול מערכת (Super Admin)</h1>
                    <p className="text-slate-500 font-medium">ניהול מועדונים, הרשאות והגדרות ליבה</p>
                </div>
           </div>
           <button onClick={() => navigate('/')} className="flex items-center justify-center gap-3 px-6 py-3 bg-white border border-slate-200 text-slate-600 hover:text-brand-600 rounded-2xl transition-all font-bold">
               <Home size={20} /> <span>חזרה לדף הבית</span>
           </button>
       </div>

       <div className="flex p-1 bg-slate-200/50 rounded-[2rem] max-w-md mx-auto md:mx-0">
          <button onClick={() => setActiveTab('CLUBS')} className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.8rem] text-sm font-black transition-all ${activeTab === 'CLUBS' ? 'bg-white text-slate-900 shadow-md scale-[1.02]' : 'text-slate-500 hover:bg-white/40'}`}>
            <LayoutGrid size={20} /> <span>חוגים</span>
          </button>
          <button onClick={() => setActiveTab('MANAGEMENT')} className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.8rem] text-sm font-black transition-all ${activeTab === 'MANAGEMENT' ? 'bg-white text-slate-900 shadow-md scale-[1.02]' : 'text-slate-500 hover:bg-white/40'}`}>
            <UserCheck size={20} /> <span>ניהול מנהלים</span>
          </button>
       </div>

       {activeTab === 'CLUBS' ? (
         <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <h2 className="font-black text-2xl mb-8 flex items-center gap-3 text-slate-800"><Waves size={28} className="text-brand-600" /> ניהול רשימת חוגים</h2>
                <form onSubmit={handleAddClub} className="flex flex-col md:flex-row gap-4 mb-10">
                    <input type="text" value={newClubName} onChange={e => setNewClubName(e.target.value)} className="flex-1 px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-brand-500 focus:bg-white outline-none font-bold transition-all" placeholder="שם החוג החדש..." />
                    <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"><Plus size={24} /> הוסף חוג</button>
                </form>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clubs.map(club => (
                        <div key={club.id} className="group p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl flex justify-between items-center hover:bg-white hover:border-brand-200 transition-all hover:shadow-xl">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors"><Waves size={24} /></div>
                                <span className="font-black text-lg text-slate-800 truncate max-w-[150px]">{club.label}</span>
                            </div>
                            <button onClick={() => handleDeleteClub(club.id, club.label)} className="text-slate-300 hover:text-red-500 p-3 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={24} /></button>
                        </div>
                    ))}
                </div>
            </div>
         </div>
       ) : (
         <AdminDashboardShell />
       )}
    </div>
  );
};
