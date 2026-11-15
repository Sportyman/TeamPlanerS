import { collection, doc, getDoc, getDocFromServer, getDocs, getDocsFromServer, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useAppStore } from '../../store';
import { addLog } from '../syncService';

export interface CleanResetResult {
  deletedMemberships: number;
  deletedWhatsAppDocs: number;
  preservedSuperAdmins: number;
}

const deleteDocsInBatches = async (refs: Array<ReturnType<typeof doc>>): Promise<number> => {
  let deleted = 0;
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    const chunk = refs.slice(i, i + 400);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
};

export const resetAllParticipantsExceptSuperAdmins = async (
  fallbackSuperAdmins: string[] = []
): Promise<CleanResetResult> => {
  const superEmails = new Set<string>(fallbackSuperAdmins.map((e) => e.toLowerCase().trim()).filter(Boolean));
  if (auth.currentUser?.email) {
    superEmails.add(auth.currentUser.email.toLowerCase().trim());
  }

  try {
    const globalRef = doc(db, 'config', 'global');
    const globalSnap = await getDocFromServer(globalRef).catch(() => getDoc(globalRef));
    if (globalSnap.exists()) {
      const data = globalSnap.data();
      [...(data.superAdmins || []), ...(data.protectedAdmins || [])].forEach((email: unknown) => {
        if (typeof email === 'string' && email.trim()) {
          superEmails.add(email.toLowerCase().trim());
        }
      });
    }
  } catch (err) {
    addLog(`Clean reset: could not refresh config/global (${err})`, 'WARN');
  }

  const superAdminUids = new Set<string>();
  if (auth.currentUser?.uid) superAdminUids.add(auth.currentUser.uid);

  const profilesSnap = await getDocsFromServer(collection(db, 'profiles')).catch(() => getDocs(collection(db, 'profiles')));
  profilesSnap.docs.forEach((d) => {
    const data = d.data();
    const email = String(data.email || '').toLowerCase().trim();
    const contactEmail = String(data.contactEmail || '').toLowerCase().trim();
    if (superEmails.has(email) || superEmails.has(contactEmail)) {
      superAdminUids.add(String(data.uid || d.id));
    }
  });

  const membershipsSnap = await getDocsFromServer(collection(db, 'memberships')).catch(() => getDocs(collection(db, 'memberships')));
  const membershipRefsToDelete = membershipsSnap.docs
    .filter((d) => {
      const uid = String(d.data().uid || '').trim();
      const uidLower = uid.toLowerCase();
      return !superAdminUids.has(uid) && !superEmails.has(uidLower);
    })
    .map((d) => d.ref);

  const whatsappSnap = await getDocsFromServer(collection(db, 'whatsapp_members')).catch(() => getDocs(collection(db, 'whatsapp_members')));
  const whatsappRefsToDelete = whatsappSnap.docs.map((d) => d.ref);

  const deletedMemberships = await deleteDocsInBatches(membershipRefsToDelete);
  const deletedWhatsAppDocs = await deleteDocsInBatches(whatsappRefsToDelete);

  const store = useAppStore.getState();
  const keptPeople = store.people.filter((p) => superAdminUids.has(p.id) || superEmails.has(p.id.toLowerCase()));
  store.setPeople(keptPeople);

  const nextSessions: typeof store.sessions = {};
  Object.entries(store.sessions).forEach(([clubId, sess]) => {
    nextSessions[clubId] = { ...sess, presentPersonIds: [], teams: [] };
  });
  useAppStore.setState({ sessions: nextSessions, snapshots: {}, pairingDirty: false });

  addLog(
    `Clean reset completed: deleted ${deletedMemberships} memberships and ${deletedWhatsAppDocs} whatsapp_members (preserved ${superAdminUids.size} super admin accounts)`,
    'SYNC'
  );

  return {
    deletedMemberships,
    deletedWhatsAppDocs,
    preservedSuperAdmins: superAdminUids.size,
  };
};
