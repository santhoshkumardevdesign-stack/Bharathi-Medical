import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bharathi-medicals-customer-secret-key-2024';

// Customer registration
router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, address } = req.body;

    // Validate required fields
    if (!name || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, phone, and password are required'
      });
    }

    // Validate phone number
    const phoneRegex = /^[+]?[\d\s-]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid phone number'
      });
    }

    // Check if customer already exists
    const existing = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
    if (existing) {
      // Check if they have a password (already registered)
      if (existing.password_hash) {
        return res.status(400).json({
          success: false,
          message: 'An account with this phone number already exists. Please login.'
        });
      }
      // Update existing customer with password
      const hashedPassword = await bcrypt.hash(password, 10);
      db.prepare(`
        UPDATE customers SET password_hash = ?, name = ?, email = ?, address = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(hashedPassword, name, email || '', address || '', existing.id);

      const token = jwt.sign({ customerId: existing.id, phone }, JWT_SECRET, { expiresIn: '30d' });

      return res.json({
        success: true,
        message: 'Account activated successfully',
        data: {
          token,
          customer: {
            id: existing.id,
            name,
            phone,
            email: email || '',
            address: address || '',
            loyalty_points: existing.loyalty_points
          }
        }
      });
    }

    // Create new customer
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = db.prepare(`
      INSERT INTO customers (name, phone, email, address, password_hash, customer_type, loyalty_points)
      VALUES (?, ?, ?, ?, ?, 'retail', 0)
    `).run(name, phone, email || '', address || '', hashedPassword);

    const token = jwt.sign({ customerId: result.lastInsertRowid, phone }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        customer: {
          id: result.lastInsertRowid,
          name,
          phone,
          email: email || '',
          address: address || '',
          loyalty_points: 0
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Customer login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone and password are required'
      });
    }

    const customer = db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this phone number'
      });
    }

    if (!customer.password_hash) {
      return res.status(401).json({
        success: false,
        message: 'Please register to create a password'
      });
    }

    const validPassword = await bcrypt.compare(password, customer.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    const token = jwt.sign({ customerId: customer.id, phone }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          loyalty_points: customer.loyalty_points
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get customer profile
router.get('/profile', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const customer = db.prepare(`
      SELECT id, name, phone, email, address, loyalty_points, total_purchases, created_at
      FROM customers WHERE id = ?
    `).get(decoded.customerId);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, data: customer });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// Update customer profile
router.put('/profile', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { name, email, address } = req.body;

    db.prepare(`
      UPDATE customers SET name = ?, email = ?, address = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name, email || '', address || '', decoded.customerId);

    const customer = db.prepare(`
      SELECT id, name, phone, email, address, loyalty_points, total_purchases
      FROM customers WHERE id = ?
    `).get(decoded.customerId);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: customer
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get customer order history
router.get('/orders', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get online orders
    const onlineOrders = db.prepare(`
      SELECT o.*, b.name as branch_name
      FROM online_orders o
      JOIN branches b ON o.branch_id = b.id
      WHERE o.customer_id = ?
      ORDER BY o.created_at DESC
    `).all(decoded.customerId);

    // Get in-store purchases
    const inStoreOrders = db.prepare(`
      SELECT s.*, b.name as branch_name, 'in_store' as order_type
      FROM sales s
      JOIN branches b ON s.branch_id = b.id
      WHERE s.customer_id = ?
      ORDER BY s.created_at DESC
      LIMIT 50
    `).all(decoded.customerId);

    const orders = onlineOrders.map(order => ({
      ...order,
      items: JSON.parse(order.items_json || '[]'),
      order_type: 'online'
    }));

    res.json({
      success: true,
      data: {
        online_orders: orders,
        in_store_orders: inStoreOrders
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add delivery address
router.post('/addresses', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { label, address, landmark, pincode, is_default } = req.body;

    if (!address) {
      return res.status(400).json({ success: false, message: 'Address is required' });
    }

    // Create addresses table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS customer_addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        label TEXT DEFAULT 'Home',
        address TEXT NOT NULL,
        landmark TEXT,
        pincode TEXT,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    // If setting as default, unset other defaults
    if (is_default) {
      db.prepare('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?').run(decoded.customerId);
    }

    const result = db.prepare(`
      INSERT INTO customer_addresses (customer_id, label, address, landmark, pincode, is_default)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(decoded.customerId, label || 'Home', address, landmark || '', pincode || '', is_default ? 1 : 0);

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: { id: result.lastInsertRowid }
    });
  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get customer addresses
router.get('/addresses', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Ensure table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS customer_addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        label TEXT DEFAULT 'Home',
        address TEXT NOT NULL,
        landmark TEXT,
        pincode TEXT,
        is_default INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);

    const addresses = db.prepare(`
      SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC
    `).all(decoded.customerId);

    res.json({ success: true, data: addresses });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
