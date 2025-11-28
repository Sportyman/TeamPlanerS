import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { BoatInventory, RoleLabel, Role, Person } from '../types';
import { Ship, Users, CheckCircle2, Circle, ArrowLeft, ArrowRight, CheckSquare, Square, Save, RotateCcw, ArrowDownAZ, ArrowUpNarrowWide, Shield } from 'lucide-react';
import { PairingBoard } from './PairingBoard';

type SortType = 'ROLE' | 'NAME' | 'RANK';

export const SessionManager: React.FC = () => {
  const { 
    people, 
    session, 
    toggleAttendance, 
    setBulkAttendance, 
    updateInventory, 
    updateDefaultInventory,
    runPairing,
    resetSession
  } = useAppStore();

  // Initialize step based on whether teams exist (persistence)
  const [step, setStep] = useState<1 | 2 | 3>(() => session.teams.length > 0 ? 3 : 1);
  
  // Sort State
  const [sortBy, setSortBy] = useState<SortType>('ROLE');

  // Initialize local inventory from current session or defaults
  const [localInventory, setLocalInventory] = useState<BoatInventory>(session.inventory);
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  // Sync local inventory if session inventory changes externally (or on mount)
  useEffect(() => {
    setLocalInventory(session.inventory);
  }, [session.inventory]);

  const handleInventoryChange = (key: keyof BoatInventory, value: number) => {
    setLocalInventory(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveDefault = () => {
    updateDefaultInventory(localInventory);
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 2000);
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
    setBulkAttendance(people.map(p => p.id));
  };

  const clearAll = () => {
    setBulkAttendance([]);
  };

  // Sorting Logic
  const getSortedPeople = () => {
    const sorted = [...people];
    switch (sortBy) {
        case 'NAME':
            return sorted.sort((a, b) => a.name.localeCompare(b.name));
        case 'RANK':
            return sorted.sort((a, b) => b.rank - a.rank);
        case 'ROLE':
        default:
            return sorted.sort((a, b) => {
                // 1. Volunteer, 2. Member, 3. Guest
                const roleOrder = { [Role.VOLUNTEER]: 0, [Role.MEMBER]: 1, [Role.GUEST]: 2 };
                if (roleOrder[a.role] !== roleOrder[b.role]) {
                    return roleOrder[a.role] - roleOrder[b.role];
                }
                // Then by Name
                return a.name.localeCompare(b.name);
            });
    }
  };

  // Calculate stats for step 1
  const presentVolunteers = people.filter(p => session.presentPersonIds.includes(p.id) && p.role === Role.VOLUNTEER).length;
  const presentMembers = people.filter(p => session.presentPersonIds.includes(p.id) && p.role === Role.MEMBER).length;
  const presentGuests = people.filter(p => session.presentPersonIds.includes(p.id) && p.role === Role.GUEST).length;
  
  // Calculate total boats for step 2
  const totalBoats = localInventory.doubles + localInventory.singles + localInventory.privates;

  const getCardStyle = (role: Role, isPresent: boolean) => {
      const baseStyle = "flex items-center justify-between p-4 rounded-lg border text-right transition-all duration-200 select-none";
      
      if (!isPresent) return `${baseStyle} border-slate-200 hover:bg-slate-50 text-slate-600`;

      switch(role) {
          case Role.VOLUNTEER:
              return `${baseStyle} border-orange-500 bg-orange-50 ring-orange-500 text-orange-900 ring-1 shadow-sm`;
          case Role.MEMBER:
              return `${baseStyle} border-sky-500 bg-sky-50 ring-sky-500 text-sky-900 ring-1 shadow-sm`;
          case Role.GUEST:
              return `${baseStyle} border-emerald-500 bg-emerald-50 ring-emerald-500 text-emerald-900 ring-1 shadow-sm`;
          default:
              return `${baseStyle} border-slate-500 bg-slate-50`;
      }
  };

  const getBadgeStyle = (role: Role) => {
      switch(role) {
          case Role.VOLUNTEER: return 'bg-orange-100 text-orange-700';
          case Role.MEMBER: return 'bg-sky-100 text-sky-700';
          case Role.GUEST: return 'bg-emerald-100 text-emerald-700';
          default: return 'bg-slate-100 text-slate-700';
      }
  };

  const getIconColor = (role: Role) => {
       switch(role) {
          case Role.VOLUNTEER: return 'text-orange-600';
          case Role.MEMBER: return 'text-sky-600';
          case Role.GUEST: return 'text-emerald-600';
          default: return 'text-slate-600';
      }
  };

  if (step === 3) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center print:hidden">
          <button 
            onClick={() => setStep(2)}
            className="text-sm text-brand-600 hover:underline flex items-center gap-1"
            title="חזור למסך בחירת הנוכחות"
          >
            <ArrowRight size={16} /> חזרה להגדרות
          </button>
          
          <button 
            onClick={handleReset}
            className="text-sm text-red-500 hover:bg-red-50 px-3 py-1 rounded flex items-center gap-1 transition-colors"
            title="מחק את כל הנתונים והתחל אימון חדש"
          >
            <RotateCcw size={14} /> איפוס אימון
          </button>
        </div>
        <PairingBoard />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Progress Stepper - Clickable */}
      <div className="flex items-center justify-center space-x-8 mb-8 flex-row-reverse">
        <button 
          onClick={() => setStep(1)}
          className={`flex flex-col items-center transition-colors ${step === 1 ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
          title="שלב 1: נוכחות"
        >
          <div className="bg-white p-3 rounded-full border-2 border-current mb-2">
            <Users size={24} />
          </div>
          <span className="font-semibold text-sm">נוכחות</span>
        </button>
        <div className="w-16 h-0.5 bg-slate-200 mx-4" />
        <button 
          onClick={() => setStep(2)}
          disabled={session.presentPersonIds.length === 0}
          className={`flex flex-col items-center transition-colors ${step === 2 ? 'text-brand-600' : 'text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed'}`}
           title="שלב 2: הגדרת ציוד"
        >
          <div className="bg-white p-3 rounded-full border-2 border-current mb-2">
            <Ship size={24} />
          </div>
          <span className="font-semibold text-sm">ציוד</span>
        </button>
      </div>

      {step === 1 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex flex-col gap-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
               <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 w-full">
                 <h2 className="text-2xl font-bold text-slate-800">מי הגיע היום?</h2>
                 
                 {/* Stats Badges - Now next to header */}
                 <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                    <span className="text-orange-700 bg-orange-50 px-2 py-1 rounded border border-orange-200 font-medium">
                        מתנדבים: {presentVolunteers}
                    </span>
                    <span className="text-sky-700 bg-sky-50 px-2 py-1 rounded border border-sky-200 font-medium">
                        חברים: {presentMembers}
                    </span>
                    {presentGuests > 0 && (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 font-medium">
                            אורחים: {presentGuests}
                        </span>
                    )}
                     <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium">
                        סה"כ: {session.presentPersonIds.length}
                    </span>
                </div>
               </div>

               {/* Action Buttons */}
                <div className="flex gap-2 text-sm self-end md:self-center shrink-0">
                    <button 
                        onClick={selectAll}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                        title="סמן את כל המשתתפים כנוכחים"
                    >
                        <CheckSquare size={16} /> בחר הכל
                    </button>
                    <button 
                        onClick={clearAll}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                        title="נקה את כל הסימונים"
                    >
                        <Square size={16} /> נקה
                    </button>
                </div>
            </div>
            
            {/* Sort Controls */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <span className="font-medium">מיון לפי:</span>
                <button 
                    onClick={() => setSortBy('ROLE')}
                    className={`px-3 py-1 rounded-full border flex items-center gap-1 transition-colors ${sortBy === 'ROLE' ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                    <Shield size={14} /> תפקיד
                </button>
                <button 
                     onClick={() => setSortBy('NAME')}
                    className={`px-3 py-1 rounded-full border flex items-center gap-1 transition-colors ${sortBy === 'NAME' ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                    <ArrowDownAZ size={14} /> שם
                </button>
                <button 
                     onClick={() => setSortBy('RANK')}
                    className={`px-3 py-1 rounded-full border flex items-center gap-1 transition-colors ${sortBy === 'RANK' ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                    <ArrowUpNarrowWide size={14} /> דירוג
                </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {getSortedPeople().map(person => {
              const isPresent = session.presentPersonIds.includes(person.id);
              
              return (
                <button
                  key={person.id}
                  onClick={() => toggleAttendance(person.id)}
                  className={getCardStyle(person.role, isPresent)}
                  title={`לחץ לשינוי סטטוס נוכחות עבור ${person.name}`}
                >
                  <div>
                    <div className={`font-bold ${isPresent ? '' : 'text-slate-800'}`}>{person.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${getBadgeStyle(person.role)}`}>
                        {RoleLabel[person.role]}
                      </span>
                      <span className="text-xs opacity-70">רמה {person.rank}</span>
                    </div>
                  </div>
                  {isPresent ? (
                    <CheckCircle2 className={getIconColor(person.role)} size={22} />
                  ) : (
                    <Circle className="text-slate-300" size={22} />
                  )}
                </button>
              );
            })}
          </div>
          
          <div className="mt-8 pt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={session.presentPersonIds.length === 0}
              className="w-full md:w-auto bg-brand-600 disabled:opacity-50 hover:bg-brand-500 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20"
              title="עבור לשלב הגדרת הציוד"
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
                <h2 className="text-2xl font-bold text-slate-800">ציוד זמין</h2>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    סה"כ כלי שיט:
                    <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-bold">
                        {totalBoats}
                    </span>
                </div>
             </div>
            <button 
              onClick={handleSaveDefault}
              className="text-xs text-brand-600 hover:bg-brand-50 px-3 py-2 rounded-md flex items-center gap-1 transition-colors border border-brand-100"
              title="שמור את הכמויות הנוכחיות כברירת המחדל לאימונים הבאים"
            >
              <Save size={14} /> 
              {showSavedMsg ? 'נשמר!' : 'שמור כברירת מחדל'}
            </button>
          </div>
          
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
               <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">סוג סירה</span>
               <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">כמות</span>
            </div>

            <div>
              <label className="flex items-center justify-between mb-2" title="סירה לשני חותרים">
                <span className="font-medium text-slate-700">קיאק זוגי (2 מושבים)</span>
                <span className="text-brand-600 font-bold text-xl">{localInventory.doubles}</span>
              </label>
              <input 
                type="range" min="0" max="20" 
                value={localInventory.doubles}
                onChange={(e) => handleInventoryChange('doubles', Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                title="גרור לשינוי הכמות"
              />
            </div>
            <div>
              <label className="flex items-center justify-between mb-2" title="סירה לחותר יחיד">
                <span className="font-medium text-slate-700">קיאק יחיד (מושב 1)</span>
                <span className="text-brand-600 font-bold text-xl">{localInventory.singles}</span>
              </label>
              <input 
                type="range" min="0" max="20" 
                value={localInventory.singles}
                onChange={(e) => handleInventoryChange('singles', Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                title="גרור לשינוי הכמות"
              />
            </div>
            <div>
              <label className="flex items-center justify-between mb-2" title="סירות בבעלות פרטית של המשתתפים">
                <span className="font-medium text-slate-700">סירות פרטיות (בעלים)</span>
                <span className="text-brand-600 font-bold text-xl">{localInventory.privates}</span>
              </label>
              <input 
                type="range" min="0" max="10" 
                value={localInventory.privates}
                onChange={(e) => handleInventoryChange('privates', Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
                title="גרור לשינוי הכמות"
              />
            </div>
          </div>
          
          <div className="mt-8 flex justify-between">
             <button
              onClick={() => setStep(1)}
              className="text-slate-500 hover:text-slate-800 px-4 py-2"
              title="חזור לשלב הקודם"
            >
              חזור
            </button>
            <button
              onClick={startPairing}
              className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-brand-500/30 flex items-center gap-2 transform transition hover:scale-105"
              title="הפעל את אלגוריתם השיבוץ החכם"
            >
              צור שיבוצים <ArrowLeft size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};