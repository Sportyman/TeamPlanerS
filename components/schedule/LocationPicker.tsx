import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, MapPin, Plus } from 'lucide-react';
import { ClubLocation } from '../../types';
import { useAppStore } from '../../store';
import { deleteGlobalLocation, fetchGlobalLocations, normalizeLocationName } from '../../services/scheduleService';
import { NewLocationFormCard } from './NewLocationFormCard';
import { LocationDropdownMenu } from './LocationDropdownMenu';

interface LocationPickerProps {
  value: string;
  locationId?: string;
  onChange: (
    locationName: string,
    locationId?: string,
    coords?: { lat?: number; lng?: number },
    areaLabel?: string
  ) => void;
  allowOneOffCustom?: boolean;
  compact?: boolean;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  locationId,
  onChange,
  allowOneOffCustom = false,
  compact = false,
}) => {
  const { locations, setLocations, addNotification } = useAppStore();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingLocation, setEditingLocation] = useState<ClubLocation | null>(null);
  const [oneOffMode, setOneOffMode] = useState(false);

  useEffect(() => {
    if (locations.length === 0) {
      fetchGlobalLocations().then((locs) => {
        if (locs.length > 0) setLocations(locs);
      });
    }
  }, [locations.length, setLocations]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, []);

  const sortedLocations = useMemo(
    () => [...locations].sort((a, b) => a.name.localeCompare(b.name, 'he')),
    [locations]
  );

  const isValueInCatalog = sortedLocations.some(
    (l) => normalizeLocationName(l.name).toLowerCase() === normalizeLocationName(value).toLowerCase()
  );

  const showOneOffInput =
    allowOneOffCustom && (oneOffMode || (Boolean(value) && !isValueInCatalog && locationId === undefined));

  const handleDeleteCatalogLocation = async (loc: ClubLocation) => {
    try {
      await deleteGlobalLocation(loc.id);
      const isSelected =
        (locationId && locationId === loc.id) ||
        normalizeLocationName(value).toLowerCase() === normalizeLocationName(loc.name).toLowerCase();
      if (isSelected) onChange('', undefined, undefined, undefined);
      if (editingLocation?.id === loc.id) setEditingLocation(null);
      addNotification(`המיקום "${loc.name}" נמחק מהמאגר הכללי`, 'INFO');
    } catch {
      addNotification('שגיאה במחיקת המיקום מהמאגר', 'WARN');
    }
  };

  return (
    <div ref={containerRef} className="space-y-2.5">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2">
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-label="בחירת מיקום מהמאגר"
            className={`w-full flex items-center justify-between gap-2.5 bg-white border rounded-xl text-right transition-all ${
              menuOpen ? 'border-brand-500 ring-2 ring-brand-500/15' : 'border-slate-200 hover:border-slate-300'
            } ${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'}`}
          >
            <span className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                <MapPin size={15} />
              </span>
              <span
                className={`whitespace-normal break-words leading-snug font-bold ${
                  value ? 'text-slate-900' : 'text-slate-400 font-medium'
                } ${compact ? 'text-xs' : 'text-sm'}`}
              >
                {value ||
                  (sortedLocations.length === 0
                    ? 'אין עדיין מיקומים במאגר — הוסף מיקום חדש'
                    : 'בחר מיקום קבוע מהמאגר...')}
              </span>
            </span>
            <ChevronDown
              size={16}
              className={`text-slate-400 shrink-0 transition-transform ${menuOpen ? 'rotate-180 text-brand-600' : ''}`}
            />
          </button>

          {menuOpen && (
            <LocationDropdownMenu
              locations={sortedLocations}
              selectedValue={value}
              allowOneOffCustom={allowOneOffCustom}
              onSelectCatalog={(loc) => {
                const coords = loc.lat !== undefined && loc.lng !== undefined ? { lat: loc.lat, lng: loc.lng } : undefined;
                onChange(loc.name, loc.id, coords, loc.areaLabel);
                setOneOffMode(false);
                setMenuOpen(false);
              }}
              onEditLocation={(loc) => {
                setEditingLocation(loc);
                setIsAddingNew(false);
                setMenuOpen(false);
              }}
              onDeleteLocation={handleDeleteCatalogLocation}
              onSelectOneOff={() => {
                setOneOffMode(true);
                onChange('', undefined);
                setMenuOpen(false);
              }}
              onRequestAddNew={() => {
                setEditingLocation(null);
                setIsAddingNew(true);
                setMenuOpen(false);
              }}
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => { setEditingLocation(null); setIsAddingNew((v) => !v); setMenuOpen(false); }}
          className={`px-3.5 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold flex items-center justify-center gap-1.5 whitespace-nowrap ${
            compact ? 'py-2 text-xs' : 'py-2.5 text-xs'
          }`}
        >
          <Plus size={14} />
          <span>מיקום חדש</span>
        </button>
      </div>

      {showOneOffInput && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value, undefined)}
          placeholder="הקלד מיקום חלופי לאימון הקרוב (למשל: מזח צפוני)..."
          className="w-full px-3.5 py-2.5 text-sm bg-amber-50/70 border border-amber-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-amber-400"
        />
      )}

      {(isAddingNew || editingLocation) && (
        <NewLocationFormCard
          existingLocations={sortedLocations}
          editingLocation={editingLocation}
          onSaved={(saved) => {
            const shouldApply =
              !editingLocation ||
              (locationId && locationId === editingLocation.id) ||
              normalizeLocationName(value).toLowerCase() === normalizeLocationName(editingLocation.name).toLowerCase();
            if (shouldApply) {
              const coords = saved.lat !== undefined && saved.lng !== undefined ? { lat: saved.lat, lng: saved.lng } : undefined;
              onChange(saved.name, saved.id, coords, saved.areaLabel);
            }
            setOneOffMode(false);
            setIsAddingNew(false);
            setEditingLocation(null);
          }}
          onClose={() => { setIsAddingNew(false); setEditingLocation(null); }}
        />
      )}
    </div>
  );
};
