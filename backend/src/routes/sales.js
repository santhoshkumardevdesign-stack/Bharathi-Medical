import express from 'express';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Generate invoice number
function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = db.prepare(`
    SELECT COUNT(*) as count FROM sales WHERE strftime('%Y', created_at) = ?
  `).get(String(year)).count;
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
}

// Get all sales
router.get('/', authenticateToken, (req, res) => {
  try {
    const { branch_id, customer_id, date, start_date, end_date, status, payment_method, limit = 100 } = req.query;

    let query = `
      SELECT s.*,
        b.name as branch_name,
        c.name as customer_name,
        c.phone as customer_phone,
        u.full_name as cashier_name
      FROM sales s
      JOIN branches b ON s.branch_id = b.id
      LEFT JOIN customers c ON s.customer_id = c.id
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      query += ' AND s.branch_id = ?';
      params.push(branch_id);
    }

    if (customer_id) {
      query += ' AND s.customer_id = ?';
      params.push(customer_id);
    }

    if (date) {
      query += ' AND DATE(s.created_at) = ?';
      params.push(date);
    }

    if (start_date && end_date) {
      query += ' AND DATE(s.created_at) BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    if (status) {
      query += ' AND s.status = ?';
      params.push(status);
    }

    if (payment_method) {
      query += ' AND s.payment_method = ?';
      params.push(payment_method);
    }

    query += ' ORDER BY s.created_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const sales = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: sales,
      count: sales.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales',
      error: error.message
    });
  }
});

// Get today's sales summary
router.get('/today', authenticateToken, (req, res) => {
  try {
    const { branch_id } = req.query;

    let branchCondition = '';
    const params = [];

    if (branch_id) {
      branchCondition = 'AND s.branch_id = ?';
      params.push(branch_id);
    }

    const summary = db.prepare(`
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(gst_amount), 0) as total_gst,
        COALESCE(SUM(discount), 0) as total_discount,
        COALESCE(AVG(grand_total), 0) as average_sale
      FROM sales s
      WHERE DATE(s.created_at) = DATE('now')
        AND s.status = 'completed'
        ${branchCondition}
    `).get(...params);

    // Payment method breakdown
    const paymentBreakdown = db.prepare(`
      SELECT
        payment_method,
        COUNT(*) as count,
        COALESCE(SUM(grand_total), 0) as total
      FROM sales s
      WHERE DATE(s.created_at) = DATE('now')
        AND s.status = 'completed'
        ${branchCondition}
      GROUP BY payment_method
    `).all(...params);

    // Recent transactions
    const recentSales = db.prepare(`
      SELECT s.*, c.name as customer_name, b.name as branch_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      JOIN branches b ON s.branch_id = b.id
      WHERE DATE(s.created_at) = DATE('now')
        AND s.status = 'completed'
        ${branchCondition}
      ORDER BY s.created_at DESC
      LIMIT 10
    `).all(...params);

    res.json({
      success: true,
      data: {
        summary,
        payment_breakdown: paymentBreakdown,
        recent_sales: recentSales
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s sales',
      error: error.message
    });
  }
});

// Get single sale with items
router.get('/:id', authenticateToken, (req, res) => {
  try {
    const sale = db.prepare(`
      SELECT s.*,
        b.name as branch_name,
        b.address as branch_address,
        b.phone as branch_phone,
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        c.address as customer_address,
        c.gst_number as customer_gst,
        u.full_name as cashier_name
      FROM sales s
      JOIN branches b ON s.branch_id = b.id
      LEFT JOIN customers c ON s.customer_id = c.id
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Get sale items
    const items = db.prepare(`
      SELECT si.*,
        p.name as product_name,
        p.sku,
        p.barcode,
        c.name as category_name
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE si.sale_id = ?
    `).all(req.params.id);

    res.json({
      success: true,
      data: {
        ...sale,
        items
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sale',
      error: error.message
    });
  }
});

