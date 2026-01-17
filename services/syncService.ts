
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Person, SessionState, ClubSettings, ClubID, PersonSnapshot, Participant } from '../types';

let syncTimeout: any = null;

export const syncToCloud = async (clubId: ClubID) => {
    const state = useAppStore.getState();
    const { people, sessions, clubSettings, snapshots, user, setSyncStatus } = state;

    if (!user || !clubId) return;

    setSyncStatus('SYNCING');

    try {
        const batch = writeBatch(db);
        
        // 1. Sync Global Participants (the identities)
        people.forEach(p => {
            const partRef = doc(db, 'participants', p.id);
            batch.set(partRef, p, { merge: true });
        });

        // 2. Sync Club Specific Data
        const clubDocRef = doc(db, 'clubs', clubId);
        const clubSession = sessions[clubId];
        const clubSet = clubSettings[clubId];
        const clubSnapshots = snapshots[clubId] || [];

        batch.set(clubDocRef, {
            clubId,
            lastUpdated: new Date().toISOString(),
            session: clubSession,
            settings: clubSet,
            snapshots: clubSnapshots,
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
        // 1. Fetch all participants (global pool)
        const partsSnap = await getDocs(collection(db, 'participants'));
        const people: Participant[] = [];
        partsSnap.forEach(d => people.push(d.data() as Participant));

        // 2. Fetch club specific data
        const clubDocRef = doc(db, 'clubs', clubId);
        const docSnap = await getDoc(clubDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            setCloudData({
                people,
                sessions: { [clubId]: data.session as SessionState },
                settings: { [clubId]: data.settings as ClubSettings },
                snapshots: { [clubId]: data.snapshots as PersonSnapshot[] || [] }
            });
        } else {
            setCloudData({ people });
            setSyncStatus('SYNCED');
        }
    } catch (error) {
        console.error("Cloud Fetch Error:", error);
        setSyncStatus('OFFLINE');
    }
};

export const triggerCloudSync = (clubId: ClubID) => {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        syncToCloud(clubId);
    }, 2000); 
};
