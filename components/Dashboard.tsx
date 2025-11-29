
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Role, RoleLabel, Person, BoatType, BoatTypeLabel, ClubLabel, Gender, GenderLabel, BoatInventory } from '../types';
import { Trash2, UserPlus, Star, Edit, X, Save, Plus, Phone, Database, Settings, Users, Ship, ArrowRight, Tag } from 'lucide-react';

type ViewMode = 'MENU' | 'PEOPLE' | 'INVENTORY' | 'SETTINGS';

export const Dashboard: React.FC = () => {
  const { 
      people, 
      activeClub, 
      addPerson, 
      updatePerson, 
      removePerson, 
      restoreDemoData,
      defaultInventories,
      updateDefaultInventory
    } = useAppStore();
  
  const [view, setView] = useState<ViewMode>('MENU');

  // Inventory State
  const currentDefaults = activeClub ? defaultInventories[activeClub] : { doubles: 0, singles: 0, privates: 0 };
  const [tempInventory, setTempInventory] = useState<BoatInventory>(currentDefaults);

  // People Management State
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  
  // New Person Form State
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>(Gender.MALE);
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Role>(Role.VOLUNTEER);
  const [newRank, setNewRank] = useState(3);
  const [newNotes, setNewNotes] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState(''); // Temp input for tags

  const clubPeople = people.filter(p => p.clubId === activeClub);

  // Sync temp inventory when club changes or view opens
  React.useEffect(() => {
    if (activeClub) {
        setTempInventory(defaultInventories[activeClub]);
    }
  }, [activeClub, defaultInventories, view]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    addPerson({
      id: Date.now().toString(),
      name: newName,
      gender: newGender,
      phone: newPhone,
      role: newRole,
      rank: newRank,
      notes: newNotes,
      tags: newTags,
    });
    
    // Reset form
    setNewName('');
    setNewGender(Gender.MALE);
    setNewPhone('');
    setNewNotes('');
    setNewRole(Role.VOLUNTEER);
    setNewRank(3);
    setNewTags([]);
    setTagInput('');
    setIsAddFormOpen(false); 
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
        e.preventDefault();
        if (!newTags.includes(tagInput.trim())) {
            setNewTags([...newTags, tagInput.trim()]);
        }
        setTagInput('');
    }
  };

  const handleAddTagEdit = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && tagInput.trim() && editingPerson) {
          e.preventDefault();
          const currentTags = editingPerson.tags || [];
          if (!currentTags.includes(tagInput.trim())) {
              setEditingPerson({ ...editingPerson, tags: [...currentTags, tagInput.trim()]});
          }
          setTagInput('');
      }
  }

  const removeTag = (tagToRemove: string) => {
      setNewTags(newTags.filter(t => t !== tagToRemove));
  };

  const removeTagEdit = (tagToRemove: string) => {
      if (editingPerson) {
          setEditingPerson({
              ...editingPerson,
              tags: (editingPerson.tags || []).filter(t => t !== tagToRemove)
          });
      }
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPerson) {
      updatePerson(editingPerson);
      setEditingPerson(null);
    }
  };

  const saveInventory = () => {
    updateDefaultInventory(tempInventory);
    alert('הגדרות הציוד נשמרו בהצלחה!');
    setView('MENU');
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

  // --- MENU VIEW ---
  if (view === 'MENU') {
      return (
          <div className="max-w-4xl mx-auto py-8 px-4">
              <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">
                  מרכז ניהול - {activeClub ? ClubLabel[activeClub] : ''}
              </h1>
              <p className="text-center text-slate-500 mb-8">בחר אפשרות לניהול החוג</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <button 
                    onClick={() => setView('PEOPLE')}
                    className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all group flex flex-col items-center gap-4"
                  >
                      <div className="bg-brand-50 text-brand-600 p-4 rounded-full group-hover:scale-110 transition-transform">
                          <Users size={40} />
                      </div>
                      <div className="text-center">
                          <h3 className="font-bold text-xl text-slate-800">ניהול משתתפים</h3>
                          <p className="text-sm text-slate-500 mt-1">הוספה, עריכה ומחיקה של חברים ומתנדבים</p>
                      </div>
                  </button>

                  <button 
                    onClick={() => setView('INVENTORY')}
                    className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all group flex flex-col items-center gap-4"
                  >
                      <div className="bg-orange-50 text-orange-600 p-4 rounded-full group-hover:scale-110 transition-transform">
                          <Ship size={40} />
                      </div>
                      <div className="text-center">
                          <h3 className="font-bold text-xl text-slate-800">ניהול ציוד</h3>
                          <p className="text-sm text-slate-500 mt-1">הגדרת מלאי קבוע של כלי שיט</p>
                      </div>
                  </button>

                  <button 
                     onClick={() => { if(confirm('האם לשחזר נתוני דמו? זה ימחק שינויים מקומיים.')) { restoreDemoData(); alert('נתונים שוחזרו!'); } }}
                     className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all group flex flex-col items-center gap-4"
                  >
                      <div className="bg-slate-50 text-slate-600 p-4 rounded-full group-hover:scale-110 transition-transform">
                          <Database size={40} />
                      </div>
                      <div className="text-center">
                          <h3 className="font-bold text-xl text-slate-800">שחזור נתונים</h3>
                          <p className="text-sm text-slate-500 mt-1">טעינת נתוני דוגמה (לפיתוח)</p>
                      </div>
                  </button>
              </div>
          </div>
      );
  }

  // --- INVENTORY VIEW ---
  if (view === 'INVENTORY') {
      return (
          <div className="max-w-2xl mx-auto py-6 px-4">
              <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 mb-6 font-medium">
                  <ArrowRight size={20} /> חזרה לתפריט
              </button>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                     <div className="bg-orange-100 text-orange-600 p-2 rounded-lg"><Ship size={24}/></div>
                     <h2 className="text-2xl font-bold text-slate-800">ניהול מלאי ציוד</h2>
                </div>
                
                <p className="text-sm text-slate-500 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  הכמויות שתגדיר כאן ישמשו כברירת מחדל לכל אימון חדש שייפתח בעתיד.
                </p>

                <div className="space-y-8">
                    <div>
                        <label className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-700 text-lg">קיאק זוגי (2 מושבים)</span>
                            <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-lg font-bold text-xl">{tempInventory.doubles}</span>
                        </label>
                        <input 
                            type="range" min="0" max="20" 
                            value={tempInventory.doubles}
                            onChange={(e) => setTempInventory({ ...tempInventory, doubles: Number(e.target.value) })}
                            className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
                        />
                    </div>
                    <div>
                        <label className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-700 text-lg">קיאק יחיד (מושב 1)</span>
                            <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-lg font-bold text-xl">{tempInventory.singles}</span>
                        </label>
                        <input 
                            type="range" min="0" max="20" 
                            value={tempInventory.singles}
                            onChange={(e) => setTempInventory({ ...tempInventory, singles: Number(e.target.value) })}
                            className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
                        />
                    </div>
                    <div>
                        <label className="flex items-center justify-between mb-2">
                            <span className="font-medium text-slate-700 text-lg">סירות פרטיות</span>
                            <span className="bg-brand-50 text-brand-700 px-3 py-1 rounded-lg font-bold text-xl">{tempInventory.privates}</span>
                        </label>
                        <input 
                            type="range" min="0" max="10" 
                            value={tempInventory.privates}
                            onChange={(e) => setTempInventory({ ...tempInventory, privates: Number(e.target.value) })}
                            className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-600"
                        />
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t flex justify-end gap-3">
                    <button 
                        onClick={() => setView('MENU')}
                        className="px-6 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium"
                    >
                        ביטול
                    </button>
                    <button 
                        onClick={saveInventory}
                        className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm"
                    >
                        <Save size={18} /> שמור שינויים
                    </button>
                </div>
              </div>
          </div>
      );
  }

  // --- PEOPLE VIEW ---
  return (
    <div className="space-y-6 pb-20">
      <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-medium px-1">
           <ArrowRight size={20} /> חזרה לתפריט
      </button>

      <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">רשימת משתתפים ({clubPeople.length})</h2>
          <button 
             onClick={() => setIsAddFormOpen(true)}
             className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm hover:bg-brand-500"
          >
              <UserPlus size={20} /> משתתף חדש
          </button>
      </div>

      {/* Edit Modal */}
      {editingPerson && (
        <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:bg-black/50 bg-white md:bg-transparent">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:w-full md:max-w-lg md:rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="bg-brand-50 p-4 border-b border-brand-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-brand-800">עריכת משתתף</h3>
              <button onClick={() => setEditingPerson(null)} className="text-slate-500 hover:text-slate-800 p-2">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">שם מלא</label>
                  <input
                    type="text"
                    value={editingPerson.name}
                    onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                  />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">מין</label>
                   <select
                        value={editingPerson.gender}
                        onChange={(e) => setEditingPerson({ ...editingPerson, gender: e.target.value as Gender })}
                        className="w-full px-3 py-2 border rounded-md"
                   >
                       <option value={Gender.MALE}>{GenderLabel[Gender.MALE]}</option>
                       <option value={Gender.FEMALE}>{GenderLabel[Gender.FEMALE]}</option>
                   </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">טלפון</label>
                  <input
                    type="tel"
                    value={editingPerson.phone || ''}
                    onChange={(e) => setEditingPerson({ ...editingPerson, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">תפקיד</label>
                  <select
                    value={editingPerson.role}
                    onChange={(e) => setEditingPerson({ ...editingPerson, role: e.target.value as Role })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value={Role.VOLUNTEER}>{RoleLabel[Role.VOLUNTEER]}</option>
                    <option value={Role.MEMBER}>{RoleLabel[Role.MEMBER]}</option>
                    <option value={Role.GUEST}>{RoleLabel[Role.GUEST]}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">דירוג</label>
                  <select
                    value={editingPerson.rank}
                    onChange={(e) => setEditingPerson({ ...editingPerson, rank: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    {[1, 2, 3, 4, 5].map((r) => (<option key={r} value={r}>{r}</option>))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">הערות</label>
                <textarea
                  value={editingPerson.notes || ''}
                  onChange={(e) => setEditingPerson({ ...editingPerson, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                />
              </div>

              {/* Tags Section */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                      <Tag size={14} /> תגיות והתניות (לחץ Enter להוספה)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                      {(editingPerson.tags || []).map(tag => (
                          <span key={tag} className="bg-white text-brand-700 px-2 py-1 rounded-full text-xs border border-brand-100 flex items-center gap-1 shadow-sm">
                              {tag}
                              <button type="button" onClick={() => removeTagEdit(tag)} className="hover:text-red-500"><X size={12}/></button>
                          </span>
                      ))}
                  </div>
                  <input 
                      type="text" 
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleAddTagEdit}
                      placeholder="הקלד תגית ולחץ Enter (למשל: סקיפר, מנוף)"
                      className="w-full px-3 py-2 border rounded-md text-sm"
                  />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-500 text-white py-2 rounded-lg font-bold">שמור</button>
                <button type="button" onClick={() => setEditingPerson(null)} className="px-6 border rounded-lg hover:bg-slate-50">ביטול</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {isAddFormOpen && (
        <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:bg-black/50 bg-white md:bg-transparent">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:w-full md:max-w-lg md:rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in duration-200">
             <div className="bg-brand-50 p-4 border-b border-brand-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-brand-800">הוספת משתתף חדש</h3>
              <button onClick={() => setIsAddFormOpen(false)} className="text-slate-500 hover:text-slate-800 p-2">
                <X size={24} />
              </button>
            </div>
             <form onSubmit={handleAdd} className="p-6 space-y-4 overflow-y-auto flex-1 bg-white">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-600 mb-1">שם מלא</label>
                        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-3 py-2 border rounded-md" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">מין</label>
                        <select value={newGender} onChange={(e) => setNewGender(e.target.value as Gender)} className="w-full px-3 py-2 border rounded-md">
                            <option value={Gender.MALE}>{GenderLabel[Gender.MALE]}</option>
                            <option value={Gender.FEMALE}>{GenderLabel[Gender.FEMALE]}</option>
                        </select>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-600 mb-1">טלפון</label>
                        <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full px-3 py-2 border rounded-md" dir="ltr" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">תפקיד</label>
                        <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)} className="w-full px-3 py-2 border rounded-md">
                        <option value={Role.VOLUNTEER}>{RoleLabel[Role.VOLUNTEER]}</option>
                        <option value={Role.MEMBER}>{RoleLabel[Role.MEMBER]}</option>
                        <option value={Role.GUEST}>{RoleLabel[Role.GUEST]}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">דירוג</label>
                        <select value={newRank} onChange={(e) => setNewRank(Number(e.target.value))} className="w-full px-3 py-2 border rounded-md">
                        {[1, 2, 3, 4, 5].map((r) => (<option key={r} value={r}>{r}</option>))}
                        </select>
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">הערות</label>
                    <textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="w-full px-3 py-2 border rounded-md" rows={1} />
                </div>
                
                 {/* Tags Section */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                        <Tag size={14} /> תגיות (לחץ Enter להוספה)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {newTags.map(tag => (
                            <span key={tag} className="bg-white text-brand-700 px-2 py-1 rounded-full text-xs border border-brand-100 flex items-center gap-1 shadow-sm">
                                {tag}
                                <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={12}/></button>
                            </span>
                        ))}
                    </div>
                    <input 
                        type="text" 
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="הקלד תגית..."
                        className="w-full px-3 py-2 border rounded-md text-sm"
                    />
                </div>

                <button type="submit" className="w-full bg-brand-600 text-white px-4 py-3 rounded-lg font-bold shadow-sm mt-4">הוסף משתתף</button>
             </form>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hidden md:block">
        <table className="w-full text-right">
          <thead className="bg-slate-50 text-slate-600 text-sm uppercase">
            <tr>
              <th className="px-6 py-3">שם</th>
              <th className="px-6 py-3">תפקיד</th>
              <th className="px-6 py-3">טלפון</th>
              <th className="px-6 py-3">תגיות</th>
              <th className="px-6 py-3">דירוג</th>
              <th className="px-6 py-3 text-left">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clubPeople.map((person) => (
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
                <td className="px-6 py-4 text-sm text-slate-600" dir="ltr">{person.phone || '-'}</td>
                <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                        {person.tags?.map(t => (
                            <span key={t} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">{t}</span>
                        ))}
                    </div>
                </td>
                <td className="px-6 py-4 flex items-center gap-1">
                  {Array.from({ length: person.rank }).map((_, i) => (
                    <Star key={i} size={14} className={`fill-current ${getRankColor(person.rank)}`} />
                  ))}
                </td>
                <td className="px-6 py-4 text-left">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingPerson(person)} className="text-slate-400 hover:text-brand-500 p-2 hover:bg-slate-100 rounded-full">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => removePerson(person.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-slate-100 rounded-full">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {clubPeople.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">לא נמצאו משתתפים.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
          {clubPeople.map(person => (
              <div key={person.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                      <div>
                          <div className="font-bold text-slate-800">{person.name}</div>
                          <div className="text-xs text-slate-500">{RoleLabel[person.role]} • {GenderLabel[person.gender]}</div>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => setEditingPerson(person)} className="text-brand-600 bg-brand-50 p-1.5 rounded"><Edit size={16}/></button>
                          <button onClick={() => removePerson(person.id)} className="text-red-600 bg-red-50 p-1.5 rounded"><Trash2 size={16}/></button>
                      </div>
                  </div>
                  {person.tags && person.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2 mb-2">
                          {person.tags.map(t => <span key={t} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{t}</span>)}
                      </div>
                  )}
                  <div className="flex items-center gap-0.5 text-slate-300">
                        {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={12} className={i < person.rank ? `fill-current ${getRankColor(person.rank)}` : ''} />
                        ))}
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};
