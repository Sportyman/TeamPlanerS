import React, { useMemo, useState } from 'react';
import { ClubID, Person, Role, getRoleLabel } from '../../types';
import { MatchCandidate, ResolvedVoter, WhatsAppMemberMapping } from '../../types/whatsapp';
import { getMappingUidForClub } from '../../services/whatsapp/pollMatching';
import { WhatsAppAvatar } from './WhatsAppAvatar';
import { WhatsAppRosterModal } from './WhatsAppRosterModal';
import { GroupLinkSelect } from './GroupLinkSelect';
import { Check, Link2, Search, Unlink, UserPlus, Users } from 'lucide-react';

interface VoterMappingTabProps {
  activeClub: ClubID;
  linkedGroups: string[];
  availableGroups: string[];
  voters: ResolvedVoter[];
  mappings: WhatsAppMemberMapping[];
  people: Person[];
  syncCandidates: MatchCandidate[];
  onLinkVoter: (voter: ResolvedVoter, personId: string) => Promise<void>;
  onUnlinkVoter: (voterId: string) => Promise<void>;
  onAddGuest: (voter: ResolvedVoter, persistToClub: boolean) => Promise<any>;
  onConfirmCandidate: (candidate: MatchCandidate, roleOverride?: Role) => Promise<void>;
  onImportRoster: (entries: Array<{ mapping: WhatsAppMemberMapping; role: Role; isSkipper?: boolean }>) => Promise<number>;
  onUpdatePersonRole: (person: Person, role: Role, isSkipper?: boolean) => Promise<void>;
  onLinkGroup: (groupName: string) => Promise<void>;
}

