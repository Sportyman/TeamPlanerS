import React, { useMemo, useState } from 'react';
import { Person, Role, getRoleLabel, Gender } from '../../types';
import { ResolvedPollSummary, ResolvedVoter, VoteChangeAlert } from '../../types/whatsapp';
import { WhatsAppAvatar } from './WhatsAppAvatar';
import { PollVoterMobileCard } from './PollVoterMobileCard';
import { Link2, UserPlus } from 'lucide-react';

type SummaryFilter = 'ALL' | 'ATTENDING' | 'VOLUNTEER' | 'MEMBER' | 'GUEST' | 'DECLINING' | 'UNMAPPED';

interface PollSummaryTabProps {
  summary: ResolvedPollSummary;
  people: Person[];
  voteAlerts: VoteChangeAlert[];
  onLinkVoter: (voter: ResolvedVoter, personId: string) => Promise<void>;
  onAddGuest: (voter: ResolvedVoter, persistToClub: boolean) => Promise<any>;
  onUpdatePersonRole: (person: Person, role: Role, isSkipper?: boolean) => Promise<void>;
}

const INTENT_LABELS: Record<string, { label: string; className: string }> = {
  ATTENDING: { label: 'מגיע', className: 'text-emerald-700 font-bold' },
  DECLINING: { label: 'לא מגיע', className: 'text-red-700 font-semibold' },
  MAYBE: { label: 'אולי / אחר', className: 'text-amber-700 font-semibold' },
  UNVOTED: { label: 'ביטל הצבעה', className: 'text-slate-500' },
};

