// Stock API
import { getDb, COLLECTIONS, docToObj, queryToArray, admin } from '../_lib/firebase.js';
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
      const { branch_id } = req.query;
      const branchId = parseInt(branch_id) || user.branch_id;

      // Get stock for branch
      const stockSnapshot = await db.collection(COLLECTIONS.STOCK)
        .where('branch_id', '==', branchId)
        .get();
      const stockItems = queryToArray(stockSnapshot);

      // Get products for details
      const productsSnapshot = await db.collection(COLLECTIONS.PRODUCTS).get();
      const products = queryToArray(productsSnapshot);
      const productMap = Object.fromEntries(products.map(p => [p.id, p]));

      // Get categories
      const categoriesSnapshot = await db.collection(COLLECTIONS.CATEGORIES).get();
      const categories = queryToArray(categoriesSnapshot);
      const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

      const stockWithDetails = stockItems.map(s => ({
        ...s,
        product_name: productMap[s.product_id]?.name,
        sku: productMap[s.product_id]?.sku,
        selling_price: productMap[s.product_id]?.selling_price,
        mrp: productMap[s.product_id]?.mrp,
        category_name: categoryMap[productMap[s.product_id]?.category_id]?.name,
        min_stock: productMap[s.product_id]?.min_stock
      }));

      res.json({
        success: true,
        data: stockWithDetails,
        count: stockWithDetails.length
      });
    } else if (req.method === 'PUT') {
      // Update stock quantity
      const { stock_id, quantity, batch_number, expiry_date } = req.body;

      if (!stock_id) {
        return res.status(400).json({ success: false, message: 'Stock ID required' });
      }

      const updateData = {
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      if (quantity !== undefined) updateData.quantity = parseInt(quantity);
      if (batch_number) updateData.batch_number = batch_number;
      if (expiry_date) updateData.expiry_date = expiry_date;

      await db.collection(COLLECTIONS.STOCK).doc(String(stock_id)).update(updateData);

      res.json({
        success: true,
        message: 'Stock updated successfully'
      });
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
}
