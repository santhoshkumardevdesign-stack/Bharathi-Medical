import express from 'express';
import db from '../config/database.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get stock for a branch
router.get('/branch/:branchId', authenticateToken, (req, res) => {
  try {
    const { search, category, low_stock } = req.query;
    const branchId = req.params.branchId;

    let query = `
      SELECT
        s.*,
        p.sku,
        p.barcode,
        p.name as product_name,
        p.mrp,
        p.selling_price,
        p.gst_rate,
        p.min_stock,
        p.unit,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        CASE
          WHEN s.quantity = 0 THEN 'out_of_stock'
          WHEN s.quantity < p.min_stock THEN 'low_stock'
          ELSE 'in_stock'
        END as stock_status,
        CASE
          WHEN s.expiry_date < DATE('now') THEN 'expired'
          WHEN s.expiry_date <= DATE('now', '+30 days') THEN 'expiring_soon'
          ELSE 'ok'
        END as expiry_status
      FROM stock s
      JOIN products p ON s.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE s.branch_id = ? AND p.is_active = 1
    `;
    const params = [branchId];

    if (search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (category) {
      query += ' AND p.category_id = ?';
      params.push(category);
    }

    if (low_stock === 'true') {
      query += ' AND s.quantity < p.min_stock';
    }

    query += ' ORDER BY p.name';

    const stock = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: stock,
      count: stock.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock',
      error: error.message
    });
  }
});

// Get stock for a specific product across all branches
router.get('/product/:productId', authenticateToken, (req, res) => {
  try {
    const stock = db.prepare(`
      SELECT
        s.*,
        b.name as branch_name,
        b.code as branch_code
      FROM stock s
      JOIN branches b ON s.branch_id = b.id
      WHERE s.product_id = ?
      ORDER BY b.name
    `).all(req.params.productId);

    const totalStock = stock.reduce((sum, s) => sum + s.quantity, 0);

    res.json({
      success: true,
      data: {
        stock_by_branch: stock,
        total_stock: totalStock
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock',
      error: error.message
    });
  }
});

// Adjust stock
router.post('/adjust', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    const { product_id, branch_id, adjustment_type, quantity, reason, batch_number } = req.body;
    const userId = req.user.id;

    // Get current stock
    const currentStock = db.prepare(`
      SELECT * FROM stock WHERE product_id = ? AND branch_id = ? AND (batch_number = ? OR batch_number IS NULL)
    `).get(product_id, branch_id, batch_number);

    if (!currentStock) {
      return res.status(404).json({
        success: false,
        message: 'Stock record not found'
      });
    }

    let newQuantity;
    if (adjustment_type === 'add') {
      newQuantity = currentStock.quantity + quantity;
    } else if (['remove', 'damage', 'expired'].includes(adjustment_type)) {
      if (currentStock.quantity < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock for this adjustment'
        });
      }
      newQuantity = currentStock.quantity - quantity;
    } else if (adjustment_type === 'correction') {
      newQuantity = quantity;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid adjustment type'
      });
    }

    // Update stock
    db.prepare(`
      UPDATE stock SET quantity = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newQuantity, currentStock.id);

    // Record adjustment
    db.prepare(`
      INSERT INTO stock_adjustments (product_id, branch_id, user_id, adjustment_type, quantity, reason, batch_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(product_id, branch_id, userId, adjustment_type, quantity, reason, batch_number);

    const updatedStock = db.prepare('SELECT * FROM stock WHERE id = ?').get(currentStock.id);

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        previous_quantity: currentStock.quantity,
        adjustment: adjustment_type === 'add' ? `+${quantity}` : `-${quantity}`,
        new_quantity: newQuantity,
        stock: updatedStock
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to adjust stock',
      error: error.message
    });
  }
});

