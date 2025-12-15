import express from 'express';
import db from '../config/database.js';

const router = express.Router();

// Public route - Get all branches for customers
router.get('/branches', (req, res) => {
  try {
    const branches = db.prepare(`
      SELECT id, name, code, address, phone, opening_hours
      FROM branches
      WHERE status = 'active'
      ORDER BY name
    `).all();

    res.json({
      success: true,
      data: branches
    });
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Public route - Get products available at a branch
router.get('/products/:branchId', (req, res) => {
  try {
    const { branchId } = req.params;
    const { category } = req.query;

    let query = `
      SELECT p.id, p.sku, p.name, p.description, p.mrp, p.selling_price, p.unit,
             c.name as category_name, c.icon as category_icon,
             COALESCE(SUM(s.quantity), 0) as available_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock s ON p.id = s.product_id AND s.branch_id = ?
      WHERE p.is_active = 1
    `;
    const params = [branchId];

    if (category) {
      query += ' AND c.id = ?';
      params.push(category);
    }

    query += ' GROUP BY p.id HAVING available_stock > 0 ORDER BY c.name, p.name';

    const products = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Public route - Get categories
router.get('/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT id, name, icon, color
      FROM categories
      ORDER BY name
    `).all();

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Public route - Place an online order
router.post('/order', (req, res) => {
  try {
    const {
      branch_id,
      customer_name,
      customer_phone,
      customer_address,
      items,
      notes,
      delivery_type = 'pickup',
      delivery_address,
      payment_method = 'cash',
      customer_id
    } = req.body;

    // Validate required fields
    if (!branch_id || !customer_name || !customer_phone || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Branch, customer name, phone, and at least one item are required'
      });
    }

    // Validate phone number format
    const phoneRegex = /^[+]?[\d\s-]{10,15}$/;
    if (!phoneRegex.test(customer_phone.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number'
      });
    }

    // Check if branch exists and is active
    const branch = db.prepare('SELECT * FROM branches WHERE id = ? AND status = ?').get(branch_id, 'active');
    if (!branch) {
      return res.status(400).json({
        success: false,
        message: 'Selected branch is not available'
      });
    }

    // Create or find customer
    let customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(customer_phone);
    if (!customer) {
      const insertCustomer = db.prepare(`
        INSERT INTO customers (name, phone, address, customer_type, loyalty_points)
        VALUES (?, ?, ?, 'retail', 0)
      `);
      const result = insertCustomer.run(customer_name, customer_phone, customer_address || '');
      customer = { id: result.lastInsertRowid };
    }

    // Calculate totals and validate stock
    let subtotal = 0;
    let totalGst = 0;
    const orderItems = [];

    for (const item of items) {
      const product = db.prepare(`
        SELECT p.*, COALESCE(SUM(s.quantity), 0) as stock
        FROM products p
        LEFT JOIN stock s ON p.id = s.product_id AND s.branch_id = ?
        WHERE p.id = ? AND p.is_active = 1
        GROUP BY p.id
      `).get(branch_id, item.product_id);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.product_id}`
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
        });
      }

      const itemSubtotal = product.selling_price * item.quantity;
      const itemGst = itemSubtotal * (product.gst_rate / 100);

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.selling_price,
        gst_rate: product.gst_rate,
        gst_amount: itemGst,
        subtotal: itemSubtotal + itemGst
      });

      subtotal += itemSubtotal;
      totalGst += itemGst;
    }

    // Calculate delivery charge (Rs.30 for delivery within 5km)
    const deliveryCharge = delivery_type === 'delivery' ? 30 : 0;
    const grandTotal = subtotal + totalGst + deliveryCharge;

    // Validate delivery address for delivery orders
    if (delivery_type === 'delivery' && !delivery_address) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address is required for home delivery'
      });
    }

    // Generate order number
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const orderCount = db.prepare(`
      SELECT COUNT(*) as count FROM online_orders WHERE DATE(created_at) = DATE('now')
    `).get();
    const orderNumber = `ONL-${today}-${String(orderCount.count + 1).padStart(4, '0')}`;

    // Create online_orders table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS online_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        branch_id INTEGER NOT NULL,
        customer_id INTEGER,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_address TEXT,
        delivery_type TEXT DEFAULT 'pickup' CHECK(delivery_type IN ('pickup', 'delivery')),
        delivery_address TEXT,
        payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'online', 'upi')),
        payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed')),
        items_json TEXT NOT NULL,
        subtotal REAL NOT NULL,
        gst_amount REAL NOT NULL,
        delivery_charge REAL DEFAULT 0,
        grand_total REAL NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'processing', 'ready', 'out_for_delivery', 'completed', 'cancelled')),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (branch_id) REFERENCES branches(id),
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    // Use provided customer_id or the one we created/found
    const finalCustomerId = customer_id || customer.id;

    // Insert order
    const insertOrder = db.prepare(`
      INSERT INTO online_orders (order_number, branch_id, customer_id, customer_name, customer_phone, customer_address, delivery_type, delivery_address, payment_method, payment_status, items_json, subtotal, gst_amount, delivery_charge, grand_total, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertOrder.run(
      orderNumber,
      branch_id,
      finalCustomerId,
      customer_name,
      customer_phone,
      customer_address || '',
      delivery_type,
      delivery_address || '',
      payment_method,
      payment_method === 'online' ? 'paid' : 'pending',
      JSON.stringify(orderItems),
      subtotal,
      totalGst,
      deliveryCharge,
      grandTotal,
      notes || ''
    );

    res.status(201).json({
      success: true,
      message: delivery_type === 'delivery'
        ? 'Order placed successfully! Your order will be delivered soon.'
        : 'Order placed successfully! You will receive a call when your order is ready for pickup.',
      data: {
        order_id: result.lastInsertRowid,
        order_number: orderNumber,
        branch: branch.name,
        delivery_type,
        delivery_address: delivery_address || '',
        payment_method,
        subtotal,
        gst_amount: totalGst,
        delivery_charge: deliveryCharge,
        grand_total: grandTotal,
        items: orderItems
      }
    });

  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get order status (public)
router.get('/order/:orderNumber', (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = db.prepare(`
      SELECT o.*, b.name as branch_name, b.phone as branch_phone, b.address as branch_address
      FROM online_orders o
      JOIN branches b ON o.branch_id = b.id
      WHERE o.order_number = ?
    `).get(orderNumber);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...order,
        items: JSON.parse(order.items_json)
      }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Staff route - Get orders for a branch
router.get('/orders', (req, res) => {
  try {
    const { branch_id, status } = req.query;

    if (!branch_id) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }

    let query = `
      SELECT o.*, b.name as branch_name
      FROM online_orders o
      JOIN branches b ON o.branch_id = b.id
      WHERE o.branch_id = ?
    `;
    const params = [branch_id];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC';

    const orders = db.prepare(query).all(...params);

    res.json({
      success: true,
      data: orders.map(order => ({
        ...order,
        items: JSON.parse(order.items_json || '[]')
      }))
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Staff route - Update order status
router.patch('/orders/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const order = db.prepare('SELECT * FROM online_orders WHERE id = ?').get(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    db.prepare(`
      UPDATE online_orders SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, id);

    res.json({
      success: true,
      message: 'Order status updated',
      data: { id, status }
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
