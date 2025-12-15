import express from 'express';
import db from '../config/database.js';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Get all products with optional filters
router.get('/', authenticateToken, (req, res) => {
  try {
    const { category, search, branch_id, low_stock, expiring } = req.query;

    let query = `
      SELECT
        p.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (category) {
      query += ' AND p.category_id = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY p.name';

    const products = db.prepare(query).all(...params);

    // If branch_id provided, add stock info
    if (branch_id) {
      products.forEach(product => {
        const stock = db.prepare(`
          SELECT COALESCE(SUM(quantity), 0) as stock, MIN(expiry_date) as nearest_expiry
          FROM stock
          WHERE product_id = ? AND branch_id = ?
        `).get(product.id, branch_id);
        product.stock = stock.stock;
        product.nearest_expiry = stock.nearest_expiry;
      });
    }

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
});

// Get product categories
router.get('/categories', authenticateToken, (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) as product_count
      FROM categories c
      ORDER BY c.name
    `).all();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// Get low stock products
router.get('/low-stock', authenticateToken, (req, res) => {
  try {
    const { branch_id } = req.query;

    let query = `
      SELECT
        p.*,
        c.name as category_name,
        s.quantity as current_stock,
        s.branch_id,
        b.name as branch_name,
        (p.min_stock - s.quantity) as reorder_quantity
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN stock s ON p.id = s.product_id
      JOIN branches b ON s.branch_id = b.id
      WHERE p.is_active = 1 AND s.quantity < p.min_stock AND s.quantity > 0
    `;

    if (branch_id) {
      query += ' AND s.branch_id = ?';
    }

    query += ' ORDER BY s.quantity ASC, p.name';

    const products = branch_id
      ? db.prepare(query).all(branch_id)
      : db.prepare(query).all();

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock products',
      error: error.message
    });
  }
});

// Get expiring products
router.get('/expiring', authenticateToken, (req, res) => {
  try {
    const { branch_id, days = 30 } = req.query;

    let query = `
      SELECT
        p.*,
        c.name as category_name,
        s.quantity,
        s.batch_number,
        s.expiry_date,
        s.branch_id,
        b.name as branch_name,
        CAST(julianday(s.expiry_date) - julianday('now') AS INTEGER) as days_until_expiry
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN stock s ON p.id = s.product_id
      JOIN branches b ON s.branch_id = b.id
      WHERE p.is_active = 1
        AND s.quantity > 0
        AND s.expiry_date IS NOT NULL
        AND s.expiry_date <= DATE('now', '+' || ? || ' days')
        AND s.expiry_date >= DATE('now')
    `;

    const params = [days];

    if (branch_id) {
      query += ' AND s.branch_id = ?';
      params.push(branch_id);
    }

    query += ' ORDER BY s.expiry_date ASC, p.name';

    const products = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expiring products',
      error: error.message
    });
  }
});

// Get expired products
router.get('/expired', authenticateToken, (req, res) => {
  try {
    const { branch_id } = req.query;

    let query = `
      SELECT
        p.*,
        c.name as category_name,
        s.quantity,
        s.batch_number,
        s.expiry_date,
        s.branch_id,
        b.name as branch_name,
        CAST(julianday('now') - julianday(s.expiry_date) AS INTEGER) as days_expired
      FROM products p
      JOIN categories c ON p.category_id = c.id
      JOIN stock s ON p.id = s.product_id
      JOIN branches b ON s.branch_id = b.id
      WHERE p.is_active = 1
        AND s.quantity > 0
        AND s.expiry_date IS NOT NULL
        AND s.expiry_date < DATE('now')
    `;

    if (branch_id) {
      query += ' AND s.branch_id = ?';
    }

    query += ' ORDER BY s.expiry_date DESC, p.name';

    const products = branch_id
      ? db.prepare(query).all(branch_id)
      : db.prepare(query).all();

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expired products',
      error: error.message
    });
  }
});

// Get single product
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const product = db.prepare(`
      SELECT
        p.*,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get stock across all branches
    const stock = db.prepare(`
      SELECT s.*, b.name as branch_name
      FROM stock s
      JOIN branches b ON s.branch_id = b.id
      WHERE s.product_id = ?
      ORDER BY b.name
    `).all(req.params.id);

    product.stock_by_branch = stock;
    product.total_stock = stock.reduce((sum, s) => sum + s.quantity, 0);

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
});

// Search product by barcode
router.get('/barcode/:barcode', authenticateToken, (req, res) => {
  try {
    const product = db.prepare(`
      SELECT
        p.*,
        c.name as category_name,
        c.icon as category_icon
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.barcode = ? AND p.is_active = 1
    `).get(req.params.barcode);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
});

// Create product
router.post('/', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    const {
      sku, barcode, name, description, category_id,
      mrp, selling_price, purchase_price, gst_rate, min_stock, unit
    } = req.body;

    // Validate required fields
    if (!sku || !name || !category_id || !mrp || !selling_price) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if SKU already exists
    const existingSku = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }

    const result = db.prepare(`
      INSERT INTO products (sku, barcode, name, description, category_id, mrp, selling_price, purchase_price, gst_rate, min_stock, unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sku, barcode, name, description, category_id, mrp, selling_price, purchase_price || 0, gst_rate, min_stock || 10, unit || 'piece');

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);

    // Initialize stock for all branches
    const branches = db.prepare('SELECT id FROM branches').all();
    branches.forEach(branch => {
      db.prepare(`
        INSERT INTO stock (product_id, branch_id, quantity, batch_number)
        VALUES (?, ?, 0, ?)
      `).run(product.id, branch.id, `BTH${String(branch.id).padStart(2, '0')}${String(product.id).padStart(4, '0')}`);
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
});

// Update product
router.put('/:id', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
  try {
    const {
      sku, barcode, name, description, category_id,
      mrp, selling_price, purchase_price, gst_rate, min_stock, unit, is_active
    } = req.body;
    const productId = req.params.id;

    db.prepare(`
      UPDATE products
      SET sku = COALESCE(?, sku),
          barcode = COALESCE(?, barcode),
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          category_id = COALESCE(?, category_id),
          mrp = COALESCE(?, mrp),
          selling_price = COALESCE(?, selling_price),
          purchase_price = COALESCE(?, purchase_price),
          gst_rate = COALESCE(?, gst_rate),
          min_stock = COALESCE(?, min_stock),
          unit = COALESCE(?, unit),
          is_active = COALESCE(?, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(sku, barcode, name, description, category_id, mrp, selling_price, purchase_price, gst_rate, min_stock, unit, is_active, productId);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
});

// Delete product (soft delete)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  try {
    db.prepare('UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(req.params.id);

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
});

export default router;
