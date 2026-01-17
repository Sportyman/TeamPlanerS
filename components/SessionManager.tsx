
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { BoatInventory, getRoleLabel, Role, RoleColorClasses } from '../types';
import { Ship, Users, CheckCircle2, Circle, ArrowLeft, ArrowRight, CheckSquare, Square, RotateCcw, Shield, ArrowDownAZ, ArrowUpNarrowWide, Settings, Wind, Anchor, AlertTriangle, ShipWheel } from 'lucide-react';
import { PairingBoard } from './PairingBoard';
import { useSearchParams, useNavigate } from 'react-router-dom';

type SortType = 'ROLE' | 'NAME' | 'RANK';

export const SessionManager: React.FC = () => {
  const { 
    activeClub,
    clubs,
    sessions,
    people,
    toggleAttendance, 
    setBulkAttendance, 
    updateInventory, 
    runPairing,
    resetSession,
    clubSettings,
    pairingDirty
  } = useAppStore();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  if (!activeClub) return null;

  const currentClubLabel = clubs.find(c => c.id === activeClub)?.label;
  const currentSession = sessions[activeClub];
  
  if (!currentSession) {
      return (
          <div className="p-8 text-center text-slate-500">
              <h2 className="text-xl font-bold mb-2">שגיאת נתונים</h2>
              <p>נתוני האימון לחוג זה חסרים. נסה לרענן את העמוד או לבחור חוג אחר.</p>
              <button onClick={() => navigate('/')} className="mt-4 text-brand-600 underline">חזור לדף הבית</button>
          </div>
      );
  }

  const settings = clubSettings[activeClub] || { boatDefinitions: [], roleColors: {} as any };
  const boatDefinitions = settings.boatDefinitions;
  const clubPeople = people.filter(p => p.clubId === activeClub);

  const [step, setStep] = useState<1 | 2 | 3>(3);

  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam) {
        setStep(Number(stepParam) as 1 | 2 | 3);
    } else {
        if (currentSession.teams.length === 0) {
            setStep(1);
        } else {
            setStep(3);
        }
    }
  }, [searchParams, currentSession.teams.length]);

  const prevPresentCount = useRef(currentSession.presentPersonIds.length);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const currentCount = currentSession.presentPersonIds.length;
    const increased = currentCount > prevPresentCount.current;
    prevPresentCount.current = currentCount;

    if (step === 1 && increased && clubPeople.length > 0) {
        const allPresent = clubPeople.every(p => currentSession.presentPersonIds.includes(p.id));
        if (allPresent) {
            setTimeout(() => {
                nextButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }
  }, [currentSession.presentPersonIds, clubPeople, step]);
  
  const [sortBy, setSortBy] = useState<SortType>('ROLE');
  const [localInventory, setLocalInventory] = useState<BoatInventory>(currentSession.inventory);

  useEffect(() => {
    setLocalInventory(currentSession.inventory);
  }, [currentSession.inventory]);

  const handleInventoryChange = (key: string, value: number) => {
    setLocalInventory(prev => ({ ...prev, [key]: value }));
  };

  const startPairing = () => {
    updateInventory(localInventory);
    runPairing();
    setStep(3);
  };

  const handleReset = () => {
    if (confirm('האם אתה בטוח שברצונך לאפס את האימון? כל השיבוצים יימחקו.')) {
      resetSession();
      setStep(1);
    }
  };

  const selectAll = () => setBulkAttendance(clubPeople.map(p => p.id));
  const clearAll = () => setBulkAttendance([]);

  const getSortedPeople = () => {
    const sorted = [...clubPeople];
    switch (sortBy) {
        case 'NAME': return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'RANK': return sorted.sort((a, b) => b.rank - a.rank);
        case 'ROLE':
        default:
            return sorted.sort((a, b) => {
                const roleOrder = { [Role.INSTRUCTOR]: -1, [Role.VOLUNTEER]: 0, [Role.MEMBER]: 1, [Role.GUEST]: 2 };
                if (roleOrder[a.role] !== roleOrder[b.role]) return roleOrder[a.role] - roleOrder[b.role];
                return a.name.localeCompare(b.name);
            });
    }
  };

  const presentVolunteers = clubPeople.filter(p => currentSession.presentPersonIds.includes(p.id) && (p.role === Role.VOLUNTEER || p.role === Role.INSTRUCTOR)).length;
  const presentMembers = clubPeople.filter(p => currentSession.presentPersonIds.includes(p.id) && p.role === Role.MEMBER).length;
  const totalBoats = Object.values(localInventory).reduce((a: number, b: number) => a + b, 0);

  const getCardStyle = (role: Role, isPresent: boolean) => {
      const baseStyle = "flex items-center justify-between p-4 rounded-xl border text-right transition-all duration-300 select-none shadow-sm active:scale-95";
      if (!isPresent) return `${baseStyle} border-slate-200 bg-white text-slate-400 opacity-60 grayscale-[0.5]`;
      
      const roleColor = settings.roleColors?.[role] || 'slate';
      const classes = RoleColorClasses[roleColor];
      return `${baseStyle} ${classes.border} ${classes.bg} ${classes.ring} ${classes.text} ring-2 shadow-md font-bold scale-[1.02]`;
  };

  if (step === 3) {
    return (
      <div className="space-y-4">
        {pairingDirty && (
            <div className="bg-amber-100 border border-amber-300 text-amber-800 p-3 rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={20} />
                    <span className="font-bold">בוצעו שינויים בנתוני המשתתפים.</span>
                </div>
                <button onClick={() => { if(confirm('האם לערבב מחדש?')) setStep(2); }} className="bg-amber-600 text-white px-3 py-1 rounded-md text-sm font-bold">ערבב מחדש</button>
            </div>
        )}
        <div className="flex justify-between items-center print:hidden">
          <button onClick={() => setStep(2)} className="text-sm text-brand-600 hover:underline flex items-center gap-1 font-bold"><ArrowRight size={16} /> חזרה להגדרות</button>
          <button onClick={handleReset} className="text-sm text-red-500 font-bold flex items-center gap-1"><RotateCcw size={14} /> איפוס אימון</button>
        </div>
        <PairingBoard />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-center space-x-8 mb-8 flex-row-reverse">
        <button onClick={() => setStep(1)} className={`flex flex-col items-center transition-all ${step === 1 ? 'text-brand-600 scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
          <div className="bg-white p-4 rounded-2xl border-2 border-current mb-2 shadow-sm"><Users size={24} /></div>
          <span className="font-black text-xs">נוכחות</span>
        </button>
        <div className="w-16 h-0.5 bg-slate-200 mx-4" />
        <button onClick={() => setStep(2)} disabled={currentSession.presentPersonIds.length === 0} className={`flex flex-col items-center transition-all ${step === 2 ? 'text-brand-600 scale-110' : 'text-slate-400 hover:text-slate-600 disabled:opacity-30'}`}>
          <div className="bg-white p-4 rounded-2xl border-2 border-current mb-2 shadow-sm"><Ship size={24} /></div>
          <span className="font-black text-xs">ציוד</span>
        </button>
      </div>

      {step === 1 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col gap-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                 <h2 className="text-3xl font-black text-slate-800 tracking-tight">מי הגיע היום?</h2>
                 <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">נוכחים: {currentSession.presentPersonIds.length}</span>
                    <span className="text-xs bg-brand-50 text-brand-700 px-3 py-1 rounded-full font-bold">מדריכים/מתנדבים: {presentVolunteers}</span>
                </div>
               </div>
                <div className="flex gap-2">
                    <button onClick={selectAll} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors text-sm"><CheckSquare size={16} className="inline ml-1" /> הכל</button>
                    <button onClick={clearAll} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors text-sm">נקה</button>
                </div>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button onClick={() => setSortBy('ROLE')} className={`px-4 py-1.5 rounded-full border-2 whitespace-nowrap text-sm font-bold transition-all ${sortBy === 'ROLE' ? 'bg-brand-500 border-brand-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}>תפקיד</button>
                <button onClick={() => setSortBy('NAME')} className={`px-4 py-1.5 rounded-full border-2 whitespace-nowrap text-sm font-bold transition-all ${sortBy === 'NAME' ? 'bg-brand-500 border-brand-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}>א-ב</button>
                <button onClick={() => setSortBy('RANK')} className={`px-4 py-1.5 rounded-full border-2 whitespace-nowrap text-sm font-bold transition-all ${sortBy === 'RANK' ? 'bg-brand-500 border-brand-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}>דירוג</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getSortedPeople().map(person => {
              const isPresent = currentSession.presentPersonIds.includes(person.id);
              const roleColor = settings.roleColors?.[person.role] || 'slate';
              const classes = RoleColorClasses[roleColor];
              return (
                <button key={person.id} onClick={() => toggleAttendance(person.id)} className={getCardStyle(person.role, isPresent)}>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                        <span className="text-lg tracking-tight">{person.name}</span>
                        {person.isSkipper && <ShipWheel size={14} className={isPresent ? classes.text : 'text-slate-300'} />}
                    </div>
                    <div className={`text-[10px] font-black uppercase tracking-wider mt-1 ${isPresent ? classes.text : 'text-slate-400'}`}>
                        {getRoleLabel(person.role, person.gender)}
                    </div>
                  </div>
                  {isPresent ? <CheckCircle2 className={classes.text} size={28} /> : <Circle className="text-slate-200" size={28} />}
                </button>
              );
            })}
          </div>
          <div className="mt-12 flex justify-end">
            <button ref={nextButtonRef} onClick={() => setStep(2)} disabled={currentSession.presentPersonIds.length === 0} className="w-full md:w-auto bg-brand-600 disabled:opacity-30 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-brand-200 transition-all flex items-center justify-center gap-3 active:scale-95">
                המשך לציוד <ArrowLeft size={20} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-xl mx-auto">
          <div className="flex justify-between items-start mb-10">
             <h2 className="text-3xl font-black text-slate-800">ציוד זמין</h2>
             <button onClick={() => navigate('/app/manage?view=INVENTORY')} className="text-xs bg-slate-50 p-2 rounded-lg font-bold"><Settings size={14} /></button>
          </div>
          <div className="space-y-8">
            {boatDefinitions.map(def => (
                <div key={def.id} className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="font-black text-slate-800 text-lg">{def.label}</span>
                        <span className="bg-brand-50 text-brand-700 px-4 py-1 rounded-full font-black text-xl">{localInventory[def.id] || 0}</span>
                    </div>
                    <input type="range" min="0" max="20" value={localInventory[def.id] || 0} onChange={(e) => handleInventoryChange(def.id, Number(e.target.value))} className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-brand-600" />
                </div>
            ))}
          </div>
          <div className="mt-12 flex justify-between gap-4">
             <button onClick={() => setStep(1)} className="flex-1 py-4 font-bold text-slate-400">חזור</button>
             <button onClick={startPairing} disabled={boatDefinitions.length === 0} className="flex-[2] bg-brand-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-brand-100">צור שיבוצים</button>
          </div>
        </div>
      )}
    </div>
  );
};
