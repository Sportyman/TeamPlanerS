import { doc, getDoc, getDocFromServer, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ClubLocation } from '../types';
import { useAppStore } from '../store';
import { addLog } from './syncService';
import { saveClubLabelToCloud } from './auth/superAdminService';

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

const readCatalogDoc = async (): Promise<{ items: ClubLocation[]; deletedNames: Set<string> }> => {
  const snap = await getDocFromServer(SHARED_LOCATIONS_DOC).catch(() => getDoc(SHARED_LOCATIONS_DOC));
  const items: ClubLocation[] = [];
  const deletedNames = new Set<string>();
  if (snap.exists()) {
    const data = snap.data();
    if (Array.isArray(data.deletedNames)) {
      data.deletedNames.forEach((n: unknown) => {
        if (typeof n === 'string' && n.trim()) deletedNames.add(normalizeLocationName(n).toLowerCase());
      });
    }
    if (Array.isArray(data.items)) {
      data.items.forEach((item: any) => {
        if (typeof item?.name === 'string' && item.name.trim()) {
          items.push(sanitizeLocationItem({
            id: String(item.id || item.name),
            name: normalizeLocationName(item.name),
            areaLabel: item.areaLabel,
            lat: item.lat,
            lng: item.lng,
            createdAt: item.createdAt,
            createdBy: item.createdBy,
          }));
        }
      });
    }
  }
  return { items, deletedNames };
};

const persistCatalog = async (items: ClubLocation[], deletedNames: Set<string>): Promise<ClubLocation[]> => {
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name, 'he'));
  await setDoc(SHARED_LOCATIONS_DOC, {
    isSystemCatalog: true,
    isDeleted: false,
    items: sorted,
    deletedNames: Array.from(deletedNames),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
  useAppStore.getState().setLocations(sorted);
  return sorted;
};

export const fetchGlobalLocations = async (): Promise<ClubLocation[]> => {
  try {
    const { items, deletedNames } = await readCatalogDoc();
    const map = new Map<string, ClubLocation>();
    items.forEach((loc) => map.set(loc.name.toLowerCase(), loc));
    useAppStore.getState().clubs.forEach((club) => {
      const sched = club.defaultSchedule;
      const locName = sched?.locationName;
      if (locName && locName.trim()) {
        const clean = normalizeLocationName(locName);
        const key = clean.toLowerCase();
        if (!map.has(key) && !deletedNames.has(key)) {
          map.set(key, sanitizeLocationItem({
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

  const { items, deletedNames } = await readCatalogDoc();
  deletedNames.delete(normalized.toLowerCase());
  const mergedMap = new Map<string, ClubLocation>();
  [...useAppStore.getState().locations, ...items].forEach((loc) => {
    const key = normalizeLocationName(loc.name).toLowerCase();
    if (key && !deletedNames.has(key) && !mergedMap.has(key)) mergedMap.set(key, sanitizeLocationItem(loc));
  });

  const existingMatch = mergedMap.get(normalized.toLowerCase());
  const hasNewCoords = coords?.lat !== undefined && coords?.lng !== undefined;
  const cleanArea = typeof areaLabel === 'string' && areaLabel.trim() ? normalizeLocationName(areaLabel) : undefined;
  if (existingMatch && !hasNewCoords && (!cleanArea || existingMatch.areaLabel)) {
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
  await persistCatalog(Array.from(mergedMap.values()), deletedNames);
  return created;
};

export const updateGlobalLocation = async (
  locationId: string,
  updates: { name: string; coords?: { lat?: number; lng?: number } | null; areaLabel?: string | null }
): Promise<ClubLocation> => {
  const normalized = normalizeLocationName(updates.name);
  if (!normalized) throw new Error('יש להזין שם מיקום');

  const { items, deletedNames } = await readCatalogDoc();
  const baseList = items.length > 0 ? items : useAppStore.getState().locations;
  const target = baseList.find((l) => l.id === locationId || normalizeLocationName(l.name).toLowerCase() === normalized.toLowerCase());
  const dupConflict = baseList.find((l) => l.id !== (target?.id || locationId) && normalizeLocationName(l.name).toLowerCase() === normalized.toLowerCase());
  if (dupConflict) throw new Error('כבר קיים מיקום אחר בשם זה במאגר');

  deletedNames.delete(normalized.toLowerCase());
  const updated = sanitizeLocationItem({
    id: target?.id || locationId,
    name: normalized,
    areaLabel: updates.areaLabel === null ? undefined : (updates.areaLabel ?? target?.areaLabel),
    lat: updates.coords === null ? undefined : (updates.coords?.lat ?? target?.lat),
    lng: updates.coords === null ? undefined : (updates.coords?.lng ?? target?.lng),
    createdAt: target?.createdAt || new Date().toISOString(),
    createdBy: target?.createdBy,
  });

  const nextItems = baseList.some((l) => l.id === updated.id)
    ? baseList.map((l) => (l.id === updated.id ? updated : sanitizeLocationItem(l)))
    : [...baseList.map(sanitizeLocationItem), updated];
  await persistCatalog(nextItems, deletedNames);

  const store = useAppStore.getState();
  for (const club of store.clubs) {
    const sched = club.defaultSchedule;
    if (sched && (sched.locationId === updated.id || (target && normalizeLocationName(sched.locationName).toLowerCase() === target.name.toLowerCase()))) {
      const nextSched = { ...sched, locationId: updated.id, locationName: updated.name, areaLabel: updated.areaLabel, lat: updated.lat, lng: updated.lng };
      store.updateClub(club.id, club.label, nextSched);
      saveClubLabelToCloud(club.id, club.label, nextSched).catch(() => {});
    }
  }
  return updated;
};

export const deleteGlobalLocation = async (locationId: string): Promise<void> => {
  const { items, deletedNames } = await readCatalogDoc();
  const baseList = items.length > 0 ? items : useAppStore.getState().locations;
  const target = baseList.find((l) => l.id === locationId || l.name === locationId);
  if (target) deletedNames.add(normalizeLocationName(target.name).toLowerCase());
  const nextItems = baseList.filter((l) => l.id !== locationId && l.name !== locationId).map(sanitizeLocationItem);
  await persistCatalog(nextItems, deletedNames);
};
