const admin = require('firebase-admin');

let serviceAccount;

// In Vercel/Production, we load from Environment Variable to keep it secure
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    // In Local Development, we can still use the physical file
    serviceAccount = require('../serviceAccountKey.json');
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
console.log(`\x1b[32m✔ Firebase Firestore initialized successfully for: ${admin.app().options.projectId}\x1b[0m`);

module.exports = { admin, db };
