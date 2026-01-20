
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Person, SessionState, ClubSettings, ClubID, PersonSnapshot } from '../types';

let syncTimeout: any = null;
let lastSyncPayload: string = '';
let isFatalError = false; 

// --- ADVANCED LOGGING SYSTEM ---
const systemLogs: { time: string; msg: string; type: 'INFO' | 'WARN' | 'ERROR' | 'SYNC' }[] = [];

export const addLog = (msg: string, type: 'INFO' | 'WARN' | 'ERROR' | 'SYNC' = 'INFO') => {
    const time = new Date().toISOString();
    const entry = { time, msg, type };
    systemLogs.push(entry);
    if (systemLogs.length > 1000) systemLogs.shift();
    
    const color = type === 'ERROR' ? 'color: #ff4444' : type === 'SYNC' ? 'color: #00C851' : 'color: #33b5e5';
    console.log(`%c[${type}] ${new Date().toLocaleTimeString()}: ${msg}`, color);
};

export const downloadSystemLogs = () => {
    const logText = systemLogs.map(l => `[${l.time}] [${l.type}] ${l.msg}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teamplaner-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addLog("Logs exported by user", 'INFO');
};

// --- RATE LIMITER ---
let requestTimes: number[] = [];
const RATE_LIMIT_PER_MINUTE = 40; 

const checkRateLimit = (): boolean => {
    if (isFatalError) return false;
    const now = Date.now();
    requestTimes = requestTimes.filter(t => now - t < 60000);
    if (requestTimes.length >= RATE_LIMIT_PER_MINUTE) {
        isFatalError = true;
        addLog("FATAL ERROR: Rate limit exceeded! Sync locked.", 'ERROR');
        return false;
    }
    requestTimes.push(now);
    return true;
};

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
    addLog("Fetching global configuration...", 'SYNC');
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
            addLog("Global configuration loaded successfully", 'SYNC');
        }
    } catch (error) {
        addLog(`Global Config Fetch Error: ${error}`, 'ERROR');
    }
};

export const addPersonToClubCloud = async (clubId: ClubID, person: Person) => {
    if (isFatalError) return;
    addLog(`Attempting to sync person ${person.name} to club ${clubId}`, 'SYNC');
    try {
        const clubDocRef = doc(db, 'clubs', clubId);
        await updateDoc(clubDocRef, {
            people: arrayUnion(person)
        });
        addLog(`Successfully synced person ${person.name} to cloud`, 'SYNC');
    } catch (error) {
        addLog(`Error adding person to club cloud: ${error}`, 'ERROR');
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
    if (currentPayload === lastSyncPayload || !currentPayload) return;

    if (!checkRateLimit()) {
        setSyncStatus('ERROR');
        return;
    }

    setSyncStatus('SYNCING');
    addLog(`Syncing club ${clubId} to cloud...`, 'SYNC');

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
            await setDoc(configDocRef, { superAdmins, permissions }, { merge: true });
        }
        
        setSyncStatus('SYNCED');
        addLog(`Club ${clubId} sync complete`, 'SYNC');
    } catch (error) {
        addLog(`Cloud Sync Error: ${error}`, 'ERROR');
        setSyncStatus('ERROR');
    }
};

export const fetchFromCloud = async (clubId: ClubID) => {
    if (isFatalError) return;
    const { setCloudData, setSyncStatus, user } = useAppStore.getState();
    if (!user || user.isDev) return;

    addLog(`Fetching data for club ${clubId}...`, 'SYNC');
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
            addLog(`Club ${clubId} data loaded successfully`, 'SYNC');
        }
    } catch (error) {
        addLog(`Cloud Fetch Error: ${error}`, 'ERROR');
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