export const PollSummaryTab: React.FC<PollSummaryTabProps> = ({
  summary, people, voteAlerts, onLinkVoter, onAddGuest, onUpdatePersonRole,
}) => {
  const [filter, setFilter] = useState<SummaryFilter>('ALL');
  const [quickSelect, setQuickSelect] = useState<Record<string, string>>({});

  const filteredVoters = useMemo(() => summary.voters.filter((v) => {
    if (filter === 'ALL') return true;
    if (filter === 'ATTENDING') return v.intent === 'ATTENDING';
    if (filter === 'DECLINING') return v.intent === 'DECLINING';
    if (filter === 'UNMAPPED') return v.matchSource === 'UNMAPPED';
    if (filter === 'VOLUNTEER') return v.intent === 'ATTENDING' && (v.effectiveRole === Role.VOLUNTEER || v.effectiveRole === Role.INSTRUCTOR);
    if (filter === 'MEMBER') return v.intent === 'ATTENDING' && v.effectiveRole === Role.MEMBER;
    if (filter === 'GUEST') return v.intent === 'ATTENDING' && v.effectiveRole === Role.GUEST;
    return true;
  }), [summary.voters, filter]);

  const filters: { id: SummaryFilter; label: string }[] = [
    { id: 'ALL', label: `הכל (${summary.voters.length})` },
    { id: 'ATTENDING', label: `מגיעים (${summary.counts.totalAttending})` },
    { id: 'VOLUNTEER', label: `מתנדבים (${summary.counts.volunteers + summary.counts.instructors})` },
    { id: 'MEMBER', label: `חברים (${summary.counts.members})` },
    { id: 'GUEST', label: `אורחים (${summary.counts.guests})` },
    { id: 'DECLINING', label: `לא מגיעים (${summary.counts.declining})` },
    { id: 'UNMAPPED', label: `לא מזוהים (${summary.voters.filter((v) => v.matchSource === 'UNMAPPED').length})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.id} type="button" onClick={() => setFilter(f.id)}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap shrink-0 transition-colors tabular-nums min-h-[40px] ${filter === f.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="md:hidden border border-slate-200 rounded-2xl bg-white divide-y divide-slate-100">
        {filteredVoters.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">אין מצביעים התואמים לסינון זה.</div>
        ) : (
          filteredVoters.map((voter) => (
            <PollVoterMobileCard
              key={voter.voterId}
              voter={voter}
              intentLabel={INTENT_LABELS[voter.intent].label}
              intentClassName={INTENT_LABELS[voter.intent].className}
              people={people}
              chosenId={quickSelect[voter.voterId] || voter.suggestedPerson?.id || ''}
              onSelectPersonId={(id) => setQuickSelect((p) => ({ ...p, [voter.voterId]: id }))}
              onLinkVoter={onLinkVoter}
              onAddGuest={onAddGuest}
              onUpdatePersonRole={onUpdatePersonRole}
            />
          ))
        )}
      </div>

      <div className="hidden md:block border border-slate-200 rounded-2xl bg-white overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
            <tr>
              <th className="py-3 px-4 font-bold">משתתף בוואטסאפ</th>
              <th className="py-3 px-4 font-bold">סטטוס ובחירה בסקר</th>
              <th className="py-3 px-4 font-bold">תואר / תפקיד בחוג</th>
              <th className="py-3 px-4 font-bold">שיוך במערכת</th>
              <th className="py-3 px-4 font-bold">עדכון</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredVoters.length === 0 ? (
              <tr><td colSpan={5} className="py-10 text-center text-sm text-slate-500">אין מצביעים התואמים לסינון זה.</td></tr>
            ) : (
              filteredVoters.map((voter) => {
                const intentInfo = INTENT_LABELS[voter.intent];
                const chosenId = quickSelect[voter.voterId] || voter.suggestedPerson?.id || '';
                const person = voter.person;
                return (
                  <tr key={voter.voterId} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <WhatsAppAvatar name={voter.displayName} src={voter.profilePicUrl} />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{voter.displayName}</div>
                          <div className="text-xs text-slate-500 font-mono tabular-nums" dir="ltr">{voter.phone || voter.voterId.split('@')[0]}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`text-xs ${intentInfo.className}`}>
                        {intentInfo.label}
                        {voter.updatedRecently && <span className="mr-1.5 text-amber-700">· שונה כעת</span>}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">{voter.selectedOptions.join(', ') || 'ללא בחירה'}</div>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {person ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <select value={voter.effectiveRole} onChange={(e) => onUpdatePersonRole(person, e.target.value as Role)} className="border border-slate-200 rounded-lg px-2 py-1.5 bg-white font-semibold text-slate-800 min-h-[38px]">
                              <option value={Role.UNASSIGNED}>לא הוגדר</option>
                              <option value={Role.MEMBER}>{getRoleLabel(Role.MEMBER, person.gender)}</option>
                              <option value={Role.VOLUNTEER}>{getRoleLabel(Role.VOLUNTEER, person.gender)}</option>
                              <option value={Role.INSTRUCTOR}>{getRoleLabel(Role.INSTRUCTOR, person.gender)}</option>
                              <option value={Role.GUEST}>{getRoleLabel(Role.GUEST, person.gender)}</option>
                            </select>
                            <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
                              <input type="checkbox" checked={Boolean(person.isSkipper)} onChange={(e) => onUpdatePersonRole(person, voter.effectiveRole, e.target.checked)} className="rounded border-slate-300" />
                              <span>סקיפר</span>
                            </label>
                          </div>
                          {voter.effectiveRole !== person.role && person.role !== Role.UNASSIGNED ? (
                            <div className="text-[11px] text-amber-700">לפי הסקר · קבוע בחוג: {getRoleLabel(person.role, person.gender)}</div>
                          ) : voter.pollRole && voter.pollRole !== voter.effectiveRole ? (
                            <div className="text-[11px] text-sky-700">בסקר הצביע: {getRoleLabel(voter.pollRole, person.gender)} (עודכן ידנית)</div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="font-semibold text-slate-700">
                          {getRoleLabel(voter.effectiveRole, Gender.MALE)}{voter.detectedIsSkipper ? ' · מפקד סירה' : ''}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {person ? (
                        <div className="text-xs">
                          <span className="font-bold text-slate-900">{person.name}</span>
                          <span className="text-slate-500 mr-1.5">· {voter.matchSource === 'PHONE_AUTO' ? 'זיהוי טלפון' : 'משויך'}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <select value={chosenId} onChange={(e) => setQuickSelect((p) => ({ ...p, [voter.voterId]: e.target.value }))} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white max-w-[155px] min-h-[38px]">
                            <option value="">בחר חבר...</option>
                            {people.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                          </select>
                          <button type="button" disabled={!chosenId} onClick={() => onLinkVoter(voter, chosenId)} className="p-2 rounded-lg bg-brand-600 disabled:opacity-40 text-white hover:bg-brand-700 min-h-[38px] min-w-[38px] flex items-center justify-center" title="שייך חבר"><Link2 size={14} /></button>
                          <button type="button" onClick={() => onAddGuest(voter, false)} className="p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 min-h-[38px] min-w-[38px] flex items-center justify-center" title="הוסף כאורח לאימון"><UserPlus size={14} /></button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                      {voter.timestampMs ? new Date(voter.timestampMs).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {voteAlerts.length > 0 && (
        <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-2">
          <h4 className="text-xs font-bold text-slate-700">יומן שינויי הצבעה בסשן הנוכחי</h4>
          <div className="divide-y divide-slate-100 text-xs">
            {voteAlerts.map((a) => (
              <div key={a.id} className="py-2 flex items-center justify-between gap-3">
                <span className="text-slate-800"><strong>{a.displayName}</strong> שינה מ״{a.previousOptions.join(', ') || 'לא הצביע'}״ ל״{a.newOptions.join(', ') || 'ביטל'}״</span>
                <span className="text-slate-500 tabular-nums shrink-0">{new Date(a.detectedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
