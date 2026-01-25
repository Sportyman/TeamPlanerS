
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Role, Gender, MembershipStatus, ClubID, getRoleLabel } from '../../types';
import { Clock, CheckCircle, ArrowRight, UserCircle, Loader2, AlertCircle, Eye, User } from 'lucide-react';
import { RequestReviewModal } from './RequestReviewModal';

interface MembershipRequestsProps {
    clubId: ClubID;
    onApprove: (member: any) => void;
    onBack: () => void;
}

export const MembershipRequests: React.FC<MembershipRequestsProps> = ({ clubId, onApprove, onBack }) => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewingRequest, setReviewingRequest] = useState<any | null>(null);

    useEffect(() => {
        setLoading(true);
        const q = query(
            collection(db, 'memberships'), 
            where('clubId', '==', clubId),
            where('status', '==', MembershipStatus.PENDING)
        );
        
        const unsubscribe = onSnapshot(q, async (snap) => {
            const rawMembers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const populated = await Promise.all(rawMembers.map(async (m: any) => {
                if (!m.uid) return m;
                try {
                    const profileSnap = await getDoc(doc(db, 'profiles', m.uid));
                    if (profileSnap.exists()) return { ...m, profile: profileSnap.data() };
                } catch (e) {
                    console.error("Profile fetch error in Requests:", e);
                }
                return m;
            }));
            setRequests(populated);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [clubId]);

    return (
        <div className="max-w-4xl mx-auto py-6 space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 mb-6 font-medium transition-colors">
                <ArrowRight size={20} /> חזרה לניהול
            </button>
            
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><Clock size={28} /></div>
                        <h2 className="text-3xl font-black text-slate-800">בקשות הצטרפות</h2>
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto mb-4 text-brand-600" size={48} /><p className="font-bold text-slate-400">סורק בקשות...</p></div>
                ) : requests.length === 0 ? (
                    <div className="py-24 text-center text-slate-400 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                        <CheckCircle size={64} className="mx-auto mb-6 opacity-10" />
                        <p className="text-xl font-medium">אין בקשות הממתינות לאישור</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {requests.map((m, i) => {
                            const p = m.profile;
                            const hasProfile = !!p;
                            const displayName = hasProfile ? `${p.firstName} ${p.lastName}` : (m.uid?.includes('@') ? m.uid : 'ממתין לפרטים...');
                            
                            return (
                                <div key={m.id || i} className="p-6 bg-white rounded-3xl border border-slate-200 flex flex-col justify-between gap-6 hover:shadow-lg transition-all shadow-sm">
                                    <div className="flex items-start gap-4 flex-row-reverse">
                                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner shrink-0">
                                            {p?.photoURL ? <img src={p.photoURL} alt="User" className="w-full h-full object-cover" /> : <UserCircle size={32} className="text-slate-200" />}
                                        </div>
                                        <div className="flex-1 overflow-hidden text-right">
                                            <h3 className="font-black text-slate-800 text-xl truncate">{displayName}</h3>
                                            {!hasProfile && <p className="text-[10px] text-amber-600 font-bold">המשתמש טרם סיים למלא פרופיל</p>}
                                            <div className="flex gap-2 mt-2 justify-end">
                                                <span className="text-[10px] font-black bg-slate-50 border border-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase">
                                                    {getRoleLabel(m.role || Role.MEMBER, p?.gender || Gender.MALE)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setReviewingRequest(m)} 
                                        disabled={!hasProfile}
                                        className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        <Eye size={24} /> {hasProfile ? 'סקור ואשר' : 'ממתין לפרופיל'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {reviewingRequest && (
                <RequestReviewModal 
                    request={reviewingRequest} 
                    onClose={() => setReviewingRequest(null)} 
                    onApprove={(data) => {
                        onApprove({ ...reviewingRequest, ...data });
                        setReviewingRequest(null);
                    }}
                />
            )}
        </div>
    );
};
