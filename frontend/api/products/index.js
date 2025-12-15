// Products API
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
      const { category, search, branch_id } = req.query;

      // Get all products
      let productsSnapshot = await db.collection(COLLECTIONS.PRODUCTS)
        .where('is_active', '==', 1)
        .get();

      let products = queryToArray(productsSnapshot);

      // Filter by category
      if (category) {
        products = products.filter(p => p.category_id == category);
      }

      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        products = products.filter(p =>
          p.name.toLowerCase().includes(searchLower) ||
          p.sku.toLowerCase().includes(searchLower) ||
          (p.barcode && p.barcode.includes(search))
        );
      }

      // Get categories for names
      const categoriesSnapshot = await db.collection(COLLECTIONS.CATEGORIES).get();
      const categories = queryToArray(categoriesSnapshot);
      const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

      // Add category info
      products = products.map(p => ({
        ...p,
        category_name: categoryMap[p.category_id]?.name,
        category_icon: categoryMap[p.category_id]?.icon,
        category_color: categoryMap[p.category_id]?.color
      }));

      // If branch_id provided, add stock info
      if (branch_id) {
        const stockSnapshot = await db.collection(COLLECTIONS.STOCK)
          .where('branch_id', '==', parseInt(branch_id))
          .get();
        const stockItems = queryToArray(stockSnapshot);
        const stockMap = {};
        stockItems.forEach(s => {
          if (!stockMap[s.product_id]) {
            stockMap[s.product_id] = { stock: 0, expiry: null };
          }
          stockMap[s.product_id].stock += s.quantity;
          if (s.expiry_date && (!stockMap[s.product_id].expiry || s.expiry_date < stockMap[s.product_id].expiry)) {
            stockMap[s.product_id].expiry = s.expiry_date;
          }
        });

        products = products.map(p => ({
          ...p,
          stock: stockMap[p.id]?.stock || 0,
          nearest_expiry: stockMap[p.id]?.expiry
        }));
      }

      res.json({
        success: true,
        data: products,
        count: products.length
      });
    } else if (req.method === 'POST') {
      // Check role
      if (!['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const { sku, barcode, name, description, category_id, mrp, selling_price, purchase_price, gst_rate, min_stock, unit } = req.body;

      if (!sku || !name || !category_id || !mrp || !selling_price) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      // Check if SKU exists
      const existingSnapshot = await db.collection(COLLECTIONS.PRODUCTS)
        .where('sku', '==', sku)
        .limit(1)
        .get();

      if (!existingSnapshot.empty) {
        return res.status(400).json({
          success: false,
          message: 'SKU already exists'
        });
      }

      const id = await getNextId(COLLECTIONS.PRODUCTS);

      const productData = {
        id,
        sku,
        barcode: barcode || null,
        name,
        description: description || '',
        category_id: parseInt(category_id),
        mrp: parseFloat(mrp),
        selling_price: parseFloat(selling_price),
        purchase_price: parseFloat(purchase_price) || 0,
        gst_rate: parseFloat(gst_rate) || 0,
        min_stock: parseInt(min_stock) || 10,
        unit: unit || 'piece',
        is_active: 1,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      await db.collection(COLLECTIONS.PRODUCTS).doc(String(id)).set(productData);

      // Initialize stock for all branches
      const branchesSnapshot = await db.collection(COLLECTIONS.BRANCHES).get();
      const branches = queryToArray(branchesSnapshot);

      for (const branch of branches) {
        const stockId = await getNextId(COLLECTIONS.STOCK);
        await db.collection(COLLECTIONS.STOCK).doc(String(stockId)).set({
          id: stockId,
          product_id: id,
          branch_id: branch.id,
          quantity: 0,
          batch_number: `BTH${String(branch.id).padStart(2, '0')}${String(id).padStart(4, '0')}`,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: productData
      });
    } else {
      res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process request',
      error: error.message
    });
  }
}
