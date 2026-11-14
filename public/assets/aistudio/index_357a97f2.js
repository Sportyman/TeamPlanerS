// תיקון קידוד לעברית במסוף
if (process.stdout.setEncoding) {
    process.stdout.setEncoding('utf8');
}

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { initializeApp } = require('firebase/app');
const { 
    getFirestore, collection, addDoc, doc, setDoc, updateDoc, 
    arrayUnion, arrayRemove, serverTimestamp 
} = require('firebase/firestore');

// הגדרות ה-Firebase המדויקות שלך
const firebaseConfig = {
  apiKey: "AIzaSyCybT80k4jJCoqw-9WVleR2cJYMdl2pELU",
  authDomain: "etgarim-database-f1676.firebaseapp.com",
  projectId: "etgarim-database-f1676",
  storageBucket: "etgarim-database-f1676.firebasestorage.app",
  messagingSenderId: "1057822427290",
  appId: "1:1057822427290:web:b7b084e37fd87a88da7723"
};

// אתחול Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false, 
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
    }
});

// פונקציית עזר לסנכרון חברי קבוצה ספציפית (כולל תמיכה בשמות, תמונות וקבוצות)
async function syncGroupParticipants(chat) {
  if (!chat.isGroup || !Array.isArray(chat.participants)) return;
  const groupTags = [chat.id._serialized, chat.name].filter(Boolean);

  for (const p of chat.participants) {
    const voterId = p.id._serialized;
    const safeId = voterId.replace(/[^a-zA-Z0-9_-]/g, '_');
    try {
      const contact = await client.getContactById(voterId);
      const profilePicUrl = await contact.getProfilePicUrl().catch(() => null);
      
      await setDoc(doc(db, 'whatsapp_members', safeId), {
        voterId,
        pushName: contact.pushname || contact.name || contact.verifiedName || null,
        phone: contact.number || contact.id?.user || null,
        profilePicUrl: profilePicUrl || null,
        groups: arrayUnion(...groupTags),
        matchedBy: 'BOT_SYNC',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.log(`דילוג על משתתף ${voterId}:`, err.message);
    }
  }
}

client.on('qr', (qr) => {
    console.log('--- יש לסרוק את קוד ה-QR הבא באמצעות וואטסאפ ---');
    qrcode.generate(qr, { small: true });
});

// 1. סנכרון מלא של כל הקבוצות כשהבוט עולה
client.on('ready', async () => {
    console.log('--- הבוט התחבר בהצלחה — מסנכרן חברי קבוצות ל-Firebase ---');
    try {
        const chats = await client.getChats();
        for (const chat of chats.filter(c => c.isGroup)) {
            await syncGroupParticipants(chat);
        }
        console.log('--- סנכרון ראשוני של כל הקבוצות הסתיים ---');
    } catch (e) {
        console.error('שגיאה בסנכרון קבוצות בעלייה:', e);
    }
});

client.on('authenticated', () => {
    console.log('--- אימות בוצע בהצלחה ---');
});

// 2. סנכרון אוטומטי כשחבר חדש מצטרף לקבוצה
client.on('group_join', async (notification) => {
    try {
        const chat = await notification.getChat();
        if (chat) await syncGroupParticipants(chat);
    } catch (e) {
        console.error('שגיאה בהצטרפות לקבוצה:', e);
    }
});

// 3. הסרת תיוג הקבוצה כשחבר עוזב
client.on('group_leave', async (notification) => {
    try {
        const chat = await notification.getChat();
        const groupTags = [chat.id._serialized, chat.name].filter(Boolean);
        for (const pid of notification.recipientIds || []) {
            const safeId = pid.replace(/[^a-zA-Z0-9_-]/g, '_');
            await updateDoc(doc(db, 'whatsapp_members', safeId), {
                groups: arrayRemove(...groupTags),
                updatedAt: new Date().toISOString()
            }).catch(() => {});
        }
    } catch (e) {
        console.error('שגיאה בעזיבת קבוצה:', e);
    }
});

// 4. האזנה ליצירת סקרים (עם message_create, מניעת כפילויות, ושמות קבוצות נקיים)
client.on('message_create', async (msg) => {
    if (msg.type === 'poll_creation') {
        console.log(`\n[סקר חדש זוהה] שאלה: ${msg.body}`);
        
        try {
            const chat = await msg.getChat();
            if (chat) {
                // סנכרון חברי הקבוצה גם בעת פרסום סקר
                await syncGroupParticipants(chat);
            }

            // נרמול אפשרויות הסקר למערך מחרוזות נקי למניעת [object Object]
            let rawOptions = msg.pollOptions || [];
            const cleanOptions = rawOptions.map(o => typeof o === 'string' ? o : (o.name || String(o)));

            // שימוש ב-setDoc עם מזהה הסקר למניעת כפילויות
            await setDoc(doc(db, "polls_events", msg.id.id), {
                pollId: msg.id.id,
                group: msg.from,
                groupName: chat?.name || msg.from,
                question: msg.body,
                options: cleanOptions,
                createdAt: serverTimestamp()
            }, { merge: true });

            console.log('>>> הסקר נשמר/עודכן בהצלחה ב-Firebase תחת מזהה:', msg.id.id);
        } catch (e) {
            console.error('שגיאה בשמירת הסקר ל-Firebase:', e);
        }
    }
});

// 5. האזנה לעדכוני הצבעה (כולל נרמול בחירות ושמירת איש קשר)
client.on('vote_update', async (vote) => {
    console.log('\n>>> זוהה עדכון הצבעה בסקר!');

    try {
        let rawSelected = vote.selectedOptions || [];
        const cleanSelected = rawSelected.map(o => typeof o === 'string' ? o : (o.name || String(o)));

        await addDoc(collection(db, "poll_votes"), {
            pollId: vote.parentMsgKey ? vote.parentMsgKey.id : 'unknown',
            voter: vote.voter,
            selectedOptions: cleanSelected,
            interractedAt: vote.interractedAtTs,
            timestamp: serverTimestamp()
        });

        try {
            const contact = await client.getContactById(vote.voter);
            const profilePicUrl = await contact.getProfilePicUrl().catch(() => null);
            const safeId = vote.voter.replace(/[^a-zA-Z0-9_-]/g, '_');
            
            await setDoc(doc(db, 'whatsapp_members', safeId), {
                voterId: vote.voter,
                pushName: contact.pushname || contact.name || contact.verifiedName || null,
                phone: contact.number || contact.id?.user || null,
                profilePicUrl: profilePicUrl || null,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (contactErr) {}

        console.log('>>> ההצבעה נשמרה בהצלחה ב-Firebase!');
    } catch (e) {
        console.error('שגיאה בשמירת ההצבעה ל-Firebase:', e);
    }
});

client.initialize().catch(err => {
    console.error('שגיאה קריטית באתחול הבוט:', err);
});