
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Role, getRoleLabel, Person, Gender, GenderLabel, BoatDefinition, GenderPrefType, GenderPrefLabels, ConstraintStrength, APP_VERSION } from '../types';
import { Trash2, UserPlus, Star, Edit, X, Save, ArrowRight, Tag, Database, Ship, Users, Calendar, Plus, Anchor, Wind, Users2, ShieldAlert, AlertOctagon, Heart, Ban, Shield, ShipWheel, Download, Upload, History, Camera, Search, AlertTriangle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type ViewMode = 'MENU' | 'PEOPLE' | 'INVENTORY' | 'SNAPSHOTS';

const PHONE_REGEX = /^05\d-?\d{7}$/;

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
  const [snapshotNameInput, setSnapshotNameInput] = useState('');
  const [peopleSearch, setPeopleSearch] = useState('');
  
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>(Gender.MALE);
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Role>(Role.VOLUNTEER);
  const [newRank, setNewRank] = useState(3);
  const [newNotes, setNewNotes] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newIsSkipper, setNewIsSkipper] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [newPreferredBoat, setNewPreferredBoat] = useState<string>('');

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
      if(!confirm('שחזור מגיבוי ימחק את כל המשתתפים וההגדרות הנוכחיים של חוג זה ויחליף אותם בנתונים מהקובץ. האם להמשיך?')) {
          e.target.value = '';
          return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              importClubData(json);
              alert('הנתונים שוחזרו בהצלחה!');
              window.location.reload();
          } catch (err) {
              alert('שגיאה בטעינת הקובץ.');
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const validatePhone = (phone: string) => {
      if (!phone) return true;
      return PHONE_REGEX.test(phone);
  };

  const resetAddForm = () => {
    setNewName(''); setNewGender(Gender.MALE); setNewPhone(''); setNewNotes('');
    setNewRole(Role.VOLUNTEER); setNewRank(3); setNewTags([]); setNewIsSkipper(false);
    setPhoneError(''); setNewPreferredBoat(''); setIsAddFormOpen(false); 
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    if (newPhone && !validatePhone(newPhone)) {
        setPhoneError('מספר טלפון לא תקין.');
        return;
    }
    addPerson({
      id: Date.now().toString(),
      name: newName, gender: newGender, phone: newPhone, role: newRole, rank: newRank,
      notes: newNotes, tags: newTags, isSkipper: newIsSkipper, preferredBoatType: newPreferredBoat || undefined
    });
    resetAddForm();
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPerson) {
      if (editingPerson.phone && !validatePhone(editingPerson.phone)) {
          setPhoneError('מספר טלפון לא תקין.');
          return;
      }
      updatePerson(editingPerson);
      setEditingPerson(null);
    }
  };

  const handleClearAll = () => {
      if (confirm('זהירות: האם אתה בטוח שברצונך למחוק את כל רשימת המשתתפים של המועדון? פעולה זו אינה הפיכה (אלא אם שמרת גרסה).')) {
          if (confirm('אישור סופי: מחק את כולם?')) {
              clearClubPeople();
              alert('הרשימה נוקתה.');
          }
      }
  };

  const handleQuickSnapshot = () => {
      const name = prompt('תן שם לרשימה השמורה (למשל: יוני 2024)', `רשימה מתאריך ${new Date().toLocaleDateString('he-IL')}`);
      if (name && name.trim()) {
          saveSnapshot(name.trim());
          alert('הרשימה נשמרה בהצלחה!');
      }
  };

  const handleLoadSnapshot = (id: string, name: string) => {
      if (confirm(`האם לטעון את הגרסה "${name}"? זה יחליף את רשימת המשתתפים הנוכחית.`)) {
          loadSnapshot(id);
          alert('הרשימה נטענה בהצלחה!');
          navigate('/app/manage?view=PEOPLE');
      }
  };

  const handleLoadDemo = () => {
      if (confirm('האם לטעון נתוני דוגמה? זה יחליף את הרשימה הנוכחית.')) {
          loadDemoForActiveClub();
          alert('נתוני דוגמה נטענו!');
      }
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
              <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">מרכז ניהול - {currentClubLabel}</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto mt-8">
                  <button onClick={() => setView('PEOPLE')} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all flex flex-col items-center gap-4">
                      <div className="bg-brand-50 text-brand-600 p-4 rounded-full"><Users size={32} /></div>
                      <h3 className="font-bold text-lg text-slate-800">ניהול משתתפים</h3>
                  </button>
                  <button onClick={() => setView('INVENTORY')} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all flex flex-col items-center gap-4">
                      <div className="bg-orange-50 text-orange-600 p-4 rounded-full"><Ship size={32} /></div>
                      <h3 className="font-bold text-lg text-slate-800">ניהול ציוד</h3>
                  </button>
                  <button onClick={() => setView('SNAPSHOTS')} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all flex flex-col items-center gap-4">
                      <div className="bg-purple-50 text-purple-600 p-4 rounded-full"><History size={32} /></div>
                      <h3 className="font-bold text-lg text-slate-800">גרסאות שמורות</h3>
                  </button>
              </div>
              <div className="mt-12 flex justify-center gap-4">
                  <button onClick={handleLoadDemo} className="text-slate-400 hover:text-brand-600 text-sm flex items-center gap-2 px-4 py-2 border rounded-full">
                      <Database size={16} /> טען נתוני דוגמה
                  </button>
                  <button onClick={() => restoreDemoData()} className="text-slate-400 hover:text-red-500 text-sm flex items-center gap-2 px-4 py-2 border rounded-full">
                      <Trash2 size={16} /> איפוס כללי
                  </button>
              </div>
          </div>
      );
  }

  if (view === 'SNAPSHOTS') {
      return (
          <div className="max-w-4xl mx-auto py-6 px-4 pb-24">
              <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 mb-6 font-medium">
                  <ArrowRight size={20} /> חזרה לתפריט
              </button>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                      <History className="text-purple-600" /> שמירת גרסאות של רשימת המשתתפים
                  </h2>
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-8">
                      <h3 className="font-bold text-purple-900 mb-2">שמור את הרשימה הנוכחית</h3>
                      <p className="text-sm text-purple-700 mb-4">תוכל לשמור את מצב המשתתפים הנוכחי כ"גרסה" ולחזור אליה בעתיד (למשל סוף עונה, תקופת קיץ וכו').</p>
                      <div className="flex gap-2">
                          <input 
                            type="text" 
                            className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="שם לגרסה (למשל: יוני 2024)"
                            value={snapshotNameInput}
                            onChange={e => setSnapshotNameInput(e.target.value)}
                          />
                          <button onClick={() => { if(snapshotNameInput.trim()) { saveSnapshot(snapshotNameInput.trim()); setSnapshotNameInput(''); alert('נשמר!'); } }} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">
                              <Camera size={18} /> שמור גרסה
                          </button>
                      </div>
                  </div>
                  <div className="space-y-4">
                      <h3 className="font-bold text-slate-700">גרסאות קודמות ({currentSnapshots.length})</h3>
                      {currentSnapshots.map(snap => (
                          <div key={snap.id} className="p-4 border rounded-lg flex justify-between items-center hover:bg-slate-50 transition-colors">
                              <div>
                                  <div className="font-bold text-slate-800">{snap.name}</div>
                                  <div className="text-xs text-slate-500">{new Date(snap.date).toLocaleDateString('he-IL')} • {snap.people.length} משתתפים</div>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => handleLoadSnapshot(snap.id, snap.name)} className="bg-white border text-brand-600 hover:bg-brand-50 px-4 py-2 rounded-lg text-sm font-bold">טען רשימה זו</button>
                                  <button onClick={() => deleteSnapshot(snap.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={18}/></button>
                              </div>
                          </div>
                      ))}
                      {currentSnapshots.length === 0 && <p className="text-center text-slate-400 py-8 italic">אין גרסאות שמורות עדיין.</p>}
                  </div>
              </div>
          </div>
      );
  }

  if (view === 'INVENTORY') {
      return (
          <div className="max-w-4xl mx-auto py-6 px-4 pb-24">
              <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 mb-6 font-medium">
                  <ArrowRight size={20} /> חזרה לתפריט
              </button>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                          <Ship className="text-orange-600" /> הגדרות ציוד ומלאי
                      </h2>
                      {hasChanges && (
                          <button onClick={handleSaveInventory} className="bg-brand-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 animate-pulse">
                              <Save size={18} /> שמור שינויים
                          </button>
                      )}
                  </div>

                  <div className="space-y-4 mb-8">
                      {draftDefs.map(def => (
                          <div key={def.id} className="p-4 border rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
                              <div className="flex-1">
                                  <div className="font-bold text-slate-800 text-lg">{def.label}</div>
                                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-500">
                                      <span className="flex items-center gap-1"><Users size={14}/> קיבולת: {def.capacity}</span>
                                      <span className="flex items-center gap-1"><Database size={14}/> מלאי קבוע: {def.defaultCount}</span>
                                      <span className="flex items-center gap-1">{def.isStable ? <Anchor size={14}/> : <Wind size={14}/>} {def.isStable ? 'יציב' : 'מהיר'}</span>
                                      {def.minSkippers ? <span className="flex items-center gap-1 text-blue-600 font-bold"><ShipWheel size={14}/> נדרש סקיפר</span> : null}
                                  </div>
                              </div>
                              <button onClick={() => handleRemoveBoat(def.id)} className="text-slate-400 hover:text-red-500 p-2 self-end md:self-center">
                                  <Trash2 size={20} />
                              </button>
                          </div>
                      ))}
                      {draftDefs.length === 0 && <p className="text-center text-slate-400 py-8">לא הוגדר ציוד עדיין.</p>}
                  </div>

                  {!isAddingBoat ? (
                      <button onClick={() => setIsAddingBoat(true)} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:border-brand-300 hover:text-brand-600 transition-all font-bold flex items-center justify-center gap-2">
                          <Plus size={20} /> הוסף סוג כלי שיט חדש
                      </button>
                  ) : (
                      <form onSubmit={handleAddBoat} className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4 animate-in slide-in-from-bottom-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="col-span-1 md:col-span-2">
                                  <label className="block text-sm font-bold mb-1">שם הכלי (למשל: קיאק זוגי צהוב)</label>
                                  <input required type="text" className="w-full p-2 border rounded-lg" value={newBoatName} onChange={e => setNewBoatName(e.target.value)} />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold mb-1">קיבולת משתתפים בסירה</label>
                                  <input type="number" min="1" className="w-full p-2 border rounded-lg" value={newBoatCapacity} onChange={e => setNewBoatCapacity(Number(e.target.value))} />
                              </div>
                              <div>
                                  <label className="block text-sm font-bold mb-1">מלאי קבוע (כמה יש במועדון?)</label>
                                  <input type="number" min="0" className="w-full p-2 border rounded-lg" value={newBoatCount} onChange={e => setNewBoatCount(Number(e.target.value))} />
                              </div>
                              <div className="flex items-center gap-6 py-2">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" checked={newBoatStable} onChange={e => setNewBoatStable(e.target.checked)} className="w-5 h-5 accent-brand-600" />
                                      <span className="text-sm font-bold">כלי שיט יציב</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" checked={newBoatMinSkippers > 0} onChange={e => setNewBoatMinSkippers(e.target.checked ? 1 : 0)} className="w-5 h-5 accent-brand-600" />
                                      <span className="text-sm font-bold">חובת סקיפר</span>
                                  </label>
                              </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                              <button type="submit" className="flex-1 bg-brand-600 text-white py-2 rounded-lg font-bold">הוסף לרשימה</button>
                              <button type="button" onClick={() => setIsAddingBoat(false)} className="bg-slate-200 px-4 py-2 rounded-lg font-bold">ביטול</button>
                          </div>
                      </form>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-20">
      <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-medium px-1">
           <ArrowRight size={20} /> חזרה לתפריט
      </button>

      <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">רשימת משתתפים ({clubPeople.length})</h2>
                <div className="flex gap-4 mt-2">
                    <button onClick={handleQuickSnapshot} className="text-xs text-purple-600 flex items-center gap-1 hover:underline"><Camera size={14}/> שמור גרסה (Snapshot)</button>
                    <button onClick={handleClearAll} className="text-xs text-red-500 flex items-center gap-1 hover:underline"><Trash2 size={14}/> נקה את כל הרשימה</button>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                <button onClick={handleExport} className="bg-white border border-slate-200 text-slate-600 hover:text-brand-600 px-3 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm"><Download size={18} /></button>
                <button onClick={handleImportClick} className="bg-white border border-slate-200 text-slate-600 hover:text-brand-600 px-3 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm"><Upload size={18} /></button>
                <button onClick={() => setIsAddFormOpen(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm hover:bg-brand-500 mr-auto sm:mr-0">
                    <UserPlus size={20} /> משתתף חדש
                </button>
              </div>
          </div>

          <div className="relative mb-4">
              <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="חפש משתתף ברשימה..." 
                className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                value={peopleSearch}
                onChange={e => setPeopleSearch(e.target.value)}
              />
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-right">
                <thead className="bg-slate-50 border-b">
                    <tr>
                        <th className="p-4 text-sm font-bold text-slate-600">שם מלא</th>
                        <th className="p-4 text-sm font-bold text-slate-600 hidden md:table-cell text-center">תפקיד</th>
                        <th className="p-4 text-sm font-bold text-slate-600 text-center">פעולות</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {filteredClubPeople.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                            <td className="p-4">
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                    {p.name}
                                    {p.isSkipper && <ShipWheel size={14} className="text-blue-600" title="סקיפר" />}
                                </div>
                                <div className="text-xs text-slate-400">{getRoleLabel(p.role, p.gender)} • רמה {p.rank}</div>
                            </td>
                            <td className="p-4 hidden md:table-cell text-center">
                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${getRoleBadgeStyle(p.role)}`}>{getRoleLabel(p.role, p.gender)}</span>
                            </td>
                            <td className="p-4">
                                <div className="flex gap-4 justify-center">
                                    <button onClick={() => setEditingPerson(p)} className="p-2 text-slate-400 hover:text-brand-600"><Edit size={18} /></button>
                                    <button onClick={() => removePerson(p.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filteredClubPeople.length === 0 && (
                        <tr>
                            <td colSpan={3} className="p-12 text-center text-slate-400 italic">לא נמצאו משתתפים תואמים לחיפוש.</td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
      </div>

      {(isAddFormOpen || editingPerson) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                  <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-lg">{editingPerson ? 'עריכת משתתף' : 'הוספת משתתף'}</h3>
                      <button onClick={editingPerson ? () => setEditingPerson(null) : resetAddForm}><X /></button>
                  </div>
                  <form onSubmit={editingPerson ? handleUpdate : handleAdd} className="p-6 space-y-4 text-right">
                      <div>
                          <label className="block text-sm font-bold mb-1">שם מלא</label>
                          <input required type="text" className="w-full border rounded-lg p-2" value={editingPerson ? editingPerson.name : newName} onChange={e => editingPerson ? setEditingPerson({...editingPerson, name: e.target.value}) : setNewName(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">תפקיד</label>
                            <select className="w-full border rounded-lg p-2" value={editingPerson ? editingPerson.role : newRole} onChange={e => editingPerson ? setEditingPerson({...editingPerson, role: e.target.value as Role}) : setNewRole(e.target.value as Role)}>
                                {Object.values(Role).map(r => <option key={r} value={r}>{getRoleLabel(r, Gender.MALE)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">דירוג (1-5)</label>
                            <input type="number" min="1" max="5" className="w-full border rounded-lg p-2" value={editingPerson ? editingPerson.rank : newRank} onChange={e => editingPerson ? setEditingPerson({...editingPerson, rank: Number(e.target.value)}) : setNewRank(Number(e.target.value))} />
                        </div>
                      </div>
                      <div>
                          <label className="block text-sm font-bold mb-1 flex items-center gap-2">
                             <input type="checkbox" checked={editingPerson ? editingPerson.isSkipper : newIsSkipper} onChange={e => editingPerson ? setEditingPerson({...editingPerson, isSkipper: e.target.checked}) : setNewIsSkipper(e.target.checked)} className="w-4 h-4" />
                             סקיפר (מוסמך להוביל סירה)
                          </label>
                      </div>
                      <div className="flex gap-2 pt-4">
                          <button type="submit" className="flex-1 bg-brand-600 text-white py-3 rounded-lg font-bold">שמור</button>
                          <button type="button" onClick={editingPerson ? () => setEditingPerson(null) : resetAddForm} className="bg-slate-200 px-4 py-3 rounded-lg font-bold">ביטול</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
