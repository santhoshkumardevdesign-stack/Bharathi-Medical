import express from 'express';
import db from '../config/database.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get all branches
router.get('/', authenticateToken, (req, res) => {
  try {
    const branches = db.prepare(`
      SELECT
        b.*,
        (SELECT COUNT(*) FROM stock s WHERE s.branch_id = b.id) as total_products,
        (SELECT COALESCE(SUM(s.quantity), 0) FROM stock s WHERE s.branch_id = b.id) as total_stock,
        (SELECT COALESCE(SUM(sl.grand_total), 0) FROM sales sl WHERE sl.branch_id = b.id AND DATE(sl.created_at) = DATE('now')) as today_sales,
        (SELECT COUNT(*) FROM sales sl WHERE sl.branch_id = b.id AND DATE(sl.created_at) = DATE('now')) as today_transactions
      FROM branches b
      ORDER BY b.id
    `).all();

    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branches',
      error: error.message
    });
  }
});

// Get single branch with stats
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const branch = db.prepare(`
      SELECT
        b.*,
        (SELECT COALESCE(SUM(s.quantity), 0) FROM stock s WHERE s.branch_id = b.id) as total_stock,
        (SELECT COUNT(DISTINCT s.product_id) FROM stock s WHERE s.branch_id = b.id WHERE s.quantity > 0) as products_in_stock,
        (SELECT COALESCE(SUM(sl.grand_total), 0) FROM sales sl WHERE sl.branch_id = b.id AND DATE(sl.created_at) = DATE('now')) as today_sales,
        (SELECT COALESCE(SUM(sl.grand_total), 0) FROM sales sl WHERE sl.branch_id = b.id AND DATE(sl.created_at) >= DATE('now', '-7 days')) as week_sales,
        (SELECT COALESCE(SUM(sl.grand_total), 0) FROM sales sl WHERE sl.branch_id = b.id AND strftime('%Y-%m', sl.created_at) = strftime('%Y-%m', 'now')) as month_sales
      FROM branches b
      WHERE b.id = ?
    `).get(req.params.id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Get low stock count for this branch
    const lowStockCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM stock s
      JOIN products p ON s.product_id = p.id
      WHERE s.branch_id = ? AND s.quantity < p.min_stock AND s.quantity > 0
    `).get(req.params.id);

    // Get expiring soon count (within 30 days)
    const expiringSoonCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM stock s
      WHERE s.branch_id = ? AND s.expiry_date <= DATE('now', '+30 days') AND s.expiry_date > DATE('now')
    `).get(req.params.id);

    branch.low_stock_count = lowStockCount.count;
    branch.expiring_soon_count = expiringSoonCount.count;

    res.json({
      success: true,
      data: branch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branch',
      error: error.message
    });
  }
});

// Get branch stats summary
router.get('/:id/stats', authenticateToken, (req, res) => {
  try {
    const branchId = req.params.id;

    // Today's sales
    const todaySales = db.prepare(`
      SELECT
        COUNT(*) as transaction_count,
        COALESCE(SUM(grand_total), 0) as total_amount,
        COALESCE(SUM(gst_amount), 0) as total_gst
      FROM sales
      WHERE branch_id = ? AND DATE(created_at) = DATE('now') AND status = 'completed'
    `).get(branchId);

    // Top selling products today
    const topProducts = db.prepare(`
      SELECT
        p.name,
        p.sku,
        SUM(si.quantity) as total_quantity,
        SUM(si.subtotal) as total_revenue
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.branch_id = ? AND DATE(s.created_at) = DATE('now')
      GROUP BY p.id
      ORDER BY total_quantity DESC
      LIMIT 5
    `).all(branchId);

    // Payment method breakdown
    const paymentBreakdown = db.prepare(`
      SELECT
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(grand_total), 0) as total
      FROM sales
      WHERE branch_id = ? AND DATE(created_at) = DATE('now') AND status = 'completed'
      GROUP BY payment_method
    `).all(branchId);

    res.json({
      success: true,
      data: {
        today_sales: todaySales,
        top_products: topProducts,
        payment_breakdown: paymentBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branch stats',
      error: error.message
    });
  }
});

// Update branch (admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const { name, address, phone, email, manager_name, manager_phone, opening_hours, staff_count, status } = req.body;
    const branchId = req.params.id;

    db.prepare(`
      UPDATE branches
      SET name = COALESCE(?, name),
          address = COALESCE(?, address),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          manager_name = COALESCE(?, manager_name),
          manager_phone = COALESCE(?, manager_phone),
          opening_hours = COALESCE(?, opening_hours),
          staff_count = COALESCE(?, staff_count),
          status = COALESCE(?, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, address, phone, email, manager_name, manager_phone, opening_hours, staff_count, status, branchId);

    const updatedBranch = db.prepare('SELECT * FROM branches WHERE id = ?').get(branchId);

    res.json({
      success: true,
      message: 'Branch updated successfully',
      data: updatedBranch
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update branch',
      error: error.message
    });
  }
});

export default router;
