
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Role, Person, APP_VERSION } from '../types';
import { Trash2, UserPlus, Ship, Users, Calendar, Database, Download, Upload, Clock, Sparkles, Wand2, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { InviteManager } from './invites/InviteManager';
import { PeopleTable } from './dashboard/PeopleTable';
import { PersonEditorModal } from './dashboard/PersonEditorModal';
import { InventoryEditor } from './dashboard/InventoryEditor';
import { MembershipRequests } from './dashboard/MembershipRequests';

type ViewMode = 'MENU' | 'PEOPLE' | 'INVENTORY' | 'MEMBERSHIPS' | 'INVITES';

export const Dashboard: React.FC = () => {
  const { people, activeClub, clubs, addPerson, updatePerson, removePerson, restoreDemoData, clubSettings, loadSampleGroup } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<ViewMode>('MENU');
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const v = searchParams.get('view') as ViewMode;
    setView(v || 'MENU');
  }, [searchParams]);

  if (!activeClub) return null;
  const currentClubLabel = clubs.find(c => c.id === activeClub)?.label || '';
  const clubPeople = people.filter(p => p.clubId === activeClub);
  const settings = clubSettings[activeClub] || { boatDefinitions: [] };

  const handleExport = () => {
      const blob = new Blob([JSON.stringify({ version: APP_VERSION, clubId: activeClub, people: clubPeople, settings }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `backup-${currentClubLabel.replace(/\s/g, '-')}.json`;
      a.click();
  };

  const handleApprove = (m: any) => {
      if (!m.profile) return;
      addPerson({ id: m.profile.uid, name: `${m.profile.firstName} ${m.profile.lastName}`, gender: m.profile.gender, phone: m.profile.primaryPhone, role: m.role || Role.MEMBER, rank: m.rank || 3 });
      alert('אושר ונוסף לרשימה.');
  };

  if (view === 'INVITES') return <div className="max-w-4xl mx-auto py-6"><button onClick={() => navigate('/app/manage')} className="flex items-center gap-2 text-slate-500 mb-6"><ArrowRight size={20} /> חזרה</button><InviteManager /></div>;
  if (view === 'MEMBERSHIPS') return <MembershipRequests clubId={activeClub} onApprove={handleApprove} onBack={() => navigate('/app/manage')} />;
  if (view === 'INVENTORY') return <InventoryEditor clubId={activeClub} definitions={settings.boatDefinitions} onSave={(defs) => { navigate('/app'); }} onCancel={() => navigate('/app/manage')} />;

  if (view === 'PEOPLE') return (
    <div className="space-y-6 pb-20">
      <button onClick={() => navigate('/app/manage')} className="flex items-center gap-2 text-slate-500 mb-2"><ArrowRight size={20} /> חזרה לתפריט</button>
      <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">משתתפים ({clubPeople.length})</h2>
          <div className="flex gap-2">
             <button onClick={() => { if(confirm('לטעון דמו?')) loadSampleGroup(); }} className="bg-amber-100 text-amber-700 px-3 py-2 rounded-lg flex items-center gap-2 font-bold"><Wand2 size={18} /> דמו</button>
             <button onClick={handleExport} className="bg-white border p-2 rounded-lg" title="גיבוי"><Download size={18} /></button>
             <button onClick={() => setIsAdding(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold"><UserPlus size={20} /> משתתף חדש</button>
          </div>
      </div>
      <PeopleTable people={clubPeople} onEdit={setEditingPerson} onDelete={(id) => confirm('למחוק?') && removePerson(id)} />
      {(isAdding || editingPerson) && <PersonEditorModal person={editingPerson} allPeople={clubPeople} boatDefinitions={settings.boatDefinitions} onClose={() => { setIsAdding(false); setEditingPerson(null); }} onSave={(p) => { editingPerson ? updatePerson(p) : addPerson(p); setIsAdding(false); setEditingPerson(null); }} />}
    </div>
  );

  return (
      <div className="max-w-4xl mx-auto py-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-8 text-center">ניהול {currentClubLabel}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <button onClick={() => navigate('/app')} className="col-span-1 md:col-span-2 bg-brand-600 text-white p-6 rounded-2xl flex items-center justify-center gap-4 shadow-lg shadow-brand-100"><Calendar size={32} /><div><h3 className="font-bold text-xl text-right">מעבר לשיבוץ</h3><p className="text-sm opacity-80 text-right">חזרה למסך האימון הראשי</p></div></button>
              
              <button onClick={() => setIsAdding(true)} className="bg-white p-8 rounded-2xl border-2 border-brand-100 flex flex-col items-center gap-4 shadow-sm hover:border-brand-500 transition-all text-brand-600">
                <UserPlus size={48} />
                <h3 className="font-black text-lg">משתתף חדש</h3>
              </button>

              <button onClick={() => navigate('/app/manage?view=PEOPLE')} className="bg-white p-8 rounded-2xl border flex flex-col items-center gap-4 shadow-sm"><Users size={32} className="text-slate-600"/><h3 className="font-bold">ניהול רשימה</h3></button>
              <button onClick={() => navigate('/app/manage?view=INVITES')} className="bg-white p-8 rounded-2xl border flex flex-col items-center gap-4 shadow-sm"><Sparkles size={32} className="text-brand-600"/><h3 className="font-bold">לינקים וצירוף</h3></button>
              <button onClick={() => navigate('/app/manage?view=MEMBERSHIPS')} className="bg-white p-8 rounded-2xl border flex flex-col items-center gap-4 shadow-sm"><Clock size={32} className="text-emerald-600"/><h3 className="font-bold">בקשות הצטרפות</h3></button>
              <button onClick={() => navigate('/app/manage?view=INVENTORY')} className="bg-white p-8 rounded-2xl border flex flex-col items-center gap-4 shadow-sm"><Ship size={32} className="text-orange-600"/><h3 className="font-bold">ניהול ציוד</h3></button>
              <button onClick={() => confirm('איפוס דמו?') && restoreDemoData()} className="col-span-1 md:col-span-2 mt-4 text-slate-400 text-sm flex items-center justify-center gap-2"><Database size={16} /> איפוס מלא לדמו</button>
          </div>
          {(isAdding) && <PersonEditorModal allPeople={clubPeople} boatDefinitions={settings.boatDefinitions} onClose={() => setIsAdding(false)} onSave={(p) => { addPerson(p); setIsAdding(false); }} />}
      </div>
  );
};
