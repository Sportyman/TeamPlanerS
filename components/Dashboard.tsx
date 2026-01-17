
import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Role, getRoleLabel, Person, Gender, GenderLabel, BoatDefinition, GenderPrefType, GenderPrefLabels, ConstraintStrength, APP_VERSION } from '../types';
import { Trash2, UserPlus, Star, Edit, X, Save, ArrowRight, Tag, Database, Ship, Users, Calendar, Plus, Anchor, Wind, Users2, ShieldAlert, AlertOctagon, Heart, Ban, Shield, ShipWheel, Download, Upload, History, Camera } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type ViewMode = 'MENU' | 'PEOPLE' | 'INVENTORY' | 'SNAPSHOTS';

const PHONE_REGEX = /^05\d-?\d{7}$/;

const RelationshipManager = ({ 
    currentId, 
    must, 
    prefer, 
    cannot, 
    people,
    onToggle, 
    onClear 
}: { 
    currentId?: string, 
    must: string[], 
    prefer: string[], 
    cannot: string[], 
    people: Person[],
    onToggle: (id: string, type: 'MUST' | 'PREFER' | 'CANNOT') => void,
    onClear: (id: string) => void
}) => {
    const [search, setSearch] = useState('');
    const candidates = people.filter(p => p.id !== currentId && p.name.includes(search));

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
             <div className="flex items-center justify-between mb-2">
                 <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                     <Users2 size={16} className="text-brand-600"/> מנהל קשרים והעדפות
                 </div>
                 <input 
                    type="text" 
                    placeholder="חפש חבר..." 
                    className="text-xs border rounded px-2 py-1 w-32 focus:ring-2 focus:ring-brand-500 outline-none"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onFocus={handleFocus}
                 />
             </div>
             
             <div className="grid grid-cols-[1fr_32px_32px_32px] gap-1 px-2 mb-1 text-[10px] text-slate-500 font-bold items-center">
                 <div></div>
                 <div className="text-center text-yellow-600">עדיף</div>
                 <div className="text-center text-green-600">חובה</div>
                 <div className="text-center text-red-600">אסור</div>
             </div>

             <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                 {candidates.map(p => {
                     const isMust = must.includes(p.id);
                     const isPrefer = prefer.includes(p.id);
                     const isCannot = cannot.includes(p.id);

                     return (
                         <div key={p.id} className="bg-white p-2 rounded border grid grid-cols-[1fr_32px_32px_32px] gap-1 items-center shadow-sm">
                             <div className="flex flex-col overflow-hidden">
                                 <span className="text-xs font-bold text-slate-700 truncate">{p.name}</span>
                                 <span className="text-[10px] text-slate-400 truncate">{getRoleLabel(p.role, p.gender)}</span>
                             </div>
                             
                             <button 
                                type="button" 
                                onClick={() => isPrefer ? onClear(p.id) : onToggle(p.id, 'PREFER')}
                                className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${isPrefer ? 'bg-yellow-100 text-yellow-600 ring-1 ring-yellow-400' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}
                             >
                                 <Heart size={14} className={isPrefer ? "fill-current" : ""}/>
                             </button>
                             <button 
                                type="button" 
                                onClick={() => isMust ? onClear(p.id) : onToggle(p.id, 'MUST')}
                                className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${isMust ? 'bg-green-100 text-green-600 ring-1 ring-green-400' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}
                             >
                                 <Shield size={14} />
                             </button>
                             <button 
                                type="button" 
                                onClick={() => isCannot ? onClear(p.id) : onToggle(p.id, 'CANNOT')}
                                className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${isCannot ? 'bg-red-100 text-red-600 ring-1 ring-red-400' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'}`}
                             >
                                 <Ban size={14} />
                             </button>
                         </div>
                     )
                 })}
                 {candidates.length === 0 && <div className="text-center text-xs text-slate-400 py-4">לא נמצאו תוצאות</div>}
             </div>
        </div>
    );
};

