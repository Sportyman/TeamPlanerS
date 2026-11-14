import { db } from '../firebase';
import { doc, getDoc, getDocFromServer, getDocs, getDocsFromServer, setDoc, collection, query, where, onSnapshot, Unsubscribe, addDoc } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Person, ClubID, MembershipStatus, UserProfile, Role, AccessLevel, Gender } from '../types';

const systemLogs: { time: string; msg: string; type: 'INFO' | 'WARN' | 'ERROR' | 'SYNC' }[] = [];

export const addLog = (msg: string, type: 'INFO' | 'WARN' | 'ERROR' | 'SYNC' = 'INFO') => {
    systemLogs.push({ time: new Date().toISOString(), msg, type });
    if (systemLogs.length > 1000) systemLogs.shift();
    console.log(`%c[${type}] ${new Date().toLocaleTimeString()}: ${msg}`, type === 'ERROR' ? 'color: #f44' : 'color: #33b5e5');
};

export const downloadSystemLogs = () => {
    const blob = new Blob([systemLogs.map(l => `[${l.time}] [${l.type}] ${l.msg}`).join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `etgarim-system-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
};

const hydratePeopleFromMemberships = async (memberships: any[]): Promise<Person[]> => {
    return Promise.all(memberships.map(async (ms: any) => {
        let profile: UserProfile | null = null;
        try {
            const profileRef = doc(db, 'profiles', ms.uid);
            const profileSnap = await getDocFromServer(profileRef).catch(() => getDoc(profileRef));
            profile = profileSnap.exists() ? (profileSnap.data() as UserProfile) : null;
        } catch {
            profile = null;
        }
        const fallbackName = ms.displayName || (ms.firstName ? `${ms.firstName} ${ms.lastName || ''}`.trim() : '');
        const name = profile
            ? `${profile.firstName} ${profile.lastName}`.trim()
            : fallbackName || (ms.uid.includes('@') ? ms.uid : 'משתמש ללא פרופיל');
        return {
            id: ms.uid, clubId: ms.clubId, name,
            firstName: profile?.firstName || ms.firstName || '',
            lastName: profile?.lastName || ms.lastName || '',
            gender: profile?.gender || ms.gender || Gender.MALE,
            role: ms.role || Role.MEMBER, rank: ms.rank || 3,
            isSkipper: Boolean(profile?.isSkipper || ms.isSkipper),
            phone: profile?.primaryPhone || ms.phone || '',
            notes: profile?.medicalNotes || ms.notes || '',
            tags: Array.isArray(ms.tags) ? ms.tags : [],
            photoURL: profile?.photoURL || ms.photoURL || undefined,
            preferredBoatType: ms.preferredBoatType || undefined,
            genderConstraint: ms.genderConstraint || undefined,
            mustPairWith: ms.mustPairWith || [],
            preferPairWith: ms.preferPairWith || [],
            cannotPairWith: ms.cannotPairWith || [],
        } as Person;
    }));
};

export const subscribeToClubData = (clubId: ClubID): Unsubscribe => {
    const { setPeople, setSyncStatus, setInitialLoading } = useAppStore.getState();
    addLog(`Starting reactive subscription for club: ${clubId}`, 'SYNC');
    setSyncStatus('SYNCING');
    setInitialLoading(true);

    const membershipsQuery = query(collection(db, 'memberships'), where('clubId', '==', clubId), where('status', '==', MembershipStatus.ACTIVE));
    return onSnapshot(membershipsQuery, async (snapshot) => {
        const peopleList = await hydratePeopleFromMemberships(snapshot.docs.map(d => d.data()));
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

export const forceFullSync = async (uid?: string, clubId?: ClubID | null): Promise<number> => {
    const store = useAppStore.getState();
    store.setSyncStatus('SYNCING');
    try {
        await fetchGlobalConfig();
        if (uid && !uid.startsWith('dev-user-')) {
            await store.loadUserResources(uid);
        }
        let syncedCount = 0;
        if (clubId) {
            const q = query(collection(db, 'memberships'), where('clubId', '==', clubId), where('status', '==', MembershipStatus.ACTIVE));
            const snap = await getDocsFromServer(q).catch(() => getDocs(q));
            const peopleList = await hydratePeopleFromMemberships(snap.docs.map(d => d.data()));
            store.setPeople(peopleList);
            syncedCount = peopleList.length;
        }
        window.dispatchEvent(new CustomEvent('teamplaner:sync-refresh'));
        store.setSyncStatus('SYNCED');
        store.addNotification(clubId ? `הנתונים סונכרנו מול השרת (${syncedCount} משתתפים בחוג)` : 'הנתונים סונכרנו מול השרת', 'SUCCESS');
        return syncedCount;
    } catch (error) {
        addLog(`Manual sync failed: ${error}`, 'ERROR');
        store.setSyncStatus('ERROR');
        store.addNotification('שגיאה בסנכרון מול מסד הנתונים', 'WARN');
        return 0;
    }
};

export const addPersonToClubCloud = async (clubId: ClubID, person: Person) => {
    try {
        const docRef = doc(db, 'memberships', `${clubId}_${person.id}`);
        const payload: Record<string, any> = {
            uid: person.id, clubId, displayName: person.name,
            firstName: person.firstName || person.name.split(' ')[0] || '',
            lastName: person.lastName || person.name.split(' ').slice(1).join(' ') || '',
            gender: person.gender || Gender.MALE, role: person.role, rank: person.rank ?? 3,
            isSkipper: Boolean(person.isSkipper), phone: person.phone || '', notes: person.notes || '',
            tags: person.tags || [], mustPairWith: person.mustPairWith || [],
            preferPairWith: person.preferPairWith || [], cannotPairWith: person.cannotPairWith || [],
            status: MembershipStatus.ACTIVE, lastUpdate: new Date().toISOString(),
        };
        if (person.photoURL) payload.photoURL = person.photoURL;
        if (person.preferredBoatType) payload.preferredBoatType = person.preferredBoatType;
        if (person.genderConstraint) payload.genderConstraint = person.genderConstraint;
        await setDoc(docRef, payload, { merge: true });
        addLog(`Person ${person.name} (${person.id}) synced to club ${clubId}`, 'SYNC');
    } catch (error) {
        addLog(`Failed to sync person to club cloud: ${error}`, 'ERROR');
        throw error;
    }
};

export const ensureAdminMembership = async (clubId: ClubID, user: { uid: string; email: string; isAdmin: boolean }) => {
    if (!user || !clubId) return;
    try {
        const docRef = doc(db, 'memberships', `${clubId}_${user.uid}`);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
            await setDoc(docRef, {
                uid: user.uid, clubId, role: Role.INSTRUCTOR, accessLevel: AccessLevel.CLUB_ADMIN,
                status: MembershipStatus.ACTIVE, joinedClubDate: new Date().toISOString(), rank: 5, lastUpdate: new Date().toISOString(),
            });
        }
    } catch (error) {
        addLog(`Error ensuring admin membership: ${error}`, 'ERROR');
    }
};

export const fetchGlobalConfig = async () => {
    const { setGlobalConfig } = useAppStore.getState();
    try {
        const docRef = doc(db, 'config', 'global');
        const docSnap = await getDocFromServer(docRef).catch(() => getDoc(docRef));
        if (docSnap.exists()) {
            const data = docSnap.data();
            setGlobalConfig({ superAdmins: data.superAdmins || [], protectedAdmins: data.protectedAdmins || [], permissions: data.permissions || [] });
        }
    } catch (error) {
        addLog(`Global config fetch error: ${error}`, 'ERROR');
    }
};

export const sendNotificationToClub = async (clubId: ClubID, message: string, type: 'INFO' | 'SUCCESS' | 'WARN' = 'INFO', senderId?: string) => {
    try {
        await addDoc(collection(db, 'notifications'), {
            clubId, message, type, senderId: senderId || null, timestamp: new Date().toISOString(), read: false,
        });
    } catch (e) {
        addLog(`Failed to send notification: ${e}`, 'ERROR');
    }
};
