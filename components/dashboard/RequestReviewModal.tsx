
import React, { useState } from 'react';
import { Role, Gender, GenderLabel, getRoleLabel } from '../../types';
import { X, CheckCircle, User, Phone, Mail, Calendar, Info, Star } from 'lucide-react';

interface RequestReviewModalProps {
    request: any;
    onClose: () => void;
    onApprove: (data: { role: Role, rank: number }) => void;
}

export const RequestReviewModal: React.FC<RequestReviewModalProps> = ({ request, onClose, onApprove }) => {
    const p = request.profile;
    const [role, setRole] = useState<Role>(request.role || Role.MEMBER);
    const [rank, setRank] = useState(3);

    const displayName = p ? `${p.firstName} ${p.lastName}` : 'משתמש חדש';

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
                <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-2xl font-black text-slate-800">סקירת בקשת הצטרפות</h3>
                        <p className="text-slate-500 text-sm mt-1">מאת: <span className="font-bold text-brand-600">{displayName}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-full transition-all">
                        <X size={28} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* User Info Section */}
                    <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><User size={10}/> מין</label>
                            <p className="font-bold text-slate-700">{GenderLabel[p?.gender as Gender] || 'לא צוין'}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Phone size={10}/> טלפון</label>
                            <p className="font-bold text-slate-700 font-mono" dir="ltr">{p?.primaryPhone || 'לא צוין'}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={10}/> תאריך לידה</label>
                            <p className="font-bold text-slate-700">{p?.birthDate || 'לא צוין'}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Mail size={10}/> אימייל קשר</label>
                            <p className="font-bold text-slate-700 truncate">{p?.contactEmail || 'לא צוין'}</p>
                        </div>
                        {p?.medicalNotes && (
                            <div className="col-span-2 space-y-1 mt-2 p-3 bg-white rounded-xl border border-slate-100">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Info size={10}/> הערות / רפואי</label>
                                <p className="text-sm text-slate-600">{p.medicalNotes}</p>
                            </div>
                        )}
                    </div>

                    {/* Admin Actions Section */}
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-800 uppercase tracking-widest">הקצאת תפקיד בחוג</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[Role.MEMBER, Role.VOLUNTEER, Role.INSTRUCTOR].map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRole(r)}
                                        className={`p-4 rounded-2xl border-2 transition-all font-bold text-sm ${role === r ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-md' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                                    >
                                        {getRoleLabel(r, p?.gender || Gender.MALE)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-black text-slate-800 uppercase tracking-widest">דירוג רמה (1-5)</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        onClick={() => setRank(n)}
                                        className={`flex-1 py-3 rounded-xl border-2 font-black transition-all ${rank === n ? 'border-brand-600 bg-brand-600 text-white shadow-lg scale-105' : 'border-slate-100 text-slate-300 hover:border-slate-200'}`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50 border-t flex gap-4">
                    <button onClick={() => onApprove({ role, rank })} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[2rem] font-black text-xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-emerald-100">
                        <CheckCircle size={28} /> אשר הצטרפות
                    </button>
                </div>
            </div>
        </div>
    );
};
