// Customer Profile API
import { getDb, COLLECTIONS, docToObj, admin } from '../_lib/firebase.js';
import { verifyCustomerToken, corsHeaders, handleOptions } from '../_lib/auth.js';

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') return handleOptions(res);

  const decoded = verifyCustomerToken(req);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const db = getDb();

  try {
    if (req.method === 'GET') {
      const doc = await db.collection(COLLECTIONS.CUSTOMERS).doc(String(decoded.customerId)).get();

      if (!doc.exists) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      const customer = docToObj(doc);
      const { password_hash, ...customerData } = customer;

      res.json({ success: true, data: customerData });
    } else if (req.method === 'PUT') {
      const { name, email, address } = req.body;

      await db.collection(COLLECTIONS.CUSTOMERS).doc(String(decoded.customerId)).update({
        name,
        email: email || '',
        address: address || '',
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      const doc = await db.collection(COLLECTIONS.CUSTOMERS).doc(String(decoded.customerId)).get();
      const customer = docToObj(doc);
      const { password_hash, ...customerData } = customer;

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: customerData
      });
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}
