import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../petcare.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
export function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'cashier' CHECK(role IN ('admin', 'manager', 'cashier')),
      branch_id INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id)
    )
  `);

  // Branches table
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      manager_name TEXT NOT NULL,
      manager_phone TEXT NOT NULL,
      opening_hours TEXT NOT NULL,
      staff_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'maintenance')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Product categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gst_rate REAL NOT NULL,
      icon TEXT,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category_id INTEGER NOT NULL,
      mrp REAL NOT NULL,
      selling_price REAL NOT NULL,
      purchase_price REAL DEFAULT 0,
      gst_rate REAL NOT NULL,
      min_stock INTEGER DEFAULT 10,
      unit TEXT DEFAULT 'piece',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // Stock table (product stock per branch with batch tracking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      branch_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 0,
      batch_number TEXT,
      expiry_date DATE,
      manufacturing_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      UNIQUE(product_id, branch_id, batch_number)
    )
  `);

  // Customers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      email TEXT,
      address TEXT,
      password_hash TEXT,
      customer_type TEXT DEFAULT 'retail' CHECK(customer_type IN ('retail', 'wholesale')),
      gst_number TEXT,
      loyalty_points INTEGER DEFAULT 0,
      total_purchases REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Customer addresses table
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

  // Online orders table
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
      delivery_address_id INTEGER,
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

  // Pets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      species TEXT NOT NULL,
      breed TEXT,
      age_years INTEGER,
      age_months INTEGER,
      gender TEXT CHECK(gender IN ('male', 'female', 'unknown')),
      weight REAL,
      color TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  // Suppliers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gst_number TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      contact_person TEXT,
      payment_terms TEXT DEFAULT 'Net 30',
      credit_limit REAL DEFAULT 0,
      outstanding_amount REAL DEFAULT 0,
      products_supplied TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sales table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      branch_id INTEGER NOT NULL,
      customer_id INTEGER,
      user_id INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      gst_amount REAL NOT NULL,
      discount REAL DEFAULT 0,
      discount_type TEXT DEFAULT 'amount' CHECK(discount_type IN ('amount', 'percentage')),
      grand_total REAL NOT NULL,
      payment_method TEXT DEFAULT 'cash' CHECK(payment_method IN ('cash', 'upi', 'card', 'credit')),
      payment_status TEXT DEFAULT 'paid' CHECK(payment_status IN ('paid', 'pending', 'partial')),
      notes TEXT,
      status TEXT DEFAULT 'completed' CHECK(status IN ('completed', 'hold', 'cancelled', 'returned')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Sale items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      gst_rate REAL NOT NULL,
      gst_amount REAL NOT NULL,
      discount REAL DEFAULT 0,
      subtotal REAL NOT NULL,
      batch_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Purchase orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT UNIQUE NOT NULL,
      supplier_id INTEGER NOT NULL,
      branch_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      gst_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'in_transit', 'delivered', 'cancelled')),
      order_date DATE NOT NULL,
      expected_delivery DATE,
      received_date DATE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Purchase order items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS po_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      received_quantity INTEGER DEFAULT 0,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      batch_number TEXT,
      expiry_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Stock transfers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_number TEXT UNIQUE NOT NULL,
      from_branch_id INTEGER NOT NULL,
      to_branch_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'in_transit', 'completed', 'cancelled')),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (from_branch_id) REFERENCES branches(id),
      FOREIGN KEY (to_branch_id) REFERENCES branches(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Transfer items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transfer_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      batch_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Stock adjustments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      branch_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('add', 'remove', 'damage', 'expired', 'correction')),
      quantity INTEGER NOT NULL,
      reason TEXT,
      batch_number TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Held sales table (for hold/resume functionality)
  db.exec(`
    CREATE TABLE IF NOT EXISTS held_sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      branch_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      customer_id INTEGER,
      cart_data TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (branch_id) REFERENCES branches(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  // Payments table (for Razorpay integration)
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      customer_id INTEGER,
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'INR',
      status TEXT DEFAULT 'created' CHECK(status IN ('created', 'paid', 'failed', 'captured', 'refunded', 'refund_initiated')),
      refund_id TEXT,
      paid_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    )
  `);

  // Add payment_id to online_orders if not exists
  try {
    db.exec(`ALTER TABLE online_orders ADD COLUMN payment_id TEXT`);
  } catch (e) {
    // Column already exists
  }

  // Add password_hash to customers table if not exists (migration for existing DBs)
  try {
    db.exec(`ALTER TABLE customers ADD COLUMN password_hash TEXT`);
  } catch (e) {
    // Column already exists
  }

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_stock_product_branch ON stock(product_id, branch_id);
    CREATE INDEX IF NOT EXISTS idx_sales_branch_date ON sales(branch_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    CREATE INDEX IF NOT EXISTS idx_stock_expiry ON stock(expiry_date);
  `);

  console.log('Database initialized successfully!');
}

export default db;
