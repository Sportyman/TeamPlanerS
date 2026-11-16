import React from 'react';
import { Person, Role, Gender, getRoleLabel } from '../../types';
import { ResolvedVoter } from '../../types/whatsapp';
import { WhatsAppAvatar } from './WhatsAppAvatar';
import { Anchor, Link2, UserPlus } from 'lucide-react';

interface PollVoterMobileCardProps {
  voter: ResolvedVoter;
  intentLabel: string;
  intentClassName: string;
  people: Person[];
  chosenId: string;
  onSelectPersonId: (personId: string) => void;
  onLinkVoter: (voter: ResolvedVoter, personId: string) => Promise<void>;
  onAddGuest: (voter: ResolvedVoter, persistToClub: boolean) => Promise<any>;
  onUpdatePersonRole: (person: Person, role: Role, isSkipper?: boolean) => Promise<void>;
}

export const PollVoterMobileCard: React.FC<PollVoterMobileCardProps> = ({
  voter,
  intentLabel,
  intentClassName,
  people,
  chosenId,
  onSelectPersonId,
  onLinkVoter,
  onAddGuest,
  onUpdatePersonRole,
}) => {
  const person = voter.person;
  const timeText = voter.timestampMs
    ? new Date(voter.timestampMs).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <article className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <WhatsAppAvatar name={voter.displayName} src={voter.profilePicUrl} sizeClass="w-11 h-11 text-xs" />
          <div className="min-w-0">
            <div className="font-bold text-sm text-slate-900 truncate">{voter.displayName}</div>
            <div className="text-xs text-slate-500 font-mono tabular-nums truncate" dir="ltr">
              {voter.phone || voter.voterId.split('@')[0]}
            </div>
          </div>
        </div>
        <div className="text-left shrink-0 space-y-0.5">
          <div className={`text-xs ${intentClassName}`}>{intentLabel}</div>
          <div className="text-[11px] text-slate-500 tabular-nums">{timeText}</div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl px-3 py-2 text-xs text-slate-700 space-y-1">
        <div className="font-medium break-words">
          <span className="text-slate-500">בחירה בסקר: </span>
          <span className="text-slate-900">{voter.selectedOptions.join(', ') || 'ללא בחירה'}</span>
          {voter.updatedRecently && <span className="mr-1.5 font-bold text-amber-700">· שונה כעת</span>}
        </div>
        {person ? (
          <div className="text-slate-600">
            <span>משויך אל: </span>
            <strong className="text-slate-900">{person.name}</strong>
            <span> · {voter.matchSource === 'PHONE_AUTO' ? 'זיהוי טלפון' : 'משויך'}</span>
          </div>
        ) : (
          <div className="text-slate-600">
            זיהוי אוטומטי מהסקר: <strong className="text-slate-800">{getRoleLabel(voter.effectiveRole, Gender.MALE)}</strong>
            {voter.detectedIsSkipper ? ' · מפקד סירה' : ''}
          </div>
        )}
      </div>

      {person ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <select
              value={person.role}
              onChange={(e) => onUpdatePersonRole(person, e.target.value as Role)}
              aria-label={`תפקיד עבור ${person.name}`}
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white font-semibold text-slate-800 min-h-[44px]"
            >
              <option value={Role.MEMBER}>{getRoleLabel(Role.MEMBER, person.gender)}</option>
              <option value={Role.VOLUNTEER}>{getRoleLabel(Role.VOLUNTEER, person.gender)}</option>
              <option value={Role.INSTRUCTOR}>{getRoleLabel(Role.INSTRUCTOR, person.gender)}</option>
              <option value={Role.GUEST}>{getRoleLabel(Role.GUEST, person.gender)}</option>
            </select>
            <button
              type="button"
              onClick={() => onUpdatePersonRole(person, person.role, !person.isSkipper)}
              aria-pressed={Boolean(person.isSkipper)}
              className={`px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 min-h-[44px] shrink-0 transition-colors ${
                person.isSkipper
                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Anchor size={14} />
              <span>סקיפר</span>
            </button>
          </div>
          {voter.pollRole && voter.pollRole !== person.role && (
            <div className="text-xs text-amber-700 font-medium">
              בסקר סומן: {getRoleLabel(voter.pollRole, person.gender)}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <select
            value={chosenId}
            onChange={(e) => onSelectPersonId(e.target.value)}
            aria-label={`שייך ${voter.displayName} לחבר`}
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 min-h-[44px]"
          >
            <option value="">בחר חבר לשיוך...</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!chosenId}
              onClick={() => onLinkVoter(voter, chosenId)}
              className="flex-1 px-3 py-2 rounded-xl bg-brand-600 disabled:opacity-40 text-white text-xs font-bold hover:bg-brand-700 flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Link2 size={15} />
              <span>שייך לחבר</span>
            </button>
            <button
              type="button"
              onClick={() => onAddGuest(voter, false)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <UserPlus size={15} />
              <span>הוסף כאורח</span>
            </button>
          </div>
        </div>
      )}
    </article>
  );
};
