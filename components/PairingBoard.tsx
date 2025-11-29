import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Team, Role, RoleLabel, BoatTypeLabel, BoatType, TEAM_COLORS, Person } from '../types';
import { GripVertical, AlertTriangle, ArrowRightLeft, Check, Printer, Share2, Link as LinkIcon, Eye, Send, RotateCcw, RotateCw, Star, Dices, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

// Pairing Board Component - Updated for Multi-Tenancy and Strict TypeScript
export const PairingBoard: React.FC = () => {
  const { 
    activeClub,
    sessions, 
    histories, 
    futures,
    reorderSessionMembers, 
    swapMembers, 
    undo, 
    redo, 
    updateTeamBoatType, 
    runPairing 
  } = useAppStore();
  
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [swapSource, setSwapSource] = useState<{ teamId: string, index: number } | null>(null);

  // Fallback for null activeClub
  if (!activeClub) return null;

  // Retrieve current session safely from the sessions map using activeClub
  const session = sessions[activeClub];
  const history = histories[activeClub];
  const future = futures[activeClub];

  // Additional safety check if session data isn't ready
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

  const generateShareData = () => {
    // 1. Filter out sensitive data (rank, notes, ids)
    // Explicitly typed 't' to avoid implicit any error
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
      teams: cleanTeams
    };

    // 2. Encode to Base64 (Handling Unicode characters for Hebrew)
    const jsonString = JSON.stringify(payload);
    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
    
    // 3. Create URL - Robust hash handling for Share
    const origin = window.location.origin;
    // Construct valid absolute URL for HashRouter
    const shareUrl = `${origin}${window.location.pathname}#/share?data=${encoded}`;
    return shareUrl;
  };

  const handleOpenPublicView = () => {
    const url = generateShareData();
    window.open(url, '_blank');
  };

  // Improved Share Handler: Tries Native Share first, falls back to Modal
  const handleMainShareClick = async () => {
    const url = generateShareData();
    const shareData = {
      title: 'שיבוצי אימון',
      text: `היי! הנה שיבוצי האימון לתאריך ${new Date().toLocaleDateString('he-IL')}:`,
      url: url
    };

    // Try Native Share API (Mobile/Supported Browsers)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return; // Success! No need to show menu.
      } catch (err) {
        console.log('User closed share sheet or error:', err);
        // If user cancelled, we don't necessarily need to open the menu, 
        // but if it failed for technical reasons, we might want to.
        if ((err as Error).name !== 'AbortError') {
             setShowShareMenu(true);
        }
      }
    } else {
      // Fallback for Desktop/Unsupported browsers
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

  return (
    <div className="space-y-6 pb-20"> 
      
      {/* Share Modal - Centered Overlay (Fallback for Desktop) */}
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

      {/* Screen Header - Hidden on Print */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">שיבוצי אימון</h2>
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
            
             {/* Undo/Redo/Remix Buttons */}
            <div className="flex gap-2 w-full md:w-auto">
               <button
                  onClick={handleRemix}
                  className="p-2 rounded-lg border border-slate-200 text-brand-600 hover:bg-brand-50"
                  title="ערבב מחדש (צור שיבוצים מחדש)"
               >
                 <Dices size={18} />
               </button>
               <div className="w-px bg-slate-200 mx-1"></div>
               <button
                  onClick={undo}
                  disabled={!history || history.length === 0}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="בטל פעולה אחרונה"
               >
                 <RotateCcw size={18} />
               </button>
               <button
                  onClick={redo}
                  disabled={!future || future.length === 0}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="שחזר פעולה שבוטלה"
               >
                 <RotateCw size={18} />
               </button>
            </div>
            
            <div className="relative flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
               
               <button 
                  onClick={handleOpenPublicView}
                  className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  title="פתח תצוגה נקייה בחלון חדש"
              >
                  <Eye size={16} /> מבט נקי
              </button>

               <button 
                  onClick={handleMainShareClick}
                  className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  title="שתף רשימה נקייה (ללא דירוגים)"
              >
                  <Share2 size={16} /> שיתוף
              </button>

              <button 
                  onClick={handlePrint}
                  className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  title="הדפס דף שיבוצים נקי (ללא דירוגים)"
              >
                  <Printer size={16} /> הדפס
              </button>
            </div>
        </div>
      </div>

      {/* Interactive Board - Hidden on Print */}
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
                    <select
                        value={team.boatType}
                        onChange={(e) => updateTeamBoatType(team.id, e.target.value as BoatType)}
                        className="font-bold text-slate-800 text-lg bg-transparent border-none focus:ring-0 cursor-pointer outline-none hover:text-brand-600 transition-colors"
                        title="שנה סוג סירה"
                    >
                        {Object.entries(BoatTypeLabel).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>

                    {hasWarnings && (
                    <div className="cursor-help group relative">
                      <div className="text-amber-500">
                        <AlertTriangle size={20} />
                      </div>
                      {/* Tooltip for warnings */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-amber-100 text-amber-900 text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                         {team.warnings?.join(', ')}
                      </div>
                    </div>
                    )}
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
                                title={`רמה: ${member.rank}. גרור את הידית לשינוי סדר, או לחץ להחלפה.`}
                                >

                                {/* Grip Icon - ENLARGED & EXPLICIT TOUCH ACTION */}
                                <div 
                                    {...provided.dragHandleProps}
                                    style={{ touchAction: 'none' }}
                                    className="p-4 -mr-2 ml-2 text-slate-400 hover:text-brand-600 bg-slate-100/50 hover:bg-slate-200/50 rounded-md cursor-grab active:cursor-grabbing flex items-center justify-center shrink-0"
                                    title="גרור לשינוי סדר"
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

                                {/* Swap Button */}
                                <button 
                                    onClick={(e) => {
                                    e.stopPropagation(); // Prevent Drag Start
                                    handleSwapClick(team.id, index);
                                    }}
                                    className={`
                                    p-2 rounded-md transition-colors z-10
                                    ${isSwappingMe 
                                        ? 'bg-brand-500 text-white' 
                                        : 'text-slate-400 hover:bg-white hover:text-brand-600 hover:shadow-sm opacity-0 group-hover:opacity-100 md:opacity-0 opacity-100'
                                    }
                                    ${swapSource ? 'opacity-100' : ''}
                                    `}
                                    title={isSwappingMe ? "בטל בחירה" : "החלף משתתף זה"}
                                >
                                    {isSwappingMe ? <Check size={18} /> : <ArrowRightLeft size={18} />}
                                </button>
                                </div>
                            )}
                            </Draggable>
                        );
                        })}
                        {provided.placeholder}
                        
                        {team.members.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic border-2 border-dashed border-slate-300/50 rounded-lg min-h-[60px]">
                            גרור לכאן
                        </div>
                        )}
                    </div>
                    )}
                </Droppable>
                </div>
            )})}
            </div>
        </DragDropContext>
      </div>

      {/* PRINT ONLY VIEW - Visible only when printing */}
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
                         <span className="text-sm px-2 py-1 bg-slate-100 rounded border">{BoatTypeLabel[team.boatType as BoatType]}</span>
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