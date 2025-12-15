import { getFirestore, firestoreHelpers } from './firebase.js';
import admin from 'firebase-admin';

let db;

// Initialize and get Firestore instance
export function initializeFirestoreDb() {
  db = getFirestore();
  console.log('Firestore database layer initialized!');
  return db;
}

// Collection names
const COLLECTIONS = {
  USERS: 'users',
  BRANCHES: 'branches',
  CATEGORIES: 'categories',
  PRODUCTS: 'products',
  STOCK: 'stock',
  CUSTOMERS: 'customers',
  CUSTOMER_ADDRESSES: 'customer_addresses',
  ONLINE_ORDERS: 'online_orders',
  PETS: 'pets',
  SUPPLIERS: 'suppliers',
  SALES: 'sales',
  SALE_ITEMS: 'sale_items',
  PURCHASE_ORDERS: 'purchase_orders',
  PO_ITEMS: 'po_items',
  STOCK_TRANSFERS: 'stock_transfers',
  TRANSFER_ITEMS: 'transfer_items',
  STOCK_ADJUSTMENTS: 'stock_adjustments',
  HELD_SALES: 'held_sales',
  PAYMENTS: 'payments',
  COUNTERS: '_counters'
};

// Helper to get next auto-increment ID
async function getNextId(collectionName) {
  const counterRef = db.collection(COLLECTIONS.COUNTERS).doc(collectionName);

  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let nextId = 1;

    if (counterDoc.exists) {
      nextId = counterDoc.data().count + 1;
    }

    transaction.set(counterRef, { count: nextId });
    return nextId;
  });
}

// Helper to convert Firestore doc to plain object
function docToObj(doc) {
  if (!doc.exists) return null;
  const data = doc.data();

  // Convert Firestore timestamps to ISO strings
  const converted = { id: parseInt(doc.id) || doc.id };
  for (const [key, value] of Object.entries(data)) {
    if (value && value.toDate) {
      converted[key] = value.toDate().toISOString();
    } else {
      converted[key] = value;
    }
  }
  return converted;
}

// Helper to convert query snapshot to array
function queryToArray(snapshot) {
  return snapshot.docs.map(doc => docToObj(doc));
}

