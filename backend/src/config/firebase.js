import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

// Initialize Firebase Admin SDK
function initializeFirebase() {
  try {
    // Check if already initialized
    if (admin.apps.length > 0) {
      db = admin.firestore();
      return db;
    }

    // Try to load service account from file (for local development)
    const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');

    if (existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase initialized with service account file');
    }
    // Use environment variables (for production)
    else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
      });
      console.log('Firebase initialized with environment variables');
    }
    // Fallback: Use default credentials (for Google Cloud environments)
    else {
      admin.initializeApp();
      console.log('Firebase initialized with default credentials');
    }

    db = admin.firestore();

    // Set Firestore settings
    db.settings({
      ignoreUndefinedProperties: true
    });

    console.log('Firestore connected successfully!');
    return db;
  } catch (error) {
    console.error('Firebase initialization error:', error);
    throw error;
  }
}

// Get Firestore instance
export function getFirestore() {
  if (!db) {
    initializeFirebase();
  }
  return db;
}

// Helper functions for common Firestore operations
export const firestoreHelpers = {
  // Generate auto-incrementing ID (simulates SQL auto-increment)
  async getNextId(collectionName) {
    const counterRef = db.collection('_counters').doc(collectionName);

    return db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let nextId = 1;

      if (counterDoc.exists) {
        nextId = counterDoc.data().count + 1;
      }

      transaction.set(counterRef, { count: nextId });
      return nextId;
    });
  },

  // Convert Firestore timestamp to ISO string
  timestampToISO(timestamp) {
    if (!timestamp) return null;
    if (timestamp.toDate) return timestamp.toDate().toISOString();
    return timestamp;
  },

  // Convert document to object with id
  docToObject(doc) {
    if (!doc.exists) return null;
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      created_at: this.timestampToISO(data.created_at),
      updated_at: this.timestampToISO(data.updated_at)
    };
  },

  // Get current timestamp
  serverTimestamp() {
    return admin.firestore.FieldValue.serverTimestamp();
  },

  // Increment field
  increment(value = 1) {
    return admin.firestore.FieldValue.increment(value);
  },

  // Array operations
  arrayUnion(...elements) {
    return admin.firestore.FieldValue.arrayUnion(...elements);
  },

  arrayRemove(...elements) {
    return admin.firestore.FieldValue.arrayRemove(...elements);
  }
};

export default { getFirestore, firestoreHelpers, initializeFirebase };
