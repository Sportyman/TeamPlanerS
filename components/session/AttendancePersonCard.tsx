import React, { useState } from 'react';
import { Person, Role, getRoleLabel } from '../../types';
import { PollIntent } from '../../types/whatsapp';
import { Check, CheckCircle2, Circle, Edit2, ShipWheel, X } from 'lucide-react';
import { WhatsAppAvatar } from '../whatsapp/WhatsAppAvatar';

interface AttendancePersonCardProps {
  person: Person;
  isPresent: boolean;
  isLiveFlash?: boolean;
  pollStatus?: { intent: PollIntent; detectedTags?: string[]; updatedRecently?: boolean };
  onToggle: (id: string) => void;
  onQuickSave: (person: Person, role: Role, isSkipper: boolean, tags: string[]) => Promise<void>;
}

export const AttendancePersonCard: React.FC<AttendancePersonCardProps> = ({
  person, isPresent, isLiveFlash = false, pollStatus, onToggle, onQuickSave,
}) => {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState<Role>(person.role);
  const [isSkipper, setIsSkipper] = useState<boolean>(Boolean(person.isSkipper));
  const [tagsText, setTagsText] = useState<string>((person.tags || []).join(', '));
  const [saving, setSaving] = useState(false);

  const isUnassigned = person.role === Role.UNASSIGNED;

  const getCardStyle = () => {
    const base = 'rounded-2xl border text-right transition-all duration-300 shadow-sm p-3.5';
    if (isLiveFlash) return `${base} border-sky-400 bg-sky-100 text-slate-900 ring-2 ring-sky-400/50`;
    if (!isPresent) {
      return isUnassigned
        ? `${base} border-amber-200 bg-amber-50/30 text-slate-700`
        : `${base} border-slate-200 bg-white text-slate-600`;
    }
    switch (person.role) {
      case Role.INSTRUCTOR: return `${base} border-cyan-500 bg-cyan-50 text-cyan-900 ring-2 ring-cyan-500/20`;
      case Role.VOLUNTEER: return `${base} border-orange-500 bg-orange-50 text-orange-900 ring-2 ring-orange-500/20`;
      case Role.MEMBER: return `${base} border-sky-500 bg-sky-50 text-sky-900 ring-2 ring-sky-500/20`;
      case Role.UNASSIGNED: return `${base} border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-500/20`;
      default: return `${base} border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20`;
    }
  };

  const openEditor = () => {
    setRole(person.role);
    setIsSkipper(Boolean(person.isSkipper));
    setTagsText((person.tags || []).filter((t) => t !== 'קבוצת וואטסאפ').join(', '));
    setEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const nextTags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
      await onQuickSave(person, role, isSkipper, nextTags);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <form onSubmit={handleSave} className="rounded-2xl border-2 border-brand-400 bg-white p-3.5 space-y-2.5 shadow-md text-right">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <WhatsAppAvatar name={person.name} src={person.photoURL} sizeClass="w-8 h-8 text-xs" />
            <span className="font-bold text-sm text-slate-900 truncate">{person.name}</span>
          </div>
          <button type="button" onClick={() => setEditing(false)} className="p-1 text-slate-400 hover:text-slate-700"><X size={15} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 font-bold">
            <option value={Role.UNASSIGNED}>לא הוגדר *</option>
            <option value={Role.MEMBER}>{getRoleLabel(Role.MEMBER, person.gender)}</option>
            <option value={Role.VOLUNTEER}>{getRoleLabel(Role.VOLUNTEER, person.gender)}</option>
            <option value={Role.INSTRUCTOR}>{getRoleLabel(Role.INSTRUCTOR, person.gender)}</option>
            <option value={Role.GUEST}>{getRoleLabel(Role.GUEST, person.gender)}</option>
          </select>
          <label className="flex items-center gap-1.5 px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer font-semibold">
            <input type="checkbox" checked={isSkipper} onChange={(e) => setIsSkipper(e.target.checked)} />
            <span>מפקד סירה</span>
          </label>
        </div>
        <input type="text" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="תגיות (למשל: חותר עצמאי, מנוף)..." className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5" />
        <div className="flex justify-end gap-1.5">
          <button type="button" onClick={() => setEditing(false)} className="px-2.5 py-1 text-xs text-slate-500 font-bold">ביטול</button>
          <button type="submit" disabled={saving} className="px-3 py-1 rounded-lg bg-brand-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-brand-700">
            <Check size={12} /> <span>{saving ? 'שומר...' : 'שמור'}</span>
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={`${getCardStyle()} flex items-center justify-between gap-2.5`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <WhatsAppAvatar name={person.name} src={person.photoURL} sizeClass="w-11 h-11 text-sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-black text-base leading-tight truncate">{person.name}</span>
            {isUnassigned && <span className="text-amber-600 font-black text-base shrink-0" title="משתתף זה דורש השלמת תפקיד/פרטים">*</span>}
            {person.isSkipper && <ShipWheel size={15} className={isPresent ? 'text-brand-600 shrink-0' : 'text-slate-400 shrink-0'} />}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] flex-wrap text-slate-600 tabular-nums">
            <span className={`font-bold ${isUnassigned ? 'text-amber-800' : ''}`}>
              {isUnassigned ? 'לא הוגדר תפקיד *' : getRoleLabel(person.role, person.gender)}
            </span>
            {(person.attendanceCount || 0) > 0 && <span>· {person.attendanceCount} אימונים</span>}
            {person.tags?.filter((t) => t !== 'קבוצת וואטסאפ').map((t) => (
              <span key={t} className="text-slate-700">· {t}</span>
            ))}
            {pollStatus && (
              <span className={`font-bold ${pollStatus.intent === 'ATTENDING' ? 'text-emerald-700' : pollStatus.intent === 'DECLINING' ? 'text-red-700' : 'text-amber-700'}`}>
                · {pollStatus.intent === 'ATTENDING' ? 'אישר בסקר' : pollStatus.intent === 'DECLINING' ? 'לא מגיע' : 'אולי'}
                {pollStatus.updatedRecently ? ' (שונה)' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={openEditor} className="p-2 rounded-lg text-slate-400 hover:text-brand-700 hover:bg-white/80 transition-colors" title="עריכה מהירה של תפקיד ותג">
          <Edit2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => onToggle(person.id)}
          aria-pressed={isPresent}
          aria-label={isPresent ? `הסר סימון עבור ${person.name}` : `סמן הגעה עבור ${person.name}`}
          title={isPresent ? 'הסר סימון נוכחות' : 'סמן כנוכח'}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
            isPresent ? 'bg-brand-100/70 hover:bg-brand-200/70 text-brand-700' : 'bg-slate-100/80 hover:bg-slate-200 text-slate-400 hover:text-slate-700'
          }`}
        >
          {isPresent ? <CheckCircle2 className="text-brand-600" size={26} /> : <Circle size={26} />}
        </button>
      </div>
    </div>
  );
};
