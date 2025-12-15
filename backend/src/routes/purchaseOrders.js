import express from 'express';
import db from '../config/database.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Generate PO number
function generatePONumber() {
  const year = new Date().getFullYear();
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM purchase_orders WHERE strftime('%Y', created_at) = ?
  `).get(String(year)).count;
  return `PO-${year}-${String(count + 1).padStart(4, '0')}`;
}

// Get all purchase orders
router.get('/', authenticateToken, (req, res) => {
  try {
    const { supplier_id, branch_id, status, start_date, end_date, limit = 100 } = req.query;

    let query = `
      SELECT po.*,
        s.name as supplier_name,
        b.name as branch_name,
        u.full_name as created_by
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      JOIN branches b ON po.branch_id = b.id
      JOIN users u ON po.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (supplier_id) {
      query += ' AND po.supplier_id = ?';
      params.push(supplier_id);
    }

    if (branch_id) {
      query += ' AND po.branch_id = ?';
      params.push(branch_id);
    }

    if (status) {
      query += ' AND po.status = ?';
      params.push(status);
    }

    if (start_date && end_date) {
      query += ' AND DATE(po.order_date) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY po.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const orders = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase orders',
      error: error.message
    });
  }
});

// Get single purchase order
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const order = db.prepare(`
      SELECT po.*,
        s.name as supplier_name,
        s.gst_number as supplier_gst,
        s.phone as supplier_phone,
        s.email as supplier_email,
        s.address as supplier_address,
        b.name as branch_name,
        u.full_name as created_by
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      JOIN branches b ON po.branch_id = b.id
      JOIN users u ON po.user_id = u.id
      WHERE po.id = ?
    `).get(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Get order items
    const items = db.prepare(`
      SELECT poi.*,
        p.name as product_name,
        p.sku,
        p.barcode
      FROM po_items poi
      JOIN products p ON poi.product_id = p.id
      WHERE poi.po_id = ?
    `).all(req.params.id);

    res.json({
      success: true,
      data: {
        ...order,
        items
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase order',
      error: error.message
    });
  }
});

// Create purchase order
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    const {
      supplier_id, branch_id, items,
      expected_delivery, notes
    } = req.body;
    const userId = req.user.id;

    if (!supplier_id || !branch_id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier, branch, and items are required'
      });
    }

    // Calculate total
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.unit_price * item.quantity;
    }

    // Generate PO number
    const poNumber = generatePONumber();

    // Create PO
    const result = db.prepare(`
      INSERT INTO purchase_orders (po_number, supplier_id, branch_id, user_id, total_amount, order_date, expected_delivery, notes)
      VALUES (?, ?, ?, ?, ?, DATE('now'), ?, ?)
    `).run(poNumber, supplier_id, branch_id, userId, totalAmount, expected_delivery, notes);

    const poId = result.lastInsertRowid;

    // Add items
    for (const item of items) {
      db.prepare(`
        INSERT INTO po_items (po_id, product_id, quantity, unit_price, subtotal, batch_number, expiry_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(poId, item.product_id, item.quantity, item.unit_price, item.unit_price * item.quantity, item.batch_number, item.expiry_date);
    }

    const order = db.prepare(`
      SELECT po.*, s.name as supplier_name, b.name as branch_name
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      JOIN branches b ON po.branch_id = b.id
      WHERE po.id = ?
    `).get(poId);

    const orderItems = db.prepare(`
      SELECT poi.*, p.name as product_name, p.sku
      FROM po_items poi
      JOIN products p ON poi.product_id = p.id
      WHERE poi.po_id = ?
    `).all(poId);

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: {
        ...order,
        items: orderItems
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase order',
      error: error.message
    });
  }
});

// Update PO status
router.put('/:id/status', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    const { status } = req.body;
    const poId = req.params.id;

    db.prepare(`
      UPDATE purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(status, poId);

    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(poId);

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
});

// Receive goods (complete PO)
router.post('/:id/receive', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    const { items } = req.body;
    const poId = req.params.id;

    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(poId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'This order has already been received'
      });
    }

    // Update each item's received quantity and stock
    for (const item of items) {
      // Update PO item
      db.prepare(`
        UPDATE po_items SET received_quantity = ? WHERE id = ?
      `).run(item.received_quantity, item.id);

      // Get PO item details
      const poItem = db.prepare('SELECT * FROM po_items WHERE id = ?').get(item.id);

      // Check if stock record exists
      const existingStock = db.prepare(`
        SELECT * FROM stock WHERE product_id = ? AND branch_id = ? AND (batch_number = ? OR batch_number IS NULL)
      `).get(poItem.product_id, order.branch_id, poItem.batch_number);

      if (existingStock) {
        // Update existing stock
        db.prepare(`
          UPDATE stock
          SET quantity = quantity + ?,
              expiry_date = COALESCE(?, expiry_date),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(item.received_quantity, poItem.expiry_date, existingStock.id);
      } else {
        // Create new stock record
        db.prepare(`
          INSERT INTO stock (product_id, branch_id, quantity, batch_number, expiry_date)
          VALUES (?, ?, ?, ?, ?)
        `).run(poItem.product_id, order.branch_id, item.received_quantity, poItem.batch_number, poItem.expiry_date);
      }
    }

    // Update PO status
    db.prepare(`
      UPDATE purchase_orders
      SET status = 'delivered', received_date = DATE('now'), updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(poId);

    const updatedOrder = db.prepare(`
      SELECT po.*, s.name as supplier_name, b.name as branch_name
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      JOIN branches b ON po.branch_id = b.id
      WHERE po.id = ?
    `).get(poId);

    res.json({
      success: true,
      message: 'Goods received and stock updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to receive goods',
      error: error.message
    });
  }
});

// Delete/Cancel PO
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(req.params.id);

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a delivered order'
      });
    }

    db.prepare('DELETE FROM po_items WHERE po_id = ?').run(req.params.id);
    db.prepare('DELETE FROM purchase_orders WHERE id = ?').run(req.params.id);

    res.json({
      success: true,
      message: 'Purchase order deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete purchase order',
      error: error.message
    });
  }
});

export default router;