// ==================== USERS ====================
export const usersDb = {
  async findByUsername(username) {
    const snapshot = await db.collection(COLLECTIONS.USERS)
      .where('username', '==', username)
      .limit(1)
      .get();
    return snapshot.empty ? null : docToObj(snapshot.docs[0]);
  },

  async findById(id) {
    const doc = await db.collection(COLLECTIONS.USERS).doc(String(id)).get();
    return docToObj(doc);
  },

  async findAll() {
    const snapshot = await db.collection(COLLECTIONS.USERS).get();
    return queryToArray(snapshot);
  },

  async create(userData) {
    const id = await getNextId(COLLECTIONS.USERS);
    const data = {
      ...userData,
      id,
      is_active: userData.is_active ?? 1,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.USERS).doc(String(id)).set(data);
    return { lastInsertRowid: id };
  },

  async update(id, userData) {
    await db.collection(COLLECTIONS.USERS).doc(String(id)).update({
      ...userData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { changes: 1 };
  }
};

// ==================== BRANCHES ====================
export const branchesDb = {
  async findById(id) {
    const doc = await db.collection(COLLECTIONS.BRANCHES).doc(String(id)).get();
    return docToObj(doc);
  },

  async findByCode(code) {
    const snapshot = await db.collection(COLLECTIONS.BRANCHES)
      .where('code', '==', code)
      .limit(1)
      .get();
    return snapshot.empty ? null : docToObj(snapshot.docs[0]);
  },

  async findAll() {
    const snapshot = await db.collection(COLLECTIONS.BRANCHES)
      .orderBy('name')
      .get();
    return queryToArray(snapshot);
  },

  async findActive() {
    const snapshot = await db.collection(COLLECTIONS.BRANCHES)
      .where('status', '==', 'active')
      .get();
    return queryToArray(snapshot);
  },

  async create(branchData) {
    const id = await getNextId(COLLECTIONS.BRANCHES);
    const data = {
      ...branchData,
      id,
      status: branchData.status || 'active',
      staff_count: branchData.staff_count || 0,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.BRANCHES).doc(String(id)).set(data);
    return { lastInsertRowid: id };
  },

  async update(id, branchData) {
    await db.collection(COLLECTIONS.BRANCHES).doc(String(id)).update({
      ...branchData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { changes: 1 };
  }
};

// ==================== CATEGORIES ====================
export const categoriesDb = {
  async findById(id) {
    const doc = await db.collection(COLLECTIONS.CATEGORIES).doc(String(id)).get();
    return docToObj(doc);
  },

  async findAll() {
    const snapshot = await db.collection(COLLECTIONS.CATEGORIES)
      .orderBy('name')
      .get();
    return queryToArray(snapshot);
  },

  async create(categoryData) {
    const id = await getNextId(COLLECTIONS.CATEGORIES);
    const data = {
      ...categoryData,
      id,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.CATEGORIES).doc(String(id)).set(data);
    return { lastInsertRowid: id };
  },

  async update(id, categoryData) {
    await db.collection(COLLECTIONS.CATEGORIES).doc(String(id)).update(categoryData);
    return { changes: 1 };
  }
};

// ==================== PRODUCTS ====================
export const productsDb = {
  async findById(id) {
    const doc = await db.collection(COLLECTIONS.PRODUCTS).doc(String(id)).get();
    return docToObj(doc);
  },

  async findBySku(sku) {
    const snapshot = await db.collection(COLLECTIONS.PRODUCTS)
      .where('sku', '==', sku)
      .limit(1)
      .get();
    return snapshot.empty ? null : docToObj(snapshot.docs[0]);
  },

  async findByBarcode(barcode) {
    const snapshot = await db.collection(COLLECTIONS.PRODUCTS)
      .where('barcode', '==', barcode)
      .limit(1)
      .get();
    return snapshot.empty ? null : docToObj(snapshot.docs[0]);
  },

  async findAll(options = {}) {
    let query = db.collection(COLLECTIONS.PRODUCTS);

    if (options.category_id) {
      query = query.where('category_id', '==', options.category_id);
    }
    if (options.is_active !== undefined) {
      query = query.where('is_active', '==', options.is_active);
    }

    const snapshot = await query.get();
    return queryToArray(snapshot);
  },

  async findActive() {
    const snapshot = await db.collection(COLLECTIONS.PRODUCTS)
      .where('is_active', '==', 1)
      .get();
    return queryToArray(snapshot);
  },

  async search(searchTerm) {
    // Firestore doesn't support full-text search natively
    // We'll do a simple prefix search on name
    const snapshot = await db.collection(COLLECTIONS.PRODUCTS)
      .where('is_active', '==', 1)
      .get();

    const results = queryToArray(snapshot).filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchTerm))
    );
    return results;
  },

  async create(productData) {
    const id = await getNextId(COLLECTIONS.PRODUCTS);
    const data = {
      ...productData,
      id,
      is_active: productData.is_active ?? 1,
      min_stock: productData.min_stock || 10,
      unit: productData.unit || 'piece',
      purchase_price: productData.purchase_price || 0,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.PRODUCTS).doc(String(id)).set(data);
    return { lastInsertRowid: id };
  },

  async update(id, productData) {
    await db.collection(COLLECTIONS.PRODUCTS).doc(String(id)).update({
      ...productData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { changes: 1 };
  },

  async getWithCategory(id) {
    const product = await this.findById(id);
    if (!product) return null;

    const category = await categoriesDb.findById(product.category_id);
    return { ...product, category_name: category?.name };
  },

  async getAllWithCategories() {
    const products = await this.findAll();
    const categories = await categoriesDb.findAll();
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]));

    return products.map(p => ({
      ...p,
      category_name: categoryMap[p.category_id]?.name
    }));
  }
};

