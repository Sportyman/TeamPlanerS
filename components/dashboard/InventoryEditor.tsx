
import React, { useState } from 'react';
import { BoatDefinition, ClubID } from '../../types';
import { Plus, Trash2, Save, Anchor, Wind, Users2, ShipWheel } from 'lucide-react';

interface InventoryEditorProps {
    clubId: ClubID;
    definitions: BoatDefinition[];
    onSave: (defs: BoatDefinition[]) => void;
    onCancel: () => void;
}

export const InventoryEditor: React.FC<InventoryEditorProps> = ({ definitions, onSave, onCancel }) => {
    const [draft, setDraft] = useState<BoatDefinition[]>(definitions);
    const [isAdding, setIsAdding] = useState(false);
    const [newBoat, setNewBoat] = useState<Partial<BoatDefinition>>({ label: '', capacity: 2, defaultCount: 1, isStable: true, minSkippers: 0 });

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newBoat.label) return;
        setDraft([...draft, { ...newBoat, id: `custom-${Date.now()}` } as BoatDefinition]);
        setNewBoat({ label: '', capacity: 2, defaultCount: 1, isStable: true, minSkippers: 0 });
        setIsAdding(false);
    };

    const updateDef = (id: string, field: keyof BoatDefinition, val: any) => {
        setDraft(draft.map(d => d.id === id ? { ...d, [field]: val } : d));
    };

    return (
        <div className="max-w-2xl mx-auto py-6 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">ניהול ציוד</h2>
                    <button onClick={() => setIsAdding(true)} className="bg-brand-600 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={16} /> הוסף כלי שיט</button>
                </div>

                {isAdding && (
                    <form onSubmit={handleAdd} className="bg-brand-50 p-4 rounded-lg border border-brand-100 mb-6 space-y-4">
                        <input required type="text" value={newBoat.label} onChange={e => setNewBoat({...newBoat, label: e.target.value})} className="w-full p-2 border rounded" placeholder="שם הכלי (למשל: סאפ, קטמרן)" />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" value={newBoat.capacity} onChange={e => setNewBoat({...newBoat, capacity: Number(e.target.value)})} className="p-2 border rounded" placeholder="קיבולת" />
                            <input type="number" value={newBoat.minSkippers} onChange={e => setNewBoat({...newBoat, minSkippers: Number(e.target.value)})} className="p-2 border rounded" placeholder="סקיפרים" />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded font-bold">הוסף</button>
                            <button type="button" onClick={() => setIsAdding(false)} className="bg-white border px-4 py-2 rounded">ביטול</button>
                        </div>
                    </form>
                )}
                
                <div className="space-y-4">
                    {draft.map(def => (
                        <div key={def.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row justify-between gap-4">
                             <div className="flex-1 space-y-2">
                                 <input value={def.label} onChange={e => updateDef(def.id, 'label', e.target.value)} className="font-bold bg-transparent border-b focus:outline-none" />
                                 <div className="flex flex-wrap gap-2 text-xs">
                                     <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border"><Users2 size={12}/> קיבולת: <input type="number" value={def.capacity} onChange={e => updateDef(def.id, 'capacity', Number(e.target.value))} className="w-8" /></span>
                                     <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border"><ShipWheel size={12}/> סקיפרים: <input type="number" value={def.minSkippers} onChange={e => updateDef(def.id, 'minSkippers', Number(e.target.value))} className="w-8" /></span>
                                     <button onClick={() => updateDef(def.id, 'isStable', !def.isStable)} className={`flex items-center gap-1 px-2 py-1 rounded border ${def.isStable ? 'bg-green-50' : 'bg-blue-50'}`}>{def.isStable ? 'יציב' : 'מהיר'}</button>
                                 </div>
                             </div>
                             <button onClick={() => setDraft(draft.filter(d => d.id !== def.id))} className="text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex gap-4">
                <button onClick={() => onSave(draft)} className="flex-1 bg-brand-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg"><Save size={18} /> שמור שינויים</button>
                <button onClick={onCancel} className="bg-white border text-slate-500 px-6 py-3 rounded-lg font-bold">ביטול</button>
            </div>
        </div>
    );
};
