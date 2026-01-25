
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Role, Person, AccessLevel } from '../types';
import { Trash2, UserPlus, Ship, Users, Calendar, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { InviteManager } from './invites/InviteManager';
import { PeopleTable } from './dashboard/PeopleTable';
import { PersonEditorModal } from './dashboard/PersonEditorModal';
import { InventoryEditor } from './dashboard/InventoryEditor';
import { MembershipRequests } from './dashboard/MembershipRequests';
import { approveMembership, saveUserProfile } from '../services/profileService';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

type ViewMode = 'MENU' | 'PEOPLE' | 'INVENTORY' | 'MEMBERSHIPS' | 'INVITES';

export const Dashboard: React.FC = () => {
  const { people, activeClub, clubs, clubSettings, addNotification } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<ViewMode>('MENU');
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    setView((searchParams.get('view') as ViewMode) || 'MENU');
  }, [searchParams]);

  if (!activeClub) return null;
  const currentClubLabel = clubs.find(c => c.id === activeClub)?.label || '';
  const clubPeople = people.filter(p => p.clubId === activeClub);
  const settings = clubSettings[activeClub] || { boatDefinitions: [] };

  const handleApprove = async (m: any) => {
      try {
          let accessLevel = AccessLevel.MEMBER;
          if (m.role === Role.INSTRUCTOR) accessLevel = AccessLevel.CLUB_ADMIN;
          else if (m.role === Role.VOLUNTEER) accessLevel = AccessLevel.STAFF;

          await approveMembership(m.id, { role: m.role, rank: m.rank, accessLevel });
          if (m.profile) await saveUserProfile({ ...m.profile, isSkipper: m.isSkipper });

          addNotification(`אושר חבר חדש: ${m.profile?.firstName || m.uid}`, 'SUCCESS');
          navigate('/app/manage');
      } catch (err) {
          alert('שגיאה בתהליך האישור.');
      }
  };

  const handleRemovePerson = async (uid: string) => {
      if (confirm('להסיר את המשתמש מהחוג? פעולה זו תבטל את חברותו.')) {
          try {
              const membershipId = `${activeClub}_${uid}`;
              await deleteDoc(doc(db, 'memberships', membershipId));
              addNotification('חבר הוסר מהחוג', 'INFO');
          } catch (e) {
              alert('שגיאה במחיקה.');
          }
      }
  };

  if (view === 'INVITES') return <div className="max-w-4xl mx-auto py-6"><button onClick={() => navigate('/app/manage')} className="flex items-center gap-2 text-slate-500 mb-6"><ArrowRight size={20} /> חזרה</button><InviteManager /></div>;
  if (view === 'MEMBERSHIPS') return <MembershipRequests clubId={activeClub} onApprove={handleApprove} onBack={() => navigate('/app/manage')} />;
  if (view === 'INVENTORY') return <InventoryEditor clubId={activeClub} definitions={settings.boatDefinitions} onSave={() => navigate('/app')} onCancel={() => navigate('/app/manage')} />;
  if (view === 'PEOPLE') return (
    <div className="space-y-6 pb-20">
      <button onClick={() => navigate('/app/manage')} className="flex items-center gap-2 text-slate-500 mb-2"><ArrowRight size={20} /> חזרה לתפריט</button>
      <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">משתתפים ({clubPeople.length})</h2>
          <button onClick={() => setIsAdding(true)} className="bg-brand-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-md transition-all active:scale-95"><UserPlus size={20} /> הוספה</button>
      </div>
      <PeopleTable people={clubPeople} onEdit={setEditingPerson} onDelete={handleRemovePerson} />
      {(isAdding || editingPerson) && <PersonEditorModal person={editingPerson} allPeople={clubPeople} boatDefinitions={settings.boatDefinitions} onClose={() => { setIsAdding(false); setEditingPerson(null); }} onSave={() => { setIsAdding(false); setEditingPerson(null); }} />}
    </div>
  );

  return (
      <div className="max-w-4xl mx-auto py-8">
          <h1 className="text-3xl font-black text-slate-800 mb-8 text-center tracking-tight">ניהול {currentClubLabel}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <button onClick={() => navigate('/app')} className="col-span-1 md:col-span-2 bg-brand-600 text-white p-8 rounded-3xl flex items-center justify-center gap-6 shadow-xl hover:bg-brand-500 transition-all transform hover:-translate-y-1"><Calendar size={36} /><div><h3 className="font-black text-2xl text-right">מעבר לשיבוץ</h3><p className="text-sm opacity-80 text-right">ניהול האימון הפעיל</p></div></button>
              <button onClick={() => navigate('/app/manage?view=PEOPLE')} className="bg-white p-8 rounded-3xl border flex flex-col items-center gap-4 shadow-sm hover:shadow-lg transition-all"><Users size={32} className="text-slate-600"/><h3 className="font-bold">ניהול רשימה</h3></button>
              <button onClick={() => navigate('/app/manage?view=INVITES')} className="bg-white p-8 rounded-3xl border flex flex-col items-center gap-4 shadow-sm hover:shadow-lg transition-all"><Sparkles size={32} className="text-brand-600"/><h3 className="font-bold">לינקים וצירוף</h3></button>
              <button onClick={() => navigate('/app/manage?view=MEMBERSHIPS')} className="bg-white p-8 rounded-3xl border flex flex-col items-center gap-4 shadow-sm hover:shadow-lg transition-all"><Clock size={32} className="text-emerald-600"/><h3 className="font-bold">בקשות הצטרפות</h3></button>
              <button onClick={() => navigate('/app/manage?view=INVENTORY')} className="bg-white p-8 rounded-3xl border flex flex-col items-center gap-4 shadow-sm hover:shadow-lg transition-all"><Ship size={32} className="text-orange-600"/><h3 className="font-bold">ניהול ציוד</h3></button>
          </div>
      </div>
  );
};
