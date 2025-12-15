import express from 'express';
import db from '../config/database.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get all suppliers
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, active_only } = req.query;

    let query = `
      SELECT s.*,
        (SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = s.id) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders po WHERE po.supplier_id = s.id AND po.status = 'delivered') as total_purchase_value
      FROM suppliers s
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (s.name LIKE ? OR s.gst_number LIKE ? OR s.contact_person LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (active_only === 'true') {
      query += ' AND s.is_active = 1';
    }

    query += ' ORDER BY s.name';

    const suppliers = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: suppliers,
      count: suppliers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suppliers',
      error: error.message
    });
  }
});

// Get single supplier with purchase history
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const supplier = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = s.id) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders po WHERE po.supplier_id = s.id AND po.status = 'delivered') as total_purchase_value
      FROM suppliers s
      WHERE s.id = ?
    `).get(req.params.id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Get recent purchase orders
    const recentOrders = db.prepare(`
      SELECT po.*, b.name as branch_name
      FROM purchase_orders po
      JOIN branches b ON po.branch_id = b.id
      WHERE po.supplier_id = ?
      ORDER BY po.created_at DESC
      LIMIT 10
    `).all(req.params.id);

    res.json({
      success: true,
      data: {
        ...supplier,
        recent_orders: recentOrders
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supplier',
      error: error.message
    });
  }
});

// Create supplier
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    const {
      name, gst_number, phone, email, address,
      contact_person, payment_terms, credit_limit, products_supplied
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    const result = db.prepare(`
      INSERT INTO suppliers (name, gst_number, phone, email, address, contact_person, payment_terms, credit_limit, products_supplied)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, gst_number, phone, email, address, contact_person, payment_terms || 'Net 30', credit_limit || 0, products_supplied);

    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create supplier',
      error: error.message
    });
  }
});

// Update supplier
router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    const {
      name, gst_number, phone, email, address,
      contact_person, payment_terms, credit_limit, outstanding_amount, products_supplied, is_active
    } = req.body;
    const supplierId = req.params.id;

    db.prepare(`
      UPDATE suppliers
      SET name = COALESCE(?, name),
          gst_number = COALESCE(?, gst_number),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          contact_person = COALESCE(?, contact_person),
          payment_terms = COALESCE(?, payment_terms),
          credit_limit = COALESCE(?, credit_limit),
          outstanding_amount = COALESCE(?, outstanding_amount),
          products_supplied = COALESCE(?, products_supplied),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, gst_number, phone, email, address, contact_person, payment_terms, credit_limit, outstanding_amount, products_supplied, is_active, supplierId);

    const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(supplierId);

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplier
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update supplier',
      error: error.message
    });
  }
});

// Delete supplier (soft delete)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    db.prepare('UPDATE suppliers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(req.params.id);

    res.json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete supplier',
      error: error.message
    });
  }
});

export default router;
