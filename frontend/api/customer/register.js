// Customer Registration API
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, COLLECTIONS, docToObj, getNextId, admin } from '../_lib/firebase.js';
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
    const { name, phone, email, password, address } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and password are required'
      });
    }

    // Validate phone
    const phoneRegex = /^[+]?[\d\s-]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number'
      });
    }

    const db = getDb();

    // Check if customer exists
    const existingSnapshot = await db.collection(COLLECTIONS.CUSTOMERS)
      .where('phone', '==', phone)
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      const existing = docToObj(existingSnapshot.docs[0]);

      if (existing.password_hash) {
        return res.status(400).json({
          success: false,
          message: 'An account with this phone number already exists. Please login.'
        });
      }

      // Update existing customer with password
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.collection(COLLECTIONS.CUSTOMERS).doc(String(existing.id)).update({
        password_hash: hashedPassword,
        name,
        email: email || '',
        address: address || '',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      const token = jwt.sign({ customerId: existing.id, phone }, CUSTOMER_JWT_SECRET, { expiresIn: '30d' });

      return res.json({
        success: true,
        message: 'Account activated successfully',
        data: {
          token,
          customer: {
            id: existing.id,
            name,
            phone,
            email: email || '',
            address: address || '',
            loyalty_points: existing.loyalty_points
          }
        }
      });
    }

    // Create new customer
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = await getNextId(COLLECTIONS.CUSTOMERS);

    await db.collection(COLLECTIONS.CUSTOMERS).doc(String(id)).set({
      id,
      name,
      phone,
      email: email || '',
      address: address || '',
      password_hash: hashedPassword,
      customer_type: 'retail',
      loyalty_points: 0,
      total_purchases: 0,
      is_active: 1,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    const token = jwt.sign({ customerId: id, phone }, CUSTOMER_JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        customer: {
          id,
          name,
          phone,
          email: email || '',
          address: address || '',
          loyalty_points: 0
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
