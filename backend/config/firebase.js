const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
console.log(`\x1b[32m✔ Firebase Firestore initialized successfully for: ${admin.app().options.projectId}\x1b[0m`);

module.exports = { admin, db };
