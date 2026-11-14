import React, { useMemo, useState } from 'react';
import { Person, getRoleLabel } from '../../types';
import { ResolvedVoter } from '../../types/whatsapp';
import { WhatsAppAvatar } from './WhatsAppAvatar';
import { Link2, Search, UserPlus, X } from 'lucide-react';

interface VoterLinkModalProps {
  voters: ResolvedVoter[];
  people: Person[];
  onLink: (voter: ResolvedVoter, personId: string) => Promise<void>;
  onAddGuest: (voter: ResolvedVoter, persistToClub: boolean) => Promise<void>;
  onClose: () => void;
}

export const VoterLinkModal: React.FC<VoterLinkModalProps> = ({
  voters,
  people,
  onLink,
  onAddGuest,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [selectedByVoter, setSelectedByVoter] = useState<Record<string, string>>({});
  const [persistGuest, setPersistGuest] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const unmappedVoters = useMemo(
    () => voters.filter((v) => v.matchSource === 'UNMAPPED'),
    [voters]
  );

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.phone || '').includes(q)
    );
  }, [people, search]);

  const handleLink = async (voter: ResolvedVoter) => {
    const targetId = selectedByVoter[voter.voterId] || voter.suggestedPerson?.id;
    if (!targetId) return;
    setBusyId(voter.voterId);
    try {
      await onLink(voter, targetId);
    } finally {
      setBusyId(null);
    }
  };

  const handleGuest = async (voter: ResolvedVoter) => {
    setBusyId(voter.voterId);
    try {
      await onAddGuest(voter, persistGuest);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">זיהוי מצביעים מוואטסאפ ({unmappedVoters.length})</h3>
            <p className="text-xs text-slate-500">שייך מצביעים חדשים לחבר קיים בחוג או הוסף אותם כאורחים לאימון</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="סינון רשימת חברי החוג..."
              className="w-full pr-9 pl-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 whitespace-nowrap cursor-pointer">
            <input
              type="checkbox"
              checked={persistGuest}
              onChange={(e) => setPersistGuest(e.target.checked)}
              className="rounded border-slate-300 text-brand-600"
            />
            <span>שמור אורחים חדשים גם ברשימת החוג</span>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-5">
          {unmappedVoters.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">כל המצביעים בסקר זה כבר משויכים לחברים או אורחים.</div>
          ) : (
            unmappedVoters.map((voter) => {
              const selectedId = selectedByVoter[voter.voterId] || voter.suggestedPerson?.id || '';
              const isBusy = busyId === voter.voterId;
              return (
                <div key={voter.voterId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <WhatsAppAvatar name={voter.displayName} src={voter.profilePicUrl} sizeClass="w-10 h-10 text-xs" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">{voter.displayName}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span>בחירה: {voter.selectedOptions.join(', ') || 'ללא'}</span>
                        {voter.phone && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums" dir="ltr">{voter.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <select
                      value={selectedId}
                      onChange={(e) =>
                        setSelectedByVoter((prev) => ({ ...prev, [voter.voterId]: e.target.value }))
                      }
                      className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-800 max-w-[180px]"
                    >
                      <option value="">בחר חבר חוג...</option>
                      {filteredPeople.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({getRoleLabel(p.role, p.gender)})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedId || isBusy}
                      onClick={() => handleLink(voter)}
                      className="px-3 py-2 rounded-lg bg-brand-600 disabled:opacity-40 text-white text-xs font-bold hover:bg-brand-700 flex items-center gap-1 whitespace-nowrap"
                    >
                      <Link2 size={14} />
                      <span>שייך</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleGuest(voter)}
                      className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                    >
                      <UserPlus size={14} />
                      <span>הוסף כאורח</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
