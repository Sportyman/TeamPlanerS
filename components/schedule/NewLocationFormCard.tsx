import React, { useState } from 'react';
import { Check, Compass, X } from 'lucide-react';
import { ClubLocation } from '../../types';
import { useAppStore } from '../../store';
import { addGlobalLocation, normalizeLocationName } from '../../services/scheduleService';
import { PlaceSearchInput } from './PlaceSearchInput';

interface NewLocationFormCardProps {
  existingLocations: ClubLocation[];
  onSaved: (saved: ClubLocation) => void;
  onClose: () => void;
}

export const NewLocationFormCard: React.FC<NewLocationFormCardProps> = ({
  existingLocations,
  onSaved,
  onClose,
}) => {
  const { user, addNotification } = useAppStore();
  const [newName, setNewName] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = normalizeLocationName(newName);
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const existedBefore = existingLocations.some(
        (l) => normalizeLocationName(l.name).toLowerCase() === trimmed.toLowerCase()
      );
      const saved = await addGlobalLocation(trimmed, user?.email, selectedCoords);
      onSaved(saved);
      addNotification(
        existedBefore
          ? `המיקום "${saved.name}" כבר קיים במאגר — נבחר למניעת כפילויות`
          : `המיקום "${saved.name}" נשמר במאגר המיקומים הכללי`,
        existedBefore ? 'INFO' : 'SUCCESS'
      );
    } catch {
      addNotification('שגיאה בשמירת המיקום למאגר', 'WARN');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 bg-slate-50 border border-brand-200 rounded-2xl space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-black text-slate-800">הוספת מיקום חדש למאגר הכללי</div>
          <div className="text-[11px] text-slate-500">
            חפשו אזור או חוף לשמירת מיקום מדויק (למזג אוויר וגלים בעתיד), או הקלידו שם ידני.
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700"
        >
          <X size={15} />
        </button>
      </div>

      <PlaceSearchInput
        value={newName}
        onChangeText={(txt) => {
          setNewName(txt);
          setSelectedCoords(undefined);
        }}
        onSelectPlace={(name, coords) => {
          setNewName(name);
          setSelectedCoords(coords);
        }}
        onSubmitEnter={handleSave}
      />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        {selectedCoords ? (
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
            <Compass size={13} />
            <span>נמצא מיקום מדויק ({selectedCoords.lat.toFixed(3)}, {selectedCoords.lng.toFixed(3)})</span>
          </span>
        ) : (
          <span />
        )}

        <button
          type="button"
          disabled={!newName.trim() || saving}
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <Check size={14} />
          <span>{saving ? 'שומר למאגר...' : 'שמור למאגר'}</span>
        </button>
      </div>
    </div>
  );
};
