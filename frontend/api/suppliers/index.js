// Suppliers API
import { getDb, COLLECTIONS, queryToArray, getNextId, admin } from '../_lib/firebase.js';
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
      const suppliersSnapshot = await db.collection(COLLECTIONS.SUPPLIERS).get();
      const suppliers = queryToArray(suppliersSnapshot);

      res.json({
        success: true,
        data: suppliers,
        count: suppliers.length
      });
    } else if (req.method === 'POST') {
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const { name, contact_person, phone, email, address, gst_number, payment_terms, credit_limit } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ success: false, message: 'Name and phone are required' });
      }

      const id = await getNextId(COLLECTIONS.SUPPLIERS);

      const supplierData = {
        id,
        name,
        contact_person: contact_person || '',
        phone,
        email: email || '',
        address: address || '',
        gst_number: gst_number || '',
        payment_terms: payment_terms || 'Net 30',
        credit_limit: parseFloat(credit_limit) || 0,
        outstanding_amount: 0,
        is_active: 1,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection(COLLECTIONS.SUPPLIERS).doc(String(id)).set(supplierData);

      res.status(201).json({
        success: true,
        message: 'Supplier created successfully',
        data: supplierData
      });
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Suppliers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
}
