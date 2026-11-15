import { doc, getDoc, getDocFromServer, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ClubLocation } from '../types';
import { useAppStore } from '../store';
import { addLog } from './syncService';

export const normalizeLocationName = (name: string): string => name.trim().replace(/\s+/g, ' ');

const SHARED_LOCATIONS_DOC = doc(db, 'clubs', 'shared_locations_catalog');

const toValidCoord = (val: unknown): number | undefined => {
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(num) && typeof val !== 'boolean' && val !== '' && val !== null && val !== undefined
    ? num
    : undefined;
};

const sanitizeLocationItem = (loc: ClubLocation): ClubLocation => {
  const clean: ClubLocation = {
    id: String(loc.id || `loc-${Date.now()}`),
    name: normalizeLocationName(loc.name),
  };
  if (typeof loc.areaLabel === 'string' && loc.areaLabel.trim()) {
    clean.areaLabel = normalizeLocationName(loc.areaLabel);
  }
  const lat = toValidCoord(loc.lat);
  const lng = toValidCoord(loc.lng);
  if (lat !== undefined && lng !== undefined) {
    clean.lat = Number(lat.toFixed(6));
    clean.lng = Number(lng.toFixed(6));
  }
  if (loc.createdAt) clean.createdAt = String(loc.createdAt);
  if (loc.createdBy) clean.createdBy = String(loc.createdBy);
  return clean;
};

export const fetchGlobalLocations = async (): Promise<ClubLocation[]> => {
  try {
    const snap = await getDocFromServer(SHARED_LOCATIONS_DOC).catch(() => getDoc(SHARED_LOCATIONS_DOC));
    const map = new Map<string, ClubLocation>();
    const rawItems = snap.exists() && Array.isArray(snap.data().items) ? snap.data().items : [];
    rawItems.forEach((item: any) => {
      if (typeof item?.name === 'string' && item.name.trim()) {
        const name = normalizeLocationName(item.name);
        map.set(name.toLowerCase(), sanitizeLocationItem({
          id: String(item.id || name),
          name,
          areaLabel: item.areaLabel,
          lat: item.lat,
          lng: item.lng,
          createdAt: item.createdAt,
          createdBy: item.createdBy,
        }));
      }
    });
    useAppStore.getState().clubs.forEach((club) => {
      const sched = club.defaultSchedule;
      const locName = sched?.locationName;
      if (locName && locName.trim()) {
        const clean = normalizeLocationName(locName);
        if (!map.has(clean.toLowerCase())) {
          map.set(clean.toLowerCase(), sanitizeLocationItem({
            id: sched?.locationId || clean,
            name: clean,
            areaLabel: sched?.areaLabel,
            lat: sched?.lat,
            lng: sched?.lng,
          }));
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'he'));
  } catch (err) {
    addLog(`Failed to fetch global locations: ${err}`, 'WARN');
    return [];
  }
};

export const addGlobalLocation = async (
  rawName: string,
  createdBy?: string,
  coords?: { lat?: number; lng?: number },
  areaLabel?: string
): Promise<ClubLocation> => {
  const normalized = normalizeLocationName(rawName);
  if (!normalized) throw new Error('יש להזין שם מיקום');

  const existingRemote = await fetchGlobalLocations();
  const storeLocs = useAppStore.getState().locations;
  const mergedMap = new Map<string, ClubLocation>();
  [...storeLocs, ...existingRemote].forEach((loc) => {
    const key = normalizeLocationName(loc.name).toLowerCase();
    if (key && !mergedMap.has(key)) mergedMap.set(key, sanitizeLocationItem(loc));
  });

  const existingMatch = mergedMap.get(normalized.toLowerCase());
  const hasNewCoords = coords?.lat !== undefined && coords?.lng !== undefined;
  const cleanArea = typeof areaLabel === 'string' && areaLabel.trim() ? normalizeLocationName(areaLabel) : undefined;
  const hasNewArea = Boolean(cleanArea && !existingMatch?.areaLabel);
  if (existingMatch && !hasNewCoords && !hasNewArea) {
    useAppStore.getState().setLocations(Array.from(mergedMap.values()));
    return existingMatch;
  }

  const created = sanitizeLocationItem({
    id: existingMatch?.id || `loc-${Date.now()}`,
    name: normalized,
    areaLabel: cleanArea || existingMatch?.areaLabel,
    lat: coords?.lat ?? existingMatch?.lat,
    lng: coords?.lng ?? existingMatch?.lng,
    createdAt: existingMatch?.createdAt || new Date().toISOString(),
    createdBy: existingMatch?.createdBy || createdBy,
  });
  mergedMap.set(normalized.toLowerCase(), created);
  const nextList = Array.from(mergedMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'he'));

  await setDoc(SHARED_LOCATIONS_DOC, {
    isSystemCatalog: true,
    isDeleted: false,
    items: nextList,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  useAppStore.getState().setLocations(nextList);
  return created;
};
