
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Person, SessionState, ClubSettings, ClubID, PersonSnapshot } from '../types';

let syncTimeout: any = null;
let lastSyncPayload: string = '';
let isFatalError = false; // Persistent flag for the current session

// --- LOGGING SYSTEM ---
const systemLogs: string[] = [];
export const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;
    systemLogs.push(entry);
    if (systemLogs.length > 500) systemLogs.shift();
    // Silent console unless critical
    if (msg.includes('CRITICAL') || msg.includes('FATAL')) {
        console.error(entry);
    }
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

// --- RATE LIMITER (HARD STOP) ---
let requestTimes: number[] = [];
const RATE_LIMIT_PER_MINUTE = 40; 

const checkRateLimit = (): boolean => {
    if (isFatalError) return false;
    
    const now = Date.now();
    requestTimes = requestTimes.filter(t => now - t < 60000);
    
    if (requestTimes.length >= RATE_LIMIT_PER_MINUTE) {
        isFatalError = true; // LOCK THE SYSTEM
        addLog("FATAL ERROR: Rate limit exceeded! System sync locked. REFRESH REQUIRED (F5).");
        return false;
    }
    
    requestTimes.push(now);
    return true;
};

// --- STABLE JSON HELPER ---
const getStablePayload = (clubPeople: Person[], clubSession: SessionState, clubSet: ClubSettings, clubSnapshots: PersonSnapshot[]) => {
    try {
        return JSON.stringify({
            clubPeople: [...(clubPeople || [])].sort((a, b) => (a.id || '').localeCompare(b.id || '')),
            clubSession: { 
                ...clubSession, 
                presentPersonIds: [...(clubSession?.presentPersonIds || [])].sort(),
                teams: [...(clubSession?.teams || [])].map(t => ({...t, members: [...(t.members || [])].sort((a, b) => a.id.localeCompare(b.id))})).sort((a,b) => a.id.localeCompare(b.id))
            },
            clubSet,
            clubSnapshots: [...(clubSnapshots || [])].sort((a, b) => a.id.localeCompare(b.id))
        });
    } catch (e) {
        return '';
    }
};

export const fetchGlobalConfig = async () => {
    if (isFatalError) return;
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
        addLog(`Global Config Fetch Error: ${error}`);
    }
};

export const addPersonToClubCloud = async (clubId: ClubID, person: Person) => {
    if (isFatalError) return;
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
    if (isFatalError) return;
    
    const state = useAppStore.getState();
    const { people, sessions, clubSettings, snapshots, user, setSyncStatus, superAdmins, permissions } = state;

    if (!user || !clubId || user.isDev) return;

    const clubPeople = people.filter(p => p.clubId === clubId);
    const clubSession = sessions[clubId];
    const clubSet = clubSettings[clubId];
    const clubSnapshots = snapshots[clubId] || [];

    const currentPayload = getStablePayload(clubPeople, clubSession, clubSet, clubSnapshots);
    
    if (currentPayload === lastSyncPayload || !currentPayload) {
        return;
    }

    if (!checkRateLimit()) {
        setSyncStatus('ERROR');
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
                superAdmins,
                permissions
            }, { merge: true });
        }
        
        setSyncStatus('SYNCED');
    } catch (error) {
        addLog(`Cloud Sync Error: ${error}`);
        setSyncStatus('ERROR');
    }
};

export const fetchFromCloud = async (clubId: ClubID) => {
    if (isFatalError) return;
    const { setCloudData, setSyncStatus, user } = useAppStore.getState();
    
    if (!user || user.isDev) return;

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
        } else {
            setSyncStatus('SYNCED'); 
        }
    } catch (error) {
        addLog(`Cloud Fetch Error: ${error}`);
        setSyncStatus('OFFLINE');
    }
};

export const triggerCloudSync = (clubId: ClubID) => {
    if (isFatalError) return;
    const state = useAppStore.getState();
    if (!state.user || state.user.isDev) return;

    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        syncToCloud(clubId);
    }, 2000); 
};
