import { db } from '../firebase';
import { doc, onSnapshot, setDoc, Unsubscribe } from 'firebase/firestore';
import { BoatDefinition, ClubID } from '../types';
import { KAYAK_DEFINITIONS, SAILING_DEFINITIONS } from '../mockData';
import { useAppStore } from '../store';

export const getDefaultBoatDefs = (clubId: string, label = ''): BoatDefinition[] => {
  const combined = `${clubId} ${label}`.toLowerCase();
  if (clubId === 'SAILING' || combined.includes('שייט') || combined.includes('סונאר') || combined.includes('sailing')) {
    return SAILING_DEFINITIONS;
  }
  return KAYAK_DEFINITIONS;
};

export const saveClubBoatDefinitions = async (clubId: ClubID, defs: BoatDefinition[]): Promise<void> => {
  const store = useAppStore.getState();
  store.setClubBoatDefinitions(clubId, defs);
  await setDoc(
    doc(db, 'clubs', clubId),
    { boatDefinitions: defs, updatedAt: new Date().toISOString() },
    { merge: true }
  );
};

export const subscribeToClubBoatDefinitions = (clubId: ClubID, clubLabel = ''): Unsubscribe => {
  return onSnapshot(doc(db, 'clubs', clubId), (snap) => {
    const data = snap.exists() ? snap.data() : null;
    const store = useAppStore.getState();
    const existing = store.clubSettings[clubId]?.boatDefinitions;
    if (Array.isArray(data?.boatDefinitions) && data.boatDefinitions.length > 0) {
      store.setClubBoatDefinitions(clubId, data.boatDefinitions as BoatDefinition[]);
    } else if (!existing || existing.length === 0) {
      store.setClubBoatDefinitions(clubId, getDefaultBoatDefs(clubId, clubLabel));
    }
  }, () => {});
};
