
import React, { useEffect, useState } from 'react';
import { ShieldAlert, Lock, UserX, UserCheck, XCircle, Loader2, Mail, User } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useAppStore } from '../../store';
import { ClubMembership, AccessLevel, UserProfile } from '../../types';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface AdminTableProps {
  onRemoveSuper: (email: string) => void;
  onRemoveClubAdmin: (uid: string, clubId: string) => void;
}

export const AdminTable: React.FC<AdminTableProps> = ({ onRemoveSuper, onRemoveClubAdmin }) => {
  const { superAdmins, protectedAdmins, clubs, user } = useAppStore();
  const [clubAdmins, setClubAdmins] = useState<ClubMembership[]>([]);
  const [profilesCache, setProfilesCache] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  const allSuperAdmins = Array.from(new Set([...protectedAdmins, ...superAdmins]));

  // 1. Listen to memberships
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(collection(db, 'memberships'), where('accessLevel', '>=', AccessLevel.STAFF));
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const adminMemberships = snap.docs.map(d => d.data() as ClubMembership);
      setClubAdmins(adminMemberships);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // 2. Hydrate profiles for UIDs found in clubAdmins
  useEffect(() => {
    const fetchMissingProfiles = async () => {
      const uidsToFetch = clubAdmins
        .map(m => m.uid)
        .filter(uid => uid && !profilesCache[uid] && !uid.includes('@')); // Don't fetch if it's an email

      if (uidsToFetch.length === 0) return;

      const newProfiles = { ...profilesCache };
      await Promise.all(uidsToFetch.map(async (uid) => {
        const snap = await getDoc(doc(db, 'profiles', uid));
        if (snap.exists()) {
          newProfiles[uid] = snap.data() as UserProfile;
        }
      }));
      setProfilesCache(newProfiles);
    };

    fetchMissingProfiles();
  }, [clubAdmins]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Super Admins Section */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">מנהלי על גלובליים</h3>
          <span className="text-[10px] font-black bg-white px-3 py-1 rounded-full border text-slate-400 shadow-sm uppercase">סה"כ: {allSuperAdmins.length}</span>
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
                    <div className="font-bold text-slate-800 text-base md:text-lg leading-tight truncate max-w-[200px]">{email}</div>
                    <div className="flex gap-2 mt-1"><StatusBadge type={isProtected ? 'ROOT' : 'SUPER'} /></div>
                  </div>
                </div>
                {!isProtected && (
                  <button onClick={() => onRemoveSuper(email)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><UserX size={24} /></button>
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
          {clubAdmins.length === 0 && !loading ? (
            <div className="p-16 text-center text-slate-400 italic bg-slate-50/50"><Mail size={48} className="mx-auto mb-4 opacity-10" /><p>אין מנהלי חוגים פעילים</p></div>
          ) : (
            clubAdmins.map((m) => {
              const club = clubs.find(c => c.id === m.clubId);
              const profile = profilesCache[m.uid];
              const displayName = profile ? `${profile.firstName} ${profile.lastName}` : (m.uid.includes('@') ? m.uid : 'טוען...');
              
              return (
                <div key={m.uid + m.clubId} className="p-5 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center shadow-sm">
                      {profile?.photoURL ? <img src={profile.photoURL} className="w-full h-full object-cover rounded-2xl" /> : <User size={24} />}
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-bold text-slate-800 text-base md:text-lg leading-tight truncate max-w-[180px] md:max-w-xs">{displayName}</div>
                      <div className="flex gap-2 mt-1.5">
                        <StatusBadge type="CLUB_ADMIN" label={`${club?.label || 'חוג'} (${m.accessLevel === AccessLevel.CLUB_ADMIN ? 'מנהל' : 'צוות'})`} />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => onRemoveClubAdmin(m.uid, m.clubId)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><XCircle size={24} /></button>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
