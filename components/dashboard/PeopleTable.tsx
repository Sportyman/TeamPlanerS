import React from 'react';
import { Person, Role, getRoleLabel } from '../../types';
import { Star, Edit, Trash2, ShipWheel, Tag, UserCheck } from 'lucide-react';
import { WhatsAppAvatar } from '../whatsapp/WhatsAppAvatar';

interface PeopleTableProps {
  people: Person[];
  onEdit: (person: Person) => void;
  onDelete: (id: string) => void;
  onPromoteWhatsAppMember?: (person: Person) => void;
}

export const PeopleTable: React.FC<PeopleTableProps> = ({ people, onEdit, onDelete, onPromoteWhatsAppMember }) => {
  const getRankColor = (rank: number) => {
    if (rank <= 2) return 'text-red-500';
    if (rank === 3) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getRoleColor = (role: Role) => {
    switch (role) {
      case Role.INSTRUCTOR: return 'text-cyan-800';
      case Role.VOLUNTEER: return 'text-orange-700';
      case Role.MEMBER: return 'text-sky-700';
      case Role.UNASSIGNED: return 'text-amber-700';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="text-right p-4 text-sm font-bold text-slate-600">משתתף</th>
            <th className="text-right p-4 text-sm font-bold text-slate-600 hidden md:table-cell">תפקיד</th>
            <th className="text-right p-4 text-sm font-bold text-slate-600 hidden md:table-cell">דירוג</th>
            <th className="text-right p-4 text-sm font-bold text-slate-600">פעולות</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {people.map((person) => (
            <tr key={person.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <WhatsAppAvatar name={person.name} src={person.photoURL} sizeClass="w-9 h-9 text-xs" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 truncate">{person.name}</span>
                      {person.role === Role.UNASSIGNED && <span className="text-amber-600 font-black" title="נדרשת השלמת תפקיד">*</span>}
                      {person.isSkipper && <ShipWheel size={14} className="text-blue-700 shrink-0" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap tabular-nums">
                      <span className={`md:hidden font-bold ${getRoleColor(person.role)}`}>{getRoleLabel(person.role, person.gender)}</span>
                      {person.phone && <span className="font-mono" dir="ltr">{person.phone}</span>}
                      {(person.attendanceCount || 0) > 0 && <span>· {person.attendanceCount} אימונים</span>}
                      {person.isWhatsAppGroupOnly && <span className="text-emerald-700 font-semibold">· מקבוצת הוואטסאפ</span>}
                    </div>
                    {(person.tags?.length || person.mustPairWith?.length) ? (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {person.tags?.map((t) => (
                          <span key={t} className="text-[10px] text-slate-500 flex items-center gap-0.5"><Tag size={9} /> {t}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="p-4 hidden md:table-cell">
                <span className={`text-xs font-bold ${getRoleColor(person.role)}`}>{getRoleLabel(person.role, person.gender)}</span>
              </td>
              <td className="p-4 hidden md:table-cell">
                <div className="flex">{Array.from({ length: person.rank }).map((_, i) => <Star key={i} size={14} className={`fill-current ${getRankColor(person.rank)}`} />)}</div>
              </td>
              <td className="p-4">
                <div className="flex items-center gap-1.5">
                  {person.isWhatsAppGroupOnly && onPromoteWhatsAppMember ? (
                    <button onClick={() => onPromoteWhatsAppMember(person)} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                      <UserCheck size={14} /> <span>הוסף לחוג</span>
                    </button>
                  ) : (
                    <>
                      <button onClick={() => onEdit(person)} className="p-2 text-slate-400 hover:text-brand-600 rounded-lg transition-colors" title="עריכה"><Edit size={18} /></button>
                      <button onClick={() => onDelete(person.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors" title="הסרה"><Trash2 size={18} /></button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
