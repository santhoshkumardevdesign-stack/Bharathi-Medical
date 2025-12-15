// JWT Authentication middleware for Vercel Serverless Functions
import jwt from 'jsonwebtoken';
import { getDb, COLLECTIONS, docToObj } from './firebase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bharathi-medicals-jwt-secret-2024';
const CUSTOMER_JWT_SECRET = process.env.JWT_SECRET || 'bharathi-medicals-customer-secret-key-2024';

export { JWT_SECRET, CUSTOMER_JWT_SECRET };

// Verify admin/staff token
export async function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const db = getDb();
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(String(decoded.userId)).get();

    if (!userDoc.exists) return null;

    const user = docToObj(userDoc);
    if (user.is_active !== 1) return null;

    return user;
  } catch (error) {
    return null;
  }
}

// Verify customer token
export function verifyCustomerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, CUSTOMER_JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

// CORS headers helper
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Send JSON response helper
export function sendJson(res, statusCode, data) {
  res.status(statusCode).json(data);
}

// Handle OPTIONS (preflight) request
export function handleOptions(res) {
  res.status(200).end();
}
