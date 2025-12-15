import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard overview
router.get('/', authenticateToken, (req, res) => {
  try {
    const { branch_id } = req.query;

    let branchCondition = '';
    let stockBranchCondition = '';

    if (branch_id) {
      branchCondition = `AND branch_id = ${branch_id}`;
      stockBranchCondition = `AND s.branch_id = ${branch_id}`;
    }

    // Today's sales
    const todaySales = db.prepare(`
      SELECT
        COUNT(*) as transactions,
        COALESCE(SUM(grand_total), 0) as total
      FROM sales
      WHERE DATE(created_at) = DATE('now') AND status = 'completed' ${branchCondition}
    `).get();

    // Yesterday's sales (for comparison)
    const yesterdaySales = db.prepare(`
      SELECT COALESCE(SUM(grand_total), 0) as total
      FROM sales
      WHERE DATE(created_at) = DATE('now', '-1 day') AND status = 'completed' ${branchCondition}
    `).get();

    // This month's sales
    const monthSales = db.prepare(`
      SELECT
        COUNT(*) as transactions,
        COALESCE(SUM(grand_total), 0) as total
      FROM sales
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') AND status = 'completed' ${branchCondition}
    `).get();

    // Total stock value
    const stockValue = db.prepare(`
      SELECT
        COALESCE(SUM(s.quantity), 0) as total_quantity,
        COALESCE(SUM(s.quantity * p.selling_price), 0) as total_value
      FROM stock s
      JOIN products p ON s.product_id = p.id
      WHERE p.is_active = 1 ${stockBranchCondition}
    `).get();

    // Low stock count
    const lowStock = db.prepare(`
      SELECT COUNT(*) as count
      FROM stock s
      JOIN products p ON s.product_id = p.id
      WHERE s.quantity < p.min_stock AND s.quantity > 0 AND p.is_active = 1 ${stockBranchCondition}
    `).get();

    // Out of stock count
    const outOfStock = db.prepare(`
      SELECT COUNT(*) as count
      FROM stock s
      JOIN products p ON s.product_id = p.id
      WHERE s.quantity = 0 AND p.is_active = 1 ${stockBranchCondition}
    `).get();

    // Expiring soon (within 30 days)
    const expiringSoon = db.prepare(`
      SELECT COUNT(*) as count
      FROM stock s
      WHERE s.quantity > 0
        AND s.expiry_date IS NOT NULL
        AND s.expiry_date <= DATE('now', '+30 days')
        AND s.expiry_date > DATE('now')
        ${stockBranchCondition}
    `).get();

    // Expired items
    const expired = db.prepare(`
      SELECT COUNT(*) as count
      FROM stock s
      WHERE s.quantity > 0 AND s.expiry_date < DATE('now') ${stockBranchCondition}
    `).get();

    // Customer count
    const customerCount = db.prepare('SELECT COUNT(*) as count FROM customers WHERE is_active = 1').get();

    // Recent sales
    const recentSales = db.prepare(`
      SELECT s.id, s.invoice_number, s.grand_total, s.payment_method, s.created_at,
        c.name as customer_name,
        b.name as branch_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      JOIN branches b ON s.branch_id = b.id
      WHERE s.status = 'completed' ${branchCondition}
      ORDER BY s.created_at DESC
      LIMIT 10
    `).all();

    // Low stock alerts
    const lowStockAlerts = db.prepare(`
      SELECT
        p.id, p.name, p.sku, p.min_stock,
        s.quantity,
        b.name as branch_name,
        (p.min_stock - s.quantity) as shortage
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN branches b ON s.branch_id = b.id
      WHERE s.quantity < p.min_stock AND s.quantity > 0 AND p.is_active = 1 ${stockBranchCondition}
      ORDER BY shortage DESC
      LIMIT 10
    `).all();

    // Expiry alerts
    const expiryAlerts = db.prepare(`
      SELECT
        p.id, p.name, p.sku,
        s.quantity, s.batch_number, s.expiry_date,
        b.name as branch_name,
        CAST(julianday(s.expiry_date) - julianday('now') AS INTEGER) as days_until_expiry
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN branches b ON s.branch_id = b.id
      WHERE s.quantity > 0
        AND s.expiry_date IS NOT NULL
        AND s.expiry_date <= DATE('now', '+30 days')
        AND s.expiry_date > DATE('now')
        ${stockBranchCondition}
      ORDER BY s.expiry_date
      LIMIT 10
    `).all();

    // Weekly sales chart data
    const weeklySales = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COALESCE(SUM(grand_total), 0) as total
      FROM sales
      WHERE DATE(created_at) >= DATE('now', '-7 days') AND status = 'completed' ${branchCondition}
      GROUP BY DATE(created_at)
      ORDER BY date
    `).all();

    // Category wise sales (today)
    const categorySales = db.prepare(`
      SELECT
        c.name as category,
        c.icon,
        c.color,
        COALESCE(SUM(si.subtotal), 0) as total
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN sale_items si ON p.id = si.product_id
      LEFT JOIN sales s ON si.sale_id = s.id AND DATE(s.created_at) = DATE('now') AND s.status = 'completed' ${branchCondition}
      GROUP BY c.id
      ORDER BY total DESC
    `).all();

    // Payment method breakdown (today)
    const paymentBreakdown = db.prepare(`
      SELECT
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(grand_total), 0) as total
      FROM sales
      WHERE DATE(created_at) = DATE('now') AND status = 'completed' ${branchCondition}
      GROUP BY payment_method
    `).all();

    // Branch summary (if admin - no specific branch)
    let branchSummary = [];
    if (!branch_id) {
      branchSummary = db.prepare(`
        SELECT
          b.id, b.name, b.status,
          (SELECT COUNT(*) FROM sales WHERE branch_id = b.id AND DATE(created_at) = DATE('now') AND status = 'completed') as today_transactions,
          (SELECT COALESCE(SUM(grand_total), 0) FROM sales WHERE branch_id = b.id AND DATE(created_at) = DATE('now') AND status = 'completed') as today_sales,
          (SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE branch_id = b.id) as total_stock
        FROM branches b
        ORDER BY today_sales DESC
      `).all();
    }

    // Calculate percentage change
    const salesChange = yesterdaySales.total > 0
      ? ((todaySales.total - yesterdaySales.total) / yesterdaySales.total * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          today_sales: {
            transactions: todaySales.transactions,
            total: todaySales.total,
            change_percentage: parseFloat(salesChange)
          },
          month_sales: monthSales,
          stock: {
            total_quantity: stockValue.total_quantity,
            total_value: stockValue.total_value
          },
          alerts: {
            low_stock: lowStock.count,
            out_of_stock: outOfStock.count,
            expiring_soon: expiringSoon.count,
            expired: expired.count
          },
          customers: customerCount.count
        },
        recent_sales: recentSales,
        low_stock_alerts: lowStockAlerts,
        expiry_alerts: expiryAlerts,
        charts: {
          weekly_sales: weeklySales,
          category_sales: categorySales,
          payment_breakdown: paymentBreakdown
        },
        branch_summary: branchSummary
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
});

// Get quick stats for header
router.get('/quick-stats', authenticateToken, (req, res) => {
  try {
    const { branch_id } = req.query;

    let branchCondition = branch_id ? `AND branch_id = ${branch_id}` : '';
    let stockCondition = branch_id ? `AND s.branch_id = ${branch_id}` : '';

    const stats = {
      today_sales: db.prepare(`
        SELECT COALESCE(SUM(grand_total), 0) as total
        FROM sales WHERE DATE(created_at) = DATE('now') AND status = 'completed' ${branchCondition}
      `).get().total,

      pending_orders: db.prepare(`
        SELECT COUNT(*) as count FROM purchase_orders WHERE status IN ('pending', 'confirmed', 'in_transit') ${branchCondition}
      `).get().count,

      low_stock: db.prepare(`
        SELECT COUNT(*) as count
        FROM stock s JOIN products p ON s.product_id = p.id
        WHERE s.quantity < p.min_stock AND s.quantity > 0 ${stockCondition}
      `).get().count,

      held_sales: db.prepare(`
        SELECT COUNT(*) as count FROM held_sales WHERE 1=1 ${branchCondition}
      `).get().count
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quick stats',
      error: error.message
    });
  }
});

export default router;
