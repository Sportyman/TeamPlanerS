
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Person, SessionState, ClubSettings, ClubID, PersonSnapshot } from '../types';

let syncTimeout: any = null;
let lastSyncPayload: string = '';

// --- LOGGING SYSTEM ---
const systemLogs: string[] = [];
export const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;
    systemLogs.push(entry);
    if (systemLogs.length > 500) systemLogs.shift();
    console.log(entry);
};

(window as any).exportLogs = () => {
    const blob = new Blob([systemLogs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etgarim-logs-${Date.now()}.txt`;
    a.click();
    return "Logs exported.";
};

// --- RATE LIMITER ---
let requestTimes: number[] = [];
const RATE_LIMIT_PER_MINUTE = 40; // Safe threshold

const checkRateLimit = (): boolean => {
    const now = Date.now();
    requestTimes = requestTimes.filter(t => now - t < 60000);
    if (requestTimes.length >= RATE_LIMIT_PER_MINUTE) {
        addLog("CRITICAL: Rate limit exceeded! Sync suspended.");
        return false;
    }
    requestTimes.push(now);
    return true;
};

// --- STABLE JSON HELPER ---
/**
 * Sorting arrays by ID ensures stringify comparisons are order-independent.
 * This is the root cause fix for infinite loops when Firestore returns data in a different order.
 */
const getStablePayload = (clubPeople: Person[], clubSession: SessionState, clubSet: ClubSettings, clubSnapshots: PersonSnapshot[]) => {
    return JSON.stringify({
        clubPeople: [...clubPeople].sort((a, b) => a.id.localeCompare(b.id)),
        clubSession: { 
            ...clubSession, 
            presentPersonIds: [...(clubSession?.presentPersonIds || [])].sort(),
            teams: [...(clubSession?.teams || [])].map(t => ({...t, members: [...t.members].sort((a, b) => a.id.localeCompare(b.id))})).sort((a,b) => a.id.localeCompare(b.id))
        },
        clubSet,
        clubSnapshots: [...clubSnapshots].sort((a, b) => a.id.localeCompare(b.id))
    });
};

export const fetchGlobalConfig = async () => {
    const { setGlobalConfig } = useAppStore.getState();
    addLog("Fetching global config...");
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
        addLog(`Global Config Fetch Error: ${error}`);
    }
};

export const addPersonToClubCloud = async (clubId: ClubID, person: Person) => {
    addLog(`Adding individual user ${person.name} to club ${clubId}...`);
    try {
        const clubDocRef = doc(db, 'clubs', clubId);
        await updateDoc(clubDocRef, {
            people: arrayUnion(person)
        });
    } catch (error) {
        addLog(`Error adding person to club cloud: ${error}`);
    }
};

export const syncToCloud = async (clubId: ClubID) => {
    const state = useAppStore.getState();
    const { people, sessions, clubSettings, snapshots, user, setSyncStatus, superAdmins, permissions } = state;

    if (!user || !clubId || user.isDev) return;

    const clubPeople = people.filter(p => p.clubId === clubId);
    const clubSession = sessions[clubId];
    const clubSet = clubSettings[clubId];
    const clubSnapshots = snapshots[clubId] || [];

    const currentPayload = getStablePayload(clubPeople, clubSession, clubSet, clubSnapshots);
    
    if (currentPayload === lastSyncPayload) {
        return;
    }

    if (!checkRateLimit()) {
        setSyncStatus('ERROR');
        return;
    }

    setSyncStatus('SYNCING');
    addLog(`Syncing to cloud for club: ${clubId}...`);

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
                permissions
            }, { merge: true });
        }
        
        setSyncStatus('SYNCED');
        addLog(`Sync successful for ${clubId}.`);
    } catch (error) {
        addLog(`Cloud Sync Error: ${error}`);
        setSyncStatus('ERROR');
    }
};

export const fetchFromCloud = async (clubId: ClubID) => {
    const { setCloudData, setSyncStatus, user } = useAppStore.getState();
    
    if (!user || user.isDev) return;

    addLog(`Fetching data from cloud for ${clubId}...`);
    try {
        const clubDocRef = doc(db, 'clubs', clubId);
        const docSnap = await getDoc(clubDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            lastSyncPayload = getStablePayload(
                data.people || [], 
                data.session || { inventory: {}, presentPersonIds: [], teams: [] }, 
                data.settings || { boatDefinitions: [] }, 
                data.snapshots || []
            );

            setCloudData({
                people: data.people as Person[],
                sessions: { [clubId]: data.session as SessionState },
                settings: { [clubId]: data.settings as ClubSettings },
                snapshots: { [clubId]: data.snapshots as PersonSnapshot[] || [] }
            });
            setSyncStatus('SYNCED');
            addLog(`Fetched data successfully for ${clubId}.`);
        } else {
            setSyncStatus('SYNCED'); 
        }
    } catch (error) {
        addLog(`Cloud Fetch Error: ${error}`);
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
