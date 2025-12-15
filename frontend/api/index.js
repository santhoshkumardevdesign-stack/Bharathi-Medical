// Unified API Handler for Vercel Serverless
// Handles all API routes in a single function to stay within the 12 function limit

import admin from 'firebase-admin';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ==================== FIREBASE INITIALIZATION ====================
let db = null;

function getDb() {
  if (!db) {
    if (admin.apps.length === 0) {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKeyRaw) {
        throw new Error(`Missing Firebase config: projectId=${!!projectId}, clientEmail=${!!clientEmail}, privateKey=${!!privateKeyRaw}`);
      }

      // Handle private key - may be JSON encoded, base64 only, or full PEM
      let privateKey = privateKeyRaw;
      if (privateKeyRaw.startsWith('"')) {
        privateKey = JSON.parse(privateKeyRaw);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');

      // If key doesn't have PEM header, wrap it
      if (!privateKey.includes('-----BEGIN')) {
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----\n`;
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
    }
    db = admin.firestore();
  }
  return db;
}

// ==================== HELPERS ====================
const JWT_SECRET = process.env.JWT_SECRET || 'bharathi-medicals-jwt-secret-2024';
const COLLECTIONS = {
  USERS: 'users',
  BRANCHES: 'branches',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  STOCK: 'stock',
  CUSTOMERS: 'customers',
  SALES: 'sales',
  ONLINE_ORDERS: 'online_orders',
  SUPPLIERS: 'suppliers',
  COUNTERS: '_counters'
};

function docToObj(doc) {
  if (!doc.exists) return null;
  const data = doc.data();
  const converted = { id: parseInt(doc.id) || doc.id };
  for (const [key, value] of Object.entries(data)) {
    converted[key] = value?.toDate ? value.toDate().toISOString() : value;
  }
  return converted;
}

function queryToArray(snapshot) {
  return snapshot.docs.map(doc => docToObj(doc));
}

async function getNextId(collectionName) {
  const db = getDb();
  const counterRef = db.collection(COLLECTIONS.COUNTERS).doc(collectionName);
  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let nextId = counterDoc.exists ? counterDoc.data().count + 1 : 1;
    transaction.set(counterRef, { count: nextId });
    return nextId;
  });
}

async function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const db = getDb();
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(String(decoded.userId)).get();
    if (!userDoc.exists) return null;
    const user = docToObj(userDoc);
    return user.is_active === 1 ? user : null;
  } catch { return null; }
}

function verifyCustomerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch { return null; }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ==================== ROUTE HANDLERS ====================

// Health Check
async function handleHealth(req, res) {
  res.json({ status: 'ok', message: 'Bharathi Medicals API running!', timestamp: new Date().toISOString() });
}

// Debug endpoint to check config
async function handleDebug(req, res) {
  res.json({
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    privateKeyLength: process.env.FIREBASE_PRIVATE_KEY?.length || 0,
    privateKeyStart: process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50) || 'none'
  });
}

// Auth Login
async function handleAuthLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required' });

  const db = getDb();
  const snapshot = await db.collection(COLLECTIONS.USERS).where('username', '==', username).limit(1).get();

  let user = snapshot.empty ? null : docToObj(snapshot.docs[0]);
  if (!user || user.is_active !== 1) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user.id, role: user.role, branchId: user.branch_id }, JWT_SECRET, { expiresIn: '24h' });
  const { password_hash, ...userWithoutPassword } = user;

  res.json({ success: true, message: 'Login successful', data: { user: userWithoutPassword, token } });
}

// Auth Me
async function handleAuthMe(req, res) {
  const user = await verifyToken(req);
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });
  const { password_hash, ...userWithoutPassword } = user;
  res.json({ success: true, data: userWithoutPassword });
}

// Customer Register
async function handleCustomerRegister(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { name, phone, email, password, address } = req.body || {};
  if (!name || !phone || !password) return res.status(400).json({ success: false, message: 'Name, phone, and password required' });

  const db = getDb();
  const existingSnapshot = await db.collection(COLLECTIONS.CUSTOMERS).where('phone', '==', phone).limit(1).get();

  if (!existingSnapshot.empty) {
    const existing = docToObj(existingSnapshot.docs[0]);
    if (existing.password_hash) return res.status(400).json({ success: false, message: 'Account exists. Please login.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection(COLLECTIONS.CUSTOMERS).doc(String(existing.id)).update({
      password_hash: hashedPassword, name, email: email || '', address: address || '',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    const token = jwt.sign({ customerId: existing.id, phone }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ success: true, message: 'Account activated', data: { token, customer: { id: existing.id, name, phone, email: email || '', loyalty_points: existing.loyalty_points } } });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const id = await getNextId(COLLECTIONS.CUSTOMERS);
  await db.collection(COLLECTIONS.CUSTOMERS).doc(String(id)).set({
    id, name, phone, email: email || '', address: address || '', password_hash: hashedPassword,
    customer_type: 'retail', loyalty_points: 0, total_purchases: 0, is_active: 1,
    created_at: admin.firestore.FieldValue.serverTimestamp(), updated_at: admin.firestore.FieldValue.serverTimestamp()
  });

  const token = jwt.sign({ customerId: id, phone }, JWT_SECRET, { expiresIn: '30d' });
  res.status(201).json({ success: true, message: 'Registration successful', data: { token, customer: { id, name, phone, email: email || '', loyalty_points: 0 } } });
}

// Customer Login
async function handleCustomerLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method not allowed' });

  const { phone, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ success: false, message: 'Phone and password required' });

  const db = getDb();
  const snapshot = await db.collection(COLLECTIONS.CUSTOMERS).where('phone', '==', phone).limit(1).get();
  if (snapshot.empty) return res.status(401).json({ success: false, message: 'No account found' });

  const customer = docToObj(snapshot.docs[0]);
  if (!customer.password_hash) return res.status(401).json({ success: false, message: 'Please register first' });

  const validPassword = await bcrypt.compare(password, customer.password_hash);
  if (!validPassword) return res.status(401).json({ success: false, message: 'Invalid password' });

  const token = jwt.sign({ customerId: customer.id, phone }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ success: true, message: 'Login successful', data: { token, customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email, loyalty_points: customer.loyalty_points } } });
}

// Customer Profile
async function handleCustomerProfile(req, res) {
  const decoded = verifyCustomerToken(req);
  if (!decoded) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const db = getDb();
  if (req.method === 'GET') {
    const doc = await db.collection(COLLECTIONS.CUSTOMERS).doc(String(decoded.customerId)).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: 'Customer not found' });
    const { password_hash, ...customerData } = docToObj(doc);
    res.json({ success: true, data: customerData });
  } else if (req.method === 'PUT') {
    const { name, email, address } = req.body || {};
    await db.collection(COLLECTIONS.CUSTOMERS).doc(String(decoded.customerId)).update({
      name, email: email || '', address: address || '', updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    res.json({ success: true, message: 'Profile updated' });
  }
}

// Products
async function handleProducts(req, res) {
  const user = await verifyToken(req);
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const db = getDb();
  const { category, search, branch_id } = req.query || {};

  const productsSnapshot = await db.collection(COLLECTIONS.PRODUCTS).where('is_active', '==', 1).get();
  let products = queryToArray(productsSnapshot);

  if (category) products = products.filter(p => p.category_id == category);
  if (search) {
    const s = search.toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
  }

  const categoriesSnapshot = await db.collection(COLLECTIONS.CATEGORIES).get();
  const categoryMap = Object.fromEntries(queryToArray(categoriesSnapshot).map(c => [c.id, c]));
  products = products.map(p => ({ ...p, category_name: categoryMap[p.category_id]?.name }));

  if (branch_id) {
    const stockSnapshot = await db.collection(COLLECTIONS.STOCK).where('branch_id', '==', parseInt(branch_id)).get();
    const stockMap = {};
    queryToArray(stockSnapshot).forEach(s => { stockMap[s.product_id] = (stockMap[s.product_id] || 0) + s.quantity; });
    products = products.map(p => ({ ...p, stock: stockMap[p.id] || 0 }));
  }

  res.json({ success: true, data: products, count: products.length });
}

// Categories
async function handleCategories(req, res) {
  const user = await verifyToken(req);
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const db = getDb();
  const categoriesSnapshot = await db.collection(COLLECTIONS.CATEGORIES).get();
  res.json({ success: true, data: queryToArray(categoriesSnapshot) });
}

// Branches
async function handleBranches(req, res) {
  const user = await verifyToken(req);
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const db = getDb();
  const branchesSnapshot = await db.collection(COLLECTIONS.BRANCHES).get();
  res.json({ success: true, data: queryToArray(branchesSnapshot) });
}

// Stock
async function handleStock(req, res) {
  const user = await verifyToken(req);
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const db = getDb();
  const branchId = parseInt(req.query?.branch_id) || user.branch_id;

  const stockSnapshot = await db.collection(COLLECTIONS.STOCK).where('branch_id', '==', branchId).get();
  const stockItems = queryToArray(stockSnapshot);

  const productsSnapshot = await db.collection(COLLECTIONS.PRODUCTS).get();
  const productMap = Object.fromEntries(queryToArray(productsSnapshot).map(p => [p.id, p]));

  const stockWithDetails = stockItems.map(s => ({
    ...s, product_name: productMap[s.product_id]?.name, sku: productMap[s.product_id]?.sku,
    selling_price: productMap[s.product_id]?.selling_price, min_stock: productMap[s.product_id]?.min_stock
  }));

  res.json({ success: true, data: stockWithDetails });
}

// Dashboard
async function handleDashboard(req, res) {
  const user = await verifyToken(req);
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const db = getDb();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const productsSnapshot = await db.collection(COLLECTIONS.PRODUCTS).where('is_active', '==', 1).get();
  const customersSnapshot = await db.collection(COLLECTIONS.CUSTOMERS).get();
  const salesSnapshot = await db.collection(COLLECTIONS.SALES).get();

  const allSales = queryToArray(salesSnapshot);
  const todaySales = allSales.filter(s => new Date(s.created_at) >= today);

  res.json({
    success: true,
    data: {
      today_sales: todaySales.reduce((sum, s) => sum + (s.grand_total || 0), 0),
      today_transactions: todaySales.length,
      total_products: productsSnapshot.size,
      total_customers: customersSnapshot.size
    }
  });
}

// Sales
async function handleSales(req, res) {
  const user = await verifyToken(req);
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const db = getDb();

  if (req.method === 'GET') {
    const branchId = parseInt(req.query?.branch_id) || user.branch_id;
    let salesSnapshot;
    if (branchId) {
      salesSnapshot = await db.collection(COLLECTIONS.SALES).where('branch_id', '==', branchId).orderBy('created_at', 'desc').limit(50).get();
    } else {
      salesSnapshot = await db.collection(COLLECTIONS.SALES).orderBy('created_at', 'desc').limit(50).get();
    }
    res.json({ success: true, data: queryToArray(salesSnapshot) });
  } else if (req.method === 'POST') {
    const { items, customer_id, discount, payment_method, branch_id } = req.body || {};
    if (!items?.length) return res.status(400).json({ success: false, message: 'Items required' });

    const branchId = parseInt(branch_id) || user.branch_id;
    let subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    const discountAmount = discount || 0;
    const grandTotal = subtotal - discountAmount;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const salesCount = await db.collection(COLLECTIONS.SALES).where('branch_id', '==', branchId).get();
    const invoiceNumber = `INV-${branchId}-${dateStr}-${String(salesCount.size + 1).padStart(4, '0')}`;

    const saleId = await getNextId(COLLECTIONS.SALES);
    await db.collection(COLLECTIONS.SALES).doc(String(saleId)).set({
      id: saleId, invoice_number: invoiceNumber, branch_id: branchId, user_id: user.id,
      customer_id: customer_id || null, subtotal, discount: discountAmount, grand_total: grandTotal,
      payment_method: payment_method || 'cash', payment_status: 'paid', status: 'completed',
      items_json: JSON.stringify(items),
      created_at: admin.firestore.FieldValue.serverTimestamp(), updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Update stock
    for (const item of items) {
      const stockSnapshot = await db.collection(COLLECTIONS.STOCK)
        .where('product_id', '==', item.product_id).where('branch_id', '==', branchId).limit(1).get();
      if (!stockSnapshot.empty) {
        const stockDoc = stockSnapshot.docs[0];
        const currentStock = stockDoc.data().quantity || 0;
        await stockDoc.ref.update({ quantity: Math.max(0, currentStock - item.quantity), updated_at: admin.firestore.FieldValue.serverTimestamp() });
      }
    }

    res.status(201).json({ success: true, message: 'Sale completed', data: { id: saleId, invoice_number: invoiceNumber, grand_total: grandTotal } });
  }
}

// Customers
async function handleCustomers(req, res) {
  const user = await verifyToken(req);
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const db = getDb();
  const customersSnapshot = await db.collection(COLLECTIONS.CUSTOMERS).get();
  const customers = queryToArray(customersSnapshot).map(c => { const { password_hash, ...rest } = c; return rest; });
  res.json({ success: true, data: customers });
}

// Suppliers
async function handleSuppliers(req, res) {
  const user = await verifyToken(req);
  if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

  const db = getDb();
  const suppliersSnapshot = await db.collection(COLLECTIONS.SUPPLIERS).get();
  res.json({ success: true, data: queryToArray(suppliersSnapshot) });
}

// Online Orders
async function handleOnlineOrders(req, res) {
  if (req.method === 'GET') {
    const user = await verifyToken(req);
    if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const db = getDb();
    const ordersSnapshot = await db.collection(COLLECTIONS.ONLINE_ORDERS).orderBy('created_at', 'desc').get();
    res.json({ success: true, data: queryToArray(ordersSnapshot) });
  } else if (req.method === 'POST') {
    const decoded = verifyCustomerToken(req);
    if (!decoded) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const db = getDb();
    const { items, branch_id, delivery_type, delivery_address, notes, payment_method } = req.body || {};
    if (!items?.length) return res.status(400).json({ success: false, message: 'Items required' });

    const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
    const deliveryCharge = delivery_type === 'delivery' ? 50 : 0;
    const grandTotal = subtotal + deliveryCharge;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const ordersCount = await db.collection(COLLECTIONS.ONLINE_ORDERS).get();
    const orderNumber = `ORD-${branch_id || 1}-${dateStr}-${String(ordersCount.size + 1).padStart(4, '0')}`;

    const orderId = await getNextId(COLLECTIONS.ONLINE_ORDERS);
    await db.collection(COLLECTIONS.ONLINE_ORDERS).doc(String(orderId)).set({
      id: orderId, order_number: orderNumber, customer_id: decoded.customerId, branch_id: parseInt(branch_id) || 1,
      items_json: JSON.stringify(items), subtotal, delivery_charge: deliveryCharge, grand_total: grandTotal,
      delivery_type: delivery_type || 'pickup', delivery_address: delivery_address || '',
      payment_method: payment_method || 'cash', payment_status: 'pending', status: 'pending', notes: notes || '',
      created_at: admin.firestore.FieldValue.serverTimestamp(), updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ success: true, message: 'Order placed', data: { id: orderId, order_number: orderNumber, grand_total: grandTotal } });
  }
}

// ==================== MAIN HANDLER ====================
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Extract path from URL - remove /api prefix and query string
    const urlPath = req.url?.split('?')[0] || '/';
    const path = urlPath.replace(/^\/api/, '') || '/';

    // Route matching
    if (path === '/health' || path === '/') return handleHealth(req, res);
    if (path === '/debug') return handleDebug(req, res);
    if (path === '/auth/login') return handleAuthLogin(req, res);
    if (path === '/auth/me') return handleAuthMe(req, res);
    if (path === '/customer/register') return handleCustomerRegister(req, res);
    if (path === '/customer/login') return handleCustomerLogin(req, res);
    if (path === '/customer/profile') return handleCustomerProfile(req, res);
    if (path === '/products') return handleProducts(req, res);
    if (path === '/products/categories') return handleCategories(req, res);
    if (path === '/branches') return handleBranches(req, res);
    if (path === '/stock') return handleStock(req, res);
    if (path === '/dashboard') return handleDashboard(req, res);
    if (path === '/sales') return handleSales(req, res);
    if (path === '/customers') return handleCustomers(req, res);
    if (path === '/suppliers') return handleSuppliers(req, res);
    if (path === '/online/orders') return handleOnlineOrders(req, res);

    res.status(404).json({ success: false, message: 'Route not found', path });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
}
