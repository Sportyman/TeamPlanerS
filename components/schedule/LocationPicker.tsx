import React, { useState } from 'react';
import { MapPin, Plus, Check, X } from 'lucide-react';
import { useAppStore } from '../../store';
import { addGlobalLocation, normalizeLocationName } from '../../services/scheduleService';

interface LocationPickerProps {
  value: string;
  locationId?: string;
  onChange: (locationName: string, locationId?: string) => void;
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
  const { locations, user, addNotification } = useAppStore();
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const sortedLocations = [...locations].sort((a, b) => a.name.localeCompare(b.name, 'he'));
  const isValueInCatalog = sortedLocations.some(
    (l) => normalizeLocationName(l.name).toLowerCase() === normalizeLocationName(value).toLowerCase()
  );

  const handleSelectChange = (selectedVal: string) => {
    if (selectedVal === '__ADD_NEW__') {
      setIsAddingNew(true);
      setNewName('');
      return;
    }
    if (selectedVal === '__ONE_OFF__') {
      onChange('', undefined);
      return;
    }
    const found = sortedLocations.find((l) => l.name === selectedVal || l.id === selectedVal);
    onChange(found ? found.name : selectedVal, found?.id);
  };

  const handleSaveToCatalog = async () => {
    const trimmed = normalizeLocationName(newName);
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const existedBefore = sortedLocations.some(
        (l) => normalizeLocationName(l.name).toLowerCase() === trimmed.toLowerCase()
      );
      const saved = await addGlobalLocation(trimmed, user?.email);
      onChange(saved.name, saved.id);
      setIsAddingNew(false);
      setNewName('');
      addNotification(
        existedBefore
          ? `המיקום "${saved.name}" כבר קיים במאגר — נבחר מהמאגר הקיים למניעת כפילויות`
          : `המיקום "${saved.name}" נוסף למאגר המיקומים הכללי`,
        existedBefore ? 'INFO' : 'SUCCESS'
      );
    } catch {
      addNotification('שגיאה בשמירת המיקום למאגר', 'WARN');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MapPin size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={isValueInCatalog ? value : value && allowOneOffCustom ? '__ONE_OFF__' : ''}
            onChange={(e) => handleSelectChange(e.target.value)}
            aria-label="מיקום הפעילות"
            className={`w-full pr-9 pl-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-brand-500 ${
              compact ? 'py-2 text-xs' : 'py-2.5 text-sm'
            }`}
          >
            <option value="">
              {sortedLocations.length === 0 ? 'אין עדיין מיקומים במאגר — הוסף מיקום' : 'בחר מיקום קבוע מהמאגר...'}
            </option>
            {sortedLocations.map((loc) => (
              <option key={loc.id || loc.name} value={loc.name}>
                {loc.name}
              </option>
            ))}
            {allowOneOffCustom && <option value="__ONE_OFF__">אחר (חד-פעמי לאימון זה)</option>}
            <option value="__ADD_NEW__">+ הוסף מיקום חדש למאגר הכללי...</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingNew((v) => !v)}
          title="הוסף מיקום חדש למאגר הכללי"
          className={`px-3 rounded-xl border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-800 font-bold flex items-center gap-1 whitespace-nowrap ${
            compact ? 'py-2 text-xs' : 'py-2.5 text-xs'
          }`}
        >
          <Plus size={14} />
          <span>מיקום חדש</span>
        </button>
      </div>

      {allowOneOffCustom && (!isValueInCatalog || locationId === undefined) && value !== undefined && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value, undefined)}
          placeholder="הקלד מיקום חלופי לאימון הקרוב (למשל: מזח צפוני)..."
          className="w-full px-3 py-2 text-xs bg-amber-50/70 border border-amber-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-amber-400"
        />
      )}

      {isAddingNew && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="text-[11px] font-bold text-slate-600">
            הוספת מיקום חדש למאגר הכללי (זמין לכל החוגים והמנהלים למניעת כפילויות):
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveToCatalog();
                }
              }}
              placeholder="למשל: מרכז דניאל לחתירה / מרינה הרצליה..."
              className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-bold focus:outline-none focus:border-brand-500"
            />
            <button
              type="button"
              disabled={!newName.trim() || saving}
              onClick={handleSaveToCatalog}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap"
            >
              <Check size={14} />
              <span>{saving ? 'שומר...' : 'שמור למאגר'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              aria-label="סגור"
              className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
