
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Person, SessionState, ClubSettings, ClubID, PersonSnapshot } from '../types';

let syncTimeout: any = null;

/**
 * Fetches global configuration (like Super Admin list and Protected Admins) from Firestore
 */
export const fetchGlobalConfig = async () => {
    const { setGlobalConfig } = useAppStore.getState();
    try {
        const configDocRef = doc(db, 'config', 'global');
        const docSnap = await getDoc(configDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            setGlobalConfig({
                superAdmins: data.superAdmins || [],
                protectedAdmins: data.protectedAdmins || []
            });
        }
    } catch (error) {
        console.error("Global Config Fetch Error:", error);
    }
};

export const syncToCloud = async (clubId: ClubID) => {
    const state = useAppStore.getState();
    const { people, sessions, clubSettings, snapshots, user, setSyncStatus, superAdmins } = state;

    if (!user || !clubId) return;

    // Filter people for this club
    const clubPeople = people.filter(p => p.clubId === clubId);
    const clubSession = sessions[clubId];
    const clubSet = clubSettings[clubId];
    const clubSnapshots = snapshots[clubId] || [];

    setSyncStatus('SYNCING');

    try {
        // Sync club data
        const clubDocRef = doc(db, 'clubs', clubId);
        await setDoc(clubDocRef, {
            clubId,
            lastUpdated: new Date().toISOString(),
            people: clubPeople,
            session: clubSession,
            settings: clubSet,
            snapshots: clubSnapshots,
            updatedBy: user.email
        }, { merge: true });

        // If user is admin, also sync the global admin list
        // Note: Security rules should protect 'protectedAdmins' from being overwritten via SDK if implemented correctly
        if (user.isAdmin) {
            const configDocRef = doc(db, 'config', 'global');
            await setDoc(configDocRef, {
                superAdmins: superAdmins
            }, { merge: true });
        }
        
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
        const clubDocRef = doc(db, 'clubs', clubId);
        const docSnap = await getDoc(clubDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            setCloudData({
                people: data.people as Person[],
                sessions: { [clubId]: data.session as SessionState },
                settings: { [clubId]: data.settings as ClubSettings },
                snapshots: { [clubId]: data.snapshots as PersonSnapshot[] || [] }
            });
        } else {
            setSyncStatus('SYNCED'); // Nothing to fetch
        }
    } catch (error) {
        console.error("Cloud Fetch Error:", error);
        setSyncStatus('OFFLINE');
    }
};

/**
 * Debounced sync to avoid excessive writes
 */
export const triggerCloudSync = (clubId: ClubID) => {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        syncToCloud(clubId);
    }, 2000); 
};
