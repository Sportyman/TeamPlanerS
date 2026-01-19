
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { Role, ClubID, getRoleLabel, Gender } from '../../types';
import { Plus, Link as LinkIcon, Copy, Trash2, CheckCircle2, Clock, ShieldAlert, Loader2, Sparkles, Share2 } from 'lucide-react';

export const InviteManager: React.FC = () => {
  const { activeClub, clubs, invites, isLoadingInvites, fetchClubInvites, createClubInvite, deleteClubInvite } = useAppStore();
  
  const [targetRole, setTargetRole] = useState<Role>(Role.VOLUNTEER);
  const [autoApprove, setAutoApprove] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (activeClub) {
      fetchClubInvites(activeClub);
    }
  }, [activeClub]);

  if (!activeClub) return null;

  const currentClub = clubs.find(c => c.id === activeClub);
  const clubName = currentClub?.label || '';

  const handleCreate = async () => {
    setIsCreating(true);
    const token = await createClubInvite(activeClub, targetRole, autoApprove);
    setIsCreating(false);
    if (token) {
        setAutoApprove(false);
    }
  };

  const copyToClipboard = (token: string, id: string) => {
    const origin = window.location.origin;
    const url = `${origin}${window.location.pathname}#/join/${token}`;
    navigator.clipboard.writeText(url).then(() => {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-brand-100 text-brand-600 p-3 rounded-xl">
                    <Sparkles size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-800">יצירת לינק הצטרפות</h2>
                    <p className="text-sm text-slate-500">הזמן משתתפים חדשים לחוג בצורה מהירה</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">תפקיד יעד</label>
                    <select 
                        value={targetRole}
                        onChange={e => setTargetRole(e.target.value as Role)}
                        className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-brand-500 outline-none"
                    >
                        {Object.values(Role).map(r => (
                            <option key={r} value={r}>{getRoleLabel(r, Gender.MALE)} / {getRoleLabel(r, Gender.FEMALE)}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">מנגנון אישור</label>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setAutoApprove(true)}
                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-bold ${autoApprove ? 'bg-green-50 border-green-600 text-green-700' : 'bg-white border-slate-100 text-slate-400'}`}
                        >
                            <CheckCircle2 size={18} /> אוטומטי
                        </button>
                        <button 
                            onClick={() => setAutoApprove(false)}
                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all font-bold ${!autoApprove ? 'bg-amber-50 border-amber-600 text-amber-700' : 'bg-white border-slate-100 text-slate-400'}`}
                        >
                            <Clock size={18} /> ידני
                        </button>
                    </div>
                </div>

                <div className="flex items-end">
                    <button 
                        onClick={handleCreate}
                        disabled={isCreating}
                        className="w-full bg-brand-600 hover:bg-brand-500 text-white font-black py-3.5 rounded-xl shadow-lg shadow-brand-100 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isCreating ? <Loader2 className="animate-spin" /> : <><Plus size={20} /> צור לינק הזמנה</>}
                    </button>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-500 flex items-start gap-3">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <div>
                    <span className="font-bold block mb-1">טיפ בטיחות:</span>
                    לינקים באישור אוטומטי יכניסו את המשתמש ישירות לרשימת השיבוץ הפעילה. השתמש בהם בזהירות ורק עבור קבוצות מוכרות.
                </div>
            </div>
        </div>

        <div className="space-y-4">
            <h3 className="font-bold text-lg text-slate-800 px-2 flex items-center gap-2">
                <LinkIcon size={20} className="text-slate-400" /> לינקים פעילים ({invites.length})
            </h3>

            {isLoadingInvites ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-600" /></div>
            ) : invites.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 italic">
                    לא נוצרו לינקים עדיין. צור את הלינק הראשון למעלה.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {invites.map(invite => (
                        <div key={invite.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${invite.autoApprove ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {invite.autoApprove ? 'אישור אוטומטי' : 'אישור ידני'}
                                        </span>
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                                            {getRoleLabel(invite.role, Gender.MALE)}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-800">הזמנה ל{clubName}</h4>
                                    <p className="text-[10px] text-slate-400">נוצר ב-{new Date(invite.createdAt).toLocaleDateString('he-IL')}</p>
                                </div>
                                <button 
                                    onClick={() => deleteClubInvite(invite.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => copyToClipboard(invite.token, invite.id)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${copiedId === invite.id ? 'bg-green-600 text-white' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}
                                >
                                    {copiedId === invite.id ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                                    {copiedId === invite.id ? 'הועתק!' : 'העתק לינק'}
                                </button>
                                <div className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl flex flex-col items-center justify-center min-w-[70px]">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">שימושים</span>
                                    <span className="font-black text-slate-800">{invite.usageCount}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};
