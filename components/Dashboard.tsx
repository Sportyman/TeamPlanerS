
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { Role, getRoleLabel, Person, Gender, BoatDefinition, APP_VERSION } from '../types';
import { Trash2, UserPlus, Star, Edit, X, Save, ArrowRight, Ship, Users, Download, Upload, Clock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { InviteManager } from './registration/InviteManager';

type ViewMode = 'PEOPLE' | 'INVENTORY' | 'INVITES' | 'MEMBERSHIPS';

export const Dashboard: React.FC = () => {
  const { people, activeClub, clubs, addPerson, updatePerson, removePerson, clubSettings, saveBoatDefinitions } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<ViewMode>('PEOPLE');

  useEffect(() => {
    const v = searchParams.get('view') as ViewMode;
    if (['PEOPLE', 'INVENTORY', 'INVITES', 'MEMBERSHIPS'].includes(v)) setView(v);
  }, [searchParams]);

  if (!activeClub) return null;
  const clubLabel = clubs.find(c => c.id === activeClub)?.label || '';
  const clubPeople = people.filter(p => p.clubId === activeClub);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800">ניהול חוג: {clubLabel}</h2>
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
              <button onClick={() => navigate('?view=PEOPLE')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'PEOPLE' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>משתתפים</button>
              <button onClick={() => navigate('?view=INVITES')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'INVITES' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>הזמנות</button>
              <button onClick={() => navigate('?view=INVENTORY')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'INVENTORY' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>ציוד</button>
          </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {view === 'INVITES' && <InviteManager />}
          {view === 'PEOPLE' && <PeopleList people={clubPeople} />}
          {view === 'INVENTORY' && <div className="p-8 text-center text-slate-400">ניהול ציוד - בפיתוח...</div>}
      </div>
    </div>
  );
};

// Internal People List Component
const PeopleList: React.FC<{ people: Person[] }> = ({ people }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Users size={18}/> רשימת משתתפים ({people.length})</h3>
                <button className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><UserPlus size={16}/> הוסף ידני</button>
            </div>
            <table className="w-full text-right">
                <thead>
                    <tr className="text-slate-500 text-sm border-b">
                        <th className="p-4">שם</th>
                        <th className="p-4 hidden md:table-cell">תפקיד</th>
                        <th className="p-4">פעולות</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {people.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                            <td className="p-4 font-bold">{p.name}</td>
                            <td className="p-4 hidden md:table-cell text-sm">{getRoleLabel(p.role, p.gender)}</td>
                            <td className="p-4 flex gap-2">
                                <button className="p-2 text-slate-400 hover:text-brand-600"><Edit size={18}/></button>
                                <button className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
