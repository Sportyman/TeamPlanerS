import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { ClubID, Person, Role } from '../types';
import { useAppStore } from '../store';
import { addLog } from './syncService';

export const promoteClubBaseRole = async (clubId: ClubID, person: Person, nextRole: Role): Promise<Person> => {
  const nowIso = new Date().toISOString();
  await setDoc(
    doc(db, 'memberships', `${clubId}_${person.id}`),
    { role: nextRole, dismissedRoleStreak: null, lastUpdate: nowIso },
    { merge: true }
  );
  const updated: Person = { ...person, role: nextRole, dismissedRoleStreak: undefined };
  const store = useAppStore.getState();
  store.setPeople(
    store.people.map((p) => (p.clubId === clubId && p.id === person.id ? { ...p, role: nextRole, dismissedRoleStreak: undefined } : p))
  );
  addLog(`Promoted base club role for ${person.name} (${clubId}) -> ${nextRole}`, 'SYNC');
  return updated;
};

export const dismissRoleStreakPrompt = async (
  clubId: ClubID,
  person: Person,
  suggestedRole: Role,
  streakCount: number
): Promise<void> => {
  const dismissal = { role: suggestedRole, reaskAtStreak: streakCount + 3 };
  await setDoc(
    doc(db, 'memberships', `${clubId}_${person.id}`),
    { dismissedRoleStreak: dismissal, lastUpdate: new Date().toISOString() },
    { merge: true }
  );
  const store = useAppStore.getState();
  store.setPeople(
    store.people.map((p) => (p.clubId === clubId && p.id === person.id ? { ...p, dismissedRoleStreak: dismissal } : p))
  );
};
