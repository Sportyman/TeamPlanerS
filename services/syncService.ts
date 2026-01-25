
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, Unsubscribe, addDoc } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Person, ClubID, MembershipStatus, UserProfile, Role, AccessLevel } from '../types';

let isFatalError = false; 
const systemLogs: { time: string; msg: string; type: 'INFO' | 'WARN' | 'ERROR' | 'SYNC' }[] = [];

export const addLog = (msg: string, type: 'INFO' | 'WARN' | 'ERROR' | 'SYNC' = 'INFO') => {
    const time = new Date().toISOString();
    systemLogs.push({ time, msg, type });
    if (systemLogs.length > 1000) systemLogs.shift();
    console.log(`%c[${type}] ${new Date().toLocaleTimeString()}: ${msg}`, type === 'ERROR' ? 'color: #f44' : 'color: #33b5e5');
};

export const downloadSystemLogs = () => {
    const logContent = systemLogs.map(l => `[${l.time}] [${l.type}] ${l.msg}`).join('\n');
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etgarim-system-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
};

// Real-time Club Data Subscription
export const subscribeToClubData = (clubId: ClubID): Unsubscribe => {
    const { setPeople, setSyncStatus, setInitialLoading } = useAppStore.getState();
    addLog(`Starting reactive subscription for club: ${clubId}`, 'SYNC');
    
    setSyncStatus('SYNCING');
    setInitialLoading(true);

    // 1. Listen to active memberships for this club
    const membershipsQuery = query(
        collection(db, 'memberships'), 
        where('clubId', '==', clubId),
        where('status', '==', MembershipStatus.ACTIVE)
    );

    return onSnapshot(membershipsQuery, async (snapshot) => {
        const memberships = snapshot.docs.map(d => d.data());
        
        // 2. Hydrate profiles for each member
        const peopleList: Person[] = await Promise.all(memberships.map(async (ms: any) => {
            const profileRef = doc(db, 'profiles', ms.uid);
            const profileSnap = await getDoc(profileRef);
            const profile = profileSnap.exists() ? profileSnap.data() as UserProfile : null;

            // Merge Identity (Profile) + Role (Membership)
            return {
                id: ms.uid,
                clubId: ms.clubId,
                name: profile ? `${profile.firstName} ${profile.lastName}` : (ms.uid.includes('@') ? ms.uid : 'משתמש ללא פרופיל'),
                gender: profile?.gender || 'MALE' as any,
                role: ms.role || Role.MEMBER,
                rank: ms.rank || 3,
                isSkipper: profile?.isSkipper || ms.isSkipper || false,
                phone: profile?.primaryPhone || '',
                notes: profile?.medicalNotes || '',
                // Preserve additional constraints from membership if they exist
                mustPairWith: ms.mustPairWith || [],
                preferPairWith: ms.preferPairWith || [],
                cannotPairWith: ms.cannotPairWith || []
            } as Person;
        }));

        setPeople(peopleList);
        setSyncStatus('SYNCED');
        setInitialLoading(false);
        addLog(`Synced ${peopleList.length} participants reactively`, 'SYNC');
    }, (err) => {
        addLog(`Subscription error: ${err}`, 'ERROR');
        setSyncStatus('OFFLINE');
        setInitialLoading(false);
    });
};

/**
 * Adds or updates a person's membership data in Firestore.
 * This is used to sync club-specific data like roles, ranks, and constraints.
 */
// Fix: Added missing addPersonToClubCloud export to resolve module errors
export const addPersonToClubCloud = async (clubId: ClubID, person: Person) => {
    try {
        const membershipId = `${clubId}_${person.id}`;
        const docRef = doc(db, 'memberships', membershipId);
        
        // We merge the data to preserve fields like joinedClubDate or accessLevel if they already exist
        await setDoc(docRef, {
            uid: person.id,
            clubId: clubId,
            role: person.role,
            rank: person.rank,
            mustPairWith: person.mustPairWith || [],
            preferPairWith: person.preferPairWith || [],
            cannotPairWith: person.cannotPairWith || [],
            status: MembershipStatus.ACTIVE,
            lastUpdate: new Date().toISOString()
        }, { merge: true });
        
        addLog(`Person ${person.name} (${person.id}) synced to club ${clubId} in cloud`, 'SYNC');
    } catch (error) {
        addLog(`Failed to sync person to club cloud: ${error}`, 'ERROR');
        throw error;
    }
};

export const fetchGlobalConfig = async () => {
    const { setGlobalConfig } = useAppStore.getState();
    try {
        const docSnap = await getDoc(doc(db, 'config', 'global'));
        if (docSnap.exists()) {
            const data = docSnap.data();
            setGlobalConfig({
                superAdmins: data.superAdmins || [],
                protectedAdmins: data.protectedAdmins || [],
                permissions: data.permissions || []
            });
        }
    } catch (error) {
        addLog(`Global config fetch error: ${error}`, 'ERROR');
    }
};

export const sendNotificationToClub = async (clubId: ClubID, message: string, type: 'INFO' | 'SUCCESS' | 'WARN' = 'INFO') => {
    try {
        await addDoc(collection(db, 'notifications'), {
            clubId, message, type,
            timestamp: new Date().toISOString(),
            read: false
        });
    } catch (e) {
        addLog(`Failed to send notification: ${e}`, 'ERROR');
    }
};
