
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Role, Gender, MembershipStatus, ClubID, getRoleLabel } from '../../types';
import { Clock, CheckCircle, ArrowRight, UserCircle, Loader2, AlertCircle } from 'lucide-react';

interface MembershipRequestsProps {
    clubId: ClubID;
    onApprove: (member: any) => void;
    onBack: () => void;
}

export const MembershipRequests: React.FC<MembershipRequestsProps> = ({ clubId, onApprove, onBack }) => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            try {
                // 1. Fetch PENDING memberships
                const q = query(
                    collection(db, 'memberships'), 
                    where('clubId', '==', clubId),
                    where('status', '==', MembershipStatus.PENDING)
                );
                
                const snap = await getDocs(q);
                const rawMembers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                
                // 2. Hydrate each membership with Profile data
                const populated = await Promise.all(rawMembers.map(async (m: any) => {
                    if (!m.uid) return m;
                    try {
                        const profileSnap = await getDoc(doc(db, 'profiles', m.uid));
                        if (profileSnap.exists()) {
                            return { ...m, profile: profileSnap.data() };
                        }
                    } catch (e) {
                        console.error("Error hydration profile for", m.uid, e);
                    }
                    return m;
                }));
                
                setRequests(populated);
            } catch (err) { 
                console.error("Error in fetchRequests:", err); 
            } finally {
                setLoading(false);
            }
        };
        fetchRequests();
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
                        {requests.map((m, i) => (
                            <div key={m.id || i} className="p-6 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col justify-between gap-6 hover:shadow-lg transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner">
                                        {m.profile?.photoURL ? (
                                            <img src={m.profile.photoURL} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserCircle size={32} className="text-slate-200" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-black text-slate-800 text-xl truncate">
                                            {m.profile ? `${m.profile.firstName} ${m.profile.lastName}` : (m.uid?.split('@')[0] || 'משתמש חדש')}
                                        </h3>
                                        <div className="flex gap-2 mt-2">
                                            <span className="text-[10px] font-black bg-white border border-slate-100 px-3 py-1 rounded-full text-slate-500">
                                                {getRoleLabel(m.role || Role.MEMBER, m.profile?.gender || Gender.MALE)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {m.profile?.primaryPhone && <div className="text-xs text-slate-400 bg-white/50 p-2 rounded-xl text-center font-mono" dir="ltr">{m.profile.primaryPhone}</div>}
                                <button onClick={() => onApprove(m)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95">
                                    <CheckCircle size={24} /> אשר הצטרפות
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
