// תיקון קידוד לעברית במסוף
if (process.stdout.setEncoding) {
    process.stdout.setEncoding('utf8');
}

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, doc, setDoc, serverTimestamp } = require('firebase/firestore');

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

client.on('qr', (qr) => {
    console.log('--- יש לסרוק את קוד ה-QR הבא באמצעות וואטסאפ ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('--- הבוט התחבר בהצלחה ומאזין לסקרים ונתונים! ---');
});

client.on('authenticated', () => {
    console.log('--- אימות בוצע בהצלחה ---');
});

// האזנה להודעות ויצירת סקרים
client.on('message', async (msg) => {
    if (msg.type === 'poll_creation') {
        console.log(`\n[סקר חדש זוהה] שאלה: ${msg.body} | קבוצה: ${msg.from}`);
        
        try {
            const docRef = await addDoc(collection(db, "polls_events"), {
                pollId: msg.id.id,
                group: msg.from,
                question: msg.body,
                options: msg.pollOptions,
                createdAt: serverTimestamp()
            });
            console.log('>>> הסקר נשמר בהצלחה ב-Firebase תחת מזהה:', docRef.id);
        } catch (e) {
            console.error('שגיאה בשמירת הסקר ל-Firebase:', e);
        }
    }
});

// האזנה לעדכוני הצבעה כולל שמירת פרטי איש הקשר (תמונה ושם מוואטסאפ)
client.on('vote_update', async (vote) => {
    console.log('\n>>> זוהה עדכון הצבעה בסקר!');
    console.log(`מצביע (LID): ${vote.voter}`);
    console.log('בחירות:', vote.selectedOptions);

    try {
        // שמירת ההצבעה באוסף ההצבעות
        await addDoc(collection(db, "poll_votes"), {
            pollId: vote.parentMsgKey ? vote.parentMsgKey.id : 'unknown',
            voter: vote.voter,
            selectedOptions: vote.selectedOptions,
            interractedAt: vote.interractedAtTs,
            timestamp: serverTimestamp()
        });

        // שליפת פרטי איש הקשר מוואטסאפ (תמונה ושם) ושמירתם המעודכנת ב-whatsapp_members
        try {
            const contact = await client.getContactById(vote.voter);
            const profilePicUrl = await contact.getProfilePicUrl().catch(() => null);
            const safeId = vote.voter.replace(/[^a-zA-Z0-9_-]/g, '_');
            
            await setDoc(doc(db, 'whatsapp_members', safeId), {
                voterId: vote.voter,
                pushName: contact.pushname || contact.name || null,
                phone: contact.number || null,
                profilePicUrl: profilePicUrl || null,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (contactErr) {
            console.log('הערה: לא ניתן היה לשלוף פרטי איש קשר מלאים, אך ההצבעה נשמרה.');
        }

        console.log('>>> ההצבעה נשמרה בהצלחה ב-Firebase!');
    } catch (e) {
        console.error('שגיאה בשמירת ההצבעה ל-Firebase:', e);
    }
});

client.initialize().catch(err => {
    console.error('שגיאה קריטית באתחול הבוט:', err);
});