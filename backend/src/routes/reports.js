import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Daily sales report
router.get('/sales/daily', authenticateToken, (req, res) => {
  try {
    const { branch_id, date } = req.query;
    const reportDate = date || new Date().toISOString().split('T')[0];

    let branchCondition = '';
    const params = [reportDate];

    if (branch_id) {
      branchCondition = 'AND s.branch_id = ?';
      params.push(branch_id);
    }

    // Summary
    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(subtotal), 0) as subtotal,
        COALESCE(SUM(gst_amount), 0) as total_gst,
        COALESCE(SUM(discount), 0) as total_discount,
        COALESCE(AVG(grand_total), 0) as average_transaction
      FROM sales s
      WHERE DATE(s.created_at) = ? AND s.status = 'completed' ${branchCondition}
    `).get(...params);

    // Payment method breakdown
    const paymentBreakdown = db.prepare(`
      SELECT
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(grand_total), 0) as total
      FROM sales s
      WHERE DATE(s.created_at) = ? AND s.status = 'completed' ${branchCondition}
      GROUP BY payment_method
    `).all(...params);

    // Category wise sales
    const categorySales = db.prepare(`
      SELECT
        c.name as category,
        c.icon,
        COUNT(DISTINCT si.sale_id) as orders,
        SUM(si.quantity) as quantity_sold,
        COALESCE(SUM(si.subtotal), 0) as total
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE DATE(s.created_at) = ? AND s.status = 'completed' ${branchCondition}
      GROUP BY c.id
      ORDER BY total DESC
    `).all(...params);

    // Top selling products
    const topProducts = db.prepare(`
      SELECT
        p.name,
        p.sku,
        SUM(si.quantity) as quantity_sold,
        COALESCE(SUM(si.subtotal), 0) as revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE DATE(s.created_at) = ? AND s.status = 'completed' ${branchCondition}
      GROUP BY p.id
      ORDER BY quantity_sold DESC
      LIMIT 10
    `).all(...params);

    // Hourly breakdown
    const hourlyBreakdown = db.prepare(`
      SELECT
        strftime('%H', s.created_at) as hour,
        COUNT(*) as transactions,
        COALESCE(SUM(grand_total), 0) as total
      FROM sales s
      WHERE DATE(s.created_at) = ? AND s.status = 'completed' ${branchCondition}
      GROUP BY hour
      ORDER BY hour
    `).all(...params);

    res.json({
      success: true,
      data: {
        date: reportDate,
        summary,
        payment_breakdown: paymentBreakdown,
        category_sales: categorySales,
        top_products: topProducts,
        hourly_breakdown: hourlyBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate daily sales report',
      error: error.message
    });
  }
});

// Sales report (range)
router.get('/sales', authenticateToken, (req, res) => {
  try {
    const { branch_id, start_date, end_date, group_by = 'day' } = req.query;

    const startDt = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDt = end_date || new Date().toISOString().split('T')[0];

    let branchCondition = '';
    const params = [startDt, endDt];

    if (branch_id) {
      branchCondition = 'AND s.branch_id = ?';
      params.push(branch_id);
    }

    // Summary
    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(gst_amount), 0) as total_gst,
        COALESCE(SUM(discount), 0) as total_discount
      FROM sales s
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed' ${branchCondition}
    `).get(...params);

    // Daily/Weekly/Monthly breakdown
    let groupFormat;
    switch (group_by) {
      case 'week':
        groupFormat = "strftime('%Y-W%W', s.created_at)";
        break;
      case 'month':
        groupFormat = "strftime('%Y-%m', s.created_at)";
        break;
      default:
        groupFormat = "DATE(s.created_at)";
    }

    const salesTrend = db.prepare(`
      SELECT
        ${groupFormat} as period,
        COUNT(*) as transactions,
        COALESCE(SUM(grand_total), 0) as total
      FROM sales s
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed' ${branchCondition}
      GROUP BY period
      ORDER BY period
    `).all(...params);

    // Branch wise breakdown (if no specific branch)
    let branchBreakdown = [];
    if (!branch_id) {
      branchBreakdown = db.prepare(`
        SELECT
          b.name as branch,
          COUNT(*) as transactions,
          COALESCE(SUM(s.grand_total), 0) as total
        FROM sales s
        JOIN branches b ON s.branch_id = b.id
        WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
        GROUP BY b.id
        ORDER BY total DESC
      `).all(startDt, endDt);
    }

    res.json({
      success: true,
      data: {
        period: { start: startDt, end: endDt },
        summary,
        sales_trend: salesTrend,
        branch_breakdown: branchBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate sales report',
      error: error.message
    });
  }
});

