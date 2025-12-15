// Admin/Staff Login API
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, COLLECTIONS, docToObj, queryToArray } from '../_lib/firebase.js';
import { JWT_SECRET, corsHeaders, handleOptions } from '../_lib/auth.js';

export default async function handler(req, res) {
  // Set CORS headers
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    return handleOptions(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    const db = getDb();

    // Find user by username or email
    const snapshot = await db.collection(COLLECTIONS.USERS)
      .where('username', '==', username)
      .limit(1)
      .get();

    let user = null;
    if (!snapshot.empty) {
      user = docToObj(snapshot.docs[0]);
    } else {
      // Try email
      const emailSnapshot = await db.collection(COLLECTIONS.USERS)
        .where('email', '==', username)
        .limit(1)
        .get();
      if (!emailSnapshot.empty) {
        user = docToObj(emailSnapshot.docs[0]);
      }
    }

    if (!user || user.is_active !== 1) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isValidPassword = bcrypt.compareSync(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Get branch info
    let branchName = null;
    let branchCode = null;
    if (user.branch_id) {
      const branchDoc = await db.collection(COLLECTIONS.BRANCHES).doc(String(user.branch_id)).get();
      if (branchDoc.exists) {
        const branch = branchDoc.data();
        branchName = branch.name;
        branchCode = branch.code;
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role, branchId: user.branch_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: { ...userWithoutPassword, branch_name: branchName, branch_code: branchCode },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
}
