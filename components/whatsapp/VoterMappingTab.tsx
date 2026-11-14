import React, { useMemo, useState } from 'react';
import { Person, getRoleLabel } from '../../types';
import { ResolvedVoter, WhatsAppMemberMapping } from '../../types/whatsapp';
import { WhatsAppAvatar } from './WhatsAppAvatar';
import { Link2, Search, Unlink, UserPlus } from 'lucide-react';

interface VoterMappingTabProps {
  voters: ResolvedVoter[];
  mappings: WhatsAppMemberMapping[];
  people: Person[];
  onLinkVoter: (voter: ResolvedVoter, personId: string) => Promise<void>;
  onUnlinkVoter: (voterId: string) => Promise<void>;
  onAddGuest: (voter: ResolvedVoter, persistToClub: boolean) => Promise<any>;
}

export const VoterMappingTab: React.FC<VoterMappingTabProps> = ({
  voters,
  mappings,
  people,
  onLinkVoter,
  onUnlinkVoter,
  onAddGuest,
}) => {
  const [search, setSearch] = useState('');
  const [selectionMap, setSelectionMap] = useState<Record<string, string>>({});

  const mergedRows = useMemo(() => {
    const map = new Map<string, ResolvedVoter>();
    voters.forEach((v) => map.set(v.voterId, v));

    mappings.forEach((m) => {
      if (!map.has(m.voterId)) {
        const person = m.uid ? people.find((p) => p.id === m.uid) : undefined;
        map.set(m.voterId, {
          voterId: m.voterId,
          displayName: person?.name || m.pushName || m.phone || m.voterId.split('@')[0],
          profilePicUrl: m.profilePicUrl || person?.photoURL,
          phone: m.phone,
          selectedOptions: [],
          intent: 'UNVOTED',
          effectiveRole: person?.role || ('GUEST' as any),
          person,
          mapping: m,
          matchSource: person ? 'MANUAL_MAP' : 'UNMAPPED',
          timestampMs: 0,
        });
      }
    });

    const q = search.trim().toLowerCase();
    return Array.from(map.values())
      .filter(
        (r) =>
          !q ||
          r.displayName.toLowerCase().includes(q) ||
          (r.phone || '').includes(q) ||
          (r.person?.name.toLowerCase().includes(q) ?? false)
      )
      .sort((a, b) => {
        if (a.matchSource === 'UNMAPPED' && b.matchSource !== 'UNMAPPED') return -1;
        if (a.matchSource !== 'UNMAPPED' && b.matchSource === 'UNMAPPED') return 1;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [voters, mappings, people, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם וואטסאפ, טלפון או שם חבר..."
            className="w-full pr-9 pl-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500"
          />
        </div>
        <span className="text-xs text-slate-500 tabular-nums">
          סה״כ רשומות: {mergedRows.length} · לא משויכים: {mergedRows.filter((r) => r.matchSource === 'UNMAPPED').length}
        </span>
      </div>

      <div className="border border-slate-200 rounded-2xl bg-white divide-y divide-slate-100">
        {mergedRows.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">לא נמצאו מצביעים או מיפויים להצגה.</div>
        ) : (
          mergedRows.map((row) => {
            const chosenId = selectionMap[row.voterId] || row.suggestedPerson?.id || '';
            return (
              <div key={row.voterId} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <WhatsAppAvatar name={row.displayName} src={row.profilePicUrl} sizeClass="w-10 h-10 text-xs" />
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-slate-900 truncate">{row.displayName}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono tabular-nums" dir="ltr">{row.phone || row.voterId}</span>
                      {row.suggestedPerson && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-700 font-semibold">הצעה לפי טלפון: {row.suggestedPerson.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {row.person ? (
                    <>
                      <span className="text-xs text-slate-700 font-semibold">
                        משויך אל: {row.person.name} ({getRoleLabel(row.person.role, row.person.gender)})
                      </span>
                      {row.matchSource === 'MANUAL_MAP' && (
                        <button
                          type="button"
                          onClick={() => onUnlinkVoter(row.voterId)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:text-red-700 hover:border-red-200 flex items-center gap-1 whitespace-nowrap"
                        >
                          <Unlink size={13} />
                          <span>נתק</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <select
                        value={chosenId}
                        onChange={(e) => setSelectionMap((p) => ({ ...p, [row.voterId]: e.target.value }))}
                        className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white max-w-[180px]"
                      >
                        <option value="">בחר חבר לשיוך...</option>
                        {people.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({getRoleLabel(p.role, p.gender)})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!chosenId}
                        onClick={() => onLinkVoter(row, chosenId)}
                        className="px-3 py-2 rounded-lg bg-brand-600 disabled:opacity-40 text-white text-xs font-bold hover:bg-brand-700 flex items-center gap-1 whitespace-nowrap"
                      >
                        <Link2 size={14} />
                        <span>שמור שיוך</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddGuest(row, true)}
                        className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                      >
                        <UserPlus size={14} />
                        <span>צור כאורח</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
