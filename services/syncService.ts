
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Person, SessionState, ClubSettings, ClubID, PersonSnapshot } from '../types';

let syncTimeout: any = null;
let lastSyncPayload: string = '';

export const fetchGlobalConfig = async () => {
    const { setGlobalConfig } = useAppStore.getState();
    try {
        const configDocRef = doc(db, 'config', 'global');
        const docSnap = await getDoc(configDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            setGlobalConfig({
                superAdmins: data.superAdmins || [],
                protectedAdmins: data.protectedAdmins || [],
                permissions: data.permissions || []
            });
        }
    } catch (error) {
        console.error("Global Config Fetch Error:", error);
    }
};

/**
 * Specifically adds a single person to the club's people array in Firestore
 * Used during onboarding to prevent "Ghost Users"
 */
export const addPersonToClubCloud = async (clubId: ClubID, person: Person) => {
    try {
        const clubDocRef = doc(db, 'clubs', clubId);
        await updateDoc(clubDocRef, {
            people: arrayUnion(person)
        });
        console.log(`User ${person.name} added to club ${clubId} cloud list.`);
    } catch (error) {
        console.error("Error adding person to club cloud:", error);
    }
};

export const syncToCloud = async (clubId: ClubID) => {
    const state = useAppStore.getState();
    const { people, sessions, clubSettings, snapshots, user, setSyncStatus, superAdmins, permissions } = state;

    if (!user || !clubId || user.isDev) {
        if (user?.isDev) setSyncStatus('SYNCED'); 
        return;
    }

    const clubPeople = people.filter(p => p.clubId === clubId);
    const clubSession = sessions[clubId];
    const clubSet = clubSettings[clubId];
    const clubSnapshots = snapshots[clubId] || [];

    const currentPayload = JSON.stringify({ clubPeople, clubSession, clubSet, clubSnapshots });
    
    // IF NO CHANGE, EXIT QUIETLY WITHOUT CHANGING STATUS
    if (currentPayload === lastSyncPayload) {
        return;
    }

    // ONLY CHANGE TO SYNCING WHEN WE ACTUALLY START THE WRITE
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
                superAdmins,
                permissions // Sync staff list as well
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

    try {
        const clubDocRef = doc(db, 'clubs', clubId);
        const docSnap = await getDoc(clubDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
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
            setSyncStatus('SYNCED');
        } else {
            setSyncStatus('SYNCED'); 
        }
    } catch (error) {
        console.error("Cloud Fetch Error:", error);
        setSyncStatus('OFFLINE');
    }
};

export const triggerCloudSync = (clubId: ClubID) => {
    const state = useAppStore.getState();
    if (!state.user || state.user.isDev) return;

    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        syncToCloud(clubId);
    }, 2000); 
};
