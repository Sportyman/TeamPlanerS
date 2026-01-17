
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Role, getRoleLabel, Person, Gender, BoatDefinition, APP_VERSION, RoleColor, RoleColorClasses, Participant, ClubMembership } from '../types';
import { Trash2, UserPlus, Edit, X, Save, ArrowRight, Database, Ship, Users, Plus, Anchor, Wind, History as HistoryIcon, Camera, Search, Download, Upload, ShipWheel, AlertCircle, Sparkles, LayoutGrid, Palette, Globe, ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type ViewMode = 'MENU' | 'PEOPLE' | 'INVENTORY' | 'SNAPSHOTS' | 'SETTINGS' | 'ORGANIZATION';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, type = 'DANGER' }: { 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void; 
    onCancel: () => void;
    type?: 'DANGER' | 'INFO' 
}) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-300">
                <div className="p-6 text-center">
                    <div className={`mx-auto w-16 h-16 flex items-center justify-center rounded-full mb-4 ${type === 'DANGER' ? 'bg-red-100 text-red-600' : 'bg-brand-100 text-brand-600'}`}>
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{message}</p>
                </div>
                <div className="flex border-t">
                    <button onClick={onCancel} className="flex-1 py-4 text-slate-600 font-bold hover:bg-slate-50 transition-colors border-l">
                        ביטול
                    </button>
                    <button onClick={onConfirm} className={`flex-1 py-4 font-black transition-colors ${type === 'DANGER' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-brand-600 text-white hover:bg-brand-700'}`}>
                        אישור
                    </button>
                </div>
            </div>
        </div>
    );
};

