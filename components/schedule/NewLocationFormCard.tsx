import React, { useEffect, useRef, useState } from 'react';
import { Check, Compass, Loader2, X } from 'lucide-react';
import { ClubLocation } from '../../types';
import { useAppStore } from '../../store';
import { addGlobalLocation, normalizeLocationName, updateGlobalLocation } from '../../services/scheduleService';
import { GeoPlaceResult, reverseGeocodeCoords } from '../../services/geocodingService';
import { PlaceSearchInput } from './PlaceSearchInput';
import { LocationPinMap } from './LocationPinMap';

interface NewLocationFormCardProps {
  existingLocations: ClubLocation[];
  editingLocation?: ClubLocation | null;
  onSaved: (saved: ClubLocation) => void;
  onClose: () => void;
}

export const NewLocationFormCard: React.FC<NewLocationFormCardProps> = ({
  existingLocations,
  editingLocation = null,
  onSaved,
  onClose,
}) => {
  const { user, addNotification } = useAppStore();
  const isEditing = Boolean(editingLocation);
  const [displayName, setDisplayName] = useState(editingLocation?.name || '');
  const [mapQuery, setMapQuery] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | undefined>(
    editingLocation && typeof editingLocation.lat === 'number' && typeof editingLocation.lng === 'number'
      ? { lat: editingLocation.lat, lng: editingLocation.lng }
      : undefined
  );
  const [areaLabel, setAreaLabel] = useState<string>(editingLocation?.areaLabel || '');
  const [resolvingArea, setResolvingArea] = useState(false);
  const [saving, setSaving] = useState(false);
  const reverseAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setDisplayName(editingLocation?.name || '');
    setSelectedCoords(
      editingLocation && typeof editingLocation.lat === 'number' && typeof editingLocation.lng === 'number'
        ? { lat: editingLocation.lat, lng: editingLocation.lng }
        : undefined
    );
    setAreaLabel(editingLocation?.areaLabel || '');
    setMapQuery('');
  }, [editingLocation]);

  useEffect(() => () => reverseAbortRef.current?.abort(), []);

  const handleMapPinChange = async (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });
    reverseAbortRef.current?.abort();
    const controller = new AbortController();
    reverseAbortRef.current = controller;
    setResolvingArea(true);
    try {
      const resolved = await reverseGeocodeCoords(lat, lng, controller.signal);
      if (!controller.signal.aborted) setAreaLabel(resolved || '');
    } catch {
      if (!controller.signal.aborted) setAreaLabel('');
    } finally {
      if (!controller.signal.aborted) setResolvingArea(false);
    }
  };

  const handleSelectSearchPlace = (place: GeoPlaceResult) => {
    reverseAbortRef.current?.abort();
    setResolvingArea(false);
    setSelectedCoords({ lat: place.lat, lng: place.lng });
    setAreaLabel(place.areaLabel);
    setMapQuery(place.areaLabel || place.primaryName);
    if (!displayName.trim()) setDisplayName(place.areaLabel || place.primaryName);
  };

  const handleClearPin = () => {
    reverseAbortRef.current?.abort();
    setResolvingArea(false);
    setSelectedCoords(undefined);
    setAreaLabel('');
  };

  const handleSave = async () => {
    const trimmed = normalizeLocationName(displayName);
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      if (editingLocation) {
        const saved = await updateGlobalLocation(editingLocation.id, {
          name: trimmed,
          coords: selectedCoords ? selectedCoords : null,
          areaLabel: areaLabel ? areaLabel : null,
        });
        onSaved(saved);
        addNotification(`המיקום "${saved.name}" עודכן במאגר הכללי`, 'SUCCESS');
      } else {
        const prevMatch = existingLocations.find(
          (l) => normalizeLocationName(l.name).toLowerCase() === trimmed.toLowerCase()
        );
        const saved = await addGlobalLocation(trimmed, user?.email, selectedCoords, areaLabel || undefined);
        onSaved(saved);
        const updatedCoords = Boolean(prevMatch && selectedCoords && (prevMatch.lat === undefined || prevMatch.lng === undefined));
        addNotification(
          updatedCoords
            ? `נקבע מיקום מפה תקני עבור "${saved.name}" ונשמר במאגר`
            : prevMatch
              ? `המיקום "${saved.name}" כבר קיים במאגר — נבחר למניעת כפילויות`
              : `המיקום "${saved.name}" נשמר במאגר המיקומים הכללי`,
          prevMatch && !updatedCoords ? 'INFO' : 'SUCCESS'
        );
      }
    } catch (err: any) {
      addNotification(err?.message || 'שגיאה בשמירת המיקום למאגר', 'WARN');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 bg-slate-50 border border-brand-200 rounded-2xl space-y-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-black text-slate-900">
            {isEditing ? 'עריכת מיקום במאגר הכללי' : 'הוספת מיקום חדש למאגר הכללי'}
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            קבע שם לתצוגה במערכת ונעץ סיכה על המפה כדי לזהות אזור תקני לתחזית מזג אוויר וגלים.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="סגור" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700">
          <X size={15} />
        </button>
      </div>

      <div>
        <label className="block text-[11px] font-bold text-slate-600 mb-1">שם המיקום לתצוגה במערכת</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
          placeholder="למשל: מועדון אתגרים מרינה תל אביב"
          className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-brand-500"
        />
      </div>

      <div className="pt-3 border-t border-slate-200/80 space-y-2.5">
        <div className="text-[11px] font-bold text-slate-600">איתור אזור במפה ונעיצת סיכה (מומלץ לזיהוי תחזית ים ומזג אוויר)</div>
        <PlaceSearchInput query={mapQuery} onChangeQuery={setMapQuery} onSelectPlace={handleSelectSearchPlace} />
        <LocationPinMap lat={selectedCoords?.lat} lng={selectedCoords?.lng} onChangePin={handleMapPinChange} />

        <div className="flex items-center justify-between gap-2 text-xs min-h-[24px]">
          {resolvingArea ? (
            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Loader2 size={13} className="animate-spin text-brand-600" />
              <span>מאתר אזור גיאוגרפי תקני...</span>
            </span>
          ) : selectedCoords ? (
            <div className="flex items-center gap-2 text-emerald-700 font-semibold flex-wrap">
              <Compass size={14} className="shrink-0" />
              <span>{areaLabel ? `אזור מזוהה: ${areaLabel}` : 'סיכה נקבעה במפה'}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="font-mono text-[11px] tabular-nums text-slate-500" dir="ltr">
                {selectedCoords.lat.toFixed(4)}, {selectedCoords.lng.toFixed(4)}
              </span>
              <button type="button" onClick={handleClearPin} className="text-[11px] text-slate-400 hover:text-rose-600 underline underline-offset-2 font-medium">
                נקה סיכה
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">חפש אזור למעלה או לחץ ישירות על המפה כדי לקבוע נקודה תקנית.</span>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200/80 flex items-center justify-end gap-2">
        <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70">ביטול</button>
        <button
          type="button"
          disabled={!displayName.trim() || saving}
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <Check size={14} />
          <span>{saving ? 'שומר...' : isEditing ? 'שמור שינויים' : 'שמור למאגר'}</span>
        </button>
      </div>
    </div>
  );
};
