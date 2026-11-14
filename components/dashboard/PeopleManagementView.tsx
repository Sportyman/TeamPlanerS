import React, { useMemo, useState } from 'react';
import { ClubID, Person, Role } from '../../types';
import { ArrowRight, MessageSquare, Search, UserPlus, Users } from 'lucide-react';
import { useWhatsAppPolls } from '../../hooks/useWhatsAppPolls';
import { sortAttendancePeople } from '../../services/whatsapp/rosterMerge';
import { addPersonToClubCloud } from '../../services/syncService';
import { PeopleTable } from './PeopleTable';
import { PersonEditorModal } from './PersonEditorModal';

interface PeopleManagementViewProps {
  activeClub: ClubID;
  people: Person[];
  boatDefinitions: any[];
  onBack: () => void;
  onDelete: (uid: string) => void;
  onNotify: (msg: string, type?: 'INFO' | 'SUCCESS' | 'WARN') => void;
}

export const PeopleManagementView: React.FC<PeopleManagementViewProps> = ({
  activeClub,
  people,
  boatDefinitions,
  onBack,
  onDelete,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const {
    effectiveClubPeople,
    clubConfig,
    availableGroups,
    mappings,
    linkClubGroup,
    importRosterMembers,
  } = useWhatsAppPolls();

  const unifiedPeople = useMemo(() => {
    const base = effectiveClubPeople.length > 0 ? effectiveClubPeople : people;
    const sorted = sortAttendancePeople(base);
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((p) => p.name.toLowerCase().includes(q) || (p.phone || '').includes(q));
  }, [effectiveClubPeople, people, search]);

  const unlinkedMappings = useMemo(() => {
    const virtualIds = new Set(effectiveClubPeople.filter((p) => p.isWhatsAppGroupOnly).map((p) => p.id));
    return mappings.filter((m) =>
      (m.aliasVoterIds || [m.voterId]).some((id) => virtualIds.has(`wa_${id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48)}`))
    );
  }, [mappings, effectiveClubPeople]);

  const handlePromote = async (person: Person) => {
    await addPersonToClubCloud(activeClub, { ...person, isWhatsAppGroupOnly: false });
    onNotify(`המשתתף ${person.name} נשמר קבוע במאגר החוג`, 'SUCCESS');
  };

  const handleImportAll = async () => {
    if (unlinkedMappings.length === 0) return;
    await importRosterMembers(unlinkedMappings.map((m) => ({ mapping: m, role: Role.UNASSIGNED })));
  };

  return (
    <div className="space-y-6 pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-sm">
        <ArrowRight size={18} /> חזרה לתפריט ניהול החוג
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">ניהול משתתפים ({unifiedPeople.length})</h2>
          <p className="text-xs text-slate-500 mt-1">
            כולל את חברי החוג הרשומים ואת כל חברי קבוצת הוואטסאפ המקושרת לחוג
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {unlinkedMappings.length > 0 && (
            <button onClick={handleImportAll} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold whitespace-nowrap">
              <Users size={16} /> שמור את כל חברי הקבוצה בחוג ({unlinkedMappings.length})
            </button>
          )}
          <button onClick={() => setIsAdding(true)} className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs font-bold shadow-sm whitespace-nowrap">
            <UserPlus size={16} /> הוספה ידנית
          </button>
        </div>
      </div>

      {clubConfig.linkedGroups.length === 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <MessageSquare size={17} className="text-amber-700" />
            <span>כדי להציג כאן את כל חברי קבוצת הוואטסאפ של החוג, יש לשייך קבוצה:</span>
          </div>
          {availableGroups.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableGroups.map((g) => (
                <button key={g} type="button" onClick={() => linkClubGroup(g)} className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-xs font-bold text-amber-900 hover:bg-amber-100">
                  + שייך לחוג: {g}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-800">הבוט עדיין לא סנכרן קבוצות — הפעל את הבוט ולחץ על "סנכרן נתונים" למעלה.</p>
          )}
        </div>
      )}

      <div className="relative max-w-md">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש לפי שם או טלפון..." className="w-full pr-9 pl-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-brand-500" />
      </div>

      <PeopleTable people={unifiedPeople} onEdit={setEditingPerson} onDelete={onDelete} onPromoteWhatsAppMember={handlePromote} />

      {(isAdding || editingPerson) && (
        <PersonEditorModal
          person={editingPerson}
          allPeople={unifiedPeople}
          boatDefinitions={boatDefinitions}
          onClose={() => { setIsAdding(false); setEditingPerson(null); }}
          onSave={() => { setIsAdding(false); setEditingPerson(null); }}
        />
      )}
    </div>
  );
};
