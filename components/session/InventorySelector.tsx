import React, { useMemo, useState } from 'react';
import { BoatDefinition, BoatInventory, Person, Role, getRoleLabel } from '../../types';
import { calculateSessionBoatRecommendation } from '../../services/boatAllocationLogic';
import { Settings, Anchor, Wind, ShipWheel, ArrowLeft, Sparkles, AlertTriangle, Users, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InventorySelectorProps {
  clubLabel: string;
  boatDefinitions: BoatDefinition[];
  localInventory: BoatInventory;
  allClubPeople: Person[];
  presentPeople: Person[];
  hasManualEdit: boolean;
  onInventoryChange: (id: string, val: number) => void;
  onApplyRecommendedInventory: (inv: BoatInventory) => void;
  onToggleParticipant: (personId: string) => void;
  onUpdateParticipantRole: (person: Person, role: Role, isSkipper?: boolean) => Promise<void>;
  onStartPairing: () => void;
  onBack: () => void;
}

export const InventorySelector: React.FC<InventorySelectorProps> = ({
  boatDefinitions, localInventory, allClubPeople, presentPeople, hasManualEdit,
  onInventoryChange, onApplyRecommendedInventory, onToggleParticipant, onUpdateParticipantRole, onStartPairing, onBack,
}) => {
  const navigate = useNavigate();
  const [showParticipants, setShowParticipants] = useState(false);

  const totalBoats = Object.values(localInventory).reduce<number>((a, b) => a + (Number(b) || 0), 0);
  const totalSeats = boatDefinitions.reduce((sum, def) => sum + (Number(localInventory[def.id]) || 0) * def.capacity, 0);
  const recommendation = useMemo(() => calculateSessionBoatRecommendation(presentPeople, boatDefinitions, localInventory), [presentPeople, boatDefinitions, localInventory]);
  const absentPeople = useMemo(() => allClubPeople.filter((p) => !presentPeople.some((pr) => pr.id === p.id)), [allClubPeople, presentPeople]);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 space-y-5">
      <div className="flex justify-between items-start border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">ציוד זמין היום</h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 font-medium tabular-nums flex-wrap">
            כלי שיט: <span className="text-brand-700 font-bold">{totalBoats}</span>
            <span aria-hidden="true">·</span>
            מקומות: <span className="font-bold text-slate-700">{totalSeats}</span>
            <span aria-hidden="true">·</span>
            נוכחים: <span className="font-bold text-slate-700">{presentPeople.length}</span>
          </div>
        </div>
        <button onClick={() => navigate('/app/manage?view=INVENTORY')} className="text-[10px] font-black uppercase text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-xl flex items-center gap-1 border border-brand-100 transition-colors">
          <Settings size={14} /> הגדר ציוד
        </button>
      </div>

      {presentPeople.length > 0 && boatDefinitions.length > 0 && (
        <div className="border border-brand-200 bg-brand-50/60 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-900">
              <Sparkles size={15} className="text-brand-600 shrink-0" />
              <span>{hasManualEdit ? 'המלצת מערכת (הציוד שונה ידנית)' : 'ברירת מחדל מומלצת למשתתפי היום'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowParticipants((v) => !v)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                <Users size={13} /> <span>משתתפים היום ({presentPeople.length})</span> {showParticipants ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              <button type="button" onClick={() => onApplyRecommendedInventory(recommendation.recommendedInventory)} className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold whitespace-nowrap">
                חשב מחדש לפי ההמלצה
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-700 tabular-nums">{recommendation.summaryText}</p>
          {recommendation.warnings.map((w, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold"><AlertTriangle size={13} className="shrink-0" /><span>{w}</span></div>
          ))}
        </div>
      )}

      {showParticipants && (
        <div className="border border-slate-200 rounded-xl bg-slate-50/70 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 tabular-nums">
              מתנדבים/מדריכים: {recommendation.stats.volunteersCount} · חברים/אורחים: {presentPeople.length - recommendation.stats.volunteersCount} · סקיפרים: {recommendation.stats.skippersCount}
            </span>
            {absentPeople.length > 0 && (
              <select value="" onChange={(e) => { if (e.target.value) onToggleParticipant(e.target.value); }} className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white">
                <option value="">+ הוסף משתתף לאימון...</option>
                {absentPeople.map((p) => (<option key={p.id} value={p.id}>{p.name} ({getRoleLabel(p.role, p.gender)})</option>))}
              </select>
            )}
          </div>
          <div className="divide-y divide-slate-200 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-xl">
            {presentPeople.map((p) => (
              <div key={p.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <span className="font-bold text-slate-900">{p.name}</span>
                  <span className="text-slate-500 mr-1.5">· דירוג {p.rank}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={p.role} onChange={(e) => onUpdateParticipantRole(p, e.target.value as Role)} className="border border-slate-200 rounded-lg px-2 py-1 bg-white font-semibold">
                    <option value={Role.UNASSIGNED}>לא הוגדר *</option>
                    <option value={Role.MEMBER}>{getRoleLabel(Role.MEMBER, p.gender)}</option>
                    <option value={Role.VOLUNTEER}>{getRoleLabel(Role.VOLUNTEER, p.gender)}</option>
                    <option value={Role.INSTRUCTOR}>{getRoleLabel(Role.INSTRUCTOR, p.gender)}</option>
                    <option value={Role.GUEST}>{getRoleLabel(Role.GUEST, p.gender)}</option>
                  </select>
                  <button type="button" onClick={() => onToggleParticipant(p.id)} className="p-1 text-slate-400 hover:text-red-600" title="הסר מנוכחות היום">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {boatDefinitions.map((def) => (
          <div key={def.id} className="group">
            <label className="flex items-center justify-between mb-2">
              <div className="flex flex-col">
                <span className="font-bold text-slate-700 group-hover:text-brand-600 transition-colors">{def.label}</span>
                <div className="flex gap-2 flex-wrap mt-1 text-[10px] text-slate-500 font-bold">
                  <span className="flex items-center gap-1">{def.isStable ? <Anchor size={10} /> : <Wind size={10} />}{def.isStable ? 'יציב' : 'מהיר'}</span>
                  <span aria-hidden="true">·</span><span>קיבולת: {def.capacity}</span>
                  {(def.minSkippers || 0) > 0 && (<><span aria-hidden="true">·</span><span className="text-blue-600 flex items-center gap-0.5"><ShipWheel size={10} /> נדרש סקיפר</span></>)}
                </div>
              </div>
              <span className="text-brand-600 font-black text-2xl tabular-nums">{localInventory[def.id] || 0}</span>
            </label>
            <input type="range" min="0" max="20" value={localInventory[def.id] || 0} onChange={(e) => onInventoryChange(def.id, Number(e.target.value))} className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600 focus:ring-2 focus:ring-brand-500/20" />
          </div>
        ))}
        {boatDefinitions.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-slate-100 border-dashed italic">
            לא הוגדר ציוד לחוג זה. <button onClick={() => navigate('/app/manage?view=INVENTORY')} className="text-brand-600 font-bold underline">לחץ להוספה</button>
          </div>
        )}
      </div>

      <div className="pt-4 flex justify-between gap-4">
        <button onClick={onBack} className="text-slate-400 font-bold hover:text-slate-800 transition-colors">ביטול</button>
        <button onClick={onStartPairing} disabled={boatDefinitions.length === 0} className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-brand-100 flex items-center justify-center gap-2 transform transition active:scale-95">
          צור שיבוצים <ArrowLeft size={20} />
        </button>
      </div>
    </div>
  );
};