export const Dashboard: React.FC = () => {
  const { 
      people, 
      activeClub,
      sessions,
      clubs, 
      addPerson, 
      updatePerson, 
      removePersonFromClub, 
      addExistingToClub,
      clearClubPeople,
      restoreDemoData,
      loadDemoForActiveClub,
      importClubData,
      clubSettings,
      snapshots,
      saveSnapshot,
      loadSnapshot,
      deleteSnapshot,
      saveBoatDefinitions,
      updateRoleColor
    } = useAppStore();
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<ViewMode>('MENU');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'PEOPLE') setView('PEOPLE');
    else if (viewParam === 'INVENTORY') setView('INVENTORY');
    else if (viewParam === 'SNAPSHOTS') setView('SNAPSHOTS');
    else if (viewParam === 'SETTINGS') setView('SETTINGS');
    else if (viewParam === 'ORGANIZATION') setView('ORGANIZATION');
    else setView('MENU');
  }, [searchParams]);

  const [confirmState, setConfirmState] = useState<{ 
      isOpen: boolean; 
      title: string; 
      message: string; 
      onConfirm: () => void;
      type: 'DANGER' | 'INFO'
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'DANGER' });

  if (!activeClub) return null;

  const currentClubLabel = clubs.find(c => c.id === activeClub)?.label || '';
  const currentSettings = clubSettings[activeClub] || { boatDefinitions: [], roleColors: {} as any };
  
  const [draftDefs, setDraftDefs] = useState<BoatDefinition[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
      setDraftDefs(currentSettings.boatDefinitions);
      setHasChanges(false);
  }, [currentSettings.boatDefinitions, activeClub]);

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [peopleSearch, setPeopleSearch] = useState('');
  
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>(Gender.MALE);
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Role>(Role.VOLUNTEER);
  const [newRank, setNewRank] = useState(3);
  const [newNotes, setNewNotes] = useState('');
  const [newIsSkipper, setNewIsSkipper] = useState(false);

  // Filter global people to only those who are members of the active club
  const clubParticipants = people.filter(p => p.memberships[activeClub]);
  
  // Transform to flat Person model for components
  const clubPeople: Person[] = clubParticipants.map(p => {
      const m = p.memberships[activeClub]!;
      return {
          ...m, id: p.id, name: p.name, gender: p.gender, phone: p.phone, clubId: activeClub
      };
  });
  
  const filteredClubPeople = clubPeople.filter(p => p.name.includes(peopleSearch));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    addPerson({
      id: Date.now().toString(),
      name: newName, gender: newGender, phone: newPhone, role: newRole, rank: newRank,
      notes: newNotes, isSkipper: newIsSkipper
    });
    setNewName(''); setNewGender(Gender.MALE); setNewPhone(''); setNewNotes('');
    setNewRole(Role.VOLUNTEER); setNewRank(3); setNewIsSkipper(false);
    setIsAddFormOpen(false); 
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPerson) {
      updatePerson(editingPerson);
      setEditingPerson(null);
    }
  };

  const handleSaveInventory = () => {
      saveBoatDefinitions(draftDefs);
      setHasChanges(false);
      alert('הגדרות הציוד נשמרו!');
  };

  if (view === 'MENU') {
      return (
          <div className="max-w-4xl mx-auto py-8 px-4">
              <div className="text-center mb-10">
                <h1 className="text-3xl font-black text-slate-800 mb-2">ניהול - {currentClubLabel}</h1>
                <p className="text-slate-500">הגדרות ארגוניות, מלאי וניהול משתתפים</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  <button onClick={() => setView('PEOPLE')} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all flex flex-col items-center gap-4 group">
                      <div className="bg-brand-50 text-brand-600 p-5 rounded-2xl group-hover:bg-brand-600 group-hover:text-white transition-all"><Users size={32} /></div>
                      <h3 className="font-bold text-lg text-slate-800">ניהול משתתפים</h3>
                  </button>
                  <button onClick={() => setView('INVENTORY')} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all flex flex-col items-center gap-4 group">
                      <div className="bg-orange-50 text-orange-600 p-5 rounded-2xl group-hover:bg-orange-600 group-hover:text-white transition-all"><Ship size={32} /></div>
                      <h3 className="font-bold text-lg text-slate-800">ניהול ציוד</h3>
                  </button>
                  <button onClick={() => setView('ORGANIZATION')} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all flex flex-col items-center gap-4 group">
                      <div className="bg-emerald-50 text-emerald-600 p-5 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all"><Globe size={32} /></div>
                      <h3 className="font-bold text-lg text-slate-800">מאגר ארגוני כללי</h3>
                  </button>
              </div>

              <div className="mt-16 flex flex-col items-center gap-4">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">הגדרות מערכת</div>
                  <div className="flex gap-4">
                      <button onClick={() => setView('SETTINGS')} className="text-slate-500 hover:text-cyan-600 text-sm flex items-center gap-2 px-6 py-2 bg-white border rounded-full shadow-sm transition-all font-bold">
                          <Palette size={16} /> הגדרות מראה
                      </button>
                      <button onClick={() => setView('SNAPSHOTS')} className="text-slate-500 hover:text-purple-600 text-sm flex items-center gap-2 px-6 py-2 bg-white border rounded-full shadow-sm transition-all font-bold">
                          <HistoryIcon size={16} /> קבוצות שמורות
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  if (view === 'ORGANIZATION') {
      const globalPool = people;
      const [orgSearch, setOrgSearch] = useState('');
      const filteredPool = globalPool.filter(p => p.name.includes(orgSearch));

      return (
          <div className="max-w-4xl mx-auto py-8 px-4">
              <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-black mb-8 transition-colors">
                  <ArrowRight size={24} /> חזרה לתפריט
              </button>
              
              <div className="bg-emerald-600 text-white p-8 rounded-3xl shadow-xl mb-10">
                  <div className="flex items-center gap-4 mb-4">
                      <Globe size={40} />
                      <h1 className="text-3xl font-black">מאגר המשתתפים של אתגרים</h1>
                  </div>
                  <p className="opacity-90 max-w-2xl leading-relaxed">כאן תוכל לראות את כל המשתתפים הרשומים בעמותה. אם משתתף כבר רשום במועדון אחר, תוכל לצרף אותו למועדון הנוכחי מבלי להזין את פרטיו מחדש.</p>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8">
                  <div className="relative">
                      <Search className="absolute right-4 top-3 text-slate-400" size={20} />
                      <input 
                        type="text" 
                        placeholder="חפש במאגר הכללי..." 
                        className="w-full pr-12 pl-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        value={orgSearch}
                        onChange={e => setOrgSearch(e.target.value)}
                      />
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPool.map(p => {
                      const isInCurrentClub = p.memberships[activeClub];
                      return (
                          <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-emerald-200 transition-all">
                              <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-black">{p.name.charAt(0)}</div>
                                  <div>
                                      <div className="font-bold text-slate-800">{p.name}</div>
                                      <div className="text-xs text-slate-400">חבר ב-{Object.keys(p.memberships).length} מועדונים</div>
                                  </div>
                              </div>
                              {isInCurrentClub ? (
                                  <div className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                      <Users size={12} /> רשום במועדון
                                  </div>
                              ) : (
                                  <button onClick={() => addExistingToClub(p.id, activeClub, { role: Role.MEMBER, rank: 3 })} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-600 transition-all flex items-center gap-2">
                                      <Plus size={14} /> צרף למועדון
                                  </button>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  }

  // All other views stay logic-consistent by using flattened clubPeople list
  if (view === 'PEOPLE') {
      return (
        <div className="max-w-4xl mx-auto py-6 px-4 pb-20">
          <div className="flex justify-between items-center mb-10">
            <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-black transition-colors">
                <ArrowRight size={24} /> חזרה לתפריט
            </button>
            <div className="flex gap-3">
                <button onClick={() => setIsAddFormOpen(true)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"><UserPlus size={18} /> הוסף חדש</button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-8">
             <div className="relative">
                <Search className="absolute right-4 top-3 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="חפש משתתף במועדון..." 
                  className="w-full pr-12 pl-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  value={peopleSearch}
                  onChange={e => setPeopleSearch(e.target.value)}
                />
             </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-right">
                <thead className="bg-slate-50 border-b">
                    <tr>
                        <th className="p-5 text-sm font-black text-slate-500">משתתף</th>
                        <th className="p-5 text-sm font-black text-slate-500 text-center">פעולות</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {filteredClubPeople.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${RoleColorClasses[currentSettings.roleColors?.[p.role] || 'slate'].bg} ${RoleColorClasses[currentSettings.roleColors?.[p.role] || 'slate'].text}`}>
                                        {p.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{p.name}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{getRoleLabel(p.role, p.gender)}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="p-5">
                                <div className="flex gap-4 justify-center">
                                    <button onClick={() => setEditingPerson(p)} className="p-2 text-slate-400 hover:text-brand-600 transition-colors"><Edit size={20} /></button>
                                    <button onClick={() => setConfirmState({ isOpen: true, title: 'הסרה מהמועדון', message: `האם להסיר את ${p.name} מהמועדון? פרטיו יישמרו במאגר הכללי.`, type: 'DANGER', onConfirm: () => { removePersonFromClub(p.id, activeClub); setConfirmState(prev => ({...prev, isOpen: false})); }})} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={20} /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>

          {(isAddFormOpen || editingPerson) && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in duration-300">
                      <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                          <h3 className="font-black text-2xl text-slate-800">{editingPerson ? 'עריכת משתתף' : 'הוספת משתתף'}</h3>
                          <button onClick={() => { setIsAddFormOpen(false); setEditingPerson(null); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                      </div>
                      <form onSubmit={editingPerson ? handleUpdate : handleAdd} className="p-8 space-y-6 text-right overflow-y-auto">
                          <div>
                              <label className="block text-sm font-black text-slate-700 mb-2">שם מלא</label>
                              <input required type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all" value={editingPerson ? editingPerson.name : newName} onChange={e => editingPerson ? setEditingPerson({...editingPerson, name: e.target.value}) : setNewName(e.target.value)} />
                          </div>
                          <div>
                              <label className="block text-sm font-black text-slate-700 mb-2">טלפון</label>
                              <input type="text" dir="ltr" className="w-full border-2 border-slate-100 rounded-2xl p-4 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none" value={editingPerson ? editingPerson.phone : newPhone} onChange={e => editingPerson ? setEditingPerson({...editingPerson, phone: e.target.value}) : setNewPhone(e.target.value)} />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-black text-slate-700 mb-2">תפקיד</label>
                                <select className="w-full border-2 border-slate-100 rounded-2xl p-4 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none" value={editingPerson ? editingPerson.role : newRole} onChange={e => editingPerson ? setEditingPerson({...editingPerson, role: e.target.value as Role}) : setNewRole(e.target.value as Role)}>
                                    {Object.values(Role).map(r => <option key={r} value={r}>{getRoleLabel(r, Gender.MALE)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-black text-slate-700 mb-2">דירוג (1-5)</label>
                                <input type="number" min="1" max="5" className="w-full border-2 border-slate-100 rounded-2xl p-4 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none" value={editingPerson ? editingPerson.rank : newRank} onChange={e => editingPerson ? setEditingPerson({...editingPerson, rank: Number(e.target.value)}) : setNewRank(Number(e.target.value))} />
                            </div>
                          </div>
                          <div className="flex gap-4 pt-6">
                              <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-5 rounded-2xl font-black shadow-xl transition-all">שמור</button>
                              <button type="button" onClick={() => { setIsAddFormOpen(false); setEditingPerson(null); }} className="bg-slate-100 text-slate-600 px-8 py-5 rounded-2xl font-black transition-all">ביטול</button>
                          </div>
                      </form>
                  </div>
              </div>
          )}

          <ConfirmModal 
            isOpen={confirmState.isOpen} 
            title={confirmState.title} 
            message={confirmState.message} 
            onConfirm={confirmState.onConfirm} 
            onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} 
            type={confirmState.type}
          />
        </div>
      );
  }

  return (
      <div className="max-w-4xl mx-auto py-6 px-4">
          <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-black mb-8 transition-colors">
              <ArrowRight size={24} /> חזרה לתפריט
          </button>
          {/* Snapshots / Inventory logic remains flattened as before for simplicity */}
          <p className="text-center py-20 text-slate-400">הגדרות מתקדמות בחלון זה בגרסת פיתוח.</p>
      </div>
  );
};
