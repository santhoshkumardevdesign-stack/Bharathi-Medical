import express from 'express';
import db from '../config/database.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get all customers
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, type, limit = 100 } = req.query;

    let query = `
      SELECT c.*,
        (SELECT COUNT(*) FROM pets p WHERE p.customer_id = c.id) as pet_count,
        (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id) as total_orders
      FROM customers c
      WHERE c.is_active = 1
    `;
    const params = [];

    if (search) {
      query += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (type) {
      query += ' AND c.customer_type = ?';
      params.push(type);
    }

    query += ' ORDER BY c.name LIMIT ?';
    params.push(parseInt(limit));

    const customers = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: customers,
      count: customers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error.message
    });
  }
});

// Search customers (for POS autocomplete)
router.get('/search', authenticateToken, (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    const searchTerm = `%${q}%`;
    const customers = db.prepare(`
      SELECT id, name, phone, email, customer_type, loyalty_points
      FROM customers
      WHERE is_active = 1 AND (name LIKE ? OR phone LIKE ?)
      ORDER BY name
      LIMIT 10
    `).all(searchTerm, searchTerm);

    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search customers',
      error: error.message
    });
  }
});

// Get single customer with pets and history
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const customer = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id) as total_orders
      FROM customers c
      WHERE c.id = ?
    `).get(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get pets
    const pets = db.prepare(`
      SELECT * FROM pets WHERE customer_id = ? ORDER BY name
    `).all(req.params.id);

    // Get recent purchases
    const purchases = db.prepare(`
      SELECT s.*, b.name as branch_name
      FROM sales s
      JOIN branches b ON s.branch_id = b.id
      WHERE s.customer_id = ?
      ORDER BY s.created_at DESC
      LIMIT 10
    `).all(req.params.id);

    res.json({
      success: true,
      data: {
        ...customer,
        pets,
        recent_purchases: purchases
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer',
      error: error.message
    });
  }
});

// Get customer purchase history
router.get('/:id/history', authenticateToken, (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const purchases = db.prepare(`
      SELECT s.*, b.name as branch_name, u.full_name as cashier_name
      FROM sales s
      JOIN branches b ON s.branch_id = b.id
      JOIN users u ON s.user_id = u.id
      WHERE s.customer_id = ?
      ORDER BY s.created_at DESC
      LIMIT ?
    `).all(req.params.id, parseInt(limit));

    // Get items for each purchase
    purchases.forEach(purchase => {
      purchase.items = db.prepare(`
        SELECT si.*, p.name as product_name, p.sku
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        WHERE si.sale_id = ?
      `).all(purchase.id);
    });

    res.json({
      success: true,
      data: purchases
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase history',
      error: error.message
    });
  }
});

// Create customer
router.post('/', authenticateToken, (req, res) => {
  try {
    const { name, phone, email, address, customer_type, gst_number } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    // Check if phone already exists
    const existingCustomer = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this phone number already exists'
      });
    }

    const result = db.prepare(`
      INSERT INTO customers (name, phone, email, address, customer_type, gst_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(name, phone, email, address, customer_type || 'retail', gst_number);

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error.message
    });
  }
});

// Update customer
router.put('/:id', authenticateToken, (req, res) => {
  try {
    const { name, phone, email, address, customer_type, gst_number, loyalty_points } = req.body;
    const customerId = req.params.id;

    db.prepare(`
      UPDATE customers
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          customer_type = COALESCE(?, customer_type),
          gst_number = COALESCE(?, gst_number),
          loyalty_points = COALESCE(?, loyalty_points),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, phone, email, address, customer_type, gst_number, loyalty_points, customerId);

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update customer',
      error: error.message
    });
  }
});

// Delete customer (soft delete)
router.delete('/:id', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    db.prepare('UPDATE customers SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(req.params.id);

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      error: error.message
    });
  }
});

// Add pet to customer
router.post('/:id/pets', authenticateToken, (req, res) => {
  try {
    const { name, species, breed, age_years, age_months, gender, weight, color, notes } = req.body;
    const customerId = req.params.id;

    if (!name || !species) {
      return res.status(400).json({
        success: false,
        message: 'Pet name and species are required'
      });
    }

    const result = db.prepare(`
      INSERT INTO pets (customer_id, name, species, breed, age_years, age_months, gender, weight, color, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customerId, name, species, breed, age_years, age_months, gender, weight, color, notes);

    const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: 'Pet added successfully',
      data: pet
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add pet',
      error: error.message
    });
  }
});

// Update pet
router.put('/:customerId/pets/:petId', authenticateToken, (req, res) => {
  try {
    const { name, species, breed, age_years, age_months, gender, weight, color, notes } = req.body;
    const { petId } = req.params;

    db.prepare(`
      UPDATE pets
      SET name = COALESCE(?, name),
          species = COALESCE(?, species),
          breed = COALESCE(?, breed),
          age_years = COALESCE(?, age_years),
          age_months = COALESCE(?, age_months),
          gender = COALESCE(?, gender),
          weight = COALESCE(?, weight),
          color = COALESCE(?, color),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, species, breed, age_years, age_months, gender, weight, color, notes, petId);

    const pet = db.prepare('SELECT * FROM pets WHERE id = ?').get(petId);

    res.json({
      success: true,
      message: 'Pet updated successfully',
      data: pet
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update pet',
      error: error.message
    });
  }
});

// Delete pet
router.delete('/:customerId/pets/:petId', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM pets WHERE id = ?').run(req.params.petId);

    res.json({
      success: true,
      message: 'Pet deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete pet',
      error: error.message
    });
  }
});

export default router;