export const VoterMappingTab: React.FC<VoterMappingTabProps> = ({
  activeClub, linkedGroups, availableGroups, voters, mappings, people, syncCandidates,
  onLinkVoter, onUnlinkVoter, onAddGuest, onConfirmCandidate, onImportRoster, onUpdatePersonRole, onLinkGroup,
}) => {
  const [search, setSearch] = useState('');
  const [selectionMap, setSelectionMap] = useState<Record<string, string>>({});
  const [candidateRoles, setCandidateRoles] = useState<Record<string, Role>>({});
  const [showRosterModal, setShowRosterModal] = useState(false);

  const mergedRows = useMemo(() => {
    const map = new Map<string, ResolvedVoter>();
    voters.forEach((v) => map.set(v.voterId, v));
    mappings.forEach((m) => {
      if (!map.has(m.voterId)) {
        const uid = getMappingUidForClub(m, activeClub);
        const person = uid ? people.find((p) => p.id === uid) : undefined;
        map.set(m.voterId, {
          voterId: m.voterId, displayName: person?.name || m.pushName || m.phone || m.voterId.split('@')[0],
          profilePicUrl: m.profilePicUrl || person?.photoURL, phone: m.phone, selectedOptions: [], intent: 'UNVOTED',
          effectiveRole: person?.role || Role.GUEST, person, mapping: m, matchSource: person ? 'MANUAL_MAP' : 'UNMAPPED', timestampMs: 0,
        });
      }
    });
    const q = search.trim().toLowerCase();
    return Array.from(map.values())
      .filter((r) => !q || r.displayName.toLowerCase().includes(q) || (r.phone || '').includes(q) || (r.person?.name.toLowerCase().includes(q) ?? false))
      .sort((a, b) => (a.matchSource === 'UNMAPPED' && b.matchSource !== 'UNMAPPED' ? -1 : a.matchSource !== 'UNMAPPED' && b.matchSource === 'UNMAPPED' ? 1 : a.displayName.localeCompare(b.displayName)));
  }, [voters, mappings, people, activeClub, search]);

  return (
    <div className="space-y-4">
      {linkedGroups.length === 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap text-xs">
          <span className="font-bold text-amber-900">יש לשייך קבוצת וואטסאפ לחוג זה כדי להציג רק את חברי החוג (גם אם הם חברים במספר חוגים).</span>
          <GroupLinkSelect groups={availableGroups} onLink={onLinkGroup} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש לפי שם וואטסאפ, טלפון או שם חבר..." className="w-full pr-9 pl-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-500 tabular-nums">רשומות בחוג: {mergedRows.length} · לא משויכים: {mergedRows.filter((r) => r.matchSource === 'UNMAPPED').length}</span>
          <button type="button" onClick={() => setShowRosterModal(true)} className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
            <Users size={14} /> <span>ייבוא וסנכרון מהקבוצה ({mappings.length})</span>
          </button>
        </div>
      </div>

      {syncCandidates.length > 0 && (
        <div className="border border-emerald-200 bg-emerald-50/70 rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-emerald-900">זיהוי אוטומטי בחוג: נמצאו {syncCandidates.length} התאמות</span>
            <button type="button" onClick={() => setShowRosterModal(true)} className="text-emerald-800 font-bold underline">רשימה מלאה</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {syncCandidates.slice(0, 4).map((c) => {
              const roleVal = candidateRoles[c.person.id] || c.person.role;
              return (
                <div key={`${c.mapping.voterId}-${c.person.id}`} className="flex items-center gap-1 bg-white border border-emerald-300 rounded-lg px-2 py-1">
                  <span className="font-bold text-slate-800">{c.person.name}</span>
                  <select value={roleVal} onChange={(e) => setCandidateRoles((p) => ({ ...p, [c.person.id]: e.target.value as Role }))} className="text-[11px] border-none bg-transparent text-slate-600 font-semibold">
                    <option value={Role.MEMBER}>חבר</option>
                    <option value={Role.VOLUNTEER}>מתנדב</option>
                    <option value={Role.INSTRUCTOR}>מדריך</option>
                    <option value={Role.GUEST}>אורח</option>
                  </select>
                  <button type="button" onClick={() => onConfirmCandidate(c, roleVal)} className="px-2 py-0.5 rounded bg-emerald-700 text-white font-bold hover:bg-emerald-800 flex items-center gap-1">
                    <Check size={11} /> אשר
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="border border-slate-200 rounded-2xl bg-white divide-y divide-slate-100">
        {mergedRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">לא נמצאו חברי קבוצה לחוג זה.</div>
        ) : (
          mergedRows.map((row) => {
            const chosenId = selectionMap[row.voterId] || row.suggestedPerson?.id || '';
            const person = row.person;
            return (
              <div key={row.voterId} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <WhatsAppAvatar name={row.displayName} src={row.profilePicUrl} sizeClass="w-10 h-10 text-xs" />
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">{row.displayName}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono tabular-nums" dir="ltr">{row.phone || row.voterId}</span>
                      {row.mapping?.groups?.length ? <span>· {row.mapping.groups.join(', ')}</span> : null}
                      {row.suggestedPerson && <span className="text-emerald-700 font-semibold">· הצעה: {row.suggestedPerson.name}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {person ? (
                    <>
                      <span className="text-xs text-slate-700 font-semibold">{person.name}</span>
                      <select value={person.role} onChange={(e) => onUpdatePersonRole(person, e.target.value as Role)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white font-semibold">
                        <option value={Role.MEMBER}>{getRoleLabel(Role.MEMBER, person.gender)}</option>
                        <option value={Role.VOLUNTEER}>{getRoleLabel(Role.VOLUNTEER, person.gender)}</option>
                        <option value={Role.INSTRUCTOR}>{getRoleLabel(Role.INSTRUCTOR, person.gender)}</option>
                        <option value={Role.GUEST}>{getRoleLabel(Role.GUEST, person.gender)}</option>
                      </select>
                      {row.matchSource === 'MANUAL_MAP' && (
                        <button type="button" onClick={() => onUnlinkVoter(row.voterId)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:text-red-700 hover:border-red-200 flex items-center gap-1 whitespace-nowrap">
                          <Unlink size={13} /> <span>נתק</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <select value={chosenId} onChange={(e) => setSelectionMap((p) => ({ ...p, [row.voterId]: e.target.value }))} className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white max-w-[180px]">
                        <option value="">בחר חבר לשיוך...</option>
                        {people.map((p) => (<option key={p.id} value={p.id}>{p.name} ({getRoleLabel(p.role, p.gender)})</option>))}
                      </select>
                      <button type="button" disabled={!chosenId} onClick={() => onLinkVoter(row, chosenId)} className="px-3 py-2 rounded-lg bg-brand-600 disabled:opacity-40 text-white text-xs font-bold hover:bg-brand-700 flex items-center gap-1 whitespace-nowrap">
                        <Link2 size={14} /> <span>שמור שיוך</span>
                      </button>
                      <button type="button" onClick={() => onAddGuest(row, true)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                        <UserPlus size={14} /> <span>צור כאורח</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showRosterModal && (
        <WhatsAppRosterModal
          activeClub={activeClub} linkedGroups={linkedGroups} mappings={mappings} people={people}
          syncCandidates={syncCandidates} onConfirmCandidate={onConfirmCandidate} onImportEntries={onImportRoster}
          onClose={() => setShowRosterModal(false)}
        />
      )}
    </div>
  );
};
