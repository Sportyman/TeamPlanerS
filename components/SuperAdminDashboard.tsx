import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { ClubSchedule } from '../types';
import { Shield, UserCheck, Home, Waves, Plus, LayoutGrid, Eraser } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminDashboardShell } from './admin/AdminDashboardShell';
import { ClubCardItem } from './admin/ClubCardItem';
import { DEFAULT_SCHEDULE_DRAFT, ScheduleFieldsForm } from './schedule/ScheduleFieldsForm';
import { fetchGlobalConfig, addLog } from '../services/syncService';
import {
  isLegacyMockId, markClubDeletedInCloud, purgeLegacyMockMemberships, saveClubLabelToCloud,
} from '../services/auth/superAdminService';

type AdminTab = 'CLUBS' | 'MANAGEMENT';

export const SuperAdminDashboard: React.FC = () => {
  const { user, clubs, people, setPeople, addClub, updateClub, removeClub, addNotification } = useAppStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as AdminTab) || 'CLUBS';

  const [newClubName, setNewClubName] = useState('');
  const [newSchedule, setNewSchedule] = useState<ClubSchedule>(DEFAULT_SCHEDULE_DRAFT);
  const [isPurging, setIsPurging] = useState(false);

  useEffect(() => {
    addLog('SuperAdmin: Refreshing global configuration on mount', 'SYNC');
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

  const mockCountInState = people.filter((p) => isLegacyMockId(p.id)).length;
  const setActiveTab = (tab: AdminTab) => setSearchParams({ tab });

  const handleAddClub = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClubName.trim();
    if (!trimmed) return;
    const newId = addClub(trimmed, newSchedule);
    setNewClubName('');
    await saveClubLabelToCloud(newId, trimmed, newSchedule).catch(() => {});
    addNotification(`החוג "${trimmed}" נוסף בהצלחה`, 'SUCCESS');
  };

  const handleSaveEdit = async (id: string, label: string, schedule?: ClubSchedule) => {
    updateClub(id, label, schedule);
    await saveClubLabelToCloud(id, label, schedule).catch(() => {});
    addNotification(`פרטי החוג "${label}" עודכנו בהצלחה`, 'SUCCESS');
  };

  const handleDeleteClub = async (id: string, label: string) => {
    if (window.confirm(`האם למחוק את החוג "${label}"? פעולה זו אינה הפיכה!`)) {
      removeClub(id);
      await markClubDeletedInCloud(id).catch(() => {});
      addNotification(`החוג "${label}" הוסר`, 'INFO');
    }
  };

  const handlePurgeMock = async () => {
    if (isPurging) return;
    setIsPurging(true);
    try {
      const removed = await purgeLegacyMockMemberships();
      setPeople(people.filter((p) => !isLegacyMockId(p.id)));
      addNotification(
        removed > 0 ? `נוקו ${removed} חברי דמה ממסד הנתונים` : 'לא נמצאו חברי דמה נוספים במסד הנתונים',
        'SUCCESS'
      );
    } finally {
      setIsPurging(false);
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
            <p className="text-slate-500 font-medium">ניהול מועדונים, ימים, שעות, מיקומים והרשאות</p>
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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-black text-2xl flex items-center gap-3 text-slate-800"><Waves size={28} className="text-brand-600" /> ניהול רשימת חוגים</h2>
              <button
                type="button"
                disabled={isPurging}
                onClick={handlePurgeMock}
                className="px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-2"
              >
                <Eraser size={15} />
                <span>{isPurging ? 'מנקה...' : `נקה חברי דמה מהמסד${mockCountInState > 0 ? ` (${mockCountInState})` : ''}`}</span>
              </button>
            </div>

            <form onSubmit={handleAddClub} className="bg-slate-50/80 border border-slate-200 rounded-3xl p-5 space-y-4">
              <div className="text-xs font-black text-slate-700">יצירת חוג חדש (שם, יום ושעה קבועים ומיקום מהמאגר הכללי):</div>
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  value={newClubName}
                  onChange={(e) => setNewClubName(e.target.value)}
                  className="flex-1 px-5 py-3 bg-white border border-slate-200 rounded-2xl focus:border-brand-500 outline-none font-bold text-sm"
                  placeholder="שם החוג החדש (למשל: קייאקים רביעי בוקר)..."
                  required
                />
                <button type="submit" className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-md flex items-center justify-center gap-2 whitespace-nowrap">
                  <Plus size={18} /> הוסף חוג
                </button>
              </div>
              <ScheduleFieldsForm value={newSchedule} onChange={setNewSchedule} compact />
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {clubs.map((club) => (
                <ClubCardItem
                  key={club.id}
                  club={club}
                  onSave={handleSaveEdit}
                  onDelete={handleDeleteClub}
                />
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