// Stock report
router.get('/stock', authenticateToken, (req, res) => {
  try {
    const { branch_id, category_id } = req.query;

    let conditions = ['p.is_active = 1'];
    const params = [];

    if (branch_id) {
      conditions.push('s.branch_id = ?');
      params.push(branch_id);
    }

    if (category_id) {
      conditions.push('p.category_id = ?');
      params.push(category_id);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Stock summary
    const stockSummary = db.prepare(`
      SELECT
        COUNT(DISTINCT p.id) as total_products,
        COALESCE(SUM(s.quantity), 0) as total_stock,
        COALESCE(SUM(s.quantity * p.selling_price), 0) as stock_value,
        COALESCE(SUM(s.quantity * p.purchase_price), 0) as stock_cost
      FROM products p
      LEFT JOIN stock s ON p.id = s.product_id
      ${whereClause}
    `).get(...params);

    // Category wise stock
    const categoryStock = db.prepare(`
      SELECT
        c.name as category,
        c.icon,
        COUNT(DISTINCT p.id) as products,
        COALESCE(SUM(s.quantity), 0) as quantity,
        COALESCE(SUM(s.quantity * p.selling_price), 0) as value
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
      LEFT JOIN stock s ON p.id = s.product_id
      ${branch_id ? 'AND s.branch_id = ?' : ''}
      GROUP BY c.id
      ORDER BY value DESC
    `).all(branch_id ? [branch_id] : []);

    // Low stock items
    const lowStock = db.prepare(`
      SELECT
        p.name, p.sku, p.min_stock,
        s.quantity,
        b.name as branch_name,
        (p.min_stock - s.quantity) as shortage
      FROM products p
      JOIN stock s ON p.id = s.product_id
      JOIN branches b ON s.branch_id = b.id
      WHERE p.is_active = 1 AND s.quantity < p.min_stock AND s.quantity > 0
      ${branch_id ? 'AND s.branch_id = ?' : ''}
      ORDER BY shortage DESC
      LIMIT 20
    `).all(branch_id ? [branch_id] : []);

    // Out of stock items
    const outOfStock = db.prepare(`
      SELECT
        p.name, p.sku,
        b.name as branch_name
      FROM products p
      JOIN stock s ON p.id = s.product_id
      JOIN branches b ON s.branch_id = b.id
      WHERE p.is_active = 1 AND s.quantity = 0
      ${branch_id ? 'AND s.branch_id = ?' : ''}
      ORDER BY p.name
    `).all(branch_id ? [branch_id] : []);

    res.json({
      success: true,
      data: {
        summary: stockSummary,
        category_stock: categoryStock,
        low_stock: lowStock,
        out_of_stock: outOfStock
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate stock report',
      error: error.message
    });
  }
});

// GST report
router.get('/gst', authenticateToken, (req, res) => {
  try {
    const { start_date, end_date, branch_id } = req.query;

    const startDt = start_date || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDt = end_date || new Date().toISOString().split('T')[0];

    let branchCondition = '';
    const params = [startDt, endDt];

    if (branch_id) {
      branchCondition = 'AND s.branch_id = ?';
      params.push(branch_id);
    }

    // GST summary
    const gstSummary = db.prepare(`
      SELECT
        COALESCE(SUM(subtotal), 0) as taxable_amount,
        COALESCE(SUM(gst_amount), 0) as total_gst,
        COALESCE(SUM(grand_total), 0) as total_with_gst
      FROM sales s
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed' ${branchCondition}
    `).get(...params);

    // GST rate wise breakdown
    const gstBreakdown = db.prepare(`
      SELECT
        si.gst_rate,
        COUNT(*) as items,
        COALESCE(SUM(si.unit_price * si.quantity), 0) as taxable_value,
        COALESCE(SUM(si.gst_amount), 0) as gst_amount
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed' ${branchCondition}
      GROUP BY si.gst_rate
      ORDER BY si.gst_rate
    `).all(...params);

    res.json({
      success: true,
      data: {
        period: { start: startDt, end: endDt },
        summary: gstSummary,
        rate_breakdown: gstBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate GST report',
      error: error.message
    });
  }
});

// Branch performance report
router.get('/branch-performance', authenticateToken, (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const startDt = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDt = end_date || new Date().toISOString().split('T')[0];

    const branchPerformance = db.prepare(`
      SELECT
        b.id,
        b.name,
        b.manager_name,
        b.status,
        COUNT(s.id) as total_transactions,
        COALESCE(SUM(s.grand_total), 0) as total_sales,
        COALESCE(AVG(s.grand_total), 0) as avg_transaction,
        (SELECT COALESCE(SUM(quantity), 0) FROM stock WHERE branch_id = b.id) as current_stock,
        (SELECT COUNT(*) FROM stock st JOIN products p ON st.product_id = p.id WHERE st.branch_id = b.id AND st.quantity < p.min_stock AND st.quantity > 0) as low_stock_items
      FROM branches b
      LEFT JOIN sales s ON b.id = s.branch_id AND DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
      GROUP BY b.id
      ORDER BY total_sales DESC
    `).all(startDt, endDt);

    res.json({
      success: true,
      data: {
        period: { start: startDt, end: endDt },
        branches: branchPerformance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate branch performance report',
      error: error.message
    });
  }
});

// Product performance report
router.get('/product-performance', authenticateToken, (req, res) => {
  try {
    const { start_date, end_date, category_id, limit = 20 } = req.query;

    const startDt = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDt = end_date || new Date().toISOString().split('T')[0];

    let categoryCondition = '';
    const params = [startDt, endDt];

    if (category_id) {
      categoryCondition = 'AND p.category_id = ?';
      params.push(category_id);
    }

    params.push(parseInt(limit));

    const productPerformance = db.prepare(`
      SELECT
        p.id,
        p.name,
        p.sku,
        c.name as category,
        p.selling_price,
        p.purchase_price,
        SUM(si.quantity) as total_sold,
        COALESCE(SUM(si.subtotal), 0) as total_revenue,
        (p.selling_price - p.purchase_price) * SUM(si.quantity) as estimated_profit
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN sale_items si ON p.id = si.product_id
      LEFT JOIN sales s ON si.sale_id = s.id AND DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
      WHERE p.is_active = 1 ${categoryCondition}
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT ?
    `).all(...params);

    res.json({
      success: true,
      data: {
        period: { start: startDt, end: endDt },
        products: productPerformance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate product performance report',
      error: error.message
    });
  }
});

// Expiry report
router.get('/expiry', authenticateToken, (req, res) => {
  try {
    const { branch_id, days = 30 } = req.query;

    let branchCondition = '';
    const params = [days];

    if (branch_id) {
      branchCondition = 'AND s.branch_id = ?';
      params.push(branch_id);
    }

    // Expired items
    const expired = db.prepare(`
      SELECT
        p.name, p.sku,
        s.quantity, s.batch_number, s.expiry_date,
        b.name as branch_name,
        CAST(julianday('now') - julianday(s.expiry_date) AS INTEGER) as days_expired
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN branches b ON s.branch_id = b.id
      WHERE s.quantity > 0 AND s.expiry_date < DATE('now') ${branchCondition}
      ORDER BY s.expiry_date
    `).all(branch_id ? [branch_id] : []);

    // Expiring soon
    const expiringSoon = db.prepare(`
      SELECT
        p.name, p.sku,
        s.quantity, s.batch_number, s.expiry_date,
        b.name as branch_name,
        CAST(julianday(s.expiry_date) - julianday('now') AS INTEGER) as days_until_expiry
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN branches b ON s.branch_id = b.id
      WHERE s.quantity > 0
        AND s.expiry_date >= DATE('now')
        AND s.expiry_date <= DATE('now', '+' || ? || ' days')
        ${branchCondition}
      ORDER BY s.expiry_date
    `).all(...params);

    // Summary
    const expiredValue = expired.reduce((sum, item) => {
      const product = db.prepare('SELECT selling_price FROM products WHERE sku = ?').get(item.sku);
      return sum + (item.quantity * (product?.selling_price || 0));
    }, 0);

    const expiringSoonValue = expiringSoon.reduce((sum, item) => {
      const product = db.prepare('SELECT selling_price FROM products WHERE sku = ?').get(item.sku);
      return sum + (item.quantity * (product?.selling_price || 0));
    }, 0);

    res.json({
      success: true,
      data: {
        summary: {
          expired_count: expired.length,
          expired_value: expiredValue,
          expiring_soon_count: expiringSoon.length,
          expiring_soon_value: expiringSoonValue
        },
        expired,
        expiring_soon: expiringSoon
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate expiry report',
      error: error.message
    });
  }
});

export default router;
