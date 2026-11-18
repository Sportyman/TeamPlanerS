import { db } from '../firebase';
import { doc, getDoc, getDocs, getDocsFromServer, setDoc, collection, query, where, onSnapshot, Unsubscribe, addDoc, increment } from 'firebase/firestore';
import { useAppStore } from '../store';
import { Person, ClubID, MembershipStatus, Role, AccessLevel, Gender } from '../types';
import { fetchCloudClubsCatalog, syncStrandedLocalClubsToCloud } from './auth/superAdminService';
import { fetchGlobalLocations } from './scheduleService';
import { hydratePeopleFromMemberships } from './membershipHydration';
import { buildNextActivityHistory } from './activityHistoryService';
import { sanitizeLogMessage } from './logging/logSanitizer';

const systemLogs: { time: string; msg: string; type: 'INFO' | 'WARN' | 'ERROR' | 'SYNC' }[] = [];

export const addLog = (msg: string, type: 'INFO' | 'WARN' | 'ERROR' | 'SYNC' = 'INFO') => {
    const safeMsg = sanitizeLogMessage(msg);
    systemLogs.push({ time: new Date().toISOString(), msg: safeMsg, type });
    if (systemLogs.length > 1000) systemLogs.shift();
    console.log(`%c[${type}] ${new Date().toLocaleTimeString()}: ${safeMsg}`, type === 'ERROR' ? 'color: #f44' : 'color: #33b5e5');
};

export const downloadSystemLogs = () => {
    const blob = new Blob([systemLogs.map(l => `[${l.time}] [${l.type}] ${l.msg}`).join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `etgarim-system-${new Date().toISOString().slice(0, 10)}.log`;
    a.click();
};

let inflightGlobalConfig: Promise<void> | null = null;
let lastGlobalConfigTs = 0;

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
        if (uid) await store.loadUserResources(uid);
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
        if (typeof person.attendanceCount === 'number') payload.attendanceCount = person.attendanceCount;
        if (person.preferredBoatType) payload.preferredBoatType = person.preferredBoatType;
        if (person.genderConstraint) payload.genderConstraint = person.genderConstraint;
        await setDoc(docRef, payload, { merge: true });
        addLog(`Person ${person.name} (${person.id}) synced to club ${clubId}`, 'SYNC');
    } catch (error) {
        addLog(`Failed to sync person to club cloud: ${error}`, 'ERROR');
        throw error;
    }
};

export const recordClubAttendance = async (
    clubId: ClubID,
    attendedPeople: Person[],
    pollMeta?: { pollId?: string; question?: string }
) => {
    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    const store = useAppStore.getState();
    const updatedMap = new Map<string, Person>();
    await Promise.all(attendedPeople.map(async (p) => {
        const { nextHistory, isNewDay, changedRoleOnSameDay } = buildNextActivityHistory(p, today, nowIso, pollMeta);
        if (!isNewDay && !changedRoleOnSameDay) return;
        try {
            const payload: Record<string, any> = {
                uid: p.id, clubId, displayName: p.name, gender: p.gender || Gender.MALE,
                role: p.role, rank: p.rank ?? 3, isSkipper: Boolean(p.isSkipper),
                phone: p.phone || '', status: MembershipStatus.ACTIVE,
                activityHistory: nextHistory, lastUpdate: nowIso,
            };
            if (isNewDay) {
                payload.attendanceCount = increment(1);
                payload.lastAttendedAt = nowIso;
            }
            if (p.photoURL) payload.photoURL = p.photoURL;
            await setDoc(doc(db, 'memberships', `${clubId}_${p.id}`), payload, { merge: true });
            updatedMap.set(p.id, {
                ...p,
                isWhatsAppGroupOnly: false,
                attendanceCount: isNewDay ? (p.attendanceCount || 0) + 1 : p.attendanceCount,
                lastAttendedAt: isNewDay ? nowIso : p.lastAttendedAt,
                activityHistory: nextHistory,
            });
        } catch (err) {
            addLog(`Attendance count update skipped for ${p.name}: ${err}`, 'WARN');
        }
    }));
    if (updatedMap.size > 0) {
        const currentClubIds = new Set(store.people.map((p) => `${p.clubId}:${p.id}`));
        const nextPeople = store.people.map((p) => (p.clubId === clubId && updatedMap.has(p.id) ? updatedMap.get(p.id)! : p));
        updatedMap.forEach((p) => { if (!currentClubIds.has(`${clubId}:${p.id}`)) nextPeople.push(p); });
        store.setPeople(nextPeople);
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
    } catch (error) { addLog(`Error ensuring admin membership: ${error}`, 'ERROR'); }
};

export const fetchGlobalConfig = async (force = false) => {
    if (inflightGlobalConfig) return inflightGlobalConfig;
    if (!force && Date.now() - lastGlobalConfigTs < 3000) return;
    inflightGlobalConfig = (async () => {
        const { setGlobalConfig, mergeCloudClubs, setLocations, user } = useAppStore.getState();
        try {
            const docSnap = await getDoc(doc(db, 'config', 'global'));
            if (docSnap.exists()) {
                const d = docSnap.data();
                setGlobalConfig({ superAdmins: d.superAdmins || [], protectedAdmins: d.protectedAdmins || [], permissions: d.permissions || [] });
            }
            const [catalog, locs] = await Promise.all([fetchCloudClubsCatalog().catch(() => null), fetchGlobalLocations().catch(() => null)]);
            if (catalog) {
                const clubs = user?.isAdmin
                    ? await syncStrandedLocalClubsToCloud(useAppStore.getState().clubs, catalog.clubs, catalog.deletedIds)
                    : catalog.clubs;
                mergeCloudClubs(clubs, catalog.deletedIds);
            }
            if (locs) setLocations(locs);
            lastGlobalConfigTs = Date.now();
        } catch (error) { addLog(`Global config fetch error: ${error}`, 'ERROR'); }
        finally { inflightGlobalConfig = null; }
    })();
    return inflightGlobalConfig;
};

export const sendNotificationToClub = async (clubId: ClubID, message: string, type: 'INFO' | 'SUCCESS' | 'WARN' = 'INFO', senderId?: string) => {
    try { await addDoc(collection(db, 'notifications'), { clubId, message, type, senderId: senderId || null, timestamp: new Date().toISOString(), read: false }); }
    catch (e) { addLog(`Failed to send notification: ${e}`, 'ERROR'); }
};
