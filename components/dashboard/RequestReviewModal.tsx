
import React, { useState } from 'react';
import { Role, Gender, GenderLabel, getRoleLabel } from '../../types';
import { X, CheckCircle, User, Phone, Mail, Calendar, Info, Star, ShipWheel, MessageSquare, AlertCircle } from 'lucide-react';

interface RequestReviewModalProps {
    request: any;
    onClose: () => void;
    onApprove: (data: any) => void;
}

export const RequestReviewModal: React.FC<RequestReviewModalProps> = ({ request, onClose, onApprove }) => {
    const p = request.profile;
    const [role, setRole] = useState<Role>(request.role || Role.MEMBER);
    const [rank, setRank] = useState(3);
    const [isSkipper, setIsSkipper] = useState(p?.isSkipper || false);
    const [medicalNotes, setMedicalNotes] = useState(p?.medicalNotes || '');
    const [clubSpecificNotes, setClubSpecificNotes] = useState(request.clubSpecificNotes || '');

    const displayName = p ? `${p.firstName} ${p.lastName}` : 'משתמש חדש';

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in duration-300 border border-slate-200">
                {/* Header Section */}
                <div className="p-8 bg-slate-900 text-white relative">
                    <button onClick={onClose} className="absolute top-6 left-6 p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-full transition-all">
                        <X size={28} />
                    </button>
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-white/10 rounded-3xl border-2 border-white/20 overflow-hidden shrink-0 flex items-center justify-center">
                            {p?.photoURL ? <img src={p.photoURL} className="w-full h-full object-cover" /> : <User size={48} className="text-white/20" />}
                        </div>
                        <div className="overflow-hidden">
                            <h3 className="text-3xl font-black truncate leading-tight">{displayName}</h3>
                            <p className="text-brand-400 font-bold flex items-center gap-2 mt-1"><Mail size={16} /> {p?.contactEmail || request.uid}</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">מין</label>
                            <p className="font-bold text-slate-800">{GenderLabel[p?.gender as Gender] || 'לא צוין'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">טלפון</label>
                            <p className="font-bold text-slate-800 font-mono" dir="ltr">{p?.primaryPhone || 'לא צוין'}</p>
                        </div>
                    </div>

                    {/* Editable Management Fields */}
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-800 uppercase tracking-widest">תפקיד ודירוג</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[Role.MEMBER, Role.VOLUNTEER, Role.INSTRUCTOR].map((r) => (
                                    <button key={r} onClick={() => setRole(r)} className={`p-3 rounded-2xl border-2 transition-all font-bold text-xs ${role === r ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-sm' : 'border-slate-100 text-slate-400'}`}>
                                        {getRoleLabel(r, p?.gender || Gender.MALE)}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <button key={n} onClick={() => setRank(n)} className={`flex-1 py-3 rounded-xl border-2 font-black transition-all ${rank === n ? 'border-brand-600 bg-brand-600 text-white shadow-md' : 'border-slate-100 text-slate-300'}`}>{n}</button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-brand-50 p-4 rounded-2xl border border-brand-100">
                            <input type="checkbox" id="skipperCheck" checked={isSkipper} onChange={e => setIsSkipper(e.target.checked)} className="w-5 h-5 text-brand-600 rounded" />
                            <label htmlFor="skipperCheck" className="font-bold text-brand-900 flex items-center gap-2 cursor-pointer"><ShipWheel size={20} /> סקיפר / משיט</label>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><AlertCircle size={14} /> הערות רפואיות (גלובלי)</label>
                            <textarea value={medicalNotes} onChange={e => setMedicalNotes(e.target.value)} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm focus:border-brand-500 outline-none min-h-[80px]" placeholder="מידע רפואי חשוב..." />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={14} /> הערות מועדון (פנימי)</label>
                            <textarea value={clubSpecificNotes} onChange={e => setClubSpecificNotes(e.target.value)} className="w-full border-2 border-slate-100 rounded-2xl p-4 text-sm focus:border-brand-500 outline-none min-h-[80px]" placeholder="הערות לשימוש המנהלים בלבד..." />
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t flex gap-4">
                    <button onClick={() => onApprove({ role, rank, isSkipper, medicalNotes, clubSpecificNotes })} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[2.5rem] font-black text-xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-emerald-100">
                        <CheckCircle size={28} /> אשר הצטרפות
                    </button>
                </div>
            </div>
        </div>
    );
};
