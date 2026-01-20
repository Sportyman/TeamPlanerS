
import React, { useState } from 'react';
import { X, Shield, Users, Save, Loader2, AlertTriangle, Building2 } from 'lucide-react';
import { AccessLevel, ClubID } from '../../types';
import { useAppStore } from '../../store';

interface RoleAssignmentModalProps {
  user: { uid?: string; email: string; name?: string };
  onClose: () => void;
  onConfirm: (data: { scope: 'GLOBAL' | 'CLUB'; clubId?: ClubID; level: AccessLevel }) => Promise<void>;
  isProcessing: boolean;
}

export const RoleAssignmentModal: React.FC<RoleAssignmentModalProps> = ({ user, onClose, onConfirm, isProcessing }) => {
  const { clubs } = useAppStore();
  const [scope, setScope] = useState<'GLOBAL' | 'CLUB'>('CLUB');
  const [clubId, setClubId] = useState<ClubID>(clubs[0]?.id || '');
  const [level, setLevel] = useState<AccessLevel>(AccessLevel.STAFF);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({ scope, clubId: scope === 'CLUB' ? clubId : undefined, level });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in slide-in-from-bottom-4 duration-300">
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black text-slate-800">הגדרת הרשאות</h3>
            <p className="text-slate-500 text-sm mt-1">עבור: <span className="font-bold text-brand-600">{user.name || user.email}</span></p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-200 transition-all">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
          {/* Scope Selector */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">היקף סמכויות (Scope)</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => { setScope('CLUB'); setLevel(AccessLevel.STAFF); }}
                className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all ${scope === 'CLUB' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
              >
                <Users size={32} />
                <span className="font-bold">ניהול חוג</span>
              </button>
              <button
                type="button"
                onClick={() => { setScope('GLOBAL'); setLevel(AccessLevel.SUPER_ADMIN); }}
                className={`flex flex-col items-center gap-3 p-6 rounded-3xl border-2 transition-all ${scope === 'GLOBAL' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
              >
                <Shield size={32} />
                <span className="font-bold">ניהול מערכת</span>
              </button>
            </div>
          </div>

          {scope === 'CLUB' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Building2 size={14} /> בחירת חוג
                </label>
                <select
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  className="w-full p-4 border-2 border-slate-100 rounded-2xl focus:border-brand-500 outline-none font-bold text-slate-800"
                >
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">רמת הרשאה בחוג</label>
                <div className="space-y-2">
                  {[
                    { val: AccessLevel.STAFF, label: 'Staff (שיבוץ ונוכחות בלבד)', color: 'bg-emerald-500' },
                    { val: AccessLevel.CLUB_ADMIN, label: 'Club Admin (ניהול מלא של החוג)', color: 'bg-brand-600' }
                  ].map((l) => (
                    <button
                      key={l.val}
                      type="button"
                      onClick={() => setLevel(l.val)}
                      className={`w-full p-4 rounded-2xl border-2 text-right flex items-center gap-4 transition-all ${level === l.val ? 'border-slate-800 bg-slate-800 text-white shadow-lg' : 'border-slate-100 text-slate-600 hover:border-slate-200'}`}
                    >
                      <div className={`w-3 h-3 rounded-full ${l.color}`} />
                      <span className="font-bold">{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 flex items-start gap-4 animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="text-amber-600 shrink-0" size={24} />
              <div className="text-sm text-amber-800">
                <p className="font-black mb-1">זהירות: הרשאת מנהל-על (Super Admin)</p>
                <p>מנהל על מקבל גישה מלאה לכלל החוגים, להגדרות הגלובליות ולניהול משתמשים אחרים. הענק הרשאה זו רק למנהלים בכירים במערכת.</p>
              </div>
            </div>
          )}

          <div className="pt-4 flex gap-4">
            <button
              type="submit"
              disabled={isProcessing}
              className="flex-1 bg-slate-900 hover:bg-black text-white py-5 rounded-[2rem] font-black text-xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <><Save size={24} /> אישור ומינוי</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
