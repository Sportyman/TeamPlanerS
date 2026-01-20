
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { BoatInventory } from '../types';
import { AlertTriangle, RotateCcw, ArrowRight } from 'lucide-react';
import { PairingBoard } from './PairingBoard';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { StepIndicator } from './session/StepIndicator';
import { AttendanceList } from './session/AttendanceList';
import { InventorySelector } from './session/InventorySelector';
import { LoadingScreen } from './layout/LoadingScreen';

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
    pairingDirty,
    isInitialLoading,
    _hasHydrated
  } = useAppStore();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // If we land here without a club after hydration and loading is done, 
  // then we really don't have an active club selection.
  if (_hasHydrated && !isInitialLoading && !activeClub) {
      return <Navigate to="/" replace />;
  }

  if (!activeClub) return <LoadingScreen message="מזהה חוג..." />;
  if (isInitialLoading) return <LoadingScreen message="מסנכרן נתוני אימון..." />;

  const currentSession = sessions[activeClub];
  
  // Guard for missing session object (prevents crash)
  if (!currentSession) {
      return (
          <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 max-w-lg mx-auto">
              <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
              <h2 className="text-2xl font-black text-slate-800 mb-2">נתוני אימון חסרים</h2>
              <p className="text-slate-500 mb-6 font-medium">אנחנו מנסים לשחזר את הנתונים מהענן. אם זה לא עוזר, נסה לבחור שוב את החוג.</p>
              <button onClick={() => navigate('/')} className="bg-brand-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg">חזור לדף הבית</button>
          </div>
      );
  }

  const settings = clubSettings[activeClub] || { boatDefinitions: [] };
  const clubPeople = people.filter(p => p.clubId === activeClub);
  const [localInventory, setLocalInventory] = useState<BoatInventory>(currentSession.inventory);

  // Sync internal state when store updates
  useEffect(() => {
    setLocalInventory(currentSession.inventory);
  }, [currentSession.inventory]);

  // Derived Step Logic
  const stepParam = searchParams.get('step');
  const step = (stepParam ? Number(stepParam) : (currentSession.teams.length > 0 ? 3 : 1)) as 1 | 2 | 3;

  const handleStepChange = (newStep: number) => {
      setSearchParams({ step: String(newStep) });
  };

  const startPairing = () => {
    updateInventory(localInventory);
    runPairing();
    handleStepChange(3);
  };

  const handleReset = () => {
    if (confirm('האם לאפס את האימון? כל השיבוצים יימחקו.')) {
      resetSession();
      handleStepChange(1);
    }
  };

  if (step === 3) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        {pairingDirty && (
            <div className="bg-amber-100 border-2 border-amber-200 text-amber-900 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <AlertTriangle size={24} className="text-amber-600" />
                    <div>
                        <span className="font-black block">נתוני המשתתפים השתנו!</span>
                        <span className="text-xs font-bold opacity-70">מומלץ לערבב מחדש כדי שהשיבוץ יהיה מעודכן.</span>
                    </div>
                </div>
                <button onClick={() => confirm('לערבב מחדש?') && handleStepChange(2)} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-black shadow-md">ערבב שוב</button>
            </div>
        )}

        <div className="flex justify-between items-center print:hidden px-2">
          <button onClick={() => handleStepChange(2)} className="text-sm font-black text-brand-600 hover:text-brand-700 flex items-center gap-2"><ArrowRight size={20} /> חזרה להגדרות</button>
          <button onClick={handleReset} className="text-sm font-black text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-all flex items-center gap-2"><RotateCcw size={16} /> איפוס אימון</button>
        </div>
        <PairingBoard />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <StepIndicator 
        currentStep={step} 
        onStepClick={handleStepChange} 
        isStep2Disabled={currentSession.presentPersonIds.length === 0} 
      />

      {step === 1 && (
        <AttendanceList 
            people={clubPeople} 
            presentIds={currentSession.presentPersonIds} 
            onToggle={toggleAttendance} 
            onBulkSelect={setBulkAttendance}
            onNext={() => handleStepChange(2)}
        />
      )}

      {step === 2 && (
        <InventorySelector 
            clubLabel={clubs.find(c => c.id === activeClub)?.label || ''}
            boatDefinitions={settings.boatDefinitions}
            localInventory={localInventory}
            onInventoryChange={(id, val) => setLocalInventory(prev => ({ ...prev, [id]: val }))}
            onBack={() => handleStepChange(1)}
            onStartPairing={startPairing}
        />
      )}
    </div>
  );
};
