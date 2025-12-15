// Customer Login API
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, COLLECTIONS, docToObj } from '../_lib/firebase.js';
import { CUSTOMER_JWT_SECRET, corsHeaders, handleOptions } from '../_lib/auth.js';

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') return handleOptions(res);

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone and password are required'
      });
    }

    const db = getDb();
    const snapshot = await db.collection(COLLECTIONS.CUSTOMERS)
      .where('phone', '==', phone)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this phone number'
      });
    }

    const customer = docToObj(snapshot.docs[0]);

    if (!customer.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'Please register to create a password'
      });
    }

    const validPassword = await bcrypt.compare(password, customer.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    const token = jwt.sign(
      { customerId: customer.id, phone },
      CUSTOMER_JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          loyalty_points: customer.loyalty_points
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
