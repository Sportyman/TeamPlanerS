import { db } from '../../firebase';
import {
  doc, updateDoc, setDoc, deleteDoc, collection, getDocs, getDocsFromServer, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { Club } from '../../types';
import { addLog } from '../syncService';

export const LEGACY_MOCK_UIDS = new Set([
  'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9', 'k10',
  's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10',
]);

export const isLegacyMockId = (uid: string): boolean =>
  LEGACY_MOCK_UIDS.has(uid) || uid.startsWith('dev-user-');

export const canModifyAdmin = (targetEmail: string, protectedAdmins: string[]): boolean => {
  const normalizedTarget = targetEmail.toLowerCase().trim();
  return !protectedAdmins.some((a) => a.toLowerCase().trim() === normalizedTarget);
};

export const addSuperAdminToCloud = async (email: string) => {
  const configRef = doc(db, 'config', 'global');
  const normalizedEmail = email.toLowerCase().trim();
  await updateDoc(configRef, { superAdmins: arrayUnion(normalizedEmail) });
  addLog(`Super Admin added: ${normalizedEmail}`);
  return true;
};

export const removeSuperAdminFromCloud = async (email: string, protectedAdmins: string[]) => {
  if (!canModifyAdmin(email, protectedAdmins)) {
    throw new Error('Cannot remove a protected original admin.');
  }
  const configRef = doc(db, 'config', 'global');
  const normalizedEmail = email.toLowerCase().trim();
  await updateDoc(configRef, { superAdmins: arrayRemove(normalizedEmail) });
  addLog(`Super Admin removed: ${normalizedEmail}`);
  return true;
};

export const saveClubLabelToCloud = async (
  clubId: string,
  label: string,
  defaultSchedule?: Club['defaultSchedule']
): Promise<void> => {
  const payload: Record<string, any> = {
    label: label.trim(),
    isDeleted: false,
    updatedAt: new Date().toISOString(),
  };
  if (defaultSchedule) payload.defaultSchedule = defaultSchedule;
  await setDoc(doc(db, 'clubs', clubId), payload, { merge: true });
};

export const markClubDeletedInCloud = async (clubId: string): Promise<void> => {
  await setDoc(doc(db, 'clubs', clubId), {
    isDeleted: true,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
};

export const fetchCloudClubsCatalog = async (): Promise<{ clubs: Club[]; deletedIds: string[] }> => {
  const colRef = collection(db, 'clubs');
  const snap = await getDocsFromServer(colRef).catch(() => getDocs(colRef));
  const clubs: Club[] = [];
  const deletedIds: string[] = [];
  snap.docs.forEach((d) => {
    const data = d.data();
    if (data.isDeleted) {
      deletedIds.push(d.id);
    } else if (typeof data.label === 'string' && data.label.trim()) {
      clubs.push({
        id: d.id,
        label: data.label.trim(),
        defaultSchedule: data.defaultSchedule || undefined,
        sessionOverride: data.sessionOverride || null,
      });
    }
  });
  return { clubs, deletedIds };
};

export const purgeLegacyMockMemberships = async (): Promise<number> => {
  const snap = await getDocsFromServer(collection(db, 'memberships')).catch(() => getDocs(collection(db, 'memberships')));
  const toDelete = snap.docs.filter((d) => {
    const uid = String(d.data().uid || '');
    return isLegacyMockId(uid);
  });
  await Promise.all(toDelete.map((d) => deleteDoc(d.ref)));
  addLog(`Purged ${toDelete.length} legacy mock memberships`, 'SYNC');
  return toDelete.length;
};
