
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Role, getRoleLabel, Person, Gender, BoatDefinition, APP_VERSION, RoleColor, RoleColorClasses } from '../types';
import { Trash2, UserPlus, Edit, X, Save, ArrowRight, Database, Ship, Users, Plus, Anchor, Wind, History as HistoryIcon, Camera, Search, Download, Upload, ShipWheel, AlertCircle, Sparkles, LayoutGrid, Palette } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type ViewMode = 'MENU' | 'PEOPLE' | 'INVENTORY' | 'SNAPSHOTS' | 'SETTINGS';

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
      removePerson, 
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
  const currentSnapshots = snapshots[activeClub] || [];

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

  const clubPeople = people.filter(p => p.clubId === activeClub);
  const filteredClubPeople = clubPeople.filter(p => p.name.includes(peopleSearch));

  const handleExport = () => {
      const dataToSave = {
          version: APP_VERSION,
          date: new Date().toISOString(),
          clubId: activeClub,
          clubLabel: currentClubLabel,
          people: clubPeople,
          settings: clubSettings[activeClub],
          session: sessions[activeClub],
          snapshots: snapshots[activeClub] || []
      };
      const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${currentClubLabel.replace(/\s/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setConfirmState({
          isOpen: true,
          title: 'שחזור מגיבוי',
          message: 'שחזור מגיבוי ימחק את כל המשתתפים וההגדרות הנוכחיים של חוג זה. האם להמשיך?',
          type: 'DANGER',
          onConfirm: () => {
              const reader = new FileReader();
              reader.onload = (event) => {
                  try {
                      const json = JSON.parse(event.target?.result as string);
                      importClubData(json);
                      setConfirmState(prev => ({ ...prev, isOpen: false }));
                  } catch (err) {
                      alert('שגיאה בטעינת הקובץ.');
                  }
              };
              reader.readAsText(file);
              e.target.value = '';
          }
      });
  };

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

  const handleClearAll = () => {
      setConfirmState({
          isOpen: true,
          title: 'מחיקת כל המשתתפים',
          message: 'זהירות: האם אתה בטוח שברצונך למחוק את כל רשימת המשתתפים של המועדון? פעולה זו אינה הפיכה.',
          type: 'DANGER',
          onConfirm: () => {
              clearClubPeople();
              setConfirmState(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  const handleQuickSnapshot = () => {
      const name = prompt('תן שם לקבוצה השמורה (למשל: יוני 2024)', `קבוצה מתאריך ${new Date().toLocaleDateString('he-IL')}`);
      if (name && name.trim()) {
          saveSnapshot(name.trim());
          alert('הקבוצה נשמרה בהצלחה!');
      }
  };

  const handleLoadSnapshot = (id: string, name: string) => {
      setConfirmState({
          isOpen: true,
          title: 'טעינת קבוצה',
          message: `האם לטעון את הקבוצה "${name}"? זה יחליף את רשימת המשתתפים הנוכחית.`,
          type: 'INFO',
          onConfirm: () => {
              loadSnapshot(id);
              setConfirmState(prev => ({ ...prev, isOpen: false }));
              navigate('/app/manage?view=PEOPLE');
          }
      });
  };

  const handleLoadDemo = () => {
      setConfirmState({
          isOpen: true,
          title: 'טעינת נתוני פתיחה',
          message: 'האם לטעון את רשימת גיבורי העל המורחבת (20 איש) כבסיס נתונים? המידע הקיים ב-Firebase יוחלף.',
          type: 'INFO',
          onConfirm: () => {
              loadDemoForActiveClub();
              setConfirmState(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  const handleSaveInventory = () => {
      saveBoatDefinitions(draftDefs);
      setHasChanges(false);
      alert('הגדרות הציוד נשמרו!');
  };

  const getRoleBadgeStyle = (role: Role) => {
    const roleColor = currentSettings.roleColors?.[role] || 'slate';
    return RoleColorClasses[roleColor].badge;
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
                  <button onClick={() => setView('SETTINGS')} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all flex flex-col items-center gap-4 group">
                      <div className="bg-cyan-50 text-cyan-600 p-5 rounded-2xl group-hover:bg-cyan-600 group-hover:text-white transition-all"><Palette size={32} /></div>
                      <h3 className="font-bold text-lg text-slate-800">הגדרות מראה</h3>
                  </button>
              </div>

              <div className="mt-16 flex flex-col items-center gap-4">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">תחזוקת מערכת</div>
                  <div className="flex gap-4">
                      <button onClick={handleLoadDemo} className="text-slate-500 hover:text-brand-600 text-sm flex items-center gap-2 px-6 py-2 bg-white border rounded-full shadow-sm transition-all font-bold">
                          <Sparkles size={16} /> טען גיבורי על (20 איש)
                      </button>
                      <button onClick={() => setConfirmState({ isOpen: true, title: 'איפוס כללי', message: 'האם לאפס את כל נתוני המועדון?', type: 'DANGER', onConfirm: () => { restoreDemoData(); setConfirmState(prev => ({...prev, isOpen: false})); }})} className="text-slate-500 hover:text-red-500 text-sm flex items-center gap-2 px-6 py-2 bg-white border rounded-full shadow-sm transition-all font-bold">
                          <Trash2 size={16} /> איפוס מלא
                      </button>
                  </div>
              </div>
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

  if (view === 'SETTINGS') {
      const colors: RoleColor[] = ['cyan', 'orange', 'purple', 'emerald', 'blue', 'indigo', 'pink', 'slate', 'red', 'amber'];
      return (
          <div className="max-w-2xl mx-auto py-8 px-4">
              <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-black mb-8">
                  <ArrowRight size={24} /> חזרה לתפריט
              </button>
              <h1 className="text-3xl font-black text-slate-800 mb-8">הגדרות מראה וצבעים</h1>
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-10">
                  {Object.values(Role).map(role => {
                      const currentColor = currentSettings.roleColors?.[role] || 'slate';
                      return (
                          <div key={role} className="space-y-4">
                              <div className="flex items-center justify-between">
                                  <h3 className="font-black text-xl text-slate-800">צבע עבור: {getRoleLabel(role, Gender.MALE)}</h3>
                                  <span className={`px-4 py-1.5 rounded-full font-black text-sm ${RoleColorClasses[currentColor].badge}`}>תצוגה מקדימה</span>
                              </div>
                              <div className="flex flex-wrap gap-3">
                                  {colors.map(color => (
                                      <button 
                                          key={color} 
                                          onClick={() => updateRoleColor(role, color)}
                                          className={`w-10 h-10 rounded-full border-4 transition-all ${RoleColorClasses[color].bg} ${currentColor === color ? 'border-slate-800 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                          title={color}
                                      />
                                  ))}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  }

  if (view === 'PEOPLE') {
      return (
        <div className="max-w-4xl mx-auto py-6 px-4 pb-20">
          <div className="flex justify-between items-center mb-10">
            <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-black transition-colors">
                <ArrowRight size={24} /> חזרה לתפריט
            </button>
            <div className="flex gap-3">
                <button onClick={handleExport} className="p-3 border rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all" title="ייצוא רשימה"><Download size={22}/></button>
                <button onClick={handleImportClick} className="p-3 border rounded-xl text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all" title="ייבוא רשימה"><Upload size={22}/></button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
            </div>
          </div>

          <div className="space-y-8">
              <div className="flex justify-between items-center gap-4">
                  <button onClick={() => setIsAddFormOpen(true)} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95">
                      <UserPlus size={24} /> משתתף חדש
                  </button>
                  <button onClick={handleQuickSnapshot} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-black shadow-lg shadow-purple-100 transition-all active:scale-95">
                      <Camera size={22} /> שמור קבוצה
                  </button>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                 <div className="relative flex-1 w-full">
                    <Search className="absolute right-4 top-3 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="חפש לפי שם..." 
                      className="w-full pr-12 pl-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                      value={peopleSearch}
                      onChange={e => setPeopleSearch(e.target.value)}
                    />
                 </div>
                 <button onClick={handleClearAll} className="text-sm text-red-500 flex items-center gap-1 hover:underline whitespace-nowrap font-bold px-2"><Trash2 size={16}/> נקה רשימה</button>
              </div>

              {clubPeople.length === 0 ? (
                  <div className="bg-white p-16 rounded-3xl shadow-sm border-2 border-dashed border-slate-200 text-center flex flex-col items-center gap-6 animate-in fade-in zoom-in">
                      <div className="bg-brand-50 p-8 rounded-full text-brand-600">
                          <Users size={64} />
                      </div>
                      <h3 className="text-2xl font-black text-slate-800">נראה שאין עדיין משתתפים בחוג</h3>
                      <button onClick={handleLoadDemo} className="bg-brand-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-brand-700 transition-all flex items-center gap-2">
                          <Sparkles size={24} /> טען נתוני פתיחה
                      </button>
                  </div>
              ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="p-5 text-sm font-black text-slate-500 text-right uppercase tracking-wider">משתתף</th>
                                    <th className="p-5 text-sm font-black text-slate-500 hidden md:table-cell uppercase tracking-wider">פרטים</th>
                                    <th className="p-5 text-sm font-black text-slate-500 text-center uppercase tracking-wider">פעולות</th>
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
                                                    <div className="font-bold text-slate-800 flex items-center gap-2">
                                                        {p.name}
                                                        {p.isSkipper && <ShipWheel size={16} className="text-blue-600" />}
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5">{getRoleLabel(p.role, p.gender)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 hidden md:table-cell">
                                            <span className={`text-[10px] self-start px-2 py-0.5 rounded-full font-bold ${getRoleBadgeStyle(p.role)}`}>{getRoleLabel(p.role, p.gender)}</span>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex gap-4 justify-center">
                                                <button onClick={() => setEditingPerson(p)} className="p-2 text-slate-400 hover:text-brand-600 transition-colors"><Edit size={20} /></button>
                                                <button onClick={() => setConfirmState({ isOpen: true, title: 'מחיקת משתתף', message: `האם למחוק את ${p.name}?`, type: 'DANGER', onConfirm: () => { removePerson(p.id); setConfirmState(prev => ({...prev, isOpen: false})); }})} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={20} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                  </div>
              )}
          </div>
          
          {(isAddFormOpen || editingPerson) && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in duration-300">
                      <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                          <h3 className="font-black text-2xl text-slate-800">{editingPerson ? 'עריכת משתתף' : 'הוספת משתתף'}</h3>
                          <button onClick={editingPerson ? () => setEditingPerson(null) : () => setIsAddFormOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                      </div>
                      <form onSubmit={editingPerson ? handleUpdate : handleAdd} className="p-8 space-y-6 text-right overflow-y-auto">
                          <div>
                              <label className="block text-sm font-black text-slate-700 mb-2">שם מלא</label>
                              <input required type="text" className="w-full border-2 border-slate-100 rounded-2xl p-4 focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all" value={editingPerson ? editingPerson.name : newName} onChange={e => editingPerson ? setEditingPerson({...editingPerson, name: e.target.value}) : setNewName(e.target.value)} />
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
                          <div className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-100">
                              <label className="flex items-center gap-4 cursor-pointer">
                                 <input type="checkbox" checked={editingPerson ? editingPerson.isSkipper : newIsSkipper} onChange={e => editingPerson ? setEditingPerson({...editingPerson, isSkipper: e.target.checked}) : setNewIsSkipper(e.target.checked)} className="w-6 h-6 rounded-lg accent-brand-600" />
                                 <span className="font-black text-slate-800">סקיפר מוסמך</span>
                              </label>
                          </div>
                          <div className="flex gap-4 pt-6">
                              <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-5 rounded-2xl font-black shadow-xl shadow-brand-100 transition-all active:scale-95 text-lg">שמור</button>
                              <button type="button" onClick={editingPerson ? () => setEditingPerson(null) : () => setIsAddFormOpen(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-8 py-5 rounded-2xl font-black transition-all text-lg">ביטול</button>
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

  // Fallback for Snapshots/Inventory (Minimal update)
  return (
      <div className="max-w-4xl mx-auto py-6 px-4 pb-20">
          <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-black mb-8">
              <ArrowRight size={24} /> חזרה לתפריט
          </button>
          {view === 'SNAPSHOTS' && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-black text-slate-800 mb-8">קבוצות שמורות</h2>
                  <div className="space-y-4">
                      {currentSnapshots.map(snap => (
                          <div key={snap.id} className="p-5 border rounded-2xl flex justify-between items-center hover:bg-slate-50">
                              <div><div className="font-bold text-slate-800 text-lg">{snap.name}</div></div>
                              <div className="flex gap-3">
                                  <button onClick={() => handleLoadSnapshot(snap.id, snap.name)} className="bg-white border-2 border-slate-100 text-brand-600 px-5 py-2.5 rounded-xl font-black">טען</button>
                                  <button onClick={() => deleteSnapshot(snap.id)} className="text-slate-400 hover:text-red-500 p-2.5"><Trash2 size={20}/></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
          {view === 'INVENTORY' && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-10">
                      <h2 className="text-2xl font-black text-slate-800">מלאי והגדרות ציוד</h2>
                      {hasChanges && <button onClick={handleSaveInventory} className="bg-brand-600 text-white px-8 py-3 rounded-xl font-black animate-pulse">שמור מלאי</button>}
                  </div>
                  <div className="space-y-4">
                      {draftDefs.map(def => (
                          <div key={def.id} className="p-5 border rounded-2xl flex items-center justify-between bg-slate-50">
                              <div className="font-bold text-slate-800 text-lg">{def.label}</div>
                              <button onClick={() => setDraftDefs(draftDefs.filter(d => d.id !== def.id))} className="text-slate-400 hover:text-red-500"><Trash2 size={22} /></button>
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </div>
  );
};
