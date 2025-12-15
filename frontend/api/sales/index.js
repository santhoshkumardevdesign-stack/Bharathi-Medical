// Sales API
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
      const { branch_id, limit = 50 } = req.query;
      const branchId = parseInt(branch_id) || user.branch_id;

      let salesSnapshot;
      if (branchId) {
        salesSnapshot = await db.collection(COLLECTIONS.SALES)
          .where('branch_id', '==', branchId)
          .orderBy('created_at', 'desc')
          .limit(parseInt(limit))
          .get();
      } else {
        salesSnapshot = await db.collection(COLLECTIONS.SALES)
          .orderBy('created_at', 'desc')
          .limit(parseInt(limit))
          .get();
      }

      const sales = queryToArray(salesSnapshot);

      // Get customers for names
      const customersSnapshot = await db.collection(COLLECTIONS.CUSTOMERS).get();
      const customers = queryToArray(customersSnapshot);
      const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));

      const salesWithDetails = sales.map(s => ({
        ...s,
        customer_name: s.customer_id ? customerMap[s.customer_id]?.name : 'Walk-in Customer'
      }));

      res.json({
        success: true,
        data: salesWithDetails,
        count: salesWithDetails.length
      });
    } else if (req.method === 'POST') {
      // Create new sale
      const { items, customer_id, discount, discount_type, payment_method, notes, branch_id } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Items are required' });
      }

      const branchId = parseInt(branch_id) || user.branch_id;

      // Calculate totals
      let subtotal = 0;
      let totalGst = 0;

      for (const item of items) {
        subtotal += item.quantity * item.unit_price;
        totalGst += item.gst_amount || 0;
      }

      // Apply discount
      let discountAmount = 0;
      if (discount) {
        discountAmount = discount_type === 'percentage'
          ? (subtotal * discount / 100)
          : discount;
      }

      const grandTotal = subtotal + totalGst - discountAmount;

      // Generate invoice number
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

      const salesCount = await db.collection(COLLECTIONS.SALES)
        .where('branch_id', '==', branchId)
        .get();

      const invoiceNumber = `INV-${branchId}-${dateStr}-${String(salesCount.size + 1).padStart(4, '0')}`;

      // Create sale
      const saleId = await getNextId(COLLECTIONS.SALES);

      const saleData = {
        id: saleId,
        invoice_number: invoiceNumber,
        branch_id: branchId,
        user_id: user.id,
        customer_id: customer_id ? parseInt(customer_id) : null,
        subtotal,
        gst_amount: totalGst,
        discount: discountAmount,
        discount_type: discount_type || 'amount',
        grand_total: grandTotal,
        payment_method: payment_method || 'cash',
        payment_status: 'paid',
        status: 'completed',
        notes: notes || '',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection(COLLECTIONS.SALES).doc(String(saleId)).set(saleData);

      // Create sale items and update stock
      for (const item of items) {
        const saleItemId = await getNextId(COLLECTIONS.SALE_ITEMS);
        await db.collection(COLLECTIONS.SALE_ITEMS).doc(String(saleItemId)).set({
          id: saleItemId,
          sale_id: saleId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount || 0,
          gst_rate: item.gst_rate || 0,
          gst_amount: item.gst_amount || 0,
          total: item.quantity * item.unit_price,
          created_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update stock
        const stockSnapshot = await db.collection(COLLECTIONS.STOCK)
          .where('product_id', '==', item.product_id)
          .where('branch_id', '==', branchId)
          .limit(1)
          .get();

        if (!stockSnapshot.empty) {
          const stockDoc = stockSnapshot.docs[0];
          const currentStock = stockDoc.data().quantity || 0;
          await stockDoc.ref.update({
            quantity: Math.max(0, currentStock - item.quantity),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      // Update customer purchase total if customer exists
      if (customer_id) {
        const customerRef = db.collection(COLLECTIONS.CUSTOMERS).doc(String(customer_id));
        await customerRef.update({
          total_purchases: admin.firestore.FieldValue.increment(grandTotal),
          loyalty_points: admin.firestore.FieldValue.increment(Math.floor(grandTotal / 100)),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      res.status(201).json({
        success: true,
        message: 'Sale completed successfully',
        data: {
          id: saleId,
          invoice_number: invoiceNumber,
          grand_total: grandTotal
        }
      });
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
}