// Create stock transfer
router.post('/transfer', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    const { from_branch_id, to_branch_id, items, notes } = req.body;
    const userId = req.user.id;

    if (from_branch_id === to_branch_id) {
      return res.status(400).json({
        success: false,
        message: 'Source and destination branches cannot be the same'
      });
    }

    // Generate transfer number
    const count = db.prepare('SELECT COUNT(*) as count FROM stock_transfers').get().count;
    const transferNumber = `TRF-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    // Create transfer record
    const result = db.prepare(`
      INSERT INTO stock_transfers (transfer_number, from_branch_id, to_branch_id, user_id, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(transferNumber, from_branch_id, to_branch_id, userId, notes);

    const transferId = result.lastInsertRowid;

    // Add transfer items and validate stock
    for (const item of items) {
      // Check source stock
      const sourceStock = db.prepare(`
        SELECT quantity FROM stock WHERE product_id = ? AND branch_id = ?
      `).get(item.product_id, from_branch_id);

      if (!sourceStock || sourceStock.quantity < item.quantity) {
        // Rollback transfer
        db.prepare('DELETE FROM transfer_items WHERE transfer_id = ?').run(transferId);
        db.prepare('DELETE FROM stock_transfers WHERE id = ?').run(transferId);

        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ID ${item.product_id}`
        });
      }

      db.prepare(`
        INSERT INTO transfer_items (transfer_id, product_id, quantity, batch_number)
        VALUES (?, ?, ?, ?)
      `).run(transferId, item.product_id, item.quantity, item.batch_number);
    }

    const transfer = db.prepare(`
      SELECT st.*, fb.name as from_branch_name, tb.name as to_branch_name
      FROM stock_transfers st
      JOIN branches fb ON st.from_branch_id = fb.id
      JOIN branches tb ON st.to_branch_id = tb.id
      WHERE st.id = ?
    `).get(transferId);

    const transferItems = db.prepare(`
      SELECT ti.*, p.name as product_name, p.sku
      FROM transfer_items ti
      JOIN products p ON ti.product_id = p.id
      WHERE ti.transfer_id = ?
    `).all(transferId);

    res.status(201).json({
      success: true,
      message: 'Stock transfer created successfully',
      data: {
        ...transfer,
        items: transferItems
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create stock transfer',
      error: error.message
    });
  }
});

// Get all transfers
router.get('/transfers', authenticateToken, (req, res) => {
  try {
    const { branch_id, status } = req.query;

    let query = `
      SELECT st.*,
        fb.name as from_branch_name,
        tb.name as to_branch_name,
        u.full_name as created_by
      FROM stock_transfers st
      JOIN branches fb ON st.from_branch_id = fb.id
      JOIN branches tb ON st.to_branch_id = tb.id
      JOIN users u ON st.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      query += ' AND (st.from_branch_id = ? OR st.to_branch_id = ?)';
      params.push(branch_id, branch_id);
    }

    if (status) {
      query += ' AND st.status = ?';
      params.push(status);
    }

    query += ' ORDER BY st.created_at DESC';

    const transfers = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: transfers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transfers',
      error: error.message
    });
  }
});

// Get single transfer
router.get('/transfers/:id', authenticateToken, (req, res) => {
  try {
    const transfer = db.prepare(`
      SELECT st.*,
        fb.name as from_branch_name,
        tb.name as to_branch_name,
        u.full_name as created_by
      FROM stock_transfers st
      JOIN branches fb ON st.from_branch_id = fb.id
      JOIN branches tb ON st.to_branch_id = tb.id
      JOIN users u ON st.user_id = u.id
      WHERE st.id = ?
    `).get(req.params.id);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    const items = db.prepare(`
      SELECT ti.*, p.name as product_name, p.sku, p.barcode
      FROM transfer_items ti
      JOIN products p ON ti.product_id = p.id
      WHERE ti.transfer_id = ?
    `).all(req.params.id);

    res.json({
      success: true,
      data: {
        ...transfer,
        items
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transfer',
      error: error.message
    });
  }
});

// Update transfer status
router.put('/transfers/:id/status', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    const { status } = req.body;
    const transferId = req.params.id;

    const transfer = db.prepare('SELECT * FROM stock_transfers WHERE id = ?').get(transferId);

    if (!transfer) {
      return res.status(404).json({
        success: false,
        message: 'Transfer not found'
      });
    }

    // If completing transfer, update stock
    if (status === 'completed' && transfer.status !== 'completed') {
      const items = db.prepare('SELECT * FROM transfer_items WHERE transfer_id = ?').all(transferId);

      for (const item of items) {
        // Decrease source stock
        db.prepare(`
          UPDATE stock SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
          WHERE product_id = ? AND branch_id = ?
        `).run(item.quantity, item.product_id, transfer.from_branch_id);

        // Increase destination stock
        db.prepare(`
          UPDATE stock SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
          WHERE product_id = ? AND branch_id = ?
        `).run(item.quantity, item.product_id, transfer.to_branch_id);
      }

      db.prepare(`
        UPDATE stock_transfers SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(status, transferId);
    } else {
      db.prepare('UPDATE stock_transfers SET status = ? WHERE id = ?').run(status, transferId);
    }

    const updatedTransfer = db.prepare('SELECT * FROM stock_transfers WHERE id = ?').get(transferId);

    res.json({
      success: true,
      message: 'Transfer status updated successfully',
      data: updatedTransfer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update transfer status',
      error: error.message
    });
  }
});

// Get stock adjustments history
router.get('/adjustments', authenticateToken, (req, res) => {
  try {
    const { branch_id, product_id, limit = 50 } = req.query;

    let query = `
      SELECT sa.*,
        p.name as product_name,
        p.sku,
        b.name as branch_name,
        u.full_name as adjusted_by
      FROM stock_adjustments sa
      JOIN products p ON sa.product_id = p.id
      JOIN branches b ON sa.branch_id = b.id
      JOIN users u ON sa.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      query += ' AND sa.branch_id = ?';
      params.push(branch_id);
    }

    if (product_id) {
      query += ' AND sa.product_id = ?';
      params.push(product_id);
    }

    query += ' ORDER BY sa.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const adjustments = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: adjustments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch adjustments',
      error: error.message
    });
  }
});

export default router;
