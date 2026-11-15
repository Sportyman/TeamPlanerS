import React, { useMemo, useState } from 'react';
import { Check, Compass, Edit3, MapPin, Plus, Search } from 'lucide-react';
import { ClubLocation } from '../../types';
import { normalizeLocationName } from '../../services/scheduleService';

interface LocationDropdownMenuProps {
  locations: ClubLocation[];
  selectedValue: string;
  allowOneOffCustom: boolean;
  onSelectCatalog: (loc: ClubLocation) => void;
  onSelectOneOff: () => void;
  onRequestAddNew: () => void;
}

export const LocationDropdownMenu: React.FC<LocationDropdownMenuProps> = ({
  locations,
  selectedValue,
  allowOneOffCustom,
  onSelectCatalog,
  onSelectOneOff,
  onRequestAddNew,
}) => {
  const [filterText, setFilterText] = useState('');

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return q ? locations.filter((l) => l.name.toLowerCase().includes(q)) : locations;
  }, [locations, filterText]);

  return (
    <div className="absolute right-0 left-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
      {locations.length > 4 && (
        <div className="p-2 border-b border-slate-100 bg-slate-50/70">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="סנן מיקומים קיימים..."
              className="w-full pr-8 pl-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-slate-400">
            {locations.length === 0
              ? 'המאגר ריק כרגע — לחץ על "הוסף מיקום חדש" כדי ליצור מיקום.'
              : 'לא נמצאו מיקומים התואמים לסינון.'}
          </div>
        ) : (
          filtered.map((loc) => {
            const isSelected =
              normalizeLocationName(selectedValue).toLowerCase() ===
              normalizeLocationName(loc.name).toLowerCase();
            const hasCoords = typeof loc.lat === 'number' && typeof loc.lng === 'number';
            return (
              <button
                key={loc.id || loc.name}
                type="button"
                onClick={() => onSelectCatalog(loc)}
                className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-right transition-colors ${
                  isSelected ? 'bg-brand-50 text-brand-900' : 'hover:bg-slate-50 text-slate-800'
                }`}
              >
                <MapPin
                  size={15}
                  className={`shrink-0 mt-0.5 ${isSelected ? 'text-brand-600' : 'text-slate-400'}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold leading-relaxed whitespace-normal break-words">
                    {loc.name}
                  </div>
                  {loc.areaLabel && loc.areaLabel !== loc.name && (
                    <div className="text-[11px] font-medium text-slate-500 whitespace-normal break-words leading-snug">
                      {loc.areaLabel}
                    </div>
                  )}
                </div>
                {hasCoords && (
                  <span title="כולל נ״צ לתחזית מזג אוויר וגלים" className="text-sky-600 shrink-0 mt-1">
                    <Compass size={13} />
                  </span>
                )}
                {isSelected && <Check size={16} className="text-brand-600 shrink-0 mt-0.5" />}
              </button>
            );
          })
        )}
      </div>

      <div className="p-2 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center gap-2">
        {allowOneOffCustom && (
          <button
            type="button"
            onClick={onSelectOneOff}
            className="flex-1 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Edit3 size={13} />
            <span>מיקום חד-פעמי לאימון זה</span>
          </button>
        )}
        <button
          type="button"
          onClick={onRequestAddNew}
          className="flex-1 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          <span>הוסף מיקום חדש למאגר</span>
        </button>
      </div>
    </div>
  );
};
