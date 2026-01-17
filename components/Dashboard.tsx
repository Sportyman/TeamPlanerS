
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Role, getRoleLabel, Person, Gender, BoatDefinition, APP_VERSION } from '../types';
import { Trash2, UserPlus, Edit, X, Save, ArrowRight, Database, Ship, Users, Plus, Anchor, Wind, History as HistoryIcon, Camera, Search, Download, Upload, ShipWheel, AlertCircle, Sparkles, LayoutGrid } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type ViewMode = 'MENU' | 'PEOPLE' | 'INVENTORY' | 'SNAPSHOTS';

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
      saveBoatDefinitions 
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
  const currentSettings = clubSettings[activeClub] ? clubSettings[activeClub] : { boatDefinitions: [] };
  const currentSnapshots = snapshots[activeClub] || [];

  const [draftDefs, setDraftDefs] = useState<BoatDefinition[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  
  useEffect(() => {
      setDraftDefs(currentSettings.boatDefinitions);
      setHasChanges(false);
  }, [currentSettings.boatDefinitions, activeClub]);

  const [isAddingBoat, setIsAddingBoat] = useState(false);
  const [newBoatName, setNewBoatName] = useState('');
  const [newBoatCount, setNewBoatCount] = useState(1);
  const [newBoatCapacity, setNewBoatCapacity] = useState(2); 
  const [newBoatStable, setNewBoatStable] = useState(true);
  const [newBoatMinSkippers, setNewBoatMinSkippers] = useState(0);

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

  const resetAddForm = () => {
    setNewName(''); setNewGender(Gender.MALE); setNewPhone(''); setNewNotes('');
    setNewRole(Role.VOLUNTEER); setNewRank(3); setNewIsSkipper(false);
    setIsAddFormOpen(false); 
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    addPerson({
      id: Date.now().toString(),
      name: newName, gender: newGender, phone: newPhone, role: newRole, rank: newRank,
      notes: newNotes, isSkipper: newIsSkipper
    });
    resetAddForm();
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
          message: 'האם לטעון את רשימת גיבורי העל כבסיס נתונים ראשוני? המידע הקיים ב-Firebase יוחלף.',
          type: 'INFO',
          onConfirm: () => {
              loadDemoForActiveClub();
              setConfirmState(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  const handleAddBoat = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newBoatName) return;
      const newDef: BoatDefinition = {
          id: 'boat-' + Date.now(),
          label: newBoatName,
          defaultCount: newBoatCount,
          capacity: newBoatCapacity,
          isStable: newBoatStable,
          minSkippers: newBoatMinSkippers
      };
      setDraftDefs([...draftDefs, newDef]);
      setHasChanges(true);
      setIsAddingBoat(false);
      setNewBoatName('');
  };

  const handleRemoveBoat = (id: string) => {
      setDraftDefs(draftDefs.filter(d => d.id !== id));
      setHasChanges(true);
  };

  const handleSaveInventory = () => {
      saveBoatDefinitions(draftDefs);
      setHasChanges(false);
      alert('הגדרות הציוד נשמרו!');
  };

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case Role.INSTRUCTOR: return 'bg-cyan-100 text-cyan-800';
      case Role.VOLUNTEER: return 'bg-orange-100 text-orange-700';
      case Role.MEMBER: return 'bg-sky-100 text-sky-700';
      case Role.GUEST: return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
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
                  <button onClick={() => setView('SNAPSHOTS')} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all flex flex-col items-center gap-4 group">
                      <div className="bg-purple-50 text-purple-600 p-5 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-all"><HistoryIcon size={32} /></div>
                      <h3 className="font-bold text-lg text-slate-800">קבוצות שמורות</h3>
                  </button>
              </div>

              <div className="mt-16 flex flex-col items-center gap-4">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-widest">תחזוקת מערכת</div>
                  <div className="flex gap-4">
                      <button onClick={handleLoadDemo} className="text-slate-500 hover:text-brand-600 text-sm flex items-center gap-2 px-6 py-2 bg-white border rounded-full shadow-sm transition-all font-bold">
                          <Sparkles size={16} /> טען גיבורי על (נתוני פתיחה)
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

  if (view === 'PEOPLE') {
      return (
        <div className="max-w-4xl mx-auto py-6 px-4 pb-20">
          {/* ROW 1: BACK & IMPORT/EXPORT */}
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
              {/* ROW 2: ACTIONS */}
              <div className="flex justify-between items-center gap-4">
                  <button onClick={() => setIsAddFormOpen(true)} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95">
                      <UserPlus size={24} /> משתתף חדש
                  </button>
                  <button onClick={handleQuickSnapshot} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-2xl flex items-center gap-2 font-black shadow-lg shadow-purple-100 transition-all active:scale-95">
                      <Camera size={22} /> שמור קבוצה
                  </button>
              </div>

              {/* SEARCH & FILTERS */}
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center">
                 <div className="relative flex-1 w-full">
                    <Search className="absolute right-4 top-3 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="חפש לפי שם או תפקיד..." 
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
                      <div className="space-y-2">
                          <h3 className="text-2xl font-black text-slate-800 tracking-tight">נראה שאין עדיין משתתפים בחוג</h3>
                          <p className="text-slate-500 max-w-sm mx-auto">כדי להתחיל בבניית תשתית הנתונים, תוכל להוסיף משתתף ידנית או לטעון את נתוני הפתיחה של גיבורי העל.</p>
                      </div>
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
                                    <th className="p-5 text-sm font-black text-slate-500 hidden md:table-cell uppercase tracking-wider">פרטים נוספים</th>
                                    <th className="p-5 text-sm font-black text-slate-500 text-center uppercase tracking-wider">פעולות</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredClubPeople.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${p.gender === Gender.FEMALE ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {p.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 flex items-center gap-2">
                                                        {p.name}
                                                        {p.isSkipper && <ShipWheel size={16} className="text-blue-600" />}
                                                        {p.tags?.includes('קבוצה לדוגמה') && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">דוגמה</span>}
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5">{getRoleLabel(p.role, p.gender)} • רמה {p.rank}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 hidden md:table-cell">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-[10px] self-start px-2 py-0.5 rounded-full font-bold ${getRoleBadgeStyle(p.role)}`}>{getRoleLabel(p.role, p.gender)}</span>
                                                {p.createdAt && <span className="text-[10px] text-slate-400">הצטרף: {new Date(p.createdAt).toLocaleDateString('he-IL')}</span>}
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex gap-4 justify-center">
                                                <button onClick={() => setEditingPerson(p)} className="p-2 text-slate-400 hover:text-brand-600 transition-colors bg-white border rounded-lg hover:shadow-sm"><Edit size={20} /></button>
                                                <button onClick={() => setConfirmState({ isOpen: true, title: 'מחיקת משתתף', message: `האם למחוק את ${p.name}?`, type: 'DANGER', onConfirm: () => { removePerson(p.id); setConfirmState(prev => ({...prev, isOpen: false})); }})} className="p-2 text-slate-400 hover:text-red-600 transition-colors bg-white border rounded-lg hover:shadow-sm"><Trash2 size={20} /></button>
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
                          <button onClick={editingPerson ? () => setEditingPerson(null) : resetAddForm} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
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
                              <p className="text-xs text-slate-400 mt-2 mr-10 leading-relaxed">משתתף שיכול להוביל סירה לבדו. חשוב לשיבוצים מורכבים בשייט.</p>
                          </div>
                          <div className="flex gap-4 pt-6">
                              <button type="submit" className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-5 rounded-2xl font-black shadow-xl shadow-brand-100 transition-all active:scale-95 text-lg">שמור משתתף</button>
                              <button type="button" onClick={editingPerson ? () => setEditingPerson(null) : resetAddForm} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-8 py-5 rounded-2xl font-black transition-all text-lg">ביטול</button>
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

  // Fallback for snapshots and inventory
  return (
      <div className="max-w-4xl mx-auto py-6 px-4 pb-20">
          <div className="flex justify-between items-center mb-10">
            <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-black transition-colors">
                <ArrowRight size={24} /> חזרה לתפריט
            </button>
          </div>
          {view === 'SNAPSHOTS' && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-3 mb-8">
                      <div className="bg-purple-50 text-purple-600 p-3 rounded-xl"><HistoryIcon size={28} /></div>
                      <h2 className="text-2xl font-black text-slate-800">קבוצות שמורות</h2>
                  </div>
                  <div className="space-y-4">
                      {currentSnapshots.map(snap => (
                          <div key={snap.id} className="p-5 border rounded-2xl flex justify-between items-center hover:bg-slate-50 transition-colors">
                              <div>
                                  <div className="font-bold text-slate-800 text-lg">{snap.name}</div>
                                  <div className="text-xs text-slate-500">{new Date(snap.date).toLocaleDateString('he-IL')} • {snap.people.length} משתתפים</div>
                              </div>
                              <div className="flex gap-3">
                                  <button onClick={() => handleLoadSnapshot(snap.id, snap.name)} className="bg-white border-2 border-slate-100 text-brand-600 hover:bg-brand-50 px-5 py-2.5 rounded-xl text-sm font-black shadow-sm transition-all">טען קבוצה</button>
                                  <button onClick={() => deleteSnapshot(snap.id)} className="text-slate-400 hover:text-red-500 p-2.5 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={20}/></button>
                              </div>
                          </div>
                      ))}
                      {currentSnapshots.length === 0 && <p className="text-center text-slate-400 py-12 italic">אין קבוצות שמורות עדיין.</p>}
                  </div>
              </div>
          )}
          {view === 'INVENTORY' && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-10">
                      <div className="flex items-center gap-3">
                          <div className="bg-orange-50 text-orange-600 p-3 rounded-xl"><Ship size={28} /></div>
                          <h2 className="text-2xl font-black text-slate-800">הגדרות ציוד ומלאי</h2>
                      </div>
                      {hasChanges && (
                          <button onClick={handleSaveInventory} className="bg-brand-600 text-white px-8 py-3 rounded-xl font-black flex items-center gap-2 animate-pulse shadow-xl shadow-brand-100">
                              <Save size={20} /> שמור מלאי
                          </button>
                      )}
                  </div>
                  <div className="space-y-4 mb-10">
                      {draftDefs.map(def => (
                          <div key={def.id} className="p-5 border rounded-2xl flex items-center justify-between bg-slate-50">
                              <div className="flex-1">
                                  <div className="font-bold text-slate-800 text-lg">{def.label}</div>
                                  <div className="flex gap-4 mt-2 text-sm text-slate-500 font-medium">
                                      <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-100"><Users size={14}/> {def.capacity}</span>
                                      <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-100"><Database size={14}/> {def.defaultCount}</span>
                                  </div>
                              </div>
                              <button onClick={() => handleRemoveBoat(def.id)} className="text-slate-400 hover:text-red-500 p-3 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={22} /></button>
                          </div>
                      ))}
                  </div>

                  {!isAddingBoat ? (
                    <button onClick={() => setIsAddingBoat(true)} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-all font-black flex items-center justify-center gap-3">
                        <Plus size={24} /> הוסף סוג כלי שיט חדש
                    </button>
                  ) : (
                    <form onSubmit={handleAddBoat} className="bg-white p-8 rounded-3xl border-2 border-brand-100 space-y-6 shadow-xl animate-in slide-in-from-bottom-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-black text-slate-700 mb-2">שם הכלי (למשל: סירה מהירה)</label>
                                <input required type="text" className="w-full p-4 border rounded-xl focus:ring-4 focus:ring-brand-500/10 outline-none" value={newBoatName} onChange={e => setNewBoatName(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-slate-700 mb-2">קיבולת</label>
                                <input type="number" min="1" className="w-full p-4 border rounded-xl focus:ring-4 focus:ring-brand-500/10 outline-none" value={newBoatCapacity} onChange={e => setNewBoatCapacity(Number(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-slate-700 mb-2">מלאי קבוע</label>
                                <input type="number" min="0" className="w-full p-4 border rounded-xl focus:ring-4 focus:ring-brand-500/10 outline-none" value={newBoatCount} onChange={e => setNewBoatCount(Number(e.target.value))} />
                            </div>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <button type="submit" className="flex-1 bg-brand-600 text-white py-4 rounded-xl font-black text-lg">הוסף למלאי</button>
                            <button type="button" onClick={() => setIsAddingBoat(false)} className="bg-slate-100 px-8 py-4 rounded-xl font-black text-lg">ביטול</button>
                        </div>
                    </form>
                  )}
              </div>
          )}
      </div>
  );
};
