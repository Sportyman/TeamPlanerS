
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { useAppStore } from '../store';
import { ClubID, Participant, SessionState, ClubSettings } from '../types';

let syncTimeout: any = null;

export const syncToCloud = async (clubId: ClubID) => {
    const state = useAppStore.getState();
    const { people, sessions, clubSettings, user, setSyncStatus } = state;

    if (!user || !clubId) return;
    setSyncStatus('SYNCING');

    try {
        const batch = writeBatch(db);
        
        // 1. Sync Identities (Participants) - Individual documents for efficiency
        people.forEach(p => {
            const partRef = doc(db, 'participants', p.id);
            batch.set(partRef, p, { merge: true });
        });

        // 2. Sync Club Specific Repositories
        const clubMetaRef = doc(db, 'clubs', clubId);
        const clubSession = sessions[clubId];
        const clubSet = clubSettings[clubId];

        batch.set(clubMetaRef, {
            clubId,
            lastUpdated: new Date().toISOString(),
            session: clubSession,
            settings: clubSet,
            updatedBy: user.email
        }, { merge: true });
        
        await batch.commit();
        setSyncStatus('SYNCED');
    } catch (error) {
        console.error("Cloud Sync Error:", error);
        setSyncStatus('ERROR');
    }
};

export const fetchFromCloud = async (clubId: ClubID) => {
    const { setCloudData, setSyncStatus } = useAppStore.getState();
    setSyncStatus('SYNCING');

    try {
        // Fetch identity repository
        const partsSnap = await getDocs(collection(db, 'participants'));
        const people: Participant[] = [];
        partsSnap.forEach(d => people.push(d.data() as Participant));

        // Fetch club repository
        const clubDocRef = doc(db, 'clubs', clubId);
        const docSnap = await getDoc(clubDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            setCloudData({
                people,
                sessions: { [clubId]: data.session as SessionState },
                settings: { [clubId]: data.settings as ClubSettings }
            });
        } else {
            setCloudData({ people });
            setSyncStatus('SYNCED');
        }
    } catch (error) {
        setSyncStatus('OFFLINE');
    }
};

export const triggerCloudSync = (clubId: ClubID) => {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => syncToCloud(clubId), 3000); 
};
