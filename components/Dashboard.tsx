import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Role, RoleLabel, Person, BoatType, BoatTypeLabel } from '../types';
import { Trash2, UserPlus, Star, Edit, X, Save, ChevronDown, ChevronUp, Plus, Users, Phone } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { people, addPerson, updatePerson, removePerson } = useAppStore();
  
  // Add State
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Role>(Role.VOLUNTEER);
  const [newRank, setNewRank] = useState(3);
  const [newNotes, setNewNotes] = useState('');
  const [newPreferredBoat, setNewPreferredBoat] = useState<BoatType | ''>('');
  const [newPreferredPartners, setNewPreferredPartners] = useState<string[]>([]);

  // Edit Modal State
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    addPerson({
      id: Date.now().toString(),
      name: newName,
      phone: newPhone,
      role: newRole,
      rank: newRank,
      notes: newNotes,
      constraints: newPreferredBoat ? { preferredBoat: newPreferredBoat } : undefined,
      preferredPartners: newPreferredPartners.length > 0 ? newPreferredPartners : undefined
    });
    
    // Reset form
    setNewName('');
    setNewPhone('');
    setNewNotes('');
    setNewPreferredBoat('');
    setNewPreferredPartners([]);
    setNewRole(Role.VOLUNTEER);
    setNewRank(3);
    setIsAddFormOpen(false); 
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPerson) {
      updatePerson(editingPerson);
      setEditingPerson(null);
    }
  };

  // Toggle helpers for Edit Mode
  const togglePartnerSelectionEdit = (partnerId: string) => {
    if (!editingPerson) return;
    const currentPartners = editingPerson.preferredPartners || [];
    const isSelected = currentPartners.includes(partnerId);
    
    let newPartners;
    if (isSelected) {
      newPartners = currentPartners.filter(id => id !== partnerId);
    } else {
      newPartners = [...currentPartners, partnerId];
    }
    
    setEditingPerson({ ...editingPerson, preferredPartners: newPartners });
  };

  // Toggle helpers for Add Mode
  const togglePartnerSelectionAdd = (partnerId: string) => {
    const isSelected = newPreferredPartners.includes(partnerId);
    if (isSelected) {
      setNewPreferredPartners(newPreferredPartners.filter(id => id !== partnerId));
    } else {
      setNewPreferredPartners([...newPreferredPartners, partnerId]);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank <= 2) return 'text-red-500';
    if (rank === 3) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case Role.VOLUNTEER: return 'bg-orange-100 text-orange-700';
      case Role.MEMBER: return 'bg-sky-100 text-sky-700';
      case Role.GUEST: return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getMobileCardColor = (role: Role) => {
    switch (role) {
      case Role.VOLUNTEER: return 'bg-orange-50 border-orange-200';
      case Role.MEMBER: return 'bg-sky-50 border-sky-200';
      case Role.GUEST: return 'bg-emerald-50 border-emerald-200';
      default: return 'bg-white border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Edit Modal - Full Screen on Mobile, Centered on Desktop */}
      {editingPerson && (
        <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:bg-black/50 bg-white md:bg-transparent">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:w-full md:max-w-lg md:rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header - Fixed at top */}
            <div className="bg-brand-50 p-4 border-b border-brand-100 flex justify-between items-center shrink-0 safe-area-top">
              <h3 className="font-bold text-lg text-brand-800">עריכת משתתף</h3>
              <button onClick={() => setEditingPerson(null)} className="text-slate-500 hover:text-slate-800 p-2" title="סגור חלון">
                <X size={24} />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <form onSubmit={handleUpdate} className="p-4 space-y-4 overflow-y-auto flex-1 bg-white">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">שם מלא</label>
                  <input
                    type="text"
                    value={editingPerson.name}
                    onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                    className="w-full px-3 py-3 md:py-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none text-base"
                    required
                    title="שם המשתתף המלא"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">טלפון</label>
                  <input
                    type="tel"
                    value={editingPerson.phone || ''}
                    onChange={(e) => setEditingPerson({ ...editingPerson, phone: e.target.value })}
                    className="w-full px-3 py-3 md:py-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none text-base"
                    placeholder="05X-XXXXXXX"
                    title="מספר טלפון"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">תפקיד</label>
                  <select
                    value={editingPerson.role}
                    onChange={(e) => setEditingPerson({ ...editingPerson, role: e.target.value as Role })}
                    className="w-full px-3 py-3 md:py-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none text-base bg-white"
                    title="בחר תפקיד במערכת"
                  >
                    <option value={Role.VOLUNTEER}>{RoleLabel[Role.VOLUNTEER]}</option>
                    <option value={Role.MEMBER}>{RoleLabel[Role.MEMBER]}</option>
                    <option value={Role.GUEST}>{RoleLabel[Role.GUEST]}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">דירוג (1-5)</label>
                  <select
                    value={editingPerson.rank}
                    onChange={(e) => setEditingPerson({ ...editingPerson, rank: Number(e.target.value) })}
                    className="w-full px-3 py-3 md:py-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none text-base bg-white"
                    title="רמת המיומנות (1 - מתחיל, 5 - מנוסה)"
                  >
                    {[1, 2, 3, 4, 5].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">הערות כלליות</label>
                <textarea
                  value={editingPerson.notes || ''}
                  onChange={(e) => setEditingPerson({ ...editingPerson, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none text-base"
                  rows={2}
                  title="הערות רפואיות או כלליות"
                />
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="font-semibold text-sm text-slate-900 mb-3">אילוצים והעדפות</h4>
                
                <div className="space-y-4">
                   <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">סירה מועדפת</label>
                    <select
                      value={editingPerson.constraints?.preferredBoat || ''}
                      onChange={(e) => setEditingPerson({ 
                        ...editingPerson, 
                        constraints: { 
                          ...editingPerson.constraints, 
                          preferredBoat: e.target.value ? e.target.value as BoatType : undefined 
                        } 
                      })}
                      className="w-full px-3 py-3 md:py-2 border rounded-md text-base bg-white"
                      title="העדפת סוג כלי שיט לשיבוץ"
                    >
                      <option value="">ללא העדפה</option>
                      {Object.entries(BoatTypeLabel).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  
                   <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-medium text-slate-500">
                        שותפים מועדפים ({editingPerson.preferredPartners?.length || 0})
                      </label>
                      {(editingPerson.preferredPartners?.length || 0) > 0 && (
                        <button 
                          type="button"
                          onClick={() => setEditingPerson({ ...editingPerson, preferredPartners: [] })}
                          className="text-xs text-red-500 font-medium hover:bg-red-50 px-2 py-1 rounded"
                        >
                          נקה הכל
                        </button>
                      )}
                    </div>
                    
                    {/* Multi-Select List */}
                    <div className="border rounded-md max-h-48 overflow-y-auto bg-slate-50 divide-y divide-slate-100">
                      {people.filter(p => p.id !== editingPerson.id).map(p => {
                        const isSelected = editingPerson.preferredPartners?.includes(p.id);
                        return (
                          <label 
                            key={p.id} 
                            className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${isSelected ? 'bg-brand-50' : 'bg-white hover:bg-slate-50'}`}
                          >
                            <span className={`text-sm ${isSelected ? 'font-medium text-brand-700' : 'text-slate-700'}`}>
                              {p.name} <span className="text-xs text-slate-400">({RoleLabel[p.role]})</span>
                            </span>
                            <input
                              type="checkbox"
                              checked={isSelected || false}
                              onChange={() => togglePartnerSelectionEdit(p.id)}
                              className="w-5 h-5 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

            </form>

            {/* Footer - Fixed at bottom */}
            <div className="p-4 border-t border-slate-100 shrink-0 flex gap-3 bg-slate-50 safe-area-bottom">
              <button
                onClick={handleUpdate}
                className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm text-lg md:text-base"
                title="שמור את השינויים"
              >
                <Save size={20} /> שמירה
              </button>
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-medium text-lg md:text-base"
                title="בטל עריכה"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accordion: Add Person Form (Expanded with all fields) */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
        <button 
          onClick={() => setIsAddFormOpen(!isAddFormOpen)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
          title={isAddFormOpen ? "סגור טופס הוספה" : "פתח טופס הוספת משתתף"}
        >
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <div className="bg-brand-100 text-brand-600 p-1 rounded-full"><Plus size={16} /></div>
            הוספת משתתף חדש
          </div>
          {isAddFormOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
        </button>

        {isAddFormOpen && (
          <div className="p-6 border-t border-slate-100 animate-in slide-in-from-top-2">
            <form onSubmit={handleAdd} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">שם מלא</label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                      placeholder="לדוגמה: ישראל ישראלי"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">טלפון</label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                      placeholder="05X-XXXXXXX"
                      dir="ltr"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">תפקיד</label>
                        <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as Role)}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                        >
                        <option value={Role.VOLUNTEER}>{RoleLabel[Role.VOLUNTEER]}</option>
                        <option value={Role.MEMBER}>{RoleLabel[Role.MEMBER]}</option>
                        <option value={Role.GUEST}>{RoleLabel[Role.GUEST]}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">דירוג</label>
                        <select
                        value={newRank}
                        onChange={(e) => setNewRank(Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                        >
                        {[1, 2, 3, 4, 5].map((r) => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                        </select>
                    </div>
                  </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">הערות</label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                  rows={1}
                  placeholder="הערות רפואיות או כלליות..."
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <h4 className="font-semibold text-sm text-slate-700 mb-3">הגדרות מתקדמות (אופציונלי)</h4>
                  <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">סירה מועדפת</label>
                        <select
                        value={newPreferredBoat}
                        onChange={(e) => setNewPreferredBoat(e.target.value as BoatType | '')}
                        className="w-full md:w-1/2 px-3 py-2 border rounded-md bg-white text-sm"
                        >
                        <option value="">ללא העדפה</option>
                        {Object.entries(BoatTypeLabel).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                        </select>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                             <label className="block text-xs font-medium text-slate-500">שותפים מועדפים ({newPreferredPartners.length})</label>
                             {newPreferredPartners.length > 0 && (
                                 <button type="button" onClick={() => setNewPreferredPartners([])} className="text-xs text-red-500">נקה הכל</button>
                             )}
                        </div>
                        <div className="border rounded-md max-h-32 overflow-y-auto bg-white divide-y divide-slate-100">
                            {people.map(p => (
                                <label key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-50 cursor-pointer">
                                    <span className="text-sm text-slate-700">
                                      {p.name} <span className="text-xs text-slate-400">({RoleLabel[p.role]})</span>
                                    </span>
                                    <input 
                                        type="checkbox" 
                                        checked={newPreferredPartners.includes(p.id)}
                                        onChange={() => togglePartnerSelectionAdd(p.id)}
                                        className="w-4 h-4 text-brand-600 rounded"
                                    />
                                </label>
                            ))}
                            {people.length === 0 && <div className="p-2 text-xs text-slate-400">אין משתתפים אחרים</div>}
                        </div>
                    </div>
                  </div>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-600 hover:bg-brand-500 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-bold shadow-sm"
              >
                <UserPlus size={20} /> הוסף משתתף
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Mobile Card List View - Redesigned & Compact */}
      <div className="md:hidden space-y-2">
        {people.map((person) => (
          <div key={person.id} className={`rounded-lg shadow-sm border p-3 ${getMobileCardColor(person.role)}`}>
             <div className="flex justify-between items-center mb-1">
               <div className="flex items-center gap-2">
                 <h3 className="font-bold text-slate-800 text-base">{person.name}</h3>
                 <span className="text-xs text-slate-500">({RoleLabel[person.role]})</span>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => setEditingPerson(person)} className="text-slate-400 hover:text-brand-600 p-1">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => removePerson(person.id)} className="text-slate-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
               </div>
             </div>

             <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1">
                  <Star size={12} className={`fill-current ${getRankColor(person.rank)}`} />
                  <span>רמה {person.rank}</span>
                </div>
                {person.phone && (
                  <div className="flex items-center gap-1">
                    <Phone size={12} />
                    <span dir="ltr">{person.phone}</span>
                  </div>
                )}
             </div>
             
             {person.notes && (
                <div className="mt-2 text-xs bg-white/50 p-1.5 rounded text-slate-600 truncate">
                  {person.notes}
                </div>
             )}
          </div>
        ))}
        {people.length === 0 && (
           <div className="text-center py-10 text-slate-400">
             לא נמצאו משתתפים. הוסף חדש באמצעות הטופס למעלה.
           </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3">שם</th>
              <th className="px-6 py-3">תפקיד</th>
              <th className="px-6 py-3">טלפון</th>
              <th className="px-6 py-3">דירוג</th>
              <th className="px-6 py-3">אילוצים</th>
              <th className="px-6 py-3 text-left">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {people.map((person) => (
              <tr key={person.id} className="hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800">
                  {person.name}
                  {person.notes && <div className="text-xs text-slate-400 mt-1">{person.notes}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeStyle(person.role)}`}>
                    {RoleLabel[person.role]}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600" dir="ltr">
                  {person.phone || '-'}
                </td>
                <td className="px-6 py-4 flex items-center gap-1">
                  {Array.from({ length: person.rank }).map((_, i) => (
                    <Star key={i} size={14} className={`fill-current ${getRankColor(person.rank)}`} />
                  ))}
                </td>
                <td className="px-6 py-4 text-xs text-slate-500">
                  {person.constraints?.preferredBoat && (
                     <div className="mb-1">סירה: {BoatTypeLabel[person.constraints.preferredBoat]}</div>
                  )}
                  {person.preferredPartners && person.preferredPartners.length > 0 && (
                     <div>שותפים: {person.preferredPartners.length}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-left">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingPerson(person)}
                      className="text-slate-400 hover:text-brand-500 transition-colors p-2 hover:bg-slate-100 rounded-full"
                      title="ערוך פרטי משתתף"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => removePerson(person.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-slate-100 rounded-full"
                      title="מחק משתתף"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {people.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  לא נמצאו משתתפים. הוסף למעלה.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};