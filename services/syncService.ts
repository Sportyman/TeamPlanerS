
import { db } from '../firebase';
import { doc, getDoc, setDoc, arrayUnion, collection, addDoc } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Person, SessionState, ClubSettings, ClubID, PersonSnapshot } from '../types';

let syncTimeout: any = null;
let lastSyncPayload: string = '';
let isFatalError = false; 

const systemLogs: { time: string; msg: string; type: 'INFO' | 'WARN' | 'ERROR' | 'SYNC' }[] = [];

// Fixed missing export: added downloadSystemLogs function
export const downloadSystemLogs = () => {
    const logContent = systemLogs.map(l => `[${l.time}] [${l.type}] ${l.msg}`).join('\n');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etgarim-system-${new Date().toISOString().slice(0, 10)}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const addLog = (msg: string, type: 'INFO' | 'WARN' | 'ERROR' | 'SYNC' = 'INFO') => {
    const time = new Date().toISOString();
    systemLogs.push({ time, msg, type });
    if (systemLogs.length > 1000) systemLogs.shift();
    const color = type === 'ERROR' ? 'color: #ff4444' : type === 'SYNC' ? 'color: #00C851' : 'color: #33b5e5';
    console.log(`%c[${type}] ${new Date().toLocaleTimeString()}: ${msg}`, color);
};

export const sendNotificationToClub = async (clubId: ClubID, message: string, type: 'INFO' | 'SUCCESS' | 'WARN' = 'INFO') => {
    try {
        const notifRef = collection(db, 'notifications');
        await addDoc(notifRef, {
            clubId,
            message,
            type,
            timestamp: new Date().toISOString(),
            read: false
        });
        addLog(`Notification sent to club ${clubId}: ${message}`, 'SYNC');
    } catch (e) {
        addLog(`Failed to send notification: ${e}`, 'ERROR');
    }
};

export const fetchGlobalConfig = async () => {
    if (isFatalError) return;
    const { setGlobalConfig, setSyncStatus } = useAppStore.getState();
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
        setSyncStatus('OFFLINE');
    }
};

export const addPersonToClubCloud = async (clubId: ClubID, person: Person) => {
    if (isFatalError) return;
    try {
        const clubDocRef = doc(db, 'clubs', clubId);
        await setDoc(clubDocRef, { people: arrayUnion(person) }, { merge: true });
        addLog(`Successfully synced person ${person.name} to cloud`, 'SYNC');
    } catch (error) {
        addLog(`Error adding person to club cloud: ${error}`, 'ERROR');
    }
};

export const fetchFromCloud = async (clubId: ClubID) => {
    if (isFatalError) return;
    const { setCloudData, setSyncStatus, setInitialLoading, user } = useAppStore.getState();
    if (!user || user.isDev) {
        setInitialLoading(false);
        return;
    }

    setSyncStatus('SYNCING');
    setInitialLoading(true);
    try {
        const clubDocRef = doc(db, 'clubs', clubId);
        const docSnap = await getDoc(clubDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            setCloudData({
                people: data.people || [],
                sessions: { [clubId]: data.session || { inventory: {}, presentPersonIds: [], teams: [] } },
                settings: { [clubId]: data.settings || { boatDefinitions: [] } },
                snapshots: { [clubId]: data.snapshots || [] }
            });
        }
    } catch (error) {
        setSyncStatus('OFFLINE');
    } finally {
        setInitialLoading(false);
    }
};
