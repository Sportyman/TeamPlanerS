
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Team, Role, RoleLabel, BoatType, TEAM_COLORS, Person } from '../types';
import { GripVertical, AlertTriangle, ArrowRightLeft, Check, Printer, Share2, Link as LinkIcon, Eye, Send, RotateCcw, RotateCw, Star, Dices, X, Plus, Trash2, Search, UserPlus, Lock } from 'lucide-react';
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

  const handleDeleteTeam = (teamId: string, memberCount: number) => {
      if (memberCount > 0) {
          if (!confirm(`בסירה זו יש ${memberCount} משתתפים. האם למחוק אותה בכל זאת? המשתתפים יוסרו מהלוח אך יישארו ברשימת הנוכחות.`)) {
              return;
          }
      }
      removeTeam(teamId);
  };

  const handleRemoveMember = (teamId: string, personId: string) => {
      removeMemberFromTeam(teamId, personId);
  };

  const generateShareData = () => {
    const cleanTeams = session.teams.map((t: Team) => ({
      id: t.id,
      boatType: t.boatType,
      members: t.members.map((m: Person) => ({
        name: m.name,
        role: m.role
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

  // --- Logic for Add Member Modal ---
  const allClubPeople = people.filter(p => p.clubId === activeClub);
  
  const assignments = new Map<string, string>();
  session.teams.forEach((t, teamIdx) => {
      t.members.forEach(m => {
          assignments.set(m.id, `סירה ${teamIdx + 1}`);
      });
  });

  const filteredPeople = allClubPeople.filter(p => p.name.includes(memberSearch));

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
                                                      <div className="font-bold text-slate-800">{p.name}</div>
                                                      <div className="flex gap-2">
                                                          <span className="text-xs text-slate-500">{RoleLabel[p.role]}</span>
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
                 <Dices size={18} />
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
                const hasWarnings = team.warnings && team.warnings.length > 0;
                const colorClass = TEAM_COLORS[index % TEAM_COLORS.length];
                const containerClass = hasWarnings ? 'border-amber-300 bg-amber-50' : colorClass;
                
                return (
                <div 
                key={team.id}
                className={`rounded-xl shadow-sm border-2 flex flex-col overflow-hidden ${containerClass}`}
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
                          <div className="text-amber-500">
                            <AlertTriangle size={20} />
                          </div>
                          <div className="absolute top-full right-0 mt-2 w-48 p-2 bg-amber-100 text-amber-900 text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
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

                {/* Warnings Text Banner */}
                {hasWarnings && (
                    <div className="px-3 py-1 bg-amber-100 text-amber-800 text-sm border-b border-amber-200">
                    {team.warnings?.join(', ')}
                    </div>
                )}

                {/* Members Droppable Area */}
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
                        
                        return (
                            <Draggable key={member.id} draggableId={member.id} index={index}>
                            {(provided, snapshot) => (
                                <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`
                                    relative group
                                    p-3 rounded-lg border flex items-center justify-between select-none
                                    transition-all duration-200
                                    ${snapshot.isDragging 
                                    ? 'shadow-2xl ring-2 ring-brand-500 ring-offset-2 z-50 bg-white opacity-95' 
                                    : 'shadow-sm hover:shadow-md'
                                    }
                                    ${getMemberStyle(member.role)}
                                    ${isSwappingMe ? 'ring-2 ring-brand-500 ring-offset-1' : ''}
                                    ${swapSource && !isSwappingMe ? 'cursor-pointer hover:bg-brand-50' : ''}
                                `}
                                onClick={() => swapSource && handleSwapClick(team.id, index)}
                                title={`רמה: ${member.rank}`}
                                >

                                <div 
                                    {...provided.dragHandleProps}
                                    style={{ touchAction: 'none' }}
                                    className="p-4 -mr-2 ml-2 text-slate-400 hover:text-brand-600 bg-slate-100/50 hover:bg-slate-200/50 rounded-md cursor-grab active:cursor-grabbing flex items-center justify-center shrink-0"
                                >
                                    <GripVertical size={24} />
                                </div>
                                
                                <div className="flex-1 flex flex-col px-1">
                                    <span className="font-bold text-slate-900 text-lg">{member.name}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-sm text-slate-500 uppercase font-medium">{RoleLabel[member.role]}</span>
                                      <div className="flex">
                                        {Array.from({ length: member.rank }).map((_, i) => (
                                          <Star key={i} size={14} className={`fill-current ${getRankColor(member.rank)}`} />
                                        ))}
                                      </div>
                                    </div>
                                    {member.notes && (
                                       <div className="text-xs text-red-600 truncate mt-1 max-w-[140px]" title={member.notes}>
                                          {member.notes}
                                       </div>
                                    )}
                                </div>

                                {/* Remove Button (X) - Top Left */}
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

                                {/* Swap Button */}
                                <button 
                                    onClick={(e) => {
                                    e.stopPropagation(); // Prevent Drag Start
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
                            )}
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

      {/* PRINT ONLY VIEW */}
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
                            <span key={m.id} className="text-lg font-medium">{m.name}</span>
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
