// Dashboard API
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
    const branchId = user.branch_id;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get sales
    const salesSnapshot = await db.collection(COLLECTIONS.SALES).get();
    const allSales = queryToArray(salesSnapshot);
    const branchSales = branchId ? allSales.filter(s => s.branch_id === branchId) : allSales;

    // Filter today's sales
    const todaySales = branchSales.filter(s => {
      const saleDate = new Date(s.created_at);
      return saleDate >= today && saleDate < tomorrow;
    });

    // Get products
    const productsSnapshot = await db.collection(COLLECTIONS.PRODUCTS)
      .where('is_active', '==', 1)
      .get();
    const products = queryToArray(productsSnapshot);

    // Get stock
    const stockQuery = branchId
      ? db.collection(COLLECTIONS.STOCK).where('branch_id', '==', branchId)
      : db.collection(COLLECTIONS.STOCK);
    const stockSnapshot = await stockQuery.get();
    const stockItems = queryToArray(stockSnapshot);

    // Get customers
    const customersSnapshot = await db.collection(COLLECTIONS.CUSTOMERS).get();
    const customers = queryToArray(customersSnapshot);

    // Get pending online orders
    const onlineOrdersSnapshot = await db.collection(COLLECTIONS.ONLINE_ORDERS).get();
    const onlineOrders = queryToArray(onlineOrdersSnapshot);
    const pendingOrders = onlineOrders.filter(o =>
      ['pending', 'confirmed', 'processing'].includes(o.status) &&
      (!branchId || o.branch_id === branchId)
    );

    // Calculate low stock
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));
    const lowStockItems = stockItems.filter(s => {
      const product = productMap[s.product_id];
      return product && s.quantity > 0 && s.quantity <= product.min_stock;
    });

    // Calculate expiring soon (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringItems = stockItems.filter(s => {
      if (!s.expiry_date || s.quantity === 0) return false;
      const expiryDate = new Date(s.expiry_date);
      return expiryDate > today && expiryDate <= thirtyDaysFromNow;
    });

    // Dashboard summary
    const dashboardData = {
      today_sales: todaySales.reduce((sum, s) => sum + (s.grand_total || 0), 0),
      today_transactions: todaySales.length,
      total_products: products.length,
      total_customers: customers.length,
      low_stock_count: lowStockItems.length,
      expiring_count: expiringItems.length,
      pending_orders: pendingOrders.length,
      recent_sales: todaySales.slice(0, 10).map(s => ({
        id: s.id,
        invoice_number: s.invoice_number,
        grand_total: s.grand_total,
        payment_method: s.payment_method,
        created_at: s.created_at
      })),
      low_stock_items: lowStockItems.slice(0, 5).map(s => ({
        product_id: s.product_id,
        product_name: productMap[s.product_id]?.name,
        quantity: s.quantity,
        min_stock: productMap[s.product_id]?.min_stock
      }))
    };

    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
}
