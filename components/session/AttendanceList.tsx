
import React, { useState } from 'react';
import { Person, Role, getRoleLabel } from '../../types';
import { CheckSquare, Square, Shield, ArrowDownAZ, ArrowUpNarrowWide, CheckCircle2, Circle, ShipWheel, ArrowLeft, UserPlus } from 'lucide-react';
import { PersonEditorModal } from '../dashboard/PersonEditorModal';
import { useAppStore } from '../../store';

type SortType = 'ROLE' | 'NAME' | 'RANK';

interface AttendanceListProps {
  people: Person[];
  presentIds: string[];
  onToggle: (id: string) => void;
  onBulkSelect: (ids: string[]) => void;
  onNext: () => void;
}

export const AttendanceList: React.FC<AttendanceListProps> = ({
  people, presentIds, onToggle, onBulkSelect, onNext
}) => {
  const { addPerson, clubSettings, activeClub } = useAppStore();
  const [sortBy, setSortBy] = useState<SortType>('ROLE');
  const [isAddingQuickly, setIsAddingQuickly] = useState(false);

  const getSortedPeople = () => {
    const sorted = [...people];
    switch (sortBy) {
        case 'NAME': return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'RANK': return sorted.sort((a, b) => b.rank - a.rank);
        default: return sorted.sort((a, b) => {
            const roleOrder = { [Role.INSTRUCTOR]: -1, [Role.VOLUNTEER]: 0, [Role.MEMBER]: 1, [Role.GUEST]: 2 };
            if (roleOrder[a.role] !== roleOrder[b.role]) return roleOrder[a.role] - roleOrder[b.role];
            return a.name.localeCompare(b.name);
        });
    }
  };

  const stats = {
    vols: people.filter(p => presentIds.includes(p.id) && (p.role === Role.VOLUNTEER || p.role === Role.INSTRUCTOR)).length,
    mems: people.filter(p => presentIds.includes(p.id) && p.role === Role.MEMBER).length
  };

  const getCardStyle = (role: Role, isPresent: boolean) => {
      const base = "flex items-center justify-between p-4 rounded-2xl border text-right transition-all duration-300 select-none shadow-sm group relative overflow-hidden";
      if (!isPresent) return `${base} border-slate-100 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600 grayscale`;
      switch(role) {
          case Role.INSTRUCTOR: return `${base} border-cyan-500 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-500/20`;
          case Role.VOLUNTEER: return `${base} border-orange-500 bg-orange-50 text-orange-900 ring-2 ring-orange-500/20`;
          case Role.MEMBER: return `${base} border-sky-500 bg-sky-50 text-sky-900 ring-2 ring-sky-500/20`;
          default: return `${base} border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20`;
      }
  };

  const boatDefs = activeClub ? (clubSettings[activeClub]?.boatDefinitions || []) : [];

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
           <div>
             <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">מי הגיע היום?</h2>
                <button 
                    onClick={() => setIsAddingQuickly(true)}
                    className="bg-brand-100 text-brand-700 p-2 rounded-xl hover:bg-brand-600 hover:text-white transition-all shadow-sm flex items-center gap-1 text-xs font-black"
                >
                    <UserPlus size={18} /> הוספת משתתף
                </button>
             </div>
             <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 text-xs font-bold uppercase">מתנדבים: {stats.vols}</span>
                <span className="text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200 text-xs font-bold uppercase">חברים: {stats.mems}</span>
                <span className="text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-xs font-bold uppercase">סה"כ: {presentIds.length}</span>
            </div>
           </div>
            <div className="flex gap-2 shrink-0">
                <button onClick={() => onBulkSelect(people.map(p => p.id))} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-sm shadow-inner"><CheckSquare size={16} /> בחר הכל</button>
                <button onClick={() => onBulkSelect([])} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all font-bold text-sm shadow-inner"><Square size={16} /> נקה</button>
            </div>
        </div>
        
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span>מיון לפי:</span>
            <button onClick={() => setSortBy('ROLE')} className={`px-4 py-1.5 rounded-full border transition-all ${sortBy === 'ROLE' ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white hover:bg-slate-50'}`}><Shield size={12} /> תפקיד</button>
            <button onClick={() => setSortBy('NAME')} className={`px-4 py-1.5 rounded-full border transition-all ${sortBy === 'NAME' ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white hover:bg-slate-50'}`}><ArrowDownAZ size={12} /> שם</button>
            <button onClick={() => setSortBy('RANK')} className={`px-4 py-1.5 rounded-full border transition-all ${sortBy === 'RANK' ? 'bg-slate-800 border-slate-800 text-white shadow-md' : 'bg-white hover:bg-slate-50'}`}><ArrowUpNarrowWide size={12} /> דירוג</button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {getSortedPeople().map(person => {
          const isPresent = presentIds.includes(person.id);
          return (
            <button key={person.id} onClick={() => onToggle(person.id)} className={getCardStyle(person.role, isPresent)}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-black text-xl leading-none">{person.name}</span>
                    {person.isSkipper && <ShipWheel size={16} className={isPresent ? "text-brand-600" : "text-slate-300"} />}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${isPresent ? 'bg-white/50 border border-current/20' : 'bg-slate-200'}`}>
                    {getRoleLabel(person.role, person.gender)}
                  </span>
                  {person.phone && <span className="text-[10px] opacity-60 font-mono" dir="ltr">{person.phone}</span>}
                </div>
              </div>
              <div className="mr-4">
                {isPresent ? <CheckCircle2 className="text-brand-600" size={32} /> : <Circle className="text-slate-200" size={32} />}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-12 flex justify-end">
        <button 
            onClick={onNext} 
            disabled={presentIds.length === 0} 
            className="w-full md:w-auto bg-brand-600 disabled:opacity-50 hover:bg-brand-500 text-white px-10 py-4 rounded-2xl font-black text-xl shadow-xl shadow-brand-100 flex items-center justify-center gap-3 transition-all active:scale-95 transform"
        >
            הבא: ציוד <ArrowLeft size={24} />
        </button>
      </div>

      {isAddingQuickly && (
          <PersonEditorModal 
            allPeople={people} 
            boatDefinitions={boatDefs} 
            onClose={() => setIsAddingQuickly(false)} 
            onSave={(p) => { addPerson(p); setIsAddingQuickly(false); }} 
          />
      )}
    </div>
  );
};
