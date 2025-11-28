import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Team, Role, RoleLabel, BoatTypeLabel } from '../types';
import { GripVertical, AlertTriangle, ArrowRightLeft, Check, Printer, Share2, Link as LinkIcon, Eye, Send, RotateCcw, RotateCw } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export const PairingBoard: React.FC = () => {
  const { session, reorderSessionMembers, swapMembers, undo, redo, history, future } = useAppStore();
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  // Swap Mode State
  const [swapSource, setSwapSource] = useState<{ teamId: string, index: number } | null>(null);

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

  const generateShareData = () => {
    // 1. Filter out sensitive data (rank, notes, ids)
    const cleanTeams = session.teams.map(t => ({
      id: t.id,
      boatType: t.boatType,
      members: t.members.map(m => ({
        name: m.name,
        role: m.role
      }))
    }));

    const payload = {
      date: new Date().toLocaleDateString('he-IL'),
      teams: cleanTeams
    };

    // 2. Encode to Base64 (handling Hebrew unicode)
    const jsonString = JSON.stringify(payload);
    const encoded = btoa(unescape(encodeURIComponent(jsonString)));
    
    // 3. Create URL
    const baseUrl = window.location.href.split('#')[0]; // Get base domain
    return `${baseUrl}#/share?data=${encoded}`;
  };

  const handleOpenPublicView = () => {
    const url = generateShareData();
    window.open(url, '_blank');
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

  return (
    <div className="space-y-6 pb-20"> 
      
      {/* Screen Header - Hidden on Print */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">שיבוצי אימון</h2>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            גרור משתתף לשנות סדר, או לחץ על {<ArrowRightLeft className="inline w-3 h-3"/>} להחלפה בין זוגות
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-2 w-full xl:w-auto">
            {swapSource && (
            <div className="bg-brand-100 text-brand-800 px-3 py-1 rounded-full text-xs font-bold animate-pulse flex-1 text-center md:flex-none">
                בחר משתתף שני...
            </div>
            )}
            
             {/* Undo/Redo Buttons */}
            <div className="flex gap-2 w-full md:w-auto">
               <button
                  onClick={undo}
                  disabled={history.length === 0}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="בטל פעולה אחרונה"
               >
                 <RotateCcw size={18} />
               </button>
               <button
                  onClick={redo}
                  disabled={future.length === 0}
                  className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="שחזר פעולה שבוטלה"
               >
                 <RotateCw size={18} />
               </button>
            </div>
            
            <div className="relative flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
               
               <button 
                  onClick={handleOpenPublicView}
                  className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  title="פתח תצוגה נקייה בחלון חדש"
              >
                  <Eye size={16} /> תצוגה
              </button>

               <button 
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex-1 md:flex-none justify-center flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                  title="שתף רשימה נקייה (ללא דירוגים)"
              >
                  <Share2 size={16} /> שיתוף
              </button>

              {showShareMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <button onClick={handleShareWhatsApp} className="w-full text-right px-4 py-3 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2 border-b border-slate-50">
                    <Share2 size={14} className="text-green-500"/> שלח בוואטסאפ
                  </button>
                  <button onClick={handleShareTelegram} className="w-full text-right px-4 py-3 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2 border-b border-slate-50">
                    <Send size={14} className="text-sky-500"/> שלח בטלגרם
                  </button>
                  <button onClick={handleCopyLink} className="w-full text-right px-4 py-3 hover:bg-slate-50 text-slate-700 text-sm flex items-center gap-2">
                    <LinkIcon size={14} className="text-brand-500"/> העתק קישור
                  </button>
                </div>
              )}

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
            {session.teams.map((team: Team) => (
                <div 
                key={team.id}
                className={`bg-white rounded-xl shadow-sm border-2 flex flex-col overflow-hidden ${
                    team.warnings && team.warnings.length > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-100'
                }`}
                >
                {/* Header */}
                <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <span className="font-bold text-slate-700 text-sm">{BoatTypeLabel[team.boatType]} x{team.boatCount}</span>
                    {team.warnings && team.warnings.length > 0 && (
                    <div title={team.warnings.join(', ')} className="cursor-help">
                      <div>
                        <AlertTriangle className="text-amber-500" size={16} />
                      </div>
                    </div>
                    )}
                </div>

                {/* Warnings */}
                {team.warnings && team.warnings.length > 0 && (
                    <div className="px-3 py-1 bg-amber-100 text-amber-800 text-xs border-b border-amber-200">
                    {team.warnings.join(', ')}
                    </div>
                )}

                {/* Members Droppable Area */}
                <Droppable droppableId={team.id}>
                    {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`p-3 flex-1 flex flex-col gap-2 min-h-[120px] transition-colors duration-200 ${
                        snapshot.isDraggingOver ? 'bg-blue-50/50' : ''
                        }`}
                    >
                        {team.members.map((member, index) => {
                        const isSwappingMe = swapSource?.teamId === team.id && swapSource?.index === index;
                        
                        return (
                            <Draggable key={member.id} draggableId={member.id} index={index}>
                            {(provided, snapshot) => (
                                <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                    ...provided.draggableProps.style,
                                    transform: snapshot.isDragging 
                                    ? `${provided.draggableProps.style?.transform} rotate(-2deg) scale(1.05)` 
                                    : provided.draggableProps.style?.transform,
                                    touchAction: 'none' // Critical fix for mobile scrolling while dragging
                                }}
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
                                title={`לחץ והחזק לגרירה, או השתמש בכפתור החצים להחלפה. רמה: ${member.rank}`}
                                >
                                
                                <div className="flex-1 flex flex-col px-2">
                                    <span className="font-semibold text-slate-800 text-sm">{member.name}</span>
                                    <span className="text-[10px] text-slate-500 uppercase">{RoleLabel[member.role]} • רמה {member.rank}</span>
                                </div>

                                {/* Grip Icon (Visual Only now) */}
                                <div className="p-1 text-slate-300">
                                    <GripVertical size={16} />
                                </div>

                                {/* Swap Button */}
                                <button 
                                    onClick={(e) => {
                                    e.stopPropagation(); // Prevent Drag Start
                                    handleSwapClick(team.id, index);
                                    }}
                                    className={`
                                    p-1.5 rounded-md transition-colors z-10
                                    ${isSwappingMe 
                                        ? 'bg-brand-500 text-white' 
                                        : 'text-slate-400 hover:bg-white hover:text-brand-600 hover:shadow-sm opacity-0 group-hover:opacity-100 md:opacity-0 opacity-100'
                                    }
                                    ${swapSource ? 'opacity-100' : ''}
                                    `}
                                    title={isSwappingMe ? "בטל בחירה" : "החלף משתתף זה"}
                                >
                                    {isSwappingMe ? <Check size={14} /> : <ArrowRightLeft size={14} />}
                                </button>
                                </div>
                            )}
                            </Draggable>
                        );
                        })}
                        {provided.placeholder}
                        
                        {team.members.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs italic border-2 border-dashed border-slate-100 rounded-lg min-h-[60px]">
                            גרור לכאן
                        </div>
                        )}
                    </div>
                    )}
                </Droppable>
                </div>
            ))}
            </div>
        </DragDropContext>
      </div>

      {/* PRINT ONLY VIEW - Visible only when printing */}
      <div className="hidden print:block space-y-8">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">רשימת שיבוצים לאימון</h1>
            <p className="text-lg text-slate-600 mt-2">{new Date().toLocaleDateString('he-IL')}</p>
        </div>

        <div className="space-y-6">
            {session.teams.map((team, idx) => (
                <div key={team.id} className="border-b border-slate-300 pb-4 break-inside-avoid">
                    <div className="flex items-baseline gap-4 mb-2">
                         <span className="text-xl font-bold">סירה {idx + 1}</span>
                         <span className="text-sm px-2 py-1 bg-slate-100 rounded border">{BoatTypeLabel[team.boatType]}</span>
                    </div>
                    <div className="flex gap-4 pr-4">
                        {team.members.map(m => (
                            <span key={m.id} className="text-lg font-medium">{m.name}</span>
                        ))}
                         {team.members.length === 0 && <span className="text-slate-400 italic">סירה ריקה</span>}
                    </div>
                </div>
            ))}
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-400 text-center text-sm text-slate-500">
            הופק באמצעות PaddleMate
        </div>
      </div>
    </div>
  );
};