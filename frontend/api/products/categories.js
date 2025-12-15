// Categories API
import { getDb, COLLECTIONS, queryToArray } from '../_lib/firebase.js';
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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const db = getDb();

    const categoriesSnapshot = await db.collection(COLLECTIONS.CATEGORIES).get();
    const categories = queryToArray(categoriesSnapshot);

    // Get product counts
    const productsSnapshot = await db.collection(COLLECTIONS.PRODUCTS)
      .where('is_active', '==', 1)
      .get();
    const products = queryToArray(productsSnapshot);

    const categoriesWithCount = categories.map(c => ({
      ...c,
      product_count: products.filter(p => p.category_id === c.id).length
    }));

    res.json({
      success: true,
      data: categoriesWithCount
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
}
