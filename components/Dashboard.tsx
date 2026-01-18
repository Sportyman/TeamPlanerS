import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Role, getRoleLabel, Person, Gender, GenderLabel, BoatDefinition, GenderPrefType, GenderPrefLabels, ConstraintStrength, APP_VERSION } from '../types';
import { Trash2, UserPlus, Star, Edit, X, Save, ArrowRight, Tag, Database, Ship, Users, Calendar, Plus, Anchor, Wind, Users2, ShieldAlert, AlertOctagon, Heart, Ban, Shield, ShipWheel, Download, Upload } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

type ViewMode = 'MENU' | 'PEOPLE' | 'INVENTORY';

const PHONE_REGEX = /^05\d-?\d{7}$/;

// Extracted Component to prevent scroll jumping
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
        // Scroll slightly to ensure keyboard doesn't hide input on mobile
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
             
             {/* Grid Header for Icons - Aligned with list items */}
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

// Smart Input for Numbers (Handles empty string vs 0)
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
            onChange(0); // Underlying value is 0
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
      importClubData,
      clubSettings,
      saveBoatDefinitions 
    } = useAppStore();
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<ViewMode>('MENU');
  
  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'PEOPLE') setView('PEOPLE');
    else if (viewParam === 'INVENTORY') setView('INVENTORY');
    else setView('MENU');
  }, [searchParams]);

  if (!activeClub) {
      return null;
  }

  const currentClubLabel = clubs.find(c => c.id === activeClub)?.label || '';
  const currentSettings = clubSettings[activeClub] ? clubSettings[activeClub] : { boatDefinitions: [] };

  // --- Inventory State (Draft Mode) ---
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

  // --- People State ---
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  
  // Add Form State
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

  // Constraint States (Add Mode)
  const [newGenderPrefType, setNewGenderPrefType] = useState<GenderPrefType>('NONE');
  const [newGenderPrefStrength, setNewGenderPrefStrength] = useState<ConstraintStrength>('PREFER');
  const [newMustPair, setNewMustPair] = useState<string[]>([]);
  const [newPreferPair, setNewPreferPair] = useState<string[]>([]);
  const [newCannotPair, setNewCannotPair] = useState<string[]>([]);

  const clubPeople = people.filter(p => p.clubId === activeClub);
  const boatDefinitions = currentSettings.boatDefinitions;

  // --- Backup / Restore Handlers ---
  const handleExport = () => {
      const dataToSave = {
          version: APP_VERSION,
          date: new Date().toISOString(),
          clubId: activeClub,
          clubLabel: currentClubLabel,
          people: people.filter(p => p.clubId === activeClub),
          settings: clubSettings[activeClub],
          session: sessions[activeClub]
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

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if(!confirm('שחזור מגיבוי ימחק את כל המשתתפים וההגדרות הנוכחיים של חוג זה ויחליף אותם בנתונים מהקובץ. האם להמשיך?')) {
          e.target.value = ''; // Reset input
          return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              importClubData(json);
              alert('הנתונים שוחזרו בהצלחה!');
              window.location.reload(); // Reload to ensure clean state
          } catch (err) {
              console.error(err);
              alert('שגיאה בטעינת הקובץ. ודא שזהו קובץ JSON תקין של המערכת.');
          }
      };
      reader.readAsText(file);
      e.target.value = ''; // Reset input for next time
  };

  // --- People Handlers ---
  const formatPhoneNumber = (value: string) => {
      // 1. Remove all non-digits
      const digits = value.replace(/\D/g, '');
      
      // 2. Limit to 10 digits
      const truncated = digits.slice(0, 10);
      
      // 3. Add Hyphen after 3rd digit
      if (truncated.length > 3) {
          return `${truncated.slice(0, 3)}-${truncated.slice(3)}`;
      }
      return truncated;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
      const formatted = formatPhoneNumber(e.target.value);
      setter(formatted);
      if (formatted.length === 11) { // 05X-XXXXXXX is 11 chars
           setPhoneError('');
      }
  };

  const validatePhone = (phone: string) => {
      if (!phone) return true; // Optional
      if (!PHONE_REGEX.test(phone)) {
          return false;
      }
      return true;
  };

  const resetAddForm = () => {
    setNewName('');
    setNewGender(Gender.MALE);
    setNewPhone('');
    setNewNotes('');
    setNewRole(Role.VOLUNTEER);
    setNewRank(3);
    setNewTags([]);
    setNewIsSkipper(false);
    setTagInput('');
    setPhoneError('');
    setNewPreferredBoat('');
    setNewGenderPrefType('NONE');
    setNewGenderPrefStrength('PREFER');
    setNewMustPair([]);
    setNewPreferPair([]);
    setNewCannotPair([]);
    setIsAddFormOpen(false); 
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    if (newPhone && !validatePhone(newPhone)) {
        setPhoneError('מספר טלפון לא תקין. פורמט רצוי: 05X-XXXXXXX');
        return;
    }

    addPerson({
      id: Date.now().toString(),
      name: newName,
      gender: newGender,
      phone: newPhone,
      role: newRole,
      rank: newRank,
      notes: newNotes,
      tags: newTags,
      isSkipper: newIsSkipper,
      preferredBoatType: newPreferredBoat || undefined,
      genderConstraint: { type: newGenderPrefType, strength: newGenderPrefStrength },
      mustPairWith: newMustPair,
      preferPairWith: newPreferPair,
      cannotPairWith: newCannotPair
    });
    
    resetAddForm();
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
      if (editingPerson.phone && !validatePhone(editingPerson.phone)) {
          setPhoneError('מספר טלפון לא תקין. פורמט רצוי: 05X-XXXXXXX');
          return;
      }

      updatePerson(editingPerson);
      setEditingPerson(null);
      setPhoneError('');
    }
  };

  // --- Relationship Manager Logic ---
  const toggleRelationship = (targetId: string, type: 'MUST' | 'PREFER' | 'CANNOT', isEditMode: boolean) => {
      if (isEditMode && editingPerson) {
          let must = editingPerson.mustPairWith || [];
          let prefer = editingPerson.preferPairWith || [];
          let cannot = editingPerson.cannotPairWith || [];

          // Clean existing for this person
          must = must.filter(id => id !== targetId);
          prefer = prefer.filter(id => id !== targetId);
          cannot = cannot.filter(id => id !== targetId);

          // Add to new
          if (type === 'MUST') must.push(targetId);
          if (type === 'PREFER') prefer.push(targetId);
          if (type === 'CANNOT') cannot.push(targetId);

          setEditingPerson({ ...editingPerson, mustPairWith: must, preferPairWith: prefer, cannotPairWith: cannot });
      } else {
          // Add Mode
          let must = newMustPair.filter(id => id !== targetId);
          let prefer = newPreferPair.filter(id => id !== targetId);
          let cannot = newCannotPair.filter(id => id !== targetId);

          if (type === 'MUST') must.push(targetId);
          if (type === 'PREFER') prefer.push(targetId);
          if (type === 'CANNOT') cannot.push(targetId);

          setNewMustPair(must);
          setNewPreferPair(prefer);
          setNewCannotPair(cannot);
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

  const handleAddBoatDraft = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newBoatName) return;
      
      const newBoat: BoatDefinition = {
          id: `custom-${Date.now()}`,
          label: newBoatName,
          defaultCount: newBoatCount,
          isStable: newBoatStable,
          capacity: newBoatCapacity,
          minSkippers: newBoatMinSkippers
      };
      
      setDraftDefs([...draftDefs, newBoat]);
      setHasChanges(true);

      setNewBoatName('');
      setNewBoatCount(1);
      setNewBoatCapacity(2);
      setNewBoatStable(true);
      setNewBoatMinSkippers(0);
      setIsAddingBoat(false);
  };

  const handleDeleteBoatDraft = (id: string) => {
      if (confirm('האם למחוק כלי שיט זה? (לחץ על "שמור שינויים" בסיום לאישור סופי)')) {
          setDraftDefs(draftDefs.filter(d => d.id !== id));
          setHasChanges(true);
      }
  };

  const handleUpdateBoatDraft = (id: string, field: keyof BoatDefinition, value: any) => {
      setDraftDefs(draftDefs.map(d => d.id === id ? { ...d, [field]: value } : d));
      setHasChanges(true);
  };

  const handleSaveInventory = () => {
      saveBoatDefinitions(draftDefs);
      setHasChanges(false);
      navigate('/app');
  };

  const handleCancelInventory = () => {
      if(hasChanges && !confirm('יש שינויים שלא נשמרו. האם לבטל ולחזור למצב האחרון?')) {
          return;
      }
      setDraftDefs(currentSettings.boatDefinitions);
      setHasChanges(false);
  };

  const getRankColor = (rank: number) => {
    if (rank <= 2) return 'text-red-500';
    if (rank === 3) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case Role.INSTRUCTOR: return 'bg-cyan-100 text-cyan-800'; // Updated to Cyan
      case Role.VOLUNTEER: return 'bg-orange-100 text-orange-700';
      case Role.MEMBER: return 'bg-sky-100 text-sky-700';
      case Role.GUEST: return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleRestore = () => {
    if(confirm('האם לשחזר נתוני דמו? זה ימחק שינויים מקומיים וייטען מחדש את העמוד.')) { 
        restoreDemoData(); 
        setTimeout(() => window.location.reload(), 500);
    }
  };

  if (view === 'MENU') {
      return (
          <div className="max-w-4xl mx-auto py-8 px-4">
              <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">
                  מרכז ניהול - {currentClubLabel}
              </h1>
              <p className="text-center text-slate-500 mb-8">בחר אפשרות לניהול החוג</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  <button 
                    onClick={() => navigate('/app')}
                    className="col-span-1 md:col-span-2 bg-brand-600 text-white p-6 rounded-2xl shadow-md hover:bg-brand-500 hover:shadow-lg transition-all group flex items-center justify-center gap-4"
                  >
                      <Calendar size={32} className="text-brand-100" />
                      <div className="text-center">
                          <h3 className="font-bold text-xl">מעבר לאימון / שיבוץ</h3>
                          <p className="text-sm text-brand-100 opacity-90">חזרה למסך השיבוץ הראשי</p>
                      </div>
                  </button>

                  <button 
                    onClick={() => navigate('/app/manage?view=PEOPLE')}
                    className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all group flex flex-col items-center gap-4"
                  >
                      <div className="bg-brand-50 text-brand-600 p-4 rounded-full group-hover:scale-110 transition-transform">
                          <Users size={32} />
                      </div>
                      <div className="text-center">
                          <h3 className="font-bold text-lg text-slate-800">ניהול משתתפים</h3>
                          <p className="text-sm text-slate-500 mt-1">עריכת רשימת השמות</p>
                      </div>
                  </button>

                  <button 
                    onClick={() => navigate('/app/manage?view=INVENTORY')}
                    className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-brand-300 transition-all group flex flex-col items-center gap-4"
                  >
                      <div className="bg-orange-50 text-orange-600 p-4 rounded-full group-hover:scale-110 transition-transform">
                          <Ship size={32} />
                      </div>
                      <div className="text-center">
                          <h3 className="font-bold text-lg text-slate-800">ניהול ציוד</h3>
                          <p className="text-sm text-slate-500 mt-1">הגדרת כמויות ושמות</p>
                      </div>
                  </button>

                  <button 
                     onClick={handleRestore}
                     className="col-span-1 md:col-span-2 mt-4 text-slate-400 hover:text-red-500 text-sm flex items-center justify-center gap-2"
                  >
                      <Database size={16} />
                       שחזר נתוני דמו (איפוס מלא)
                  </button>
              </div>
          </div>
      );
  }

  if (view === 'INVENTORY') {
      return (
          <div className="max-w-2xl mx-auto py-6 px-4 pb-24">
              <button onClick={() => navigate('/app/manage')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 mb-6 font-medium">
                  <ArrowRight size={20} /> חזרה לתפריט
              </button>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                     <div className="flex items-center gap-3">
                        <div className="bg-orange-100 text-orange-600 p-2 rounded-lg"><Ship size={24}/></div>
                        <h2 className="text-2xl font-bold text-slate-800">ניהול ציוד ומלאי</h2>
                     </div>
                     <button 
                        onClick={() => setIsAddingBoat(true)}
                        className="bg-brand-600 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-brand-500"
                     >
                         <Plus size={16} /> הוסף כלי שיט
                     </button>
                </div>

                {isAddingBoat && (
                    <form onSubmit={handleAddBoatDraft} className="bg-brand-50 p-4 rounded-lg border border-brand-100 mb-6 animate-in fade-in slide-in-from-top-2">
                        <h3 className="font-bold text-brand-800 mb-3">כלי שיט חדש</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-brand-600 mb-1">שם הכלי</label>
                                <input 
                                    type="text" 
                                    value={newBoatName} 
                                    onChange={e => setNewBoatName(e.target.value)} 
                                    className="w-full px-3 py-2 border rounded-md" 
                                    placeholder="למשל: סאפ, קטמרן..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-600 mb-1">כמות ברירת מחדל</label>
                                <SmartNumberInput 
                                    value={newBoatCount} 
                                    onChange={setNewBoatCount} 
                                    className="w-full px-3 py-2 border rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-600 mb-1">קיבולת נוסעים</label>
                                <SmartNumberInput 
                                    value={newBoatCapacity} 
                                    onChange={setNewBoatCapacity} 
                                    className="w-full px-3 py-2 border rounded-md" 
                                    min={1}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-600 mb-1">מינימום סקיפרים</label>
                                <SmartNumberInput 
                                    value={newBoatMinSkippers} 
                                    onChange={setNewBoatMinSkippers} 
                                    className="w-full px-3 py-2 border rounded-md" 
                                    min={0}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <input 
                                type="checkbox" 
                                id="isStable" 
                                checked={newBoatStable} 
                                onChange={e => setNewBoatStable(e.target.checked)} 
                                className="w-4 h-4 text-brand-600 rounded"
                            />
                            <label htmlFor="isStable" className="text-sm text-brand-700">
                                כלי יציב (מתאים לחברים ברמה נמוכה / זוגות)
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded font-bold text-sm">הוסף לרשימה</button>
                            <button type="button" onClick={() => setIsAddingBoat(false)} className="bg-white border text-slate-600 px-4 py-2 rounded font-bold text-sm">ביטול</button>
                        </div>
                    </form>
                )}
                
                <div className="space-y-4">
                    {draftDefs.map(def => (
                        <div key={def.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                             <div className="flex-1">
                                 <div className="flex items-center gap-2 mb-1">
                                    <input 
                                        type="text" 
                                        value={def.label}
                                        onChange={e => handleUpdateBoatDraft(def.id, 'label', e.target.value)}
                                        className="font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none"
                                    />
                                 </div>
                                 <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                                     <span className={`px-2 py-0.5 rounded-full flex items-center gap-1 border ${def.isStable ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                         {def.isStable ? <Anchor size={12}/> : <Wind size={12}/>}
                                         {def.isStable ? 'יציב' : 'מהיר'}
                                     </span>
                                     <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                         <Users2 size={12}/>
                                         קיבולת: 
                                         <SmartNumberInput 
                                            min={1}
                                            value={def.capacity}
                                            onChange={val => handleUpdateBoatDraft(def.id, 'capacity', val)}
                                            className="w-10 bg-transparent border-b border-dashed border-slate-300 text-center font-bold focus:outline-none"
                                         />
                                     </span>
                                     <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                         <ShipWheel size={12}/>
                                         מינימום סקיפרים: 
                                         <SmartNumberInput 
                                            min={0}
                                            value={def.minSkippers || 0}
                                            onChange={val => handleUpdateBoatDraft(def.id, 'minSkippers', val)}
                                            className="w-10 bg-transparent border-b border-dashed border-slate-300 text-center font-bold focus:outline-none"
                                         />
                                     </span>
                                 </div>
                             </div>

                             <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="flex flex-col items-center flex-1 md:flex-none">
                                    <label className="text-[10px] text-slate-400 font-bold uppercase mb-1">ברירת מחדל</label>
                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <input 
                                            type="range"
                                            min="0"
                                            max="30"
                                            value={def.defaultCount}
                                            onChange={e => handleUpdateBoatDraft(def.id, 'defaultCount', Number(e.target.value))}
                                            className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-600 hidden md:block"
                                        />
                                        <SmartNumberInput 
                                            min={0}
                                            value={def.defaultCount}
                                            onChange={val => handleUpdateBoatDraft(def.id, 'defaultCount', val)}
                                            className="w-16 text-center py-1 border rounded bg-white font-bold"
                                        />
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteBoatDraft(def.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-white rounded-full transition-colors">
                                    <Trash2 size={18}/>
                                </button>
                             </div>
                        </div>
                    ))}
                </div>
              </div>

              {/* FLOATING ACTION BAR FOR SAVE/CANCEL */}
              <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-transform duration-300 ${hasChanges ? 'translate-y-0' : 'translate-y-full'}`}>
                 <div className="max-w-4xl mx-auto flex items-center justify-between">
                     <span className="text-sm font-bold text-slate-500">יש שינויים שלא נשמרו</span>
                     <div className="flex gap-4">
                         <button 
                             onClick={handleCancelInventory}
                             className="text-slate-500 hover:text-slate-800 font-medium px-4 py-2"
                         >
                             בטל שינויים
                         </button>
                         <button 
                             onClick={handleSaveInventory}
                             className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm"
                         >
                             <Save size={18} /> שמור שינויים
                         </button>
                     </div>
                 </div>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-20">
      <button onClick={() => navigate('/app/manage')} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 font-medium px-1">
           <ArrowRight size={20} /> חזרה לתפריט
      </button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-slate-800">רשימת משתתפים ({clubPeople.length})</h2>
          
          <div className="flex gap-2 w-full sm:w-auto">
             {/* Hidden Import Input */}
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
             />
             
             {/* Export/Import Buttons */}
             <button 
                onClick={handleExport}
                className="bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 px-3 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors"
                title="שמור גיבוי לקובץ"
             >
                 <Download size={18} /> <span className="hidden sm:inline">שמור גיבוי</span>
             </button>
             <button 
                onClick={handleImportClick}
                className="bg-white border border-slate-200 text-slate-600 hover:text-brand-600 hover:border-brand-300 px-3 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors"
                title="טען נתונים מקובץ"
             >
                 <Upload size={18} /> <span className="hidden sm:inline">טען גיבוי</span>
             </button>

             <button 
                onClick={() => { setIsAddFormOpen(true); setPhoneError(''); }}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm hover:bg-brand-500 mr-auto sm:mr-0"
             >
                <UserPlus size={20} /> משתתף חדש
             </button>
          </div>
      </div>
      
       <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="text-right p-4 text-sm font-bold text-slate-600">שם מלא</th>
                        <th className="text-right p-4 text-sm font-bold text-slate-600 hidden md:table-cell">תפקיד</th>
                        <th className="text-right p-4 text-sm font-bold text-slate-600 hidden md:table-cell">דירוג</th>
                        <th className="text-right p-4 text-sm font-bold text-slate-600">פעולות</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {clubPeople.map(person => (
                        <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <div className="font-bold text-slate-800">{person.name}</div>
                                    {person.isSkipper && (
                                        <div className="bg-blue-100 text-blue-700 p-1 rounded-full" title="מוסמך כסקיפר">
                                            <ShipWheel size={14} />
                                        </div>
                                    )}
                                </div>
                                {person.phone && (
                                    <div className="text-xs text-slate-500 mt-0.5">{person.phone}</div>
                                )}
                                <div className="text-xs text-slate-400 md:hidden mt-1 flex gap-2">
                                    <span>{getRoleLabel(person.role, person.gender)}</span>
                                    <span>•</span>
                                    <span>רמה {person.rank}</span>
                                </div>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                    {person.tags?.map(tag => (
                                        <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                                            <Tag size={8} /> {tag}
                                        </span>
                                    ))}
                                    {/* Constraint Indicators */}
                                    {person.genderConstraint && person.genderConstraint.type !== 'NONE' && <span className="text-[10px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded border border-pink-100" title="העדפה מגדרית">מגדר</span>}
                                    {(person.mustPairWith?.length || 0) > 0 && <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-100" title="התניות חובה">חובה</span>}
                                    {(person.preferPairWith?.length || 0) > 0 && <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded border border-yellow-100" title="התניות העדפה">העדפה</span>}
                                    {(person.cannotPairWith?.length || 0) > 0 && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100" title="התניות שלילה">שלילה</span>}
                                </div>
                            </td>
                            <td className="p-4 hidden md:table-cell">
                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${getRoleBadgeStyle(person.role)}`}>
                                    {getRoleLabel(person.role, person.gender)}
                                </span>
                            </td>
                            <td className="p-4 hidden md:table-cell">
                                <div className="flex">
                                    {Array.from({ length: person.rank }).map((_, i) => (
                                        <Star key={i} size={14} className={`fill-current ${getRankColor(person.rank)}`} />
                                    ))}
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="flex gap-2">
                                    <button onClick={() => { setEditingPerson(person); setPhoneError(''); }} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => { if(confirm('למחוק?')) removePerson(person.id) }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
       </div>

       {/* ADD MODAL */}
       {isAddFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-lg">הוספת משתתף</h3>
                <button onClick={resetAddForm}><X className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">שם מלא</label>
                        <input required type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full border rounded-lg p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">מין</label>
                        <select value={newGender} onChange={e => setNewGender(e.target.value as Gender)} className="w-full border rounded-lg p-2">
                            <option value={Gender.MALE}>{GenderLabel[Gender.MALE]}</option>
                            <option value={Gender.FEMALE}>{GenderLabel[Gender.FEMALE]}</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">טלפון</label>
                    <input 
                        type="tel" 
                        value={newPhone} 
                        onChange={e => handlePhoneChange(e, setNewPhone)} 
                        className={`w-full border rounded-lg p-2 ${phoneError ? 'border-red-500' : ''}`}
                        placeholder="05X-XXXXXXX"
                        dir="ltr"
                    />
                    {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">תפקיד</label>
                        <select value={newRole} onChange={e => setNewRole(e.target.value as Role)} className="w-full border rounded-lg p-2">
                            {Object.values(Role).map(r => <option key={r} value={r}>{getRoleLabel(r, newGender)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">דירוג (1-5)</label>
                        <input type="number" min="1" max="5" value={newRank} onChange={e => setNewRank(Number(e.target.value))} className="w-full border rounded-lg p-2" />
                    </div>
                </div>

                <div className="flex items-center gap-2 border p-2 rounded-lg bg-blue-50 border-blue-100">
                    <input 
                        type="checkbox" 
                        id="newIsSkipper" 
                        checked={newIsSkipper} 
                        onChange={e => setNewIsSkipper(e.target.checked)} 
                        className="w-5 h-5 text-blue-600 rounded"
                    />
                    <label htmlFor="newIsSkipper" className="text-sm font-bold text-blue-800 flex items-center gap-2">
                         <ShipWheel size={18} /> {newGender === Gender.FEMALE ? 'מוסמכת כסקיפר?' : 'מוסמך כסקיפר?'}
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">כלי שיט מועדף/מחייב</label>
                    <select 
                        value={newPreferredBoat} 
                        onChange={e => setNewPreferredBoat(e.target.value)}
                        className="w-full border rounded-lg p-2"
                    >
                        <option value="">ללא העדפה (הכל מתאים)</option>
                        {boatDefinitions.map(def => (
                            <option key={def.id} value={def.id}>{def.label}</option>
                        ))}
                    </select>
                </div>

                {/* ADVANCED CONSTRAINTS SECTION */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
                     <div className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-800">
                         <AlertOctagon size={16} className="text-brand-600"/> הגדרות שיבוץ מתקדמות
                     </div>
                     <div className="space-y-4">
                         
                         {/* Gender Constraint */}
                         <div className="bg-white p-2 rounded border border-slate-200">
                             <div className="grid grid-cols-2 gap-2">
                                 <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">התניית מין</label>
                                    <select 
                                        value={newGenderPrefType}
                                        onChange={e => setNewGenderPrefType(e.target.value as GenderPrefType)}
                                        className="w-full border rounded p-1.5 text-xs"
                                    >
                                        {Object.entries(GenderPrefLabels).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">רמת חשיבות</label>
                                    <select 
                                        value={newGenderPrefStrength}
                                        onChange={e => setNewGenderPrefStrength(e.target.value as ConstraintStrength)}
                                        className="w-full border rounded p-1.5 text-xs"
                                    >
                                        <option value="NONE">ללא (לא רלוונטי)</option>
                                        <option value="PREFER">העדפה בלבד</option>
                                        <option value="MUST">חובה קריטית</option>
                                    </select>
                                 </div>
                             </div>
                         </div>

                         {/* Relationship Manager */}
                         <RelationshipManager 
                             people={clubPeople}
                             must={newMustPair}
                             prefer={newPreferPair}
                             cannot={newCannotPair}
                             onToggle={(id, type) => toggleRelationship(id, type, false)}
                             onClear={(id) => clearRelationship(id, false)}
                             currentId="" // New person doesn't have ID yet
                         />
                     </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">תגיות (לחץ Enter להוספה)</label>
                    <div className="border rounded-lg p-2 flex flex-wrap gap-2 min-h-[42px]">
                        {newTags.map(tag => (
                            <span key={tag} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                                {tag} <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={12}/></button>
                            </span>
                        ))}
                        <input 
                            type="text" 
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={handleAddTag}
                            className="flex-1 outline-none text-sm min-w-[100px]"
                            placeholder="הקלד תגית..."
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700">שמור משתתף</button>
                    <button type="button" onClick={resetAddForm} className="bg-slate-200 text-slate-700 px-4 py-3 rounded-lg font-bold hover:bg-slate-300">ביטול</button>
                </div>
            </form>
          </div>
        </div>
       )}

       {/* EDIT MODAL */}
       {editingPerson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
             <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-lg">עריכת משתתף</h3>
                <button onClick={() => setEditingPerson(null)}><X className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">שם מלא</label>
                        <input required type="text" value={editingPerson.name} onChange={e => setEditingPerson({...editingPerson, name: e.target.value})} className="w-full border rounded-lg p-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">מין</label>
                        <select value={editingPerson.gender} onChange={e => setEditingPerson({...editingPerson, gender: e.target.value as Gender})} className="w-full border rounded-lg p-2">
                            <option value={Gender.MALE}>{GenderLabel[Gender.MALE]}</option>
                            <option value={Gender.FEMALE}>{GenderLabel[Gender.FEMALE]}</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">טלפון</label>
                    <input 
                        type="tel" 
                        value={editingPerson.phone || ''} 
                        onChange={e => {
                            const formatted = formatPhoneNumber(e.target.value);
                            setEditingPerson({...editingPerson, phone: formatted});
                            if(formatted.length === 11) setPhoneError('');
                        }} 
                        className={`w-full border rounded-lg p-2 ${phoneError ? 'border-red-500' : ''}`}
                        placeholder="05X-XXXXXXX"
                        dir="ltr"
                    />
                     {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                </div>
                
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">תפקיד</label>
                        <select value={editingPerson.role} onChange={e => setEditingPerson({...editingPerson, role: e.target.value as Role})} className="w-full border rounded-lg p-2">
                            {Object.values(Role).map(r => <option key={r} value={r}>{getRoleLabel(r, editingPerson.gender)}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">דירוג (1-5)</label>
                        <input type="number" min="1" max="5" value={editingPerson.rank} onChange={e => setEditingPerson({...editingPerson, rank: Number(e.target.value)})} className="w-full border rounded-lg p-2" />
                    </div>
                </div>

                <div className="flex items-center gap-2 border p-2 rounded-lg bg-blue-50 border-blue-100">
                    <input 
                        type="checkbox" 
                        id="editIsSkipper" 
                        checked={editingPerson.isSkipper || false} 
                        onChange={e => setEditingPerson({...editingPerson, isSkipper: e.target.checked})} 
                        className="w-5 h-5 text-blue-600 rounded"
                    />
                    <label htmlFor="editIsSkipper" className="text-sm font-bold text-blue-800 flex items-center gap-2">
                         <ShipWheel size={18} /> {editingPerson.gender === Gender.FEMALE ? 'מוסמכת כסקיפר?' : 'מוסמך כסקיפר?'}
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">כלי שיט מועדף/מחייב</label>
                    <select 
                        value={editingPerson.preferredBoatType || ''} 
                        onChange={e => setEditingPerson({...editingPerson, preferredBoatType: e.target.value})}
                        className="w-full border rounded-lg p-2"
                    >
                        <option value="">ללא העדפה (הכל מתאים)</option>
                        {boatDefinitions.map(def => (
                            <option key={def.id} value={def.id}>{def.label}</option>
                        ))}
                    </select>
                </div>

                {/* ADVANCED CONSTRAINTS SECTION - EDIT MODE */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-2">
                     <div className="flex items-center gap-2 mb-2 text-sm font-bold text-slate-800">
                         <AlertOctagon size={16} className="text-brand-600"/> הגדרות שיבוץ מתקדמות
                     </div>
                     <div className="space-y-4">
                         
                         {/* Gender Constraint */}
                         <div className="bg-white p-2 rounded border border-slate-200">
                             <div className="grid grid-cols-2 gap-2">
                                 <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">התניית מין</label>
                                    <select 
                                        value={editingPerson.genderConstraint?.type || 'NONE'}
                                        onChange={e => setEditingPerson({...editingPerson, genderConstraint: { ...(editingPerson.genderConstraint || { strength: 'PREFER' }), type: e.target.value as GenderPrefType }})}
                                        className="w-full border rounded p-1.5 text-xs"
                                    >
                                        {Object.entries(GenderPrefLabels).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">רמת חשיבות</label>
                                    <select 
                                        value={editingPerson.genderConstraint?.strength || 'NONE'}
                                        onChange={e => setEditingPerson({...editingPerson, genderConstraint: { ...(editingPerson.genderConstraint || { type: 'NONE' }), strength: e.target.value as ConstraintStrength }})}
                                        className="w-full border rounded p-1.5 text-xs"
                                    >
                                        <option value="NONE">ללא (לא רלוונטי)</option>
                                        <option value="PREFER">העדפה בלבד</option>
                                        <option value="MUST">חובה קריטית</option>
                                    </select>
                                 </div>
                             </div>
                         </div>

                         {/* Relationship Manager */}
                         <RelationshipManager 
                             people={clubPeople}
                             must={editingPerson.mustPairWith || []}
                             prefer={editingPerson.preferPairWith || []}
                             cannot={editingPerson.cannotPairWith || []}
                             onToggle={(id, type) => toggleRelationship(id, type, true)}
                             onClear={(id) => clearRelationship(id, true)}
                             currentId={editingPerson.id} 
                         />
                     </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">תגיות (לחץ Enter להוספה)</label>
                    <div className="border rounded-lg p-2 flex flex-wrap gap-2 min-h-[42px]">
                        {editingPerson.tags?.map(tag => (
                            <span key={tag} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                                {tag} <button type="button" onClick={() => removeTagEdit(tag)} className="hover:text-red-500"><X size={12}/></button>
                            </span>
                        ))}
                        <input 
                            type="text" 
                            value={tagInput}
                            onChange={e => setTagInput(e.target.value)}
                            onKeyDown={handleAddTagEdit}
                            className="flex-1 outline-none text-sm min-w-[100px]"
                            placeholder="הקלד תגית..."
                        />
                    </div>
                </div>
                
                <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700">עדכן פרטים</button>
                    <button type="button" onClick={() => setEditingPerson(null)} className="bg-slate-200 text-slate-700 px-4 py-3 rounded-lg font-bold hover:bg-slate-300">ביטול</button>
                </div>
            </form>
          </div>
        </div>
       )}
    </div>
  );
};