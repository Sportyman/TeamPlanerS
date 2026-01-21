
import React from 'react';
import { BoatDefinition, BoatInventory, BoatType } from '../../types';
import { Settings, Anchor, Wind, ShipWheel, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InventorySelectorProps {
  clubLabel: string;
  boatDefinitions: BoatDefinition[];
  localInventory: BoatInventory;
  onInventoryChange: (id: string, val: number) => void;
  onStartPairing: () => void;
  onBack: () => void;
}

export const InventorySelector: React.FC<InventorySelectorProps> = ({
  clubLabel, boatDefinitions, localInventory, onInventoryChange, onStartPairing, onBack
}) => {
  const navigate = useNavigate();
  // Fix: Explicitly type reduce generic and cast values to resolve unknown type addition error
  const totalBoats = Object.values(localInventory).reduce<number>((a, b) => a + (Number(b) || 0), 0);

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
         <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">ציוד זמין היום</h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 font-medium">
                סה"כ כלי שיט בשימוש: <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-bold">{totalBoats}</span>
            </div>
         </div>
         <button 
            onClick={() => navigate('/app/manage?view=INVENTORY')} 
            className="text-[10px] font-black uppercase text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-2 rounded-xl flex items-center gap-1 border border-brand-100 transition-colors"
         >
            <Settings size={14} /> הגדר ציוד
         </button>
      </div>
      
      <div className="space-y-6">
        {boatDefinitions.map(def => (
            <div key={def.id} className="group">
                <label className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-700 group-hover:text-brand-600 transition-colors">{def.label}</span>
                        <div className="flex gap-2 flex-wrap mt-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1 bg-slate-50 px-1.5 py-0.5 rounded border">
                                {def.isStable ? <Anchor size={10} /> : <Wind size={10} />}
                                {def.isStable ? 'יציב' : 'מהיר'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase border-r pr-2 mr-1">קיבולת: {def.capacity}</span>
                            {(def.minSkippers || 0) > 0 && (
                                 <span className="text-[10px] text-blue-500 font-black border-r pr-2 mr-1 flex items-center gap-0.5 uppercase">
                                     <ShipWheel size={10} /> נדרש סקיפר
                                 </span>
                            )}
                        </div>
                    </div>
                    <span className="text-brand-600 font-black text-2xl tabular-nums">{localInventory[def.id] || 0}</span>
                </label>
                <input 
                    type="range" 
                    min="0" 
                    max="20" 
                    value={localInventory[def.id] || 0} 
                    onChange={(e) => onInventoryChange(def.id, Number(e.target.value))} 
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600 focus:ring-2 focus:ring-brand-500/20" 
                />
            </div>
        ))}
        
        {boatDefinitions.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-slate-100 border-dashed italic">
                לא הוגדר ציוד לחוג זה. <button onClick={() => navigate('/app/manage?view=INVENTORY')} className="text-brand-600 font-bold underline">לחץ להוספה</button>
            </div>
        )}
      </div>
      
      <div className="mt-10 flex justify-between gap-4">
         <button onClick={onBack} className="text-slate-400 font-bold hover:text-slate-800 transition-colors">ביטול</button>
         <button 
            onClick={onStartPairing} 
            disabled={boatDefinitions.length === 0} 
            className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-brand-100 flex items-center justify-center gap-2 transform transition active:scale-95"
         >
            צור שיבוצים <ArrowLeft size={20} />
         </button>
      </div>
    </div>
  );
};
