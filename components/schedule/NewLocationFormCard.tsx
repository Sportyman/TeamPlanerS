import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { ClubLocation } from '../../types';
import { useAppStore } from '../../store';
import { addGlobalLocation, normalizeLocationName } from '../../services/scheduleService';
import { GooglePlaceSearchInput } from './GooglePlaceSearchInput';

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
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = normalizeLocationName(newName);
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const existedBefore = existingLocations.some(
        (l) => normalizeLocationName(l.name).toLowerCase() === trimmed.toLowerCase()
      );
      const saved = await addGlobalLocation(trimmed, user?.email, selectedPlaceId);
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
            חפשו מקום ב-Google Maps או הקלידו שם מיקום. המיקום יישמר עבור כל החוגים למניעת כפילויות.
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

      <GooglePlaceSearchInput
        value={newName}
        onChangeText={(txt) => {
          setNewName(txt);
          setSelectedPlaceId(undefined);
        }}
        onSelectPlace={(name, placeId) => {
          setNewName(name);
          setSelectedPlaceId(placeId);
        }}
        onSubmitEnter={handleSave}
      />

      <div className="flex justify-end gap-2">
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
