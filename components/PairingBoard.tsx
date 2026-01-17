
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Team, Role, getRoleLabel, BoatType, TEAM_COLORS, Person, RoleColorClasses } from '../types';
import { GripVertical, AlertTriangle, ArrowRightLeft, Check, Printer, Share2, Link as LinkIcon, Eye, Send, RotateCcw, RotateCw, Star, Shuffle, X, Plus, Trash2, Search, UserPlus, Lock, ShieldCheck, Heart, UserX, Shield, ShipWheel } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

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
  const [addMemberModal, setAddMemberModal] = useState<{ isOpen: boolean, teamId: string | null }>({ isOpen: false, teamId: null });
  const [memberSearch, setMemberSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'EXISTING' | 'GUEST'>('EXISTING');
  const [newGuestName, setNewGuestName] = useState('');
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set());

  if (!activeClub) return null;

  const session = sessions[activeClub];
  const history = histories[activeClub];
  const future = futures[activeClub];
  const settings = clubSettings[activeClub] || { boatDefinitions: [], roleColors: {} as any };
  const boatDefinitions = settings.boatDefinitions;

  const boatLabels: Record<string, string> = {};
  boatDefinitions.forEach(def => { boatLabels[def.id] = def.label; });

  if (!session) return <div className="p-8 text-center font-bold">טוען...</div>;

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    reorderSessionMembers(source.droppableId, source.index, destination.droppableId, destination.index);
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

  const handleRemix = () => { if (confirm('לערבב מחדש?')) runPairing(); };
  const handleAssignExisting = (personId: string) => {
      if (addMemberModal.teamId) {
          assignMemberToTeam(addMemberModal.teamId, personId);
          setAddMemberModal({ isOpen: false, teamId: null });
      }
  };

  const handleMemberDelete = (teamId: string, personId: string) => {
      setDeletingItems(prev => new Set(prev).add(personId));
      setTimeout(() => {
          removeMemberFromTeam(teamId, personId);
          setDeletingItems(prev => { const n = new Set(prev); n.delete(personId); return n; });
      }, 300);
  };

  const getMemberStyle = (role: Role) => {
    const roleColor = settings.roleColors?.[role] || 'slate';
    const classes = RoleColorClasses[roleColor];
    return `${classes.bg} ${classes.border}`;
  };

  const generateShareData = () => {
    const payload = { date: new Date().toLocaleDateString('he-IL'), labels: boatLabels, teams: session.teams.map((t: Team) => ({ id: t.id, boatType: t.boatType, members: t.members.map((m: Person) => ({ name: m.name, role: m.role, gender: m.gender })) })) };
    return `${window.location.origin}${window.location.pathname}#/share?data=${btoa(unescape(encodeURIComponent(JSON.stringify(payload))))}`;
  };

  return (
    <div className="space-y-6 pb-20"> 
      {showShareMenu && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowShareMenu(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center"><h3 className="font-bold">שיתוף</h3><button onClick={() => setShowShareMenu(false)}><X size={24} /></button></div>
                <button onClick={() => { navigator.clipboard.writeText(generateShareData()); alert('הועתק!'); setShowShareMenu(false); }} className="w-full p-6 text-center font-black text-brand-600">העתק קישור לשיבוץ</button>
            </div>
        </div>
      )}

      {/* Board Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-3">
             <h2 className="text-2xl font-black text-slate-800 tracking-tight">לוח שיבוצים</h2>
             <button onClick={addManualTeam} className="bg-brand-600 text-white p-2 rounded-xl flex items-center gap-2 text-sm font-black shadow-lg shadow-brand-100 active:scale-95"><Plus size={18} /> סירה</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
            <button onClick={handleRemix} className="p-3 bg-white border rounded-xl text-brand-600 shadow-sm"><Shuffle size={20} /></button>
            <button onClick={undo} disabled={!history || history.length === 0} className="p-3 bg-white border rounded-xl text-slate-600 disabled:opacity-30"><RotateCcw size={20} /></button>
            <button onClick={redo} disabled={!future || future.length === 0} className="p-3 bg-white border rounded-xl text-slate-600 disabled:opacity-30"><RotateCw size={20} /></button>
            <button onClick={() => setShowShareMenu(true)} className="flex-1 md:flex-none bg-emerald-600 text-white px-6 py-3 rounded-xl font-black shadow-lg flex items-center justify-center gap-2"><Share2 size={18} /> שיתוף</button>
            <button onClick={() => window.print()} className="bg-slate-800 text-white px-6 py-3 rounded-xl font-black shadow-lg flex items-center justify-center gap-2"><Printer size={18} /> הדפסה</button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {session.teams.map((team: Team, idx: number) => {
            const boatDef = boatDefinitions.find(d => d.id === team.boatType);
            const colorClass = TEAM_COLORS[idx % TEAM_COLORS.length];
            return (
              <div key={team.id} className={`rounded-2xl shadow-md border-2 overflow-hidden flex flex-col transition-all duration-300 ${colorClass}`}>
                <div className="p-4 bg-white/40 border-b border-slate-100/50 flex justify-between items-center">
                   <select value={team.boatType} onChange={e => updateTeamBoatType(team.id, e.target.value as BoatType)} className="bg-transparent border-none font-black text-slate-800 text-lg focus:ring-0 outline-none">
                      {boatDefinitions.map(def => <option key={def.id} value={def.id}>{def.label}</option>)}
                   </select>
                   <div className="flex gap-1">
                      <button onClick={() => setAddMemberModal({ isOpen: true, teamId: team.id })} className="p-2 text-slate-500 hover:text-brand-600 transition-colors"><UserPlus size={18} /></button>
                      <button onClick={() => { if(confirm('מחק סירה?')) removeTeam(team.id); }} className="p-2 text-slate-500 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                   </div>
                </div>

                <Droppable droppableId={team.id}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={`p-4 flex-1 flex flex-col gap-3 min-h-[160px] ${snapshot.isDraggingOver ? 'bg-white/30' : ''}`}>
                      {team.members.map((member: Person, mIdx: number) => {
                        const isSwapping = swapSource?.teamId === team.id && swapSource?.index === mIdx;
                        const roleColor = settings.roleColors?.[member.role] || 'slate';
                        const classes = RoleColorClasses[roleColor];
                        return (
                          <Draggable key={member.id} draggableId={member.id} index={mIdx}>
                            {(p, dSnapshot) => (
                              <div ref={p.innerRef} {...p.draggableProps} className="relative group">
                                <div onClick={() => swapSource && handleSwapClick(team.id, mIdx)} className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all shadow-sm ${dSnapshot.isDragging ? 'shadow-2xl scale-105 z-50' : ''} ${getMemberStyle(member.role)} ${isSwapping ? 'ring-4 ring-brand-500 scale-105' : ''}`}>
                                  <div {...p.dragHandleProps} className="p-3 -ml-2 text-slate-400 cursor-grab active:cursor-grabbing touch-none"><GripVertical size={24} /></div>
                                  <div className="flex-1 flex flex-col text-right pr-2">
                                     <div className="flex items-center gap-1">
                                        <span className="font-black text-slate-800 text-lg leading-none">{member.name}</span>
                                        {member.isSkipper && <ShipWheel size={14} className={classes.text} />}
                                     </div>
                                     <div className={`text-[10px] font-black uppercase tracking-wider mt-1 ${classes.text}`}>{getRoleLabel(member.role, member.gender)}</div>
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); handleMemberDelete(team.id, member.id); }} className="p-1.5 text-slate-300 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100"><X size={16} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleSwapClick(team.id, mIdx); }} className={`p-2 rounded-lg ml-2 transition-all ${isSwapping ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-white'}`}>{isSwapping ? <Check size={18} /> : <ArrowRightLeft size={18} />}</button>
                                </div>
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
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};
