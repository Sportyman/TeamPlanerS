import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store';
import { BoatInventory } from '../types';
import { AlertTriangle, RotateCcw, ArrowRight } from 'lucide-react';
import { PairingBoard } from './PairingBoard';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { StepIndicator } from './session/StepIndicator';
import { AttendanceList } from './session/AttendanceList';
import { InventorySelector } from './session/InventorySelector';
import { LoadingScreen } from './layout/LoadingScreen';
import { UpcomingSessionBanner } from './schedule/UpcomingSessionBanner';
import { useWhatsAppPolls } from '../hooks/useWhatsAppPolls';
import { usePermissions } from '../hooks/usePermissions';
import { calculateSessionBoatRecommendation } from '../services/boatAllocationLogic';
import { recordClubAttendance } from '../services/syncService';
import { getDefaultBoatDefs } from '../services/clubEquipmentService';

export const SessionManager: React.FC = () => {
  const {
    activeClub, clubs, sessions, people, toggleAttendance, setBulkAttendance,
    updateInventory, runPairing, resetSession, clubSettings, pairingDirty, isInitialLoading, _hasHydrated,
  } = useAppStore();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { effectiveClubPeople, updateMemberRole } = useWhatsAppPolls();
  const { isStaff } = usePermissions();

  const currentSession = activeClub ? sessions[activeClub] : undefined;
  const [localInventory, setLocalInventory] = useState<BoatInventory>(currentSession?.inventory || {});
  const [hasManualInventoryEdit, setHasManualInventoryEdit] = useState(false);

  const currentClubObj = activeClub ? clubs.find((c) => c.id === activeClub) : undefined;
  const currentClubLabel = currentClubObj?.label || '';
  const storedDefs = activeClub ? clubSettings[activeClub]?.boatDefinitions : undefined;
  const boatDefinitions = useMemo(
    () => (storedDefs && storedDefs.length > 0 ? storedDefs : activeClub ? getDefaultBoatDefs(activeClub, currentClubLabel) : []),
    [storedDefs, activeClub, currentClubLabel]
  );

  const allClubPeople = useMemo(
    () => (effectiveClubPeople.length > 0 ? effectiveClubPeople : people.filter((p) => p.clubId === activeClub)),
    [effectiveClubPeople, people, activeClub]
  );

  const presentPeople = useMemo(() => {
    if (!currentSession) return [];
    return allClubPeople.filter((p) => currentSession.presentPersonIds.includes(p.id));
  }, [allClubPeople, currentSession]);

  const presentSignature = useMemo(
    () => presentPeople.map((p) => `${p.id}:${p.role}:${p.isSkipper ? 1 : 0}`).join('|'),
    [presentPeople]
  );

  useEffect(() => {
    setHasManualInventoryEdit(false);
  }, [presentSignature, activeClub]);

  useEffect(() => {
    if (!currentSession || hasManualInventoryEdit || presentPeople.length === 0 || boatDefinitions.length === 0) return;
    const rec = calculateSessionBoatRecommendation(presentPeople, boatDefinitions, currentSession.inventory);
    setLocalInventory(rec.recommendedInventory);
  }, [presentPeople, boatDefinitions, currentSession, hasManualInventoryEdit]);

  if (_hasHydrated && !isInitialLoading && !activeClub) return <Navigate to="/" replace />;
  if (!activeClub) return <LoadingScreen message="מזהה חוג..." />;
  if (isInitialLoading) return <LoadingScreen message="מסנכרן נתוני אימון..." />;

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

  const clubPeople = people.filter((p) => p.clubId === activeClub);
  const stepParam = searchParams.get('step');
  const step = (stepParam ? Number(stepParam) : (currentSession.teams.length > 0 ? 3 : 1)) as 1 | 2 | 3;
  const handleStepChange = (newStep: number) => setSearchParams({ step: String(newStep) });

  const handleAdvanceToEquipment = () => {
    if (activeClub && presentPeople.length > 0) {
      recordClubAttendance(activeClub, presentPeople).catch(() => {});
    }
    handleStepChange(2);
  };

  const startPairing = () => {
    updateInventory(localInventory);
    runPairing(allClubPeople.length > 0 ? allClubPeople : undefined, boatDefinitions);
    handleStepChange(3);
  };

  const handleReset = () => {
    if (confirm('האם לאפס את האימון? כל השיבוצים יימחקו.')) {
      resetSession();
      setHasManualInventoryEdit(false);
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
        <UpcomingSessionBanner club={currentClubObj} canEdit={isStaff} />
        <PairingBoard />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <StepIndicator currentStep={step} onStepClick={handleStepChange} isStep2Disabled={currentSession.presentPersonIds.length === 0} />
      <UpcomingSessionBanner club={currentClubObj} canEdit={isStaff} />
      {step === 1 && (
        <AttendanceList
          people={clubPeople} presentIds={currentSession.presentPersonIds}
          onToggle={toggleAttendance} onBulkSelect={setBulkAttendance} onNext={handleAdvanceToEquipment}
        />
      )}
      {step === 2 && (
        <InventorySelector
          clubLabel={currentClubLabel}
          boatDefinitions={boatDefinitions}
          localInventory={localInventory}
          allClubPeople={allClubPeople}
          presentPeople={presentPeople}
          hasManualEdit={hasManualInventoryEdit}
          onInventoryChange={(id, val) => { setHasManualInventoryEdit(true); setLocalInventory((prev) => ({ ...prev, [id]: val })); }}
          onApplyRecommendedInventory={(inv) => { setHasManualInventoryEdit(false); setLocalInventory(inv); }}
          onToggleParticipant={toggleAttendance}
          onUpdateParticipantRole={updateMemberRole}
          onBack={() => handleStepChange(1)}
          onStartPairing={startPairing}
        />
      )}
    </div>
  );
};