// ==================== STOCK ====================
export const stockDb = {
  async findByProductAndBranch(productId, branchId, batchNumber = null) {
    let query = db.collection(COLLECTIONS.STOCK)
      .where('product_id', '==', productId)
      .where('branch_id', '==', branchId);

    if (batchNumber) {
      query = query.where('batch_number', '==', batchNumber);
    }

    const snapshot = await query.limit(1).get();
    return snapshot.empty ? null : docToObj(snapshot.docs[0]);
  },

  async findByBranch(branchId) {
    const snapshot = await db.collection(COLLECTIONS.STOCK)
      .where('branch_id', '==', branchId)
      .get();
    return queryToArray(snapshot);
  },

  async findByProduct(productId) {
    const snapshot = await db.collection(COLLECTIONS.STOCK)
      .where('product_id', '==', productId)
      .get();
    return queryToArray(snapshot);
  },

  async getStockWithDetails(branchId) {
    const stockItems = await this.findByBranch(branchId);
    const products = await productsDb.findAll();
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    return stockItems.map(s => ({
      ...s,
      product_name: productMap[s.product_id]?.name,
      sku: productMap[s.product_id]?.sku,
      selling_price: productMap[s.product_id]?.selling_price
    }));
  },

  async create(stockData) {
    const id = await getNextId(COLLECTIONS.STOCK);
    const data = {
      ...stockData,
      id,
      quantity: stockData.quantity || 0,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.STOCK).doc(String(id)).set(data);
    return { lastInsertRowid: id };
  },

  async updateQuantity(id, quantity) {
    await db.collection(COLLECTIONS.STOCK).doc(String(id)).update({
      quantity,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { changes: 1 };
  },

  async incrementQuantity(id, amount) {
    await db.collection(COLLECTIONS.STOCK).doc(String(id)).update({
      quantity: admin.firestore.FieldValue.increment(amount),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { changes: 1 };
  },

  async decrementQuantity(productId, branchId, amount) {
    const stock = await this.findByProductAndBranch(productId, branchId);
    if (stock) {
      await this.updateQuantity(stock.id, Math.max(0, stock.quantity - amount));
    }
    return { changes: stock ? 1 : 0 };
  },

  async getLowStock(branchId, threshold = 10) {
    const stockItems = await this.findByBranch(branchId);
    const products = await productsDb.findAll();
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    return stockItems
      .filter(s => s.quantity <= (productMap[s.product_id]?.min_stock || threshold))
      .map(s => ({
        ...s,
        product_name: productMap[s.product_id]?.name,
        min_stock: productMap[s.product_id]?.min_stock
      }));
  },

  async getExpiringStock(branchId, days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    const snapshot = await db.collection(COLLECTIONS.STOCK)
      .where('branch_id', '==', branchId)
      .where('expiry_date', '<=', cutoffDate.toISOString().split('T')[0])
      .get();

    return queryToArray(snapshot);
  }
};

// ==================== CUSTOMERS ====================
export const customersDb = {
  async findById(id) {
    const doc = await db.collection(COLLECTIONS.CUSTOMERS).doc(String(id)).get();
    return docToObj(doc);
  },

  async findByPhone(phone) {
    const snapshot = await db.collection(COLLECTIONS.CUSTOMERS)
      .where('phone', '==', phone)
      .limit(1)
      .get();
    return snapshot.empty ? null : docToObj(snapshot.docs[0]);
  },

  async findAll() {
    const snapshot = await db.collection(COLLECTIONS.CUSTOMERS)
      .orderBy('name')
      .get();
    return queryToArray(snapshot);
  },

  async search(searchTerm) {
    const snapshot = await db.collection(COLLECTIONS.CUSTOMERS).get();
    const results = queryToArray(snapshot).filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
    );
    return results;
  },

  async create(customerData) {
    const id = await getNextId(COLLECTIONS.CUSTOMERS);
    const data = {
      ...customerData,
      id,
      customer_type: customerData.customer_type || 'retail',
      loyalty_points: customerData.loyalty_points || 0,
      total_purchases: customerData.total_purchases || 0,
      is_active: customerData.is_active ?? 1,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.CUSTOMERS).doc(String(id)).set(data);
    return { lastInsertRowid: id };
  },

  async update(id, customerData) {
    await db.collection(COLLECTIONS.CUSTOMERS).doc(String(id)).update({
      ...customerData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { changes: 1 };
  },

  async updateLoyaltyPoints(id, points) {
    await db.collection(COLLECTIONS.CUSTOMERS).doc(String(id)).update({
      loyalty_points: admin.firestore.FieldValue.increment(points),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { changes: 1 };
  },

  async updateTotalPurchases(id, amount) {
    await db.collection(COLLECTIONS.CUSTOMERS).doc(String(id)).update({
      total_purchases: admin.firestore.FieldValue.increment(amount),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { changes: 1 };
  }
};

// ==================== CUSTOMER ADDRESSES ====================
export const customerAddressesDb = {
  async findByCustomer(customerId) {
    const snapshot = await db.collection(COLLECTIONS.CUSTOMER_ADDRESSES)
      .where('customer_id', '==', customerId)
      .orderBy('is_default', 'desc')
      .get();
    return queryToArray(snapshot);
  },

  async create(addressData) {
    const id = await getNextId(COLLECTIONS.CUSTOMER_ADDRESSES);
    const data = {
      ...addressData,
      id,
      is_default: addressData.is_default || 0,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.CUSTOMER_ADDRESSES).doc(String(id)).set(data);
    return { lastInsertRowid: id };
  },

  async setDefault(customerId, addressId) {
    // Unset all defaults for customer
    const addresses = await this.findByCustomer(customerId);
    const batch = db.batch();

    for (const addr of addresses) {
      const ref = db.collection(COLLECTIONS.CUSTOMER_ADDRESSES).doc(String(addr.id));
      batch.update(ref, { is_default: addr.id === addressId ? 1 : 0 });
    }

    await batch.commit();
    return { changes: 1 };
  }
};

// ==================== SALES ====================
export const salesDb = {
  async findById(id) {
    const doc = await db.collection(COLLECTIONS.SALES).doc(String(id)).get();
    return docToObj(doc);
  },

  async findByInvoice(invoiceNumber) {
    const snapshot = await db.collection(COLLECTIONS.SALES)
      .where('invoice_number', '==', invoiceNumber)
      .limit(1)
      .get();
    return snapshot.empty ? null : docToObj(snapshot.docs[0]);
  },

  async findByBranch(branchId, options = {}) {
    let query = db.collection(COLLECTIONS.SALES)
      .where('branch_id', '==', branchId);

    if (options.startDate) {
      query = query.where('created_at', '>=', new Date(options.startDate));
    }
    if (options.endDate) {
      query = query.where('created_at', '<=', new Date(options.endDate));
    }

    query = query.orderBy('created_at', 'desc');

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return queryToArray(snapshot);
  },

  async findByCustomer(customerId) {
    const snapshot = await db.collection(COLLECTIONS.SALES)
      .where('customer_id', '==', customerId)
      .orderBy('created_at', 'desc')
      .get();
    return queryToArray(snapshot);
  },

  async create(saleData) {
    const id = await getNextId(COLLECTIONS.SALES);
    const data = {
      ...saleData,
      id,
      discount: saleData.discount || 0,
      discount_type: saleData.discount_type || 'amount',
      payment_method: saleData.payment_method || 'cash',
      payment_status: saleData.payment_status || 'paid',
      status: saleData.status || 'completed',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.SALES).doc(String(id)).set(data);
    return { lastInsertRowid: id };
  },

  async update(id, saleData) {
    await db.collection(COLLECTIONS.SALES).doc(String(id)).update({
      ...saleData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { changes: 1 };
  },

  async getNextInvoiceNumber(branchId) {
    const snapshot = await db.collection(COLLECTIONS.SALES)
      .where('branch_id', '==', branchId)
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    let nextNum = 1;
    if (!snapshot.empty) {
      const lastInvoice = snapshot.docs[0].data().invoice_number;
      const numPart = parseInt(lastInvoice.split('-').pop()) || 0;
      nextNum = numPart + 1;
    }

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    return `INV-${branchId}-${dateStr}-${String(nextNum).padStart(4, '0')}`;
  },

  async getDailySummary(branchId, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const sales = await this.findByBranch(branchId, {
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString()
    });

    return {
      total_sales: sales.reduce((sum, s) => sum + s.grand_total, 0),
      transaction_count: sales.length,
      cash_sales: sales.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.grand_total, 0),
      upi_sales: sales.filter(s => s.payment_method === 'upi').reduce((sum, s) => sum + s.grand_total, 0),
      card_sales: sales.filter(s => s.payment_method === 'card').reduce((sum, s) => sum + s.grand_total, 0)
    };
  }
};

// ==================== SALE ITEMS ====================
export const saleItemsDb = {
  async findBySale(saleId) {
    const snapshot = await db.collection(COLLECTIONS.SALE_ITEMS)
      .where('sale_id', '==', saleId)
      .get();
    return queryToArray(snapshot);
  },

  async create(itemData) {
    const id = await getNextId(COLLECTIONS.SALE_ITEMS);
    const data = {
      ...itemData,
      id,
      discount: itemData.discount || 0,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.SALE_ITEMS).doc(String(id)).set(data);
    return { lastInsertRowid: id };
  },

  async createMany(items) {
    const batch = db.batch();
    const ids = [];

    for (const item of items) {
      const id = await getNextId(COLLECTIONS.SALE_ITEMS);
      ids.push(id);
      const ref = db.collection(COLLECTIONS.SALE_ITEMS).doc(String(id));
      batch.set(ref, {
        ...item,
        id,
        discount: item.discount || 0,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    await batch.commit();
    return ids;
  }
};

// ==================== ONLINE ORDERS ====================
export const onlineOrdersDb = {
  async findById(id) {
    const doc = await db.collection(COLLECTIONS.ONLINE_ORDERS).doc(String(id)).get();
    return docToObj(doc);
  },

  async findByOrderNumber(orderNumber) {
    const snapshot = await db.collection(COLLECTIONS.ONLINE_ORDERS)
      .where('order_number', '==', orderNumber)
      .limit(1)
      .get();
    return snapshot.empty ? null : docToObj(snapshot.docs[0]);
  },

  async findByBranch(branchId, options = {}) {
    let query = db.collection(COLLECTIONS.ONLINE_ORDERS)
      .where('branch_id', '==', branchId);

    if (options.status) {
      query = query.where('status', '==', options.status);
    }

    query = query.orderBy('created_at', 'desc');

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    return queryToArray(snapshot);
  },

  async findByCustomer(customerId) {
    const snapshot = await db.collection(COLLECTIONS.ONLINE_ORDERS)
      .where('customer_id', '==', customerId)
      .orderBy('created_at', 'desc')
      .get();
    return queryToArray(snapshot);
  },

  async findPending() {
    const snapshot = await db.collection(COLLECTIONS.ONLINE_ORDERS)
      .where('status', 'in', ['pending', 'confirmed', 'processing'])
      .orderBy('created_at', 'asc')
      .get();
    return queryToArray(snapshot);
  },

  async create(orderData) {
    const id = await getNextId(COLLECTIONS.ONLINE_ORDERS);
    const data = {
      ...orderData,
      id,
      delivery_type: orderData.delivery_type || 'pickup',
      payment_method: orderData.payment_method || 'cash',
      payment_status: orderData.payment_status || 'pending',
      status: orderData.status || 'pending',
      delivery_charge: orderData.delivery_charge || 0,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.ONLINE_ORDERS).doc(String(id)).set(data);
    return { lastInsertRowid: id };
  },

  async update(id, orderData) {
    await db.collection(COLLECTIONS.ONLINE_ORDERS).doc(String(id)).update({
      ...orderData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { changes: 1 };
  },

  async updateStatus(id, status) {
    return this.update(id, { status });
  },

  async getNextOrderNumber(branchId) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    const snapshot = await db.collection(COLLECTIONS.ONLINE_ORDERS)
      .where('branch_id', '==', branchId)
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    let nextNum = 1;
    if (!snapshot.empty) {
      const lastOrder = snapshot.docs[0].data().order_number;
      const numPart = parseInt(lastOrder.split('-').pop()) || 0;
      nextNum = numPart + 1;
    }

    return `ORD-${branchId}-${dateStr}-${String(nextNum).padStart(4, '0')}`;
  }
};

// ==================== SUPPLIERS ====================
export const suppliersDb = {
  async findById(id) {
    const doc = await db.collection(COLLECTIONS.SUPPLIERS).doc(String(id)).get();
    return docToObj(doc);
  },

  async findAll() {
    const snapshot = await db.collection(COLLECTIONS.SUPPLIERS)
      .orderBy('name')
      .get();
    return queryToArray(snapshot);
  },

  async findActive() {
    const snapshot = await db.collection(COLLECTIONS.SUPPLIERS)
      .where('is_active', '==', 1)
      .get();
    return queryToArray(snapshot);
  },

  async create(supplierData) {
    const id = await getNextId(COLLECTIONS.SUPPLIERS);
    const data = {
      ...supplierData,
      id,
      payment_terms: supplierData.payment_terms || 'Net 30',
      credit_limit: supplierData.credit_limit || 0,
      outstanding_amount: supplierData.outstanding_amount || 0,
      is_active: supplierData.is_active ?? 1,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.SUPPLIERS).doc(String(id)).set(data);
    return { lastInsertRowid: id };
  },

  async update(id, supplierData) {
    await db.collection(COLLECTIONS.SUPPLIERS).doc(String(id)).update({
      ...supplierData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { changes: 1 };
  }
};

// ==================== HELD SALES ====================
export const heldSalesDb = {
  async findById(id) {
    const doc = await db.collection(COLLECTIONS.HELD_SALES).doc(String(id)).get();
    return docToObj(doc);
  },

  async findByBranch(branchId) {
    const snapshot = await db.collection(COLLECTIONS.HELD_SALES)
      .where('branch_id', '==', branchId)
      .orderBy('created_at', 'desc')
      .get();
    return queryToArray(snapshot);
  },

  async create(heldSaleData) {
    const id = await getNextId(COLLECTIONS.HELD_SALES);
    const data = {
      ...heldSaleData,
      id,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.HELD_SALES).doc(String(id)).set(data);
    return { lastInsertRowid: id };
  },

  async delete(id) {
    await db.collection(COLLECTIONS.HELD_SALES).doc(String(id)).delete();
    return { changes: 1 };
  }
};

// ==================== PAYMENTS ====================
export const paymentsDb = {
  async findById(id) {
    const doc = await db.collection(COLLECTIONS.PAYMENTS).doc(String(id)).get();
    return docToObj(doc);
  },

  async findByRazorpayOrderId(razorpayOrderId) {
    const snapshot = await db.collection(COLLECTIONS.PAYMENTS)
      .where('razorpay_order_id', '==', razorpayOrderId)
      .limit(1)
      .get();
    return snapshot.empty ? null : docToObj(snapshot.docs[0]);
  },

  async create(paymentData) {
    const id = await getNextId(COLLECTIONS.PAYMENTS);
    const data = {
      ...paymentData,
      id,
      currency: paymentData.currency || 'INR',
      status: paymentData.status || 'created',
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.PAYMENTS).doc(String(id)).set(data);
    return { lastInsertRowid: id };
  },

  async update(id, paymentData) {
    await db.collection(COLLECTIONS.PAYMENTS).doc(String(id)).update(paymentData);
    return { changes: 1 };
  }
};

// ==================== PURCHASE ORDERS ====================
export const purchaseOrdersDb = {
  async findById(id) {
    const doc = await db.collection(COLLECTIONS.PURCHASE_ORDERS).doc(String(id)).get();
    return docToObj(doc);
  },

  async findByPONumber(poNumber) {
    const snapshot = await db.collection(COLLECTIONS.PURCHASE_ORDERS)
      .where('po_number', '==', poNumber)
      .limit(1)
      .get();
    return snapshot.empty ? null : docToObj(snapshot.docs[0]);
  },

  async findByBranch(branchId) {
    const snapshot = await db.collection(COLLECTIONS.PURCHASE_ORDERS)
      .where('branch_id', '==', branchId)
      .orderBy('created_at', 'desc')
      .get();
    return queryToArray(snapshot);
  },

  async create(poData) {
    const id = await getNextId(COLLECTIONS.PURCHASE_ORDERS);
    const data = {
      ...poData,
      id,
      gst_amount: poData.gst_amount || 0,
      status: poData.status || 'pending',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection(COLLECTIONS.PURCHASE_ORDERS).doc(String(id)).set(data);
    return { lastInsertRowid: id };
  },

  async update(id, poData) {
    await db.collection(COLLECTIONS.PURCHASE_ORDERS).doc(String(id)).update({
      ...poData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    return { changes: 1 };
  }
};

// Export all database modules
export default {
  initializeFirestoreDb,
  users: usersDb,
  branches: branchesDb,
  categories: categoriesDb,
  products: productsDb,
  stock: stockDb,
  customers: customersDb,
  customerAddresses: customerAddressesDb,
  sales: salesDb,
  saleItems: saleItemsDb,
  onlineOrders: onlineOrdersDb,
  suppliers: suppliersDb,
  heldSales: heldSalesDb,
  payments: paymentsDb,
  purchaseOrders: purchaseOrdersDb,
  COLLECTIONS
};
