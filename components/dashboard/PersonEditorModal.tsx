
import React, { useState } from 'react';
import { Person, Role, Gender, GenderLabel, BoatDefinition, GenderPrefType, GenderPrefLabels, ConstraintStrength, getRoleLabel } from '../../types';
import { X, Save, ShipWheel, AlertOctagon, Tag } from 'lucide-react';
import { RelationshipManager } from './RelationshipManager';

interface PersonEditorModalProps {
    person?: Person | null;
    allPeople: Person[];
    boatDefinitions: BoatDefinition[];
    onClose: () => void;
    onSave: (person: Person) => void;
}

export const PersonEditorModal: React.FC<PersonEditorModalProps> = ({ 
    person, allPeople, boatDefinitions, onClose, onSave 
}) => {
    const isEdit = !!person;
    const [formData, setFormData] = useState<Partial<Person>>(person || {
        name: '', gender: Gender.MALE, role: Role.VOLUNTEER, rank: 3, tags: [], 
        isSkipper: false, phone: '', notes: '', preferredBoatType: '',
        genderConstraint: { type: 'NONE', strength: 'PREFER' },
        mustPairWith: [], preferPairWith: [], cannotPairWith: []
    });
    
    const [tagInput, setTagInput] = useState('');
    const [phoneError, setPhoneError] = useState('');

    const formatPhone = (val: string) => {
        const digits = val.replace(/\D/g, '').slice(0, 10);
        return digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value);
        setFormData(prev => ({ ...prev, phone: formatted }));
        setPhoneError(formatted.length === 11 || formatted === '' ? '' : 'פורמט: 05X-XXXXXXX');
    };

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            const currentTags = formData.tags || [];
            if (!currentTags.includes(tagInput.trim())) {
                setFormData(prev => ({ ...prev, tags: [...currentTags, tagInput.trim()] }));
            }
            setTagInput('');
        }
    };

    const toggleRel = (targetId: string, type: 'MUST' | 'PREFER' | 'CANNOT') => {
        const must = (formData.mustPairWith || []).filter(id => id !== targetId);
        const pref = (formData.preferPairWith || []).filter(id => id !== targetId);
        const cannt = (formData.cannotPairWith || []).filter(id => id !== targetId);
        if (type === 'MUST') must.push(targetId);
        if (type === 'PREFER') pref.push(targetId);
        if (type === 'CANNOT') cannt.push(targetId);
        setFormData(prev => ({ ...prev, mustPairWith: must, preferPairWith: pref, cannotPairWith: cannt }));
    };

    const clearRel = (targetId: string) => {
        setFormData(prev => ({
            ...prev,
            mustPairWith: (prev.mustPairWith || []).filter(id => id !== targetId),
            preferPairWith: (prev.preferPairWith || []).filter(id => id !== targetId),
            cannotPairWith: (prev.cannotPairWith || []).filter(id => id !== targetId)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;
        if (phoneError) return;
        onSave({ ...formData, id: formData.id || Date.now().toString() } as Person);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-lg">{isEdit ? 'עריכת משתתף' : 'הוספת משתתף'}</h3>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">שם מלא</label>
                            <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border rounded-lg p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">מין</label>
                            <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as Gender})} className="w-full border rounded-lg p-2">
                                <option value={Gender.MALE}>{GenderLabel[Gender.MALE]}</option>
                                <option value={Gender.FEMALE}>{GenderLabel[Gender.FEMALE]}</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">טלפון</label>
                        <input type="tel" value={formData.phone || ''} onChange={handlePhoneChange} className={`w-full border rounded-lg p-2 ${phoneError ? 'border-red-500' : ''}`} placeholder="05X-XXXXXXX" dir="ltr" />
                        {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">תפקיד</label>
                            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} className="w-full border rounded-lg p-2">
                                {Object.values(Role).map(r => <option key={r} value={r}>{getRoleLabel(r, formData.gender || Gender.MALE)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">דירוג (1-5)</label>
                            <input type="number" min="1" max="5" value={formData.rank} onChange={e => setFormData({...formData, rank: Number(e.target.value)})} className="w-full border rounded-lg p-2" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 border p-2 rounded-lg bg-blue-50 border-blue-100">
                        <input type="checkbox" id="skipper" checked={formData.isSkipper || false} onChange={e => setFormData({...formData, isSkipper: e.target.checked})} className="w-5 h-5 text-blue-600 rounded" />
                        <label htmlFor="skipper" className="text-sm font-bold text-blue-800 flex items-center gap-2">
                            <ShipWheel size={18} /> סקיפר / משיט
                        </label>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><AlertOctagon size={16} className="text-brand-600"/> הגדרות שיבוץ</div>
                        <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded border">
                            <select value={formData.genderConstraint?.type || 'NONE'} onChange={e => setFormData({...formData, genderConstraint: { ...formData.genderConstraint!, type: e.target.value as GenderPrefType }})} className="border rounded p-1.5 text-xs">
                                {Object.entries(GenderPrefLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                            </select>
                            <select value={formData.genderConstraint?.strength || 'NONE'} onChange={e => setFormData({...formData, genderConstraint: { ...formData.genderConstraint!, strength: e.target.value as any }})} className="border rounded p-1.5 text-xs">
                                <option value="NONE">ללא חשיבות</option>
                                <option value="PREFER">העדפה</option>
                                <option value="MUST">חובה קריטית</option>
                            </select>
                        </div>
                        <RelationshipManager people={allPeople} must={formData.mustPairWith || []} prefer={formData.preferPairWith || []} cannot={formData.cannotPairWith || []} onToggle={toggleRel} onClear={clearRel} currentId={formData.id} />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">תגיות</label>
                        <div className="border rounded-lg p-2 flex flex-wrap gap-2 min-h-[42px]">
                            {formData.tags?.map(t => <span key={t} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs flex items-center gap-1">{t}<button type="button" onClick={() => setFormData({...formData, tags: formData.tags?.filter(x => x !== t)})}><X size={12}/></button></span>)}
                            <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} className="flex-1 outline-none text-sm min-w-[100px]" placeholder="הוסף תגית..." />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 flex items-center justify-center gap-2"><Save size={18} /> שמור משתתף</button>
                        <button type="button" onClick={onClose} className="bg-slate-200 text-slate-700 px-4 py-3 rounded-lg font-bold">ביטול</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
