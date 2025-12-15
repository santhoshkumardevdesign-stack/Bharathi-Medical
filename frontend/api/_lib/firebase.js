// Firebase Admin SDK initialization for Vercel Serverless Functions
import admin from 'firebase-admin';

let db = null;

export function getDb() {
  if (!db) {
    // Check if already initialized
    if (admin.apps.length === 0) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
        throw new Error('Firebase credentials not configured');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      });
    }
    db = admin.firestore();
  }
  return db;
}

// Helper to convert Firestore doc to plain object
export function docToObj(doc) {
  if (!doc.exists) return null;
  const data = doc.data();
  const converted = { id: parseInt(doc.id) || doc.id };

  for (const [key, value] of Object.entries(data)) {
    if (value && value.toDate) {
      converted[key] = value.toDate().toISOString();
    } else {
      converted[key] = value;
    }
  }
  return converted;
}

// Helper to convert query snapshot to array
export function queryToArray(snapshot) {
  return snapshot.docs.map(doc => docToObj(doc));
}

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  BRANCHES: 'branches',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  STOCK: 'stock',
  CUSTOMERS: 'customers',
  CUSTOMER_ADDRESSES: 'customer_addresses',
  ONLINE_ORDERS: 'online_orders',
  SUPPLIERS: 'suppliers',
  SALES: 'sales',
  SALE_ITEMS: 'sale_items',
  HELD_SALES: 'held_sales',
  PAYMENTS: 'payments',
  COUNTERS: '_counters'
};

// Get next auto-increment ID
export async function getNextId(collectionName) {
  const db = getDb();
  const counterRef = db.collection(COLLECTIONS.COUNTERS).doc(collectionName);

  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let nextId = 1;

    if (counterDoc.exists) {
      nextId = counterDoc.data().count + 1;
    }

    transaction.set(counterRef, { count: nextId });
    return nextId;
  });
}

export { admin };
