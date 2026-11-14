import React, { useMemo, useState } from 'react';
import { ClubID, Person, Role } from '../../types';
import { MatchCandidate, WhatsAppMemberMapping } from '../../types/whatsapp';
import { getMappingUidForClub } from '../../services/whatsapp/pollMatching';
import { WhatsAppAvatar } from './WhatsAppAvatar';
import { Check, UserPlus, Users, X } from 'lucide-react';

interface WhatsAppRosterModalProps {
  activeClub: ClubID;
  linkedGroups: string[];
  mappings: WhatsAppMemberMapping[];
  people: Person[];
  syncCandidates: MatchCandidate[];
  onConfirmCandidate: (candidate: MatchCandidate, roleOverride?: Role) => Promise<void>;
  onImportEntries: (entries: Array<{ mapping: WhatsAppMemberMapping; role: Role; isSkipper?: boolean }>) => Promise<number>;
  onClose: () => void;
}

export const WhatsAppRosterModal: React.FC<WhatsAppRosterModalProps> = ({
  activeClub, linkedGroups, mappings, people, syncCandidates, onConfirmCandidate, onImportEntries, onClose,
}) => {
  const [groupFilter, setGroupFilter] = useState('');
  const [defaultRole, setDefaultRole] = useState<Role>(Role.MEMBER);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [roleOverrides, setRoleOverrides] = useState<Record<string, Role>>({});
  const [candidateRoles, setCandidateRoles] = useState<Record<string, Role>>({});
  const [busy, setBusy] = useState(false);

  const availableGroups = useMemo(() => {
    const all = Array.from(new Set(mappings.flatMap((m) => m.groups || []).filter(Boolean)));
    if (!linkedGroups.length) return all;
    return all.filter((g) => linkedGroups.some((lg) => g.toLowerCase().includes(lg.trim().toLowerCase())));
  }, [mappings, linkedGroups]);

  const unlinkedMembers = useMemo(() => {
    const linkedPersonIds = new Set(people.map((p) => p.id));
    return mappings.filter((m) => {
      const uid = getMappingUidForClub(m, activeClub);
      if (uid && linkedPersonIds.has(uid)) return false;
      if (groupFilter && !(m.groups || []).includes(groupFilter)) return false;
      return true;
    });
  }, [mappings, people, activeClub, groupFilter]);

  const toggleSelect = (voterId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(voterId)) next.delete(voterId);
      else next.add(voterId);
      return next;
    });
  };

  const handleImport = async () => {
    const chosen = unlinkedMembers.filter((m) => selectedIds.has(m.voterId));
    if (chosen.length === 0) return;
    setBusy(true);
    try {
      await onImportEntries(chosen.map((m) => ({ mapping: m, role: roleOverrides[m.voterId] || defaultRole })));
      setSelectedIds(new Set());
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-brand-600" />
            <h3 className="text-base font-black text-slate-900">יבוא וסנכרון חברי קבוצת הוואטסאפ של החוג</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={18} /></button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {syncCandidates.length > 0 && (
            <div className="border border-emerald-200 bg-emerald-50/70 rounded-xl p-3 space-y-2">
              <div className="text-xs font-bold text-emerald-900">נמצאו {syncCandidates.length} התאמות מוצעות בחוג זה (ניתן לעדכן תפקיד בעת האישור)</div>
              <div className="divide-y divide-emerald-100">
                {syncCandidates.map((c) => {
                  const chosenRole = candidateRoles[c.person.id] || c.person.role;
                  return (
                    <div key={`${c.mapping.voterId}-${c.person.id}`} className="py-2 flex items-center justify-between gap-2 text-xs flex-wrap">
                      <span className="text-slate-800">
                        <strong>{c.mapping.pushName || c.mapping.phone}</strong> ↔ <strong>{c.person.name}</strong>
                        <span className="text-slate-500 mr-1.5">({c.confidence === 'PHONE_EXACT' ? 'טלפון' : 'שם'})</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <select value={chosenRole} onChange={(e) => setCandidateRoles((p) => ({ ...p, [c.person.id]: e.target.value as Role }))} className="border border-emerald-200 rounded-lg px-2 py-1 bg-white">
                          <option value={Role.MEMBER}>חבר</option>
                          <option value={Role.VOLUNTEER}>מתנדב</option>
                          <option value={Role.INSTRUCTOR}>מדריך</option>
                          <option value={Role.GUEST}>אורח</option>
                        </select>
                        <button type="button" onClick={() => onConfirmCandidate(c, chosenRole)} className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-800 flex items-center gap-1 whitespace-nowrap">
                          <Check size={12} /> אשר סנכרון
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                <option value="">כל קבוצות החוג ({unlinkedMembers.length})</option>
                {availableGroups.map((g) => (<option key={g} value={g}>{g}</option>))}
              </select>
              <select value={defaultRole} onChange={(e) => setDefaultRole(e.target.value as Role)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white">
                <option value={Role.MEMBER}>ברירת מחדל: חבר</option>
                <option value={Role.VOLUNTEER}>ברירת מחדל: מתנדב</option>
                <option value={Role.INSTRUCTOR}>ברירת מחדל: מדריך</option>
                <option value={Role.GUEST}>ברירת מחדל: אורח</option>
              </select>
            </div>
            <button type="button" onClick={() => setSelectedIds(new Set(unlinkedMembers.map((m) => m.voterId)))} className="font-bold text-brand-700 hover:underline">
              בחר הכל ({unlinkedMembers.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {unlinkedMembers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">כל חברי קבוצת הוואטסאפ של החוג כבר משויכים למאגר, או שטרם קושרה קבוצה בהגדרות.</div>
            ) : (
              unlinkedMembers.map((m) => (
                <div key={m.voterId} className="p-3 flex items-center justify-between gap-3">
                  <label className="flex items-center gap-3 min-w-0 cursor-pointer flex-1">
                    <input type="checkbox" checked={selectedIds.has(m.voterId)} onChange={() => toggleSelect(m.voterId)} className="rounded border-slate-300" />
                    <WhatsAppAvatar name={m.pushName || m.phone || '?'} src={m.profilePicUrl} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{m.pushName || m.phone || m.voterId}</div>
                      <div className="text-xs text-slate-500 font-mono truncate" dir="ltr">{m.phone || m.voterId} {m.groups?.length ? `· ${m.groups.join(', ')}` : ''}</div>
                    </div>
                  </label>
                  <select value={roleOverrides[m.voterId] || defaultRole} onChange={(e) => setRoleOverrides((p) => ({ ...p, [m.voterId]: e.target.value as Role }))} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
                    <option value={Role.MEMBER}>חבר</option>
                    <option value={Role.VOLUNTEER}>מתנדב</option>
                    <option value={Role.INSTRUCTOR}>מדריך</option>
                    <option value={Role.GUEST}>אורח</option>
                  </select>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
          <span className="text-xs text-slate-600 tabular-nums">נבחרו לייבוא: {selectedIds.size}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-600">סגור</button>
            <button type="button" disabled={busy || selectedIds.size === 0} onClick={handleImport} className="px-4 py-2 rounded-xl bg-brand-600 disabled:opacity-40 text-white text-xs font-bold hover:bg-brand-700 flex items-center gap-1.5">
              <UserPlus size={14} /> <span>ייבא נבחרים לחוג</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
