
import React from 'react';
// Added UserCheck to the imports to resolve the error on line 79
import { Trash2, ShieldAlert, Lock, UserX, UserCheck } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useAppStore } from '../../store';

interface AdminTableProps {
  onRemoveSuper: (email: string) => void;
  onRemoveClubAdmin: (uid: string, clubId: string) => void;
}

export const AdminTable: React.FC<AdminTableProps> = ({ onRemoveSuper, onRemoveClubAdmin }) => {
  const { superAdmins, protectedAdmins, people, clubs } = useAppStore();

  // Combine data: We need to see who has CLUB_ADMIN/STAFF level in memberships? 
  // For now, let's use the current "superAdmins" and a simplified view of Club Admins from People.
  // In v5, memberships will be the source of truth, but we display active people as a proxy.

  return (
    <div className="space-y-8">
      {/* Super Admins Section */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">מנהלי על גלובליים</h3>
          <span className="text-[10px] font-black bg-white px-2 py-1 rounded border text-slate-400">TOTAL: {superAdmins.length}</span>
        </div>
        <div className="divide-y divide-slate-50">
          {superAdmins.map((email) => {
            const isProtected = protectedAdmins.some(a => a.toLowerCase() === email.toLowerCase());
            return (
              <div key={email} className="p-5 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isProtected ? 'bg-amber-100 text-amber-600' : 'bg-brand-100 text-brand-600'}`}>
                    {isProtected ? <Lock size={24} /> : <ShieldAlert size={24} />}
                  </div>
                  <div>
                    <div className="font-mono text-slate-800 font-bold">{email}</div>
                    <div className="flex gap-2 mt-1">
                      <StatusBadge type={isProtected ? 'ROOT' : 'SUPER'} />
                    </div>
                  </div>
                </div>
                
                {isProtected ? (
                  <div className="flex items-center gap-2 text-slate-300 text-[10px] font-black uppercase px-4 py-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    מנהל מערכת חסין
                  </div>
                ) : (
                  <button
                    onClick={() => onRemoveSuper(email)}
                    className="p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                    title="ביטול הרשאה גלובלית"
                  >
                    <UserX size={20} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Club Admins Section */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">מנהלי חוגים פעילים</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {/* Note: In a real v5 implementation, we would iterate over all memberships with Level >= 2 */}
          {people.filter(p => p.role === 'INSTRUCTOR').length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">לא נמצאו מנהלי חוגים מוגדרים ברמת ה-Membership.</div>
          ) : (
            people.filter(p => p.role === 'INSTRUCTOR').map((p) => {
              const club = clubs.find(c => c.id === p.clubId);
              return (
                <div key={p.id + p.clubId} className="p-5 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center">
                      <UserCheck size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{p.id}</div>
                      <div className="flex gap-2 mt-1">
                        <StatusBadge type="CLUB_ADMIN" label={club?.label || p.clubId} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
