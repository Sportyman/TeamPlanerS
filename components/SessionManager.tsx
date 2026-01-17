

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { BoatInventory, getRoleLabel, Role } from '../types';
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
  
  // Safety check: if session data is missing (e.g. after club deletion), show error or redirect
  if (!currentSession) {
      return (
          <div className="p-8 text-center text-slate-500">
              <h2 className="text-xl font-bold mb-2">שגיאת נתונים</h2>
              <p>נתוני האימון לחוג זה חסרים. נסה לרענן את העמוד או לבחור חוג אחר.</p>
              <button onClick={() => navigate('/')} className="mt-4 text-brand-600 underline">חזור לדף הבית</button>
          </div>
      );
  }

  const settings = clubSettings[activeClub] || { boatDefinitions: [] };
  const boatDefinitions = settings.boatDefinitions;
  const clubPeople = people.filter(p => p.clubId === activeClub);

  // Initialize step
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

  // SMART AUTO SCROLL LOGIC (Instead of Advance)
  const prevPresentCount = useRef(currentSession.presentPersonIds.length);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const currentCount = currentSession.presentPersonIds.length;
    // Only trigger if we added people (not removed, and not just navigation)
    const increased = currentCount > prevPresentCount.current;
    prevPresentCount.current = currentCount;

    if (step === 1 && increased && clubPeople.length > 0) {
        // Check if everyone is present
        const allPresent = clubPeople.every(p => currentSession.presentPersonIds.includes(p.id));
        
        if (allPresent) {
            // Scroll to the next button instead of auto advancing
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

  const selectAll = () => {
    setBulkAttendance(clubPeople.map(p => p.id));
  };

  const clearAll = () => {
    setBulkAttendance([]);
  };

  const getSortedPeople = () => {
    const sorted = [...clubPeople];
    switch (sortBy) {
        case 'NAME':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'RANK':
            return sorted.sort((a, b) => b.rank - a.rank);
        case 'ROLE':
        default:
            return sorted.sort((a, b) => {
                const roleOrder = { [Role.INSTRUCTOR]: -1, [Role.VOLUNTEER]: 0, [Role.MEMBER]: 1, [Role.GUEST]: 2 };
                if (roleOrder[a.role] !== roleOrder[b.role]) {
                    return roleOrder[a.role] - roleOrder[b.role];
                }
                return a.name.localeCompare(b.name);
            });
    }
  };

  const presentVolunteers = clubPeople.filter(p => currentSession.presentPersonIds.includes(p.id) && (p.role === Role.VOLUNTEER || p.role === Role.INSTRUCTOR)).length;
  const presentMembers = clubPeople.filter(p => currentSession.presentPersonIds.includes(p.id) && p.role === Role.MEMBER).length;
  const presentGuests = clubPeople.filter(p => currentSession.presentPersonIds.includes(p.id) && p.role === Role.GUEST).length;
  const totalBoats = Object.values(localInventory).reduce((a: number, b: number) => a + b, 0);

  const getCardStyle = (role: Role, isPresent: boolean) => {
      const baseStyle = "flex items-center justify-between p-4 rounded-lg border text-right transition-all duration-200 select-none";
      if (!isPresent) return `${baseStyle} border-slate-200 hover:bg-slate-50 text-slate-600`;
      switch(role) {
          case Role.INSTRUCTOR: return `${baseStyle} border-cyan-500 bg-cyan-50 ring-cyan-500 text-cyan-900 ring-1 shadow-sm`;
          case Role.VOLUNTEER: return `${baseStyle} border-orange-500 bg-orange-50 ring-orange-500 text-orange-900 ring-1 shadow-sm`;
          case Role.MEMBER: return `${baseStyle} border-sky-500 bg-sky-50 ring-sky-500 text-sky-900 ring-1 shadow-sm`;
          case Role.GUEST: return `${baseStyle} border-emerald-500 bg-emerald-50 ring-emerald-500 text-emerald-900 ring-1 shadow-sm`;
          default: return baseStyle;
      }
  };

  if (step === 3) {
    return (
      <div className="space-y-4">
        {pairingDirty && (
            <div className="bg-amber-100 border border-amber-300 text-amber-800 p-3 rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                    <AlertTriangle size={20} />
                    <span className="font-bold">בוצעו שינויים בנתוני המשתתפים.</span>
                    <span className="text-sm hidden md:inline">מומלץ לבצע שיבוץ מחדש כדי להתחשב בשינויים.</span>
                </div>
                <button 
                    onClick={() => {
                        if(confirm('האם לבצע שיבוץ מחדש? הנתונים הקיימים יימחקו.')) {
                            setStep(2); // Go back to inventory/pairing trigger
                        }
                    }} 
                    className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-md text-sm font-bold shadow-sm"
                >
                    ערבב מחדש
                </button>
            </div>
        )}

        <div className="flex justify-between items-center print:hidden">
          <button onClick={() => setStep(2)} className="text-sm text-brand-600 hover:underline flex items-center gap-1"><ArrowRight size={16} /> חזרה להגדרות</button>
          <button onClick={handleReset} className="text-sm text-red-500 hover:bg-red-50 px-3 py-1 rounded flex items-center gap-1 transition-colors"><RotateCcw size={14} /> איפוס אימון</button>
        </div>
        <PairingBoard />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-center space-x-8 mb-8 flex-row-reverse">
        <button onClick={() => setStep(1)} className={`flex flex-col items-center transition-colors ${step === 1 ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}>
          <div className="bg-white p-3 rounded-full border-2 border-current mb-2"><Users size={24} /></div>
          <span className="font-semibold text-sm">נוכחות</span>
        </button>
        <div className="w-16 h-0.5 bg-slate-200 mx-4" />
        <button onClick={() => setStep(2)} disabled={currentSession.presentPersonIds.length === 0} className={`flex flex-col items-center transition-colors ${step === 2 ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed'}`}>
          <div className="bg-white p-3 rounded-full border-2 border-current mb-2"><Ship size={24} /></div>
          <span className="font-semibold text-sm">ציוד</span>
        </button>
      </div>

      {step === 1 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col gap-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
               <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 w-full">
                 <h2 className="text-2xl font-bold text-slate-800">מי הגיע היום?</h2>
                 <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                    <span className="text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-200 font-medium">מתנדבים/מדריכים: {presentVolunteers}</span>
                    <span className="text-sky-700 bg-sky-50 px-2 py-1 rounded border border-sky-200 font-medium">חברים: {presentMembers}</span>
                    <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium">סה"כ: {currentSession.presentPersonIds.length}</span>
                </div>
               </div>
                <div className="flex gap-2 text-sm self-end md:self-center shrink-0">
                    <button onClick={selectAll} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"><CheckSquare size={16} /> בחר הכל</button>
                    <button onClick={clearAll} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"><Square size={16} /> נקה</button>
                </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="font-medium">מיון לפי:</span>
                <button onClick={() => setSortBy('ROLE')} className={`px-3 py-1 rounded-full border ${sortBy === 'ROLE' ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white'}`}><Shield size={14} /> תפקיד</button>
                <button onClick={() => setSortBy('NAME')} className={`px-3 py-1 rounded-full border ${sortBy === 'NAME' ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white'}`}><ArrowDownAZ size={14} /> שם</button>
                <button onClick={() => setSortBy('RANK')} className={`px-3 py-1 rounded-full border ${sortBy === 'RANK' ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white'}`}><ArrowUpNarrowWide size={14} /> דירוג</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {getSortedPeople().map(person => {
              const isPresent = currentSession.presentPersonIds.includes(person.id);
              return (
                <button key={person.id} onClick={() => toggleAttendance(person.id)} className={getCardStyle(person.role, isPresent)}>
                  <div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                            <span className={`font-bold text-lg ${isPresent ? '' : 'text-slate-800'}`}>{person.name}</span>
                            {person.isSkipper && <ShipWheel size={14} className="text-blue-600" />}
                        </div>
                        {person.phone && (
                            <span className={`text-sm ${isPresent ? 'text-slate-600' : 'text-slate-400'}`} dir="ltr">
                                {person.phone}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${person.role === Role.INSTRUCTOR ? 'bg-cyan-100 text-cyan-700' : person.role === Role.VOLUNTEER ? 'bg-orange-100 text-orange-700' : 'bg-sky-100 text-sky-700'}`}>{getRoleLabel(person.role, person.gender)}</span>
                    </div>
                  </div>
                  {isPresent ? <CheckCircle2 className="text-brand-600" size={24} /> : <Circle className="text-slate-300" size={24} />}
                </button>
              );
            })}
          </div>
          <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
            <button 
                ref={nextButtonRef}
                onClick={() => setStep(2)} 
                disabled={currentSession.presentPersonIds.length === 0} 
                className="w-full md:w-auto bg-brand-600 disabled:opacity-50 hover:bg-brand-500 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 shadow-lg"
            >
                הבא: ציוד <ArrowLeft size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-xl mx-auto">
          <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
             <div>
                <h2 className="text-2xl font-bold text-slate-800">ציוד זמין ({currentClubLabel})</h2>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    סה"כ כלי שיט: <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-bold">{totalBoats}</span>
                </div>
             </div>
             <button onClick={() => navigate('/app/manage?view=INVENTORY')} className="text-xs text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-lg flex items-center gap-1 border border-brand-100"><Settings size={14} /> הגדר ציוד קבוע</button>
          </div>
          
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
               <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">סוג סירה</span>
               <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">כמות לאימון זה</span>
            </div>

            {boatDefinitions.map(def => (
                <div key={def.id}>
                    <label className="flex items-center justify-between mb-2">
                        <div className="flex flex-col">
                            <span className="font-medium text-slate-700">{def.label}</span>
                            <div className="flex gap-2 flex-wrap">
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    {def.isStable ? <Anchor size={10} /> : <Wind size={10} />}
                                    {def.isStable ? 'יציב' : 'מהיר'}
                                </span>
                                <span className="text-xs text-slate-400 border-r pr-2 mr-1">קיבולת: {def.capacity}</span>
                                {(def.minSkippers || 0) > 0 && (
                                     <span className="text-xs text-blue-500 font-bold border-r pr-2 mr-1 flex items-center gap-0.5">
                                         <ShipWheel size={10} /> נדרש סקיפר
                                     </span>
                                )}
                            </div>
                        </div>
                        <span className="text-brand-600 font-bold text-xl">{localInventory[def.id] || 0}</span>
                    </label>
                    <input type="range" min="0" max="20" value={localInventory[def.id] || 0} onChange={(e) => handleInventoryChange(def.id, Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600" />
                </div>
            ))}
            
            {boatDefinitions.length === 0 && (
                <div className="text-center py-4 text-slate-400 text-sm bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                    לא הוגדר ציוד לחוג זה. <button onClick={() => navigate('/app/manage?view=INVENTORY')} className="text-brand-600 underline mt-1">לחץ להוספה</button>
                </div>
            )}
          </div>
          
          <div className="mt-8 flex justify-between">
             <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-800 px-4 py-2">חזור</button>
             <button onClick={startPairing} disabled={boatDefinitions.length === 0} className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 transform transition hover:scale-105">צור שיבוצים <ArrowLeft size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
};