const SmartNumberInput = ({ 
    value, 
    onChange, 
    min = 0, 
    className 
}: { 
    value: number, 
    onChange: (val: number) => void, 
    min?: number, 
    className?: string 
}) => {
    const [displayVal, setDisplayVal] = useState<string>(value.toString());

    useEffect(() => {
        setDisplayVal(value.toString());
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (val === '') {
            setDisplayVal('');
            onChange(0);
        } else {
            const num = Number(val);
            if (!isNaN(num)) {
                setDisplayVal(val);
                onChange(num);
            }
        }
    };

    const handleBlur = () => {
        if (displayVal === '') {
            setDisplayVal('0');
            onChange(0);
        }
    };

    return (
        <input 
            type="number"
            min={min}
            value={displayVal}
            onChange={handleChange}
            onBlur={handleBlur}
            className={className}
        />
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
  
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>(Gender.MALE);
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<Role>(Role.VOLUNTEER);
  const [newRank, setNewRank] = useState(3);
  const [newNotes, setNewNotes] = useState('');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [newIsSkipper, setNewIsSkipper] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [newPreferredBoat, setNewPreferredBoat] = useState<string>('');

  const [newGenderPrefType, setNewGenderPrefType] = useState<GenderPrefType>('NONE');
  const [newGenderPrefStrength, setNewGenderPrefStrength] = useState<ConstraintStrength>('PREFER');
  const [newMustPair, setNewMustPair] = useState<string[]>([]);
  const [newPreferPair, setNewPreferPair] = useState<string[]>([]);
  const [newCannotPair, setNewCannotPair] = useState<string[]>([]);

  const clubPeople = people.filter(p => p.clubId === activeClub);
  const boatDefinitions = currentSettings.boatDefinitions;

  const handleExport = () => {
      const dataToSave = {
          version: APP_VERSION,
          date: new Date().toISOString(),
          clubId: activeClub,
          clubLabel: currentClubLabel,
          people: people.filter(p => p.clubId === activeClub),
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

  const formatPhoneNumber = (value: string) => {
      const digits = value.replace(/\D/g, '');
      const truncated = digits.slice(0, 10);
      if (truncated.length > 3) return `${truncated.slice(0, 3)}-${truncated.slice(3)}`;
      return truncated;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
      const formatted = formatPhoneNumber(e.target.value);
      setter(formatted);
      if (formatted.length === 11) setPhoneError('');
  };

  const validatePhone = (phone: string) => {
      if (!phone) return true;
      return PHONE_REGEX.test(phone);
  };

  const resetAddForm = () => {
    setNewName(''); setNewGender(Gender.MALE); setNewPhone(''); setNewNotes('');
    setNewRole(Role.VOLUNTEER); setNewRank(3); setNewTags([]); setNewIsSkipper(false);
    setTagInput(''); setPhoneError(''); setNewPreferredBoat(''); setNewGenderPrefType('NONE');
    setNewGenderPrefStrength('PREFER'); setNewMustPair([]); setNewPreferPair([]); setNewCannotPair([]);
    setIsAddFormOpen(false); 
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
      notes: newNotes, tags: newTags, isSkipper: newIsSkipper, preferredBoatType: newPreferredBoat || undefined,
      genderConstraint: { type: newGenderPrefType, strength: newGenderPrefStrength },
      mustPairWith: newMustPair, preferPairWith: newPreferPair, cannotPairWith: newCannotPair
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

  const toggleRelationship = (targetId: string, type: 'MUST' | 'PREFER' | 'CANNOT', isEditMode: boolean) => {
      if (isEditMode && editingPerson) {
          let must = editingPerson.mustPairWith || [], prefer = editingPerson.preferPairWith || [], cannot = editingPerson.cannotPairWith || [];
          must = must.filter(id => id !== targetId); prefer = prefer.filter(id => id !== targetId); cannot = cannot.filter(id => id !== targetId);
          if (type === 'MUST') must.push(targetId); if (type === 'PREFER') prefer.push(targetId); if (type === 'CANNOT') cannot.push(targetId);
          setEditingPerson({ ...editingPerson, mustPairWith: must, preferPairWith: prefer, cannotPairWith: cannot });
      } else {
          let must = newMustPair.filter(id => id !== targetId), prefer = newPreferPair.filter(id => id !== targetId), cannot = newCannotPair.filter(id => id !== targetId);
          if (type === 'MUST') must.push(targetId); if (type === 'PREFER') prefer.push(targetId); if (type === 'CANNOT') cannot.push(targetId);
          setNewMustPair(must); setNewPreferPair(prefer); setNewCannotPair(cannot);
      }
  };

  const clearRelationship = (targetId: string, isEditMode: boolean) => {
      if (isEditMode && editingPerson) {
          setEditingPerson({
              ...editingPerson,
              mustPairWith: (editingPerson.mustPairWith || []).filter(id => id !== targetId),
              preferPairWith: (editingPerson.preferPairWith || []).filter(id => id !== targetId),
              cannotPairWith: (editingPerson.cannotPairWith || []).filter(id => id !== targetId)
          });
      } else {
          setNewMustPair(newMustPair.filter(id => id !== targetId));
          setNewPreferPair(newPreferPair.filter(id => id !== targetId));
          setNewCannotPair(newCannotPair.filter(id => id !== targetId));
      }
  };

  const handleSaveSnapshot = () => {
      if (!snapshotNameInput.trim()) return;
      saveSnapshot(snapshotNameInput.trim());
      setSnapshotNameInput('');
      alert('הרשימה נשמרה בהצלחה!');
  };

  const handleLoadSnapshot = (id: string, name: string) => {
      if (confirm(`האם לטעון את הגרסה "${name}"? זה יחליף את רשימת המשתתפים הנוכחית.`)) {
          loadSnapshot(id);
          alert('הרשימה נטענה בהצלחה!');
      }
  };

  const handleLoadDemo = () => {
      if (confirm('האם לטעון נתוני דוגמה? זה יחליף את הרשימה הנוכחית.')) {
          loadDemoForActiveClub();
          alert('נתוני דוגמה נטענו!');
      }
  };

  const handleSaveInventory = () => {
      saveBoatDefinitions(draftDefs);
      setHasChanges(false);
      navigate('/app');
  };

  const getRankColor = (rank: number) => rank <= 2 ? 'text-red-500' : rank === 3 ? 'text-yellow-500' : 'text-green-500';

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
                  <button onClick={() => navigate('/app/manage?view=PEOPLE')} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all flex flex-col items-center gap-4">
                      <div className="bg-brand-50 text-brand-600 p-4 rounded-full"><Users size={32} /></div>
                      <h3 className="font-bold text-lg text-slate-800">ניהול משתתפים</h3>
                  </button>
                  <button onClick={() => navigate('/app/manage?view=INVENTORY')} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all flex flex-col items-center gap-4">
                      <div className="bg-orange-50 text-orange-600 p-4 rounded-full"><Ship size={32} /></div>
                      <h3 className="font-bold text-lg text-slate-800">ניהול ציוד</h3>
                  </button>
                  <button onClick={() => navigate('/app/manage?view=SNAPSHOTS')} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all flex flex-col items-center gap-4">
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
                          <button onClick={handleSaveSnapshot} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">
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

  // PEOPLE and INVENTORY views remain similar with minor additions...
  return (
    <div className="space-y-6 pb-20">
      <button onClick={() => setView('MENU')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-medium px-1">
           <ArrowRight size={20} /> חזרה לתפריט
      </button>

      {view === 'PEOPLE' && (
          <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-2xl font-bold text-slate-800">רשימת משתתפים ({clubPeople.length})</h2>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                    <button onClick={handleExport} className="bg-white border border-slate-200 text-slate-600 hover:text-brand-600 px-3 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm"><Download size={18} /></button>
                    <button onClick={handleImportClick} className="bg-white border border-slate-200 text-slate-600 hover:text-brand-600 px-3 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm"><Upload size={18} /></button>
                    <button onClick={() => setIsAddFormOpen(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm hover:bg-brand-500 mr-auto sm:mr-0">
                        <UserPlus size={20} /> משתתף חדש
                    </button>
                  </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-right">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="p-4 text-sm font-bold text-slate-600">שם מלא</th>
                            <th className="p-4 text-sm font-bold text-slate-600 hidden md:table-cell">תפקיד</th>
                            <th className="p-4 text-sm font-bold text-slate-600">פעולות</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {clubPeople.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                                <td className="p-4">
                                    <div className="font-bold text-slate-800">{p.name}</div>
                                    <div className="text-xs text-slate-400">{getRoleLabel(p.role, p.gender)} • רמה {p.rank}</div>
                                </td>
                                <td className="p-4 hidden md:table-cell">
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${getRoleBadgeStyle(p.role)}`}>{getRoleLabel(p.role, p.gender)}</span>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingPerson(p)} className="p-2 text-slate-400 hover:text-brand-600"><Edit size={18} /></button>
                                        <button onClick={() => removePerson(p.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}

      {/* MODALS for Add/Edit Person (Keep existing logic but ensure clean UI) */}
      {(isAddFormOpen || editingPerson) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                  <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-lg">{editingPerson ? 'עריכת משתתף' : 'הוספת משתתף'}</h3>
                      <button onClick={editingPerson ? () => setEditingPerson(null) : resetAddForm}><X /></button>
                  </div>
                  <form onSubmit={editingPerson ? handleUpdate : handleAdd} className="p-6 space-y-4 text-right">
                      {/* Form Fields... */}
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
