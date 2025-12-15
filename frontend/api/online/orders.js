// Online Orders API
import { getDb, COLLECTIONS, docToObj, queryToArray, getNextId, admin } from '../_lib/firebase.js';
import { verifyToken, verifyCustomerToken, corsHeaders, handleOptions } from '../_lib/auth.js';

export default async function handler(req, res) {
  Object.entries(corsHeaders()).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') return handleOptions(res);

  const db = getDb();

  try {
    if (req.method === 'GET') {
      // Staff/Admin viewing orders
      const user = await verifyToken(req);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { status, branch_id } = req.query;
      const branchId = parseInt(branch_id) || user.branch_id;

      let ordersSnapshot;
      if (status) {
        ordersSnapshot = await db.collection(COLLECTIONS.ONLINE_ORDERS)
          .where('status', '==', status)
          .orderBy('created_at', 'desc')
          .get();
      } else {
        ordersSnapshot = await db.collection(COLLECTIONS.ONLINE_ORDERS)
          .orderBy('created_at', 'desc')
          .get();
      }

      let orders = queryToArray(ordersSnapshot);

      if (branchId) {
        orders = orders.filter(o => o.branch_id === branchId);
      }

      // Get customers for names
      const customersSnapshot = await db.collection(COLLECTIONS.CUSTOMERS).get();
      const customers = queryToArray(customersSnapshot);
      const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));

      const ordersWithDetails = orders.map(o => ({
        ...o,
        customer_name: o.customer_id ? customerMap[o.customer_id]?.name : 'Guest',
        customer_phone: o.customer_id ? customerMap[o.customer_id]?.phone : null,
        items: typeof o.items_json === 'string' ? JSON.parse(o.items_json) : o.items_json || []
      }));

      res.json({
        success: true,
        data: ordersWithDetails,
        count: ordersWithDetails.length
      });
    } else if (req.method === 'POST') {
      // Customer creating order
      const customerAuth = verifyCustomerToken(req);
      if (!customerAuth) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { items, branch_id, delivery_type, delivery_address, notes, payment_method } = req.body;

      if (!items || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Items are required' });
      }

      // Calculate totals
      let subtotal = 0;
      let totalGst = 0;

      for (const item of items) {
        subtotal += item.quantity * item.unit_price;
        totalGst += item.gst_amount || 0;
      }

      const deliveryCharge = delivery_type === 'delivery' ? 50 : 0;
      const grandTotal = subtotal + totalGst + deliveryCharge;

      // Generate order number
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

      const ordersCount = await db.collection(COLLECTIONS.ONLINE_ORDERS).get();
      const orderNumber = `ORD-${branch_id || 1}-${dateStr}-${String(ordersCount.size + 1).padStart(4, '0')}`;

      // Create order
      const orderId = await getNextId(COLLECTIONS.ONLINE_ORDERS);

      const orderData = {
        id: orderId,
        order_number: orderNumber,
        customer_id: customerAuth.customerId,
        branch_id: parseInt(branch_id) || 1,
        items_json: JSON.stringify(items),
        subtotal,
        gst_amount: totalGst,
        delivery_charge: deliveryCharge,
        grand_total: grandTotal,
        delivery_type: delivery_type || 'pickup',
        delivery_address: delivery_address || '',
        payment_method: payment_method || 'cash',
        payment_status: 'pending',
        status: 'pending',
        notes: notes || '',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection(COLLECTIONS.ONLINE_ORDERS).doc(String(orderId)).set(orderData);

      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: {
          id: orderId,
          order_number: orderNumber,
          grand_total: grandTotal,
          status: 'pending'
        }
      });
    } else if (req.method === 'PUT') {
      // Staff/Admin updating order status
      const user = await verifyToken(req);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { order_id, status } = req.body;

      if (!order_id || !status) {
        return res.status(400).json({ success: false, message: 'Order ID and status are required' });
      }

      await db.collection(COLLECTIONS.ONLINE_ORDERS).doc(String(order_id)).update({
        status,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({
        success: true,
        message: 'Order status updated'
      });
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Online orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
}
