const admin = require('firebase-admin');
const serviceAccount = require('./path/to/your-service-account.json'); // Replace with the path to your Firebase service account JSON file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: '' // Replace with your Firebase project ID
});

const bucket = admin.storage().bucket();

module.exports = { bucket };
