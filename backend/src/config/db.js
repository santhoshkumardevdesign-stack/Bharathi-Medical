// Database abstraction layer - switches between SQLite and Firestore
// Use SQLite for local development, Firestore for production

import sqliteDb from './database.js';

// Determine which database to use
const DATABASE_TYPE = process.env.DATABASE_TYPE || 'sqlite';

let db;
let firestoreDb;

// Initialize the appropriate database
export async function initializeDb() {
  if (DATABASE_TYPE === 'firestore') {
    console.log('Using Firestore database...');
    const { initializeFirestoreDb } = await import('./firestoreDb.js');
    firestoreDb = await import('./firestoreDb.js');
    initializeFirestoreDb();
    return { type: 'firestore' };
  } else {
    console.log('Using SQLite database...');
    const { initializeDatabase } = await import('./database.js');
    initializeDatabase();
    db = sqliteDb;
    return { type: 'sqlite' };
  }
}

// Get the database instance
export function getDb() {
  if (DATABASE_TYPE === 'firestore') {
    return firestoreDb;
  }
  return db;
}

// Check if using Firestore
export function isFirestore() {
  return DATABASE_TYPE === 'firestore';
}

// Export for backwards compatibility with existing routes
export default sqliteDb;
