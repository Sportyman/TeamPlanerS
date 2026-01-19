
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Person, SessionState, ClubSettings, ClubID, PersonSnapshot } from '../types';

let syncTimeout: any = null;
let lastSyncPayload: string = '';

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

    // Skip sync if user is not logged in OR is a Dev User
    if (!user || !clubId || user.isDev) {
        if (user?.isDev) setSyncStatus('SYNCED'); 
        return;
    }

    const clubPeople = people.filter(p => p.clubId === clubId);
    const clubSession = sessions[clubId];
    const clubSet = clubSettings[clubId];
    const clubSnapshots = snapshots[clubId] || [];

    // Create a fingerprint of the data to see if it actually changed
    const currentPayload = JSON.stringify({ clubPeople, clubSession, clubSet, clubSnapshots });
    if (currentPayload === lastSyncPayload) {
        setSyncStatus('SYNCED');
        return;
    }

    setSyncStatus('SYNCING');

    try {
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

        lastSyncPayload = currentPayload;
        
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
    const { setCloudData, setSyncStatus, user } = useAppStore.getState();
    
    if (!user || user.isDev) {
        if (user?.isDev) setSyncStatus('SYNCED');
        return;
    }

    setSyncStatus('SYNCING');

    try {
        const clubDocRef = doc(db, 'clubs', clubId);
        const docSnap = await getDoc(clubDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Store the initial payload to prevent immediate re-sync
            lastSyncPayload = JSON.stringify({ 
                clubPeople: data.people, 
                clubSession: data.session, 
                clubSet: data.settings, 
                clubSnapshots: data.snapshots || [] 
            });

            setCloudData({
                people: data.people as Person[],
                sessions: { [clubId]: data.session as SessionState },
                settings: { [clubId]: data.settings as ClubSettings },
                snapshots: { [clubId]: data.snapshots as PersonSnapshot[] || [] }
            });
        } else {
            setSyncStatus('SYNCED'); 
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
    }, 3000); // Increased debounce to 3s for stability
};
