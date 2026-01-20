
import React from 'react';
import { Person, Role, getRoleLabel, TEAM_COLORS } from '../../types';
import { Star, Edit, Trash2, ShipWheel, Tag } from 'lucide-react';

interface PeopleTableProps {
    people: Person[];
    onEdit: (person: Person) => void;
    onDelete: (id: string) => void;
}

export const PeopleTable: React.FC<PeopleTableProps> = ({ people, onEdit, onDelete }) => {
    const getRankColor = (rank: number) => {
        if (rank <= 2) return 'text-red-500';
        if (rank === 3) return 'text-yellow-500';
        return 'text-green-500';
    };

    const getBadgeStyle = (role: Role) => {
        switch (role) {
            case Role.INSTRUCTOR: return 'bg-cyan-100 text-cyan-800';
            case Role.VOLUNTEER: return 'bg-orange-100 text-orange-700';
            case Role.MEMBER: return 'bg-sky-100 text-sky-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="text-right p-4 text-sm font-bold text-slate-600">שם מלא</th>
                        <th className="text-right p-4 text-sm font-bold text-slate-600 hidden md:table-cell">תפקיד</th>
                        <th className="text-right p-4 text-sm font-bold text-slate-600 hidden md:table-cell">דירוג</th>
                        <th className="text-right p-4 text-sm font-bold text-slate-600">פעולות</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {people.map(person => (
                        <tr key={person.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <div className="font-bold text-slate-800">{person.name}</div>
                                    {person.isSkipper && <div className="text-blue-700"><ShipWheel size={14} /></div>}
                                </div>
                                <div className="text-xs text-slate-400 md:hidden mt-1 flex gap-2">
                                    <span>{getRoleLabel(person.role, person.gender)}</span>
                                    <span>•</span>
                                    <span>רמה {person.rank}</span>
                                </div>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                    {person.tags?.map(t => <span key={t} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1"><Tag size={8} /> {t}</span>)}
                                    {person.genderConstraint?.type !== 'NONE' && <span className="text-[10px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded border border-pink-100">מגדר</span>}
                                    {(person.mustPairWith?.length || 0) > 0 && <span className="text-[10px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded border border-green-100">חובה</span>}
                                </div>
                            </td>
                            <td className="p-4 hidden md:table-cell">
                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${getBadgeStyle(person.role)}`}>{getRoleLabel(person.role, person.gender)}</span>
                            </td>
                            <td className="p-4 hidden md:table-cell">
                                <div className="flex">{Array.from({ length: person.rank }).map((_, i) => <Star key={i} size={14} className={`fill-current ${getRankColor(person.rank)}`} />)}</div>
                            </td>
                            <td className="p-4">
                                <div className="flex gap-2">
                                    <button onClick={() => onEdit(person)} className="p-2 text-slate-400 hover:text-brand-600 rounded-lg transition-colors"><Edit size={18} /></button>
                                    <button onClick={() => onDelete(person.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
