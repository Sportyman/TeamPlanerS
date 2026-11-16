import React, { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';

interface GroupLinkSelectProps {
  groups: string[];
  onLink: (groupName: string) => Promise<void> | void;
  placeholder?: string;
  centered?: boolean;
}

export const GroupLinkSelect: React.FC<GroupLinkSelectProps> = ({
  groups,
  onLink,
  placeholder = 'בחר קבוצת וואטסאפ מהרשימה...',
  centered = false,
}) => {
  const [selected, setSelected] = useState(groups[0] || '');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (!groups.includes(selected)) setSelected(groups[0] || '');
  }, [groups, selected]);

  if (groups.length === 0) return null;

  const handleLink = async () => {
    if (!selected || linking) return;
    setLinking(true);
    try {
      await onLink(selected);
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto ${centered ? 'justify-center' : ''}`}>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        aria-label={placeholder}
        className="w-full sm:w-auto sm:min-w-[220px] px-3 py-2.5 text-sm sm:text-xs font-bold bg-white border border-amber-300 rounded-xl text-slate-800 focus:outline-none focus:border-brand-500 min-h-[44px]"
      >
        <option value="" disabled>{placeholder}</option>
        {groups.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <button
        type="button"
        disabled={!selected || linking}
        onClick={handleLink}
        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap min-h-[44px]"
      >
        <Link2 size={15} />
        <span>{linking ? 'משייך...' : 'שייך לחוג'}</span>
      </button>
    </div>
  );
};