// Create new sale
router.post('/', authenticateToken, (req, res) => {
  try {
    const {
      branch_id,
      customer_id,
      items,
      discount = 0,
      discount_type = 'amount',
      payment_method,
      notes
    } = req.body;
    const userId = req.user.id;

    if (!branch_id || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Branch and items are required'
      });
    }

    // Calculate totals
    let subtotal = 0;
    let totalGst = 0;

    // Validate items and calculate
    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.product_id);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.product_id}`
        });
      }

      // Check stock
      const stock = db.prepare(`
        SELECT COALESCE(SUM(quantity), 0) as quantity FROM stock
        WHERE product_id = ? AND branch_id = ?
      `).get(item.product_id, branch_id);

      if (stock.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${stock.quantity}`
        });
      }

      const itemSubtotal = item.unit_price * item.quantity;
      const itemGst = (itemSubtotal * product.gst_rate) / 100;

      subtotal += itemSubtotal;
      totalGst += itemGst;

      item.gst_rate = product.gst_rate;
      item.gst_amount = itemGst;
      item.subtotal = itemSubtotal + itemGst;
    }

    // Apply discount
    let discountAmount = 0;
    if (discount_type === 'percentage') {
      discountAmount = (subtotal * discount) / 100;
    } else {
      discountAmount = discount;
    }

    const grandTotal = subtotal + totalGst - discountAmount;

    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber();

    // Create sale record
    const result = db.prepare(`
      INSERT INTO sales (invoice_number, branch_id, customer_id, user_id, subtotal, gst_amount, discount, discount_type, grand_total, payment_method, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
    `).run(invoiceNumber, branch_id, customer_id || null, userId, subtotal, totalGst, discountAmount, discount_type, grandTotal, payment_method || 'cash', notes);

    const saleId = result.lastInsertRowid;

    // Create sale items and update stock
    for (const item of items) {
      db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, gst_rate, gst_amount, discount, subtotal, batch_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(saleId, item.product_id, item.quantity, item.unit_price, item.gst_rate, item.gst_amount, item.discount || 0, item.subtotal, item.batch_number);

      // Update stock (decrease)
      db.prepare(`
        UPDATE stock SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP
        WHERE product_id = ? AND branch_id = ?
      `).run(item.quantity, item.product_id, branch_id);
    }

    // Update customer total purchases
    if (customer_id) {
      db.prepare(`
        UPDATE customers
        SET total_purchases = total_purchases + ?,
            loyalty_points = loyalty_points + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(grandTotal, Math.floor(grandTotal / 100), customer_id);
    }

    // Fetch complete sale data for response
    const sale = db.prepare(`
      SELECT s.*,
        b.name as branch_name,
        b.address as branch_address,
        b.phone as branch_phone,
        c.name as customer_name,
        c.phone as customer_phone,
        u.full_name as cashier_name
      FROM sales s
      JOIN branches b ON s.branch_id = b.id
      LEFT JOIN customers c ON s.customer_id = c.id
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ?
    `).get(saleId);

    const saleItems = db.prepare(`
      SELECT si.*, p.name as product_name, p.sku
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `).all(saleId);

    res.status(201).json({
      success: true,
      message: 'Sale completed successfully',
      data: {
        ...sale,
        items: saleItems
      }
    });
  } catch (error) {
    console.error('Sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sale',
      error: error.message
    });
  }
});

// Hold sale
router.post('/hold', authenticateToken, (req, res) => {
  try {
    const { branch_id, customer_id, cart_data, notes } = req.body;
    const userId = req.user.id;

    const result = db.prepare(`
      INSERT INTO held_sales (branch_id, user_id, customer_id, cart_data, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(branch_id, userId, customer_id || null, JSON.stringify(cart_data), notes);

    res.status(201).json({
      success: true,
      message: 'Sale held successfully',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to hold sale',
      error: error.message
    });
  }
});

// Get held sales
router.get('/held/list', authenticateToken, (req, res) => {
  try {
    const { branch_id } = req.query;

    let query = `
      SELECT hs.*,
        c.name as customer_name,
        u.full_name as held_by
      FROM held_sales hs
      LEFT JOIN customers c ON hs.customer_id = c.id
      JOIN users u ON hs.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (branch_id) {
      query += ' AND hs.branch_id = ?';
      params.push(branch_id);
    }

    query += ' ORDER BY hs.created_at DESC';

    const heldSales = db.prepare(query).all(...params);

    // Parse cart data
    heldSales.forEach(sale => {
      sale.cart_data = JSON.parse(sale.cart_data);
    });

    res.json({
      success: true,
      data: heldSales
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch held sales',
      error: error.message
    });
  }
});

// Resume held sale
router.get('/held/:id', authenticateToken, (req, res) => {
  try {
    const heldSale = db.prepare(`
      SELECT hs.*, c.name as customer_name
      FROM held_sales hs
      LEFT JOIN customers c ON hs.customer_id = c.id
      WHERE hs.id = ?
    `).get(req.params.id);

    if (!heldSale) {
      return res.status(404).json({
        success: false,
        message: 'Held sale not found'
      });
    }

    heldSale.cart_data = JSON.parse(heldSale.cart_data);

    res.json({
      success: true,
      data: heldSale
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch held sale',
      error: error.message
    });
  }
});

// Delete held sale
router.delete('/held/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM held_sales WHERE id = ?').run(req.params.id);

    res.json({
      success: true,
      message: 'Held sale deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete held sale',
      error: error.message
    });
  }
});

// Cancel/Return sale
router.put('/:id/cancel', authenticateToken, (req, res) => {
  try {
    const { reason } = req.body;
    const saleId = req.params.id;

    const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed sales can be cancelled'
      });
    }

    // Restore stock
    const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId);
    for (const item of items) {
      db.prepare(`
        UPDATE stock SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP
        WHERE product_id = ? AND branch_id = ?
      `).run(item.quantity, item.product_id, sale.branch_id);
    }

    // Update customer total purchases
    if (sale.customer_id) {
      db.prepare(`
        UPDATE customers
        SET total_purchases = total_purchases - ?,
            loyalty_points = loyalty_points - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(sale.grand_total, Math.floor(sale.grand_total / 100), sale.customer_id);
    }

    // Update sale status
    db.prepare(`
      UPDATE sales SET status = 'cancelled', notes = COALESCE(notes || ' | ', '') || ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(`Cancelled: ${reason || 'No reason provided'}`, saleId);

    const updatedSale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId);

    res.json({
      success: true,
      message: 'Sale cancelled successfully',
      data: updatedSale
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel sale',
      error: error.message
    });
  }
});

export default router;
