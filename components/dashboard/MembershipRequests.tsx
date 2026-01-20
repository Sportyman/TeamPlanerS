
import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Role, Gender, MembershipStatus, ClubID, getRoleLabel } from '../../types';
import { Clock, CheckCircle, ArrowRight } from 'lucide-react';

interface MembershipRequestsProps {
    clubId: ClubID;
    onApprove: (member: any) => void;
    onBack: () => void;
}

export const MembershipRequests: React.FC<MembershipRequestsProps> = ({ clubId, onApprove, onBack }) => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'memberships'), where('clubId', '==', clubId));
                const snap = await getDocs(q);
                const members = snap.docs.map(d => d.data());
                const profilePromises = members.map(m => getDocs(query(collection(db, 'profiles'), where('uid', '==', m.uid))));
                const profileSnaps = await Promise.all(profilePromises);
                setRequests(members.map((m, i) => ({ ...m, profile: profileSnaps[i].docs[0]?.data() })));
            } catch (err) { console.error(err); }
            setLoading(false);
        };
        fetch();
    }, [clubId]);

    return (
        <div className="max-w-4xl mx-auto py-6 space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-brand-600 mb-6 font-medium"><ArrowRight size={20} /> חזרה</button>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2"><Clock className="text-emerald-600" /> בקשות הצטרפות</h2>
                {loading ? <div className="py-12 text-center text-slate-400">טוען...</div> : requests.length === 0 ? <div className="py-12 text-center text-slate-400 italic">אין בקשות חדשות</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {requests.map((m, i) => (
                            <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-start gap-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">{m.profile ? `${m.profile.firstName} ${m.profile.lastName}` : 'לא ידוע'}</h3>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="text-[10px] bg-white border px-2 py-0.5 rounded-full">{getRoleLabel(m.role || Role.MEMBER, m.profile?.gender || Gender.MALE)}</span>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${m.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{m.status === 'ACTIVE' ? 'פעיל' : 'ממתין'}</span>
                                    </div>
                                </div>
                                <button onClick={() => onApprove(m)} className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"><CheckCircle size={16} /> אשר</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
