// Customers API
import { getDb, COLLECTIONS, docToObj, queryToArray, getNextId, admin } from '../_lib/firebase.js';
import { verifyToken, corsHeaders, handleOptions } from '../_lib/auth.js';

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') return handleOptions(res);

  const user = await verifyToken(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const db = getDb();

  try {
    if (req.method === 'GET') {
      const { search, phone } = req.query;

      const customersSnapshot = await db.collection(COLLECTIONS.CUSTOMERS).get();
      let customers = queryToArray(customersSnapshot);

      // Filter by phone
      if (phone) {
        customers = customers.filter(c => c.phone === phone);
      }

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        customers = customers.filter(c =>
          c.name.toLowerCase().includes(searchLower) ||
          c.phone.includes(search) ||
          (c.email && c.email.toLowerCase().includes(searchLower))
        );
      }

      // Remove password_hash
      customers = customers.map(c => {
        const { password_hash, ...customerData } = c;
        return customerData;
      });

      res.json({
        success: true,
        data: customers,
        count: customers.length
      });
    } else if (req.method === 'POST') {
      const { name, phone, email, address, customer_type } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ success: false, message: 'Name and phone are required' });
      }

      // Check if phone exists
      const existingSnapshot = await db.collection(COLLECTIONS.CUSTOMERS)
        .where('phone', '==', phone)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        return res.status(400).json({ success: false, message: 'Phone number already exists' });
      }

      const id = await getNextId(COLLECTIONS.CUSTOMERS);

      const customerData = {
        id,
        name,
        phone,
        email: email || '',
        address: address || '',
        customer_type: customer_type || 'retail',
        loyalty_points: 0,
        total_purchases: 0,
        is_active: 1,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection(COLLECTIONS.CUSTOMERS).doc(String(id)).set(customerData);

      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: customerData
      });
    } else if (req.method === 'PUT') {
      const { id, name, email, address, customer_type, is_active } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: 'Customer ID required' });
      }

      const updateData = {
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      if (name) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (address !== undefined) updateData.address = address;
      if (customer_type) updateData.customer_type = customer_type;
      if (is_active !== undefined) updateData.is_active = is_active;

      await db.collection(COLLECTIONS.CUSTOMERS).doc(String(id)).update(updateData);

      res.json({
        success: true,
        message: 'Customer updated successfully'
      });
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
}
