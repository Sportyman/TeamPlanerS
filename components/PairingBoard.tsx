
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Team, Role, getRoleLabel, BoatType, TEAM_COLORS, Person } from '../types';
import { GripVertical, AlertTriangle, ArrowRightLeft, Check, Printer, Share2, Link as LinkIcon, Eye, Send, RotateCcw, RotateCw, Star, Shuffle, X, Plus, Trash2, Search, UserPlus, Lock, ShieldCheck, Heart, UserX, Shield, ShipWheel } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// Pairing Board Component
export const PairingBoard: React.FC = () => {
  const { 
    activeClub,
    sessions, 
    histories, 
    futures,
    people,
    reorderSessionMembers, 
    swapMembers, 
    undo, 
    redo, 
    updateTeamBoatType, 
    runPairing,
    addManualTeam,
    removeTeam,
    addGuestToTeam,
    assignMemberToTeam,
    removeMemberFromTeam,
    clubSettings
  } = useAppStore();
  
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [swapSource, setSwapSource] = useState<{ teamId: string, index: number } | null>(null);

  // Modal State for Adding Members
  const [addMemberModal, setAddMemberModal] = useState<{ isOpen: boolean, teamId: string | null }>({ isOpen: false, teamId: null });
  const [memberSearch, setMemberSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'EXISTING' | 'GUEST'>('EXISTING');
  const [newGuestName, setNewGuestName] = useState('');

  // Animation State for Deletions
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());

  // Fallback for null activeClub
  if (!activeClub) return null;

  const session = sessions[activeClub];
  const history = histories[activeClub];
  const future = futures[activeClub];
  const settings = clubSettings[activeClub] || { boatDefinitions: [] };
  const boatDefinitions = settings.boatDefinitions;

  // Helper map for labels
  const boatLabels: Record<string, string> = {};
  boatDefinitions.forEach(def => {
      boatLabels[def.id] = def.label;
  });

  if (!session) return <div>טוען נתונים...</div>;

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    reorderSessionMembers(
      source.droppableId,
      source.index,
      destination.droppableId,
      destination.index
    );
  };

  const handleSwapClick = (teamId: string, index: number) => {
    if (!swapSource) {
      setSwapSource({ teamId, index });
    } else {
      if (swapSource.teamId === teamId && swapSource.index === index) {
        setSwapSource(null);
        return;
      }
      swapMembers(swapSource.teamId, swapSource.index, teamId, index);
      setSwapSource(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRemix = () => {
    if (confirm('האם אתה בטוח שברצונך לערבב מחדש? השיבוץ הנוכחי יוחלף.')) {
        runPairing();
    }
  };

  const openAddMemberModal = (teamId: string) => {
      setAddMemberModal({ isOpen: true, teamId });
      setMemberSearch('');
      setActiveTab('EXISTING');
      setNewGuestName('');
  };

  const handleAssignExisting = (personId: string) => {
      if (addMemberModal.teamId) {
          assignMemberToTeam(addMemberModal.teamId, personId);
          setAddMemberModal({ isOpen: false, teamId: null });
      }
  };

  const handleAddGuestSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (addMemberModal.teamId && newGuestName.trim()) {
          addGuestToTeam(addMemberModal.teamId, newGuestName.trim());
          setAddMemberModal({ isOpen: false, teamId: null });
      }
  };

  // Helper to handle delete with animation
  const handleDeleteWithAnim = (id: string, action: () => void) => {
      setDeletingItems(prev => new Set(prev).add(id));
      setTimeout(() => {
          action();
          setDeletingItems(prev => {
              const newSet = new Set(prev);
              newSet.delete(id);
              return newSet;
          });
      }, 300); // Wait for animation
  };

  const handleDeleteTeam = (teamId: string, memberCount: number) => {
      if (memberCount > 0) {
          if (!confirm(`בסירה זו יש ${memberCount} משתתפים. האם למחוק אותה בכל זאת? המשתתפים יוסרו מהלוח אך יישארו ברשימת הנוכחות.`)) {
              return;
          }
      }
      handleDeleteWithAnim(teamId, () => removeTeam(teamId));
  };

  const handleRemoveMember = (teamId: string, personId: string) => {
      handleDeleteWithAnim(personId, () => removeMemberFromTeam(teamId, personId));
  };

  const generateShareData = () => {
    const cleanTeams = session.teams.map((t: Team) => ({
      id: t.id,
      boatType: t.boatType,
      members: t.members.map((m: Person) => ({
        name: m.name,
        role: m.role,
        gender: m.gender // Added Gender for correct labeling in public view
      }))
    }));

    const payload = {
      date: new Date().toLocaleDateString('he-IL'),
      labels: boatLabels,
      teams: cleanTeams
    };

    const jsonString = JSON.stringify(payload);
    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
    
    const origin = window.location.origin;
    const shareUrl = `${origin}${window.location.pathname}#/share?data=${encoded}`;
    return shareUrl;
  };

  const handleOpenPublicView = () => {
    const url = generateShareData();
    window.open(url, '_blank');
  };

  const handleMainShareClick = async () => {
    const url = generateShareData();
    const shareData = {
      title: 'שיבוצי אימון',
      text: `היי! הנה שיבוצי האימון לתאריך ${new Date().toLocaleDateString('he-IL')}:`,
      url: url
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return; 
      } catch (err) {
        console.log('User closed share sheet or error:', err);
        if ((err as Error).name !== 'AbortError') {
             setShowShareMenu(true);
        }
      }
    } else {
      setShowShareMenu(true);
    }
  };

  const handleShareWhatsApp = () => {
    const url = generateShareData();
    const text = `היי! הנה שיבוצי האימון להיום: \n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleShareTelegram = () => {
    const url = generateShareData();
    const text = `היי! הנה שיבוצי האימון להיום:`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(text)}`, '_blank');
    setShowShareMenu(false);
  };

  const handleCopyLink = () => {
    const url = generateShareData();
    navigator.clipboard.writeText(url).then(() => {
      alert('הקישור הועתק ללוח!');
      setShowShareMenu(false);
    });
  };

  const getMemberStyle = (role: Role) => {
    switch (role) {
      case Role.INSTRUCTOR: return 'bg-cyan-50 border-cyan-200'; // Cyan for Instructor
      case Role.VOLUNTEER: return 'bg-orange-50 border-orange-200';
      case Role.MEMBER: return 'bg-sky-50 border-sky-200';
      case Role.GUEST: return 'bg-emerald-50 border-emerald-200';
      default: return 'bg-slate-50 border-slate-200';
    }
  };

  const getRankColor = (rank: number) => {
    if (rank <= 2) return 'text-red-500';
    if (rank === 3) return 'text-yellow-500';
    return 'text-green-500';
  };

  // --- Inventory Calculation ---
  const inventoryStatus = boatDefinitions.map(def => {
      const used = session.teams.filter(t => t.boatType === def.id).length;
      const total = session.inventory[def.id] || 0;
      return { ...def, used, total };
  });

  // --- Logic for Add Member Modal ---
  const allClubPeople = people.filter(p => p.clubId === activeClub);
  
  const assignments = new Map<string, string>();
  session.teams.forEach((t, teamIdx) => {
      t.members.forEach(m => {
          assignments.set(m.id, `סירה ${teamIdx + 1}`);
      });
  });

  const filteredPeople = allClubPeople.filter(p => p.name.includes(memberSearch));

  // --- Logic for active constraints ---
  const getActiveConstraintBadges = (member: Person, teamMembers: Person[]) => {
      const badges = [];

      // 1. Must Pair With (Hard)
      if (member.mustPairWith && member.mustPairWith.length > 0) {
          const matchedPartners = teamMembers.filter(m => m.id !== member.id && member.mustPairWith?.includes(m.id));
          if (matchedPartners.length > 0) {
              badges.push({
                  type: 'SUCCESS',
                  label: `צוות עם: ${matchedPartners.map(p => p.name.split(' ')[0]).join(', ')}`,
                  title: `משובץ בהצלחה עם ${matchedPartners.map(p => p.name).join(', ')} (חובה)`,
                  icon: <ShieldCheck size={10} />
              });
          }
      }

      // 2. Prefer Pair With (Soft)
      if (member.preferPairWith && member.preferPairWith.length > 0) {
          const matchedPartners = teamMembers.filter(m => m.id !== member.id && member.preferPairWith?.includes(m.id));
          if (matchedPartners.length > 0) {
              badges.push({
                  type: 'INFO',
                  label: `מועדף עם: ${matchedPartners.map(p => p.name.split(' ')[0]).join(', ')}`,
                  title: `משובץ עם ${matchedPartners.map(p => p.name).join(', ')} (העדפה)`,
                  icon: <Heart size={10} className="fill-current" />
              });
          }
      }

      // 3. Conflicts (Blacklist)
      if (member.cannotPairWith && member.cannotPairWith.length > 0) {
          const conflictPartners = teamMembers.filter(m => m.id !== member.id && member.cannotPairWith?.includes(m.id));
          if (conflictPartners.length > 0) {
              badges.push({
                  type: 'DANGER',
                  label: `התנגשות: ${conflictPartners.map(p => p.name.split(' ')[0]).join(', ')}`,
                  title: `אזהרה: המשתמש חסום לשיבוץ עם ${conflictPartners.map(p => p.name).join(', ')}`,
                  icon: <UserX size={10} />
              });
          }
      }

      // 4. Gender Preference
      if (member.genderConstraint && member.genderConstraint.type !== 'NONE') {
           if (member.genderConstraint.strength === 'MUST') {
                badges.push({
                    type: 'INFO',
                    label: 'חובת מגדר',
                    title: `מוגדרת חובת שיבוץ ${member.genderConstraint.type === 'MALE' ? 'גברים' : 'נשים'} בלבד`,
                    icon: <Shield size={10} />
                });
           }
      }

      return badges;
  };

  return (
    <div className="space-y-6 pb-20"> 
      
      {/* Share Modal */}
      {showShareMenu && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200" onClick={() => setShowShareMenu(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">אפשרויות שיתוף</h3>
                    <button onClick={() => setShowShareMenu(false)} className="text-slate-400 hover:text-slate-700">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-2 space-y-1">
                    <button onClick={handleShareWhatsApp} className="w-full text-right px-4 py-4 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-3 rounded-lg transition-colors">
                        <div className="bg-green-100 p-2 rounded-full text-green-600"><Share2 size={20} /></div>
                        שלח בוואטסאפ
                    </button>
                    <button onClick={handleShareTelegram} className="w-full text-right px-4 py-4 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-3 rounded-lg transition-colors">
                        <div className="bg-sky-100 p-2 rounded-full text-sky-600"><Send size={20} /></div>
                        שלח בטלגרם
                    </button>
                    <button onClick={handleCopyLink} className="w-full text-right px-4 py-4 hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-3 rounded-lg transition-colors">
                        <div className="bg-brand-100 p-2 rounded-full text-brand-600"><LinkIcon size={20} /></div>
                        העתק קישור
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Add Member Modal */}
      {addMemberModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in zoom-in duration-200">
              <div className="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-800">הוספת שייט לסירה</h3>
                      <button onClick={() => setAddMemberModal({ isOpen: false, teamId: null })} className="text-slate-400 hover:text-slate-700 p-1">
                          <X size={24} />
                      </button>
                  </div>

                  <div className="flex border-b border-slate-100">
                      <button 
                          onClick={() => setActiveTab('EXISTING')}
                          className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'EXISTING' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                          בחר מרשימה
                      </button>
                      <button 
                           onClick={() => setActiveTab('GUEST')}
                           className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'GUEST' ? 'text-brand-600 border-b-2 border-brand-600 bg-brand-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                          אורח חדש
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4">
                      {activeTab === 'EXISTING' ? (
                          <div className="space-y-4">
                               <div className="relative">
                                  <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
                                  <input 
                                      type="text" 
                                      placeholder="חפש חבר..." 
                                      value={memberSearch}
                                      onChange={e => setMemberSearch(e.target.value)}
                                      className="w-full pr-10 pl-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                  />
                               </div>
                               <div className="space-y-2">
                                  {filteredPeople.length > 0 ? (
                                      filteredPeople.map(p => {
                                          const assignedTo = assignments.get(p.id);
                                          const isAssigned = !!assignedTo;
                                          return (
                                              <button 
                                                  key={p.id}
                                                  onClick={() => !isAssigned && handleAssignExisting(p.id)}
                                                  disabled={isAssigned}
                                                  className={`w-full text-right p-3 border rounded-lg flex items-center justify-between group transition-colors ${
                                                      isAssigned 
                                                        ? 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60' 
                                                        : 'hover:bg-slate-50 border-slate-100'
                                                  }`}
                                              >
                                                  <div>
                                                      <div className="font-bold text-slate-800 flex items-center gap-1">
                                                          {p.name}
                                                          {p.isSkipper && <ShipWheel size={12} className="text-blue-600" />}
                                                      </div>
                                                      <div className="flex gap-2">
                                                          <span className="text-xs text-slate-500">{getRoleLabel(p.role, p.gender)}</span>
                                                          {isAssigned && (
                                                              <span className="text-xs font-bold text-brand-600 flex items-center gap-1">
                                                                  <Lock size={10} /> {assignedTo}
                                                              </span>
                                                          )}
                                                      </div>
                                                  </div>
                                                  {!isAssigned && (
                                                      <Plus size={18} className="text-slate-300 group-hover:text-brand-600" />
                                                  )}
                                              </button>
                                          );
                                      })
                                  ) : (
                                      <div className="text-center py-8 text-slate-400 text-sm">
                                          לא נמצאו תוצאות.
                                      </div>
                                  )}
                               </div>
                          </div>
                      ) : (
                          <form onSubmit={handleAddGuestSubmit} className="space-y-4 pt-4">
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">שם האורח</label>
                                  <input 
                                      type="text" 
                                      value={newGuestName}
                                      onChange={e => setNewGuestName(e.target.value)}
                                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                      placeholder="הכנס שם מלא"
                                      autoFocus
                                      required
                                  />
                              </div>
                              <button 
                                  type="submit" 
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                              >
                                  <UserPlus size={18} /> הוסף שייט
                              </button>
                          </form>
                      )}
                  </div>
              </div>
          </div>
      )}
      
      {/* INVENTORY STATUS BAR */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-center print:hidden">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">סטטוס מלאי:</span>
          {inventoryStatus.map(stat => {
              const isOverLimit = stat.used > stat.total;
              return (
                  <div key={stat.id} className="flex items-center gap-1.5 text-sm">
                      <span className="text-slate-700 font-medium">{stat.label}:</span>
                      <span className={`font-mono font-bold px-1.5 rounded ${isOverLimit ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                          {stat.used}/{stat.total}
                      </span>
                  </div>
              );
          })}
      </div>

      {/* Screen Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-3">
             <h2 className="text-xl md:text-2xl font-bold text-slate-800">שיבוצי אימון</h2>
             <button 
                onClick={addManualTeam}
                className="bg-brand-600 hover:bg-brand-500 text-white p-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-md transition-all active:scale-95"
                title="הוסף סירה חדשה ריקה"
             >
                 <Plus size={18} /> סירה
             </button>
          </div>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            גרור את הידית (⋮⋮) כדי לשנות סדר, או לחץ על {<ArrowRightLeft className="inline w-3 h-3"/>} להחלפה בין זוגות
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-2 w-full xl:w-auto">
            {swapSource && (
            <div className="bg-brand-100 text-brand-800 px-3 py-1 rounded-full text-xs font-bold animate-pulse flex-1 text-center md:flex-none">
                בחר משתתף שני...
            </div>
            )}
            
            <div className="flex gap-2 w-full md:w-auto">
               <button
                  onClick={handleRemix}
                  className="p-2 rounded-lg border border-slate-200 text-brand-600 hover:bg-brand-50"
                  title="ערבב מחדש"
               >
                 <Shuffle size={18} />
               </button>
               <div className="w-px bg-slate-200 mx-1"></div>
               <button
                  onClick={undo}
                  disabled={!history || history.length === 0}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
               >
                 <RotateCcw size={18} />
               </button>
               <button
                  onClick={redo}
                  disabled={!future || future.length === 0}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
               >
                 <RotateCw size={18} />
               </button>
            </div>
            
            <div className="relative flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
               <button 
                  onClick={handleOpenPublicView}
                  className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                  <Eye size={16} /> מבט נקי
              </button>

               <button 
                  onClick={handleMainShareClick}
                  className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                  <Share2 size={16} /> שיתוף
              </button>

              <button 
                  onClick={handlePrint}
                  className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              >
                  <Printer size={16} /> הדפס
              </button>
            </div>
        </div>
      </div>

      {/* Interactive Board */}
      <div className="print:hidden">
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {session.teams.map((team: Team, index: number) => {
                const isDeleting = deletingItems.has(team.id);
                if (isDeleting) return null;

                const boatDef = boatDefinitions.find(d => d.id === team.boatType);
                const capacity = boatDef?.capacity || 99;
                
                // Calculate warnings
                const isOverCapacity = team.members.length > capacity;
                const minSkippers = boatDef?.minSkippers || 0;
                const currentSkippers = team.members.filter(m => m.isSkipper).length;
                const isMissingSkipper = minSkippers > 0 && currentSkippers < minSkippers;
                
                const hasWarnings = (team.warnings && team.warnings.length > 0) || isOverCapacity || isMissingSkipper;
                const colorClass = TEAM_COLORS[index % TEAM_COLORS.length];
                
                let containerClass = colorClass;
                if (isOverCapacity) containerClass = 'border-red-600 bg-red-100 ring-4 ring-red-200/50 shadow-lg shadow-red-100';
                else if (isMissingSkipper) containerClass = 'border-red-400 bg-red-50 ring-2 ring-red-200';
                else if (hasWarnings) containerClass = 'border-amber-300 bg-amber-50';
                
                const fadeStyle = isDeleting ? { opacity: 0, transform: 'scale(0.9)', transition: 'all 0.3s ease-out' } : {};

                return (
                <div 
                key={team.id}
                style={fadeStyle}
                className={`rounded-xl shadow-sm border-2 flex flex-col overflow-hidden transition-all duration-300 ${containerClass} ${isDeleting ? 'pointer-events-none' : ''}`}
                >
                {/* Header with Boat Selector */}
                <div className="p-3 border-b border-slate-100/50 bg-white/30 flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                        <select
                            value={team.boatType || ''}
                            onChange={(e) => updateTeamBoatType(team.id, e.target.value as BoatType)}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="font-bold text-slate-800 text-lg bg-transparent border-none focus:ring-0 cursor-pointer outline-none hover:text-brand-600 transition-colors max-w-[130px]"
                        >
                            {boatDefinitions.map(def => (
                                <option key={def.id} value={def.id}>{def.label}</option>
                            ))}
                            {!boatDefinitions.find(d => d.id === team.boatType) && team.boatType && (
                                <option value={team.boatType}>{team.boatType}</option>
                            )}
                        </select>
                        {hasWarnings && (
                        <div className="cursor-help group relative">
                          <div className={isOverCapacity || isMissingSkipper ? 'text-red-600 animate-pulse' : 'text-amber-500'}>
                            <AlertTriangle size={20} />
                          </div>
                          <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-white border border-slate-200 text-slate-800 text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                             {isOverCapacity && <div className="text-red-600 font-bold mb-1">חריגה מקיבולת ({team.members.length}/{capacity})</div>}
                             {isMissingSkipper && <div className="text-red-600 font-bold mb-1">חסר סקיפר ({currentSkippers}/{minSkippers})</div>}
                             {team.warnings?.join(', ')}
                          </div>
                        </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => openAddMemberModal(team.id)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-brand-600 p-1.5 rounded-full hover:bg-white/50 transition-colors"
                            title="הוסף שייט"
                        >
                            <UserPlus size={16} />
                        </button>
                        <button 
                            onClick={() => handleDeleteTeam(team.id, team.members.length)}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-red-500 p-1.5 rounded-full hover:bg-white/50 transition-colors"
                            title="מחק סירה"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>

                {hasWarnings && (
                    <div className={`px-3 py-1 text-sm border-b ${isOverCapacity || isMissingSkipper ? 'bg-red-200 text-red-900 border-red-300 font-bold' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                    {isOverCapacity 
                        ? `חריגה מקיבולת (${team.members.length}/${capacity})` 
                        : isMissingSkipper 
                            ? `חסר סקיפר (${currentSkippers}/${minSkippers})`
                            : team.warnings?.join(', ')}
                    </div>
                )}

                <Droppable droppableId={team.id}>
                    {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-3 flex-1 flex flex-col gap-2 min-h-[140px] transition-colors duration-200 ${
                        snapshot.isDraggingOver ? 'bg-white/40' : ''
                        }`}
                    >
                        {team.members.map((member: Person, index: number) => {
                        const isSwappingMe = swapSource?.teamId === team.id && swapSource?.index === index;
                        const constraints = getActiveConstraintBadges(member, team.members);
                        const isMemberDeleting = deletingItems.has(member.id);
                        
                        const memberStyle = isMemberDeleting ? { opacity: 0, transform: 'scale(0.8)', marginBottom: '-40px' } : {};

                        return (
                            <Draggable key={member.id} draggableId={member.id} index={index}>
                            {(provided, snapshot) => {
                                // CRITICAL DND FIX FOR MOBILE:
                                // We separate the Draggable structural container from the Visual container.
                                // 1. Outer div gets the ref and draggableProps. It handles POSITIONING.
                                // 2. Inner div handles STYLING, ROTATION (TILT), and SCALE.
                                // 3. The Drag Handle gets specific touch-action: none to prevent scrolling.
                                // This prevents coordinate conflicts between CSS Transforms and Fixed Positioning.
                                return (
                                <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={{
                                    ...provided.draggableProps.style,
                                    ...memberStyle,
                                    transition: isMemberDeleting ? 'all 0.3s ease-out' : provided.draggableProps.style?.transition
                                }}
                                className={`relative group ${isMemberDeleting ? 'pointer-events-none' : ''}`}
                                onClick={() => swapSource && handleSwapClick(team.id, index)}
                                title={`רמה: ${member.rank}`}
                                >

                                {/* VISUAL INNER CONTAINER */}
                                <div className={`
                                    p-3 rounded-lg border flex items-center justify-between select-none
                                    transition-all duration-200
                                    ${snapshot.isDragging 
                                    ? 'shadow-2xl ring-4 ring-brand-500/30 bg-white opacity-100 scale-105 rotate-3 z-50' 
                                    : 'shadow-sm hover:shadow-md'
                                    }
                                    ${getMemberStyle(member.role)}
                                    ${isSwappingMe ? 'ring-2 ring-brand-500 ring-offset-1' : ''}
                                    ${swapSource && !isSwappingMe ? 'cursor-pointer hover:bg-brand-50' : ''}
                                `}>

                                    <div 
                                        {...provided.dragHandleProps}
                                        className="p-4 -mr-2 ml-2 text-slate-400 hover:text-brand-600 bg-slate-100/50 hover:bg-slate-200/50 rounded-md flex items-center justify-center shrink-0 self-stretch cursor-grab active:cursor-grabbing touch-none"
                                        style={{ touchAction: 'none' }} // Prevents scrolling when touching handle
                                    >
                                        <GripVertical size={24} />
                                    </div>
                                    
                                    <div className="flex-1 flex flex-col px-1">
                                        <div className="flex items-center gap-1">
                                            <span className="font-bold text-slate-900 text-lg leading-tight">{member.name}</span>
                                            {member.isSkipper && (
                                                <div className="text-blue-600 bg-blue-50 rounded-full p-0.5" title="סקיפר">
                                                    <ShipWheel size={14} />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2 mt-1">
                                        <span className="text-sm text-slate-500 uppercase font-medium">{getRoleLabel(member.role, member.gender)}</span>
                                        <div className="flex">
                                            {Array.from({ length: member.rank }).map((_, i) => (
                                            <Star key={i} size={14} className={`fill-current ${getRankColor(member.rank)}`} />
                                            ))}
                                        </div>
                                        </div>

                                        {constraints.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {constraints.map((c, i) => (
                                                    <span 
                                                        key={i} 
                                                        title={c.title}
                                                        className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 border cursor-help ${
                                                        c.type === 'SUCCESS' ? 'bg-green-100 text-green-700 border-green-200' :
                                                        c.type === 'DANGER' ? 'bg-red-100 text-red-700 border-red-200' :
                                                        c.type === 'INFO' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                                        'bg-blue-100 text-blue-700 border-blue-200'
                                                    }`}>
                                                        {c.icon} {c.label}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {member.notes && (
                                        <div className="text-xs text-red-600 truncate mt-1 max-w-[140px]" title={member.notes}>
                                            {member.notes}
                                        </div>
                                        )}
                                    </div>

                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if(confirm(`האם להסיר את ${member.name} מהסירה?`)) {
                                                handleRemoveMember(team.id, member.id);
                                            }
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        className="absolute top-1 left-1 p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-white/80 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                        title="הסר מהסירה"
                                    >
                                        <X size={14} />
                                    </button>

                                    <button 
                                        onClick={(e) => {
                                        e.stopPropagation();
                                        handleSwapClick(team.id, index);
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        className={`
                                        p-2 rounded-md transition-colors z-10
                                        ${isSwappingMe 
                                            ? 'bg-brand-500 text-white' 
                                            : 'text-slate-400 hover:bg-white hover:text-brand-600 hover:shadow-sm opacity-0 group-hover:opacity-100 md:opacity-0 opacity-100'
                                        }
                                        ${swapSource ? 'opacity-100' : ''}
                                        `}
                                    >
                                        {isSwappingMe ? <Check size={18} /> : <ArrowRightLeft size={18} />}
                                    </button>
                                </div> 
                                
                                </div>
                            )}}
                            </Draggable>
                        );
                        })}
                        {provided.placeholder}
                    </div>
                    )}
                </Droppable>
                </div>
            )})}
            </div>
        </DragDropContext>
      </div>

      <div className="hidden print:block space-y-8">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">רשימת שיבוצים לאימון</h1>
            <p className="text-lg text-slate-600 mt-2">{new Date().toLocaleDateString('he-IL')}</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
            {session.teams.map((team: Team, idx: number) => (
                <div key={team.id} className="border-b border-slate-300 pb-2 break-inside-avoid page-break-inside-avoid">
                    <div className="flex items-baseline gap-4 mb-2">
                         <span className="text-xl font-bold">סירה {idx + 1}</span>
                         <span className="text-sm px-2 py-1 bg-slate-100 rounded border">{boatLabels[team.boatType] || team.boatType}</span>
                    </div>
                    <div className="flex gap-4 pr-4">
                        {team.members.map((m: Person) => (
                            <div key={m.id} className="flex items-center gap-1">
                                <span className="text-lg font-medium">{m.name}</span>
                                {m.isSkipper && <ShipWheel size={14} className="text-black" />}
                            </div>
                        ))}
                         {team.members.length === 0 && <span className="text-slate-400 italic">סירה ריקה</span>}
                    </div>
                </div>
            ))}
        </div>
        
        <div className="mt-8 pt-4 border-t border-slate-400 text-center text-sm text-slate-500" dir="ltr">
            Built by Shay Kalimi - @Shay.A.i
        </div>
      </div>
    </div>
  );
};