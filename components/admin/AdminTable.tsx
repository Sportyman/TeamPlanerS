
import React from 'react';
import { Trash2, ShieldAlert, Lock, UserX, UserCheck, XCircle } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { useAppStore } from '../../store';

interface AdminTableProps {
  onRemoveSuper: (email: string) => void;
  onRemoveClubAdmin: (uid: string, clubId: string) => void;
}

export const AdminTable: React.FC<AdminTableProps> = ({ onRemoveSuper, onRemoveClubAdmin }) => {
  const { superAdmins, protectedAdmins, people, clubs } = useAppStore();

  return (
    <div className="space-y-8">
      {/* Super Admins Section */}
      <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">מנהלי על גלובליים</h3>
          <span className="text-[10px] font-black bg-white px-3 py-1 rounded-full border text-slate-400 shadow-sm">TOTAL: {superAdmins.length}</span>
        </div>
        <div className="divide-y divide-slate-50">
          {superAdmins.map((email) => {
            const isProtected = protectedAdmins.some(a => a.toLowerCase() === email.toLowerCase());
            return (
              <div key={email} className="p-5 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isProtected ? 'bg-amber-100 text-amber-600' : 'bg-brand-100 text-brand-600'}`}>
                    {isProtected ? <Lock size={24} /> : <ShieldAlert size={24} />}
                  </div>
                  <div>
                    <div className="font-mono text-slate-800 font-bold text-sm md:text-base">{email}</div>
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
        <div className="p-6 bg-slate-50 border-b border-slate-100">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">מנהלי חוגים פעילים</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {people.filter(p => p.role === 'INSTRUCTOR').length === 0 ? (
            <div className="p-16 text-center text-slate-400 italic bg-slate-50/50">
              <UserCheck size={48} className="mx-auto mb-4 opacity-10" />
              <p>לא נמצאו מנהלי חוגים פעילים במערכת</p>
            </div>
          ) : (
            people.filter(p => p.role === 'INSTRUCTOR').map((p) => {
              const club = clubs.find(c => c.id === p.clubId);
              return (
                <div key={p.id + p.clubId} className="p-5 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center shadow-sm">
                      <UserCheck size={24} />
                    </div>
                    <div>
                      <div className="font-black text-slate-800 text-lg leading-tight">{p.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{p.id}</div>
                      <div className="flex gap-2 mt-1.5">
                        <StatusBadge type="CLUB_ADMIN" label={club?.label || p.clubId} />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveClubAdmin(p.id, p.clubId)}
                    className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                    title="הסר מניהול חוג"
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
