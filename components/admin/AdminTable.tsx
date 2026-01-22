
import React, { useEffect, useState } from 'react';
import { ShieldAlert, Lock, UserX, UserCheck, XCircle, Loader2, Mail } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useAppStore } from '../../store';
import { ClubMembership, AccessLevel } from '../../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

interface AdminTableProps {
  onRemoveSuper: (email: string) => void;
  onRemoveClubAdmin: (uid: string, clubId: string) => void;
}

export const AdminTable: React.FC<AdminTableProps> = ({ onRemoveSuper, onRemoveClubAdmin }) => {
  const { superAdmins, protectedAdmins, clubs, user } = useAppStore();
  const [clubAdmins, setClubAdmins] = useState<(ClubMembership & { name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const allSuperAdmins = Array.from(new Set([...protectedAdmins, ...superAdmins]));

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    // Real-time listener for memberships with staff level or higher
    const q = query(
      collection(db, 'memberships'), 
      where('accessLevel', '>=', AccessLevel.STAFF)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const adminMemberships = snap.docs.map(d => d.data() as ClubMembership);
      setClubAdmins(adminMemberships);
      setLoading(false);
    }, (err) => {
      console.error("Error listening to admins:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Super Admins Section */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">מנהלי על גלובליים</h3>
          <span className="text-[10px] font-black bg-white px-3 py-1 rounded-full border text-slate-400 shadow-sm uppercase">Count: {allSuperAdmins.length}</span>
        </div>
        <div className="divide-y divide-slate-50">
          {allSuperAdmins.map((email) => {
            const isProtected = protectedAdmins.some(a => a.toLowerCase() === email.toLowerCase());
            return (
              <div key={email} className="p-5 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isProtected ? 'bg-amber-100 text-amber-600' : 'bg-brand-100 text-brand-600'}`}>
                    {isProtected ? <Lock size={24} /> : <ShieldAlert size={24} />}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-mono text-slate-800 font-bold text-sm md:text-base truncate max-w-[200px]">{email}</div>
                    <div className="flex gap-2 mt-1">
                      <StatusBadge type={isProtected ? 'ROOT' : 'SUPER'} />
                    </div>
                  </div>
                </div>
                
                {isProtected ? (
                  <div className="flex items-center gap-2 text-slate-300 text-[10px] font-black uppercase px-4 py-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    חסין
                  </div>
                ) : (
                  <button
                    onClick={() => onRemoveSuper(email)}
                    className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                    title="ביטול הרשאה גלובלית"
                  >
                    <UserX size={24} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Club Admins Section */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">מנהלי חוגים וצוות</h3>
          {loading && <Loader2 className="animate-spin text-brand-600" size={16} />}
        </div>
        <div className="divide-y divide-slate-50">
          {loading && clubAdmins.length === 0 ? (
             <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-brand-600" /></div>
          ) : clubAdmins.length === 0 ? (
            <div className="p-16 text-center text-slate-400 italic bg-slate-50/50">
              <Mail size={48} className="mx-auto mb-4 opacity-10" />
              <p>לא נמצאו מנהלי חוגים פעילים</p>
            </div>
          ) : (
            clubAdmins.map((m) => {
              const club = clubs.find(c => c.id === m.clubId);
              return (
                <div key={m.uid + m.clubId} className="p-5 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center shadow-sm">
                      <UserCheck size={24} />
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold text-slate-800 text-base md:text-lg leading-tight truncate max-w-[180px] md:max-w-xs" dir="ltr">{m.uid}</div>
                      <div className="flex gap-2 mt-1.5">
                        <StatusBadge 
                            type="CLUB_ADMIN" 
                            label={`${club?.label || m.clubId} (${m.accessLevel === AccessLevel.CLUB_ADMIN ? 'ניהול' : 'צוות'})`} 
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveClubAdmin(m.uid, m.clubId)}
                    className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                    title="ביטול הרשאת ניהול"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
