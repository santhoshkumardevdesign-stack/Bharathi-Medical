// Firestore Seed Script for Bharathi Medicals Vet & Pet Shop
// Run with: node src/scripts/seedFirestore.js

import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase
function initFirebase() {
  const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');

  if (existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase initialized with service account file');
  } else if (process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log('Firebase initialized with environment variables');
  } else {
    console.error('No Firebase credentials found!');
    console.log('Please either:');
    console.log('1. Place firebase-service-account.json in backend/ folder');
    console.log('2. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env');
    process.exit(1);
  }

  return admin.firestore();
}

async function seedDatabase() {
  console.log('Starting Firestore seed...');
  const db = initFirebase();

  try {
    // Initialize counters collection
    const countersRef = db.collection('_counters');

    // Seed Categories
    console.log('Seeding categories...');
    const categories = [
      { id: 1, name: 'Dog Food', gst_rate: 5, icon: '🐕', color: '#8B4513' },
      { id: 2, name: 'Cat Food', gst_rate: 5, icon: '🐱', color: '#FF6B35' },
      { id: 3, name: 'Pet Medicines', gst_rate: 12, icon: '💊', color: '#EF4444' },
      { id: 4, name: 'Pet Accessories', gst_rate: 18, icon: '🎀', color: '#8B5CF6' },
      { id: 5, name: 'Grooming Products', gst_rate: 18, icon: '✨', color: '#EC4899' },
      { id: 6, name: 'Aquarium & Fish', gst_rate: 5, icon: '🐟', color: '#3B82F6' },
      { id: 7, name: 'Bird Supplies', gst_rate: 5, icon: '🐦', color: '#10B981' },
      { id: 8, name: 'Small Pets', gst_rate: 5, icon: '🐹', color: '#F59E0B' }
    ];

    for (const category of categories) {
      await db.collection('categories').doc(String(category.id)).set({
        ...category,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    await countersRef.doc('categories').set({ count: categories.length });
    console.log(`Seeded ${categories.length} categories`);

    // Seed Branches
    console.log('Seeding branches...');
    const branches = [
      {
        id: 1,
        name: 'Vaniyambadi Main',
        code: 'VNB-001',
        address: '45, Main Road, Vaniyambadi, Tamil Nadu 635751',
        phone: '04174-252525',
        email: 'vaniyambadi@bharathimedicals.in',
        manager_name: 'Rajesh Kumar',
        manager_phone: '9876543210',
        opening_hours: '8:00 AM - 9:00 PM',
        staff_count: 5,
        status: 'active'
      },
      {
        id: 2,
        name: 'Alangayam Branch',
        code: 'ALN-001',
        address: '12, Market Street, Alangayam, Tamil Nadu 635701',
        phone: '04174-262626',
        email: 'alangayam@bharathimedicals.in',
        manager_name: 'Suresh M',
        manager_phone: '9876543211',
        opening_hours: '8:30 AM - 8:30 PM',
        staff_count: 3,
        status: 'active'
      }
    ];

    for (const branch of branches) {
      await db.collection('branches').doc(String(branch.id)).set({
        ...branch,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    await countersRef.doc('branches').set({ count: branches.length });
    console.log(`Seeded ${branches.length} branches`);

    // Seed Admin User
    console.log('Seeding admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = {
      id: 1,
      username: 'admin',
      email: 'admin@bharathimedicals.in',
      password_hash: hashedPassword,
      full_name: 'Administrator',
      role: 'admin',
      branch_id: 1,
      is_active: 1
    };

    await db.collection('users').doc('1').set({
      ...adminUser,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Add a cashier user
    const cashierPassword = await bcrypt.hash('cashier123', 10);
    const cashierUser = {
      id: 2,
      username: 'cashier',
      email: 'cashier@bharathimedicals.in',
      password_hash: cashierPassword,
      full_name: 'Shop Cashier',
      role: 'cashier',
      branch_id: 1,
      is_active: 1
    };

    await db.collection('users').doc('2').set({
      ...cashierUser,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    await countersRef.doc('users').set({ count: 2 });
    console.log('Seeded 2 users (admin & cashier)');

    // Seed Sample Products
    console.log('Seeding products...');
    const products = [
      // Dog Food
      { id: 1, sku: 'DF001', barcode: '8901234567001', name: 'Royal Canin Adult Dog Food 3kg', category_id: 1, mrp: 2500, selling_price: 2350, purchase_price: 1800, gst_rate: 5, min_stock: 10, unit: 'pack' },
      { id: 2, sku: 'DF002', barcode: '8901234567002', name: 'Pedigree Adult Chicken & Vegetables 10kg', category_id: 1, mrp: 2200, selling_price: 2000, purchase_price: 1500, gst_rate: 5, min_stock: 10, unit: 'pack' },
      { id: 3, sku: 'DF003', barcode: '8901234567003', name: 'Drools Premium Adult Dog Food 4kg', category_id: 1, mrp: 1200, selling_price: 1100, purchase_price: 850, gst_rate: 5, min_stock: 15, unit: 'pack' },
      // Cat Food
      { id: 4, sku: 'CF001', barcode: '8901234567004', name: 'Whiskas Adult Cat Food Tuna 3kg', category_id: 2, mrp: 1500, selling_price: 1400, purchase_price: 1100, gst_rate: 5, min_stock: 10, unit: 'pack' },
      { id: 5, sku: 'CF002', barcode: '8901234567005', name: 'Royal Canin Kitten Food 2kg', category_id: 2, mrp: 2000, selling_price: 1850, purchase_price: 1400, gst_rate: 5, min_stock: 10, unit: 'pack' },
      // Pet Medicines
      { id: 6, sku: 'PM001', barcode: '8901234567006', name: 'Frontline Plus Dog Flea Treatment', category_id: 3, mrp: 850, selling_price: 800, purchase_price: 600, gst_rate: 12, min_stock: 20, unit: 'piece' },
      { id: 7, sku: 'PM002', barcode: '8901234567007', name: 'Drontal Plus Dewormer for Dogs', category_id: 3, mrp: 450, selling_price: 420, purchase_price: 320, gst_rate: 12, min_stock: 25, unit: 'strip' },
      { id: 8, sku: 'PM003', barcode: '8901234567008', name: 'Advocate Spot-On for Cats', category_id: 3, mrp: 750, selling_price: 700, purchase_price: 550, gst_rate: 12, min_stock: 15, unit: 'piece' },
      // Pet Accessories
      { id: 9, sku: 'PA001', barcode: '8901234567009', name: 'Dog Collar with Leash Set', category_id: 4, mrp: 450, selling_price: 400, purchase_price: 280, gst_rate: 18, min_stock: 20, unit: 'set' },
      { id: 10, sku: 'PA002', barcode: '8901234567010', name: 'Cat Scratching Post', category_id: 4, mrp: 1200, selling_price: 1100, purchase_price: 750, gst_rate: 18, min_stock: 5, unit: 'piece' },
      { id: 11, sku: 'PA003', barcode: '8901234567011', name: 'Pet Food Bowl Stainless Steel', category_id: 4, mrp: 350, selling_price: 320, purchase_price: 200, gst_rate: 18, min_stock: 30, unit: 'piece' },
      // Grooming Products
      { id: 12, sku: 'GP001', barcode: '8901234567012', name: 'Pet Shampoo Anti-Tick 500ml', category_id: 5, mrp: 380, selling_price: 350, purchase_price: 250, gst_rate: 18, min_stock: 25, unit: 'bottle' },
      { id: 13, sku: 'GP002', barcode: '8901234567013', name: 'Pet Grooming Brush', category_id: 5, mrp: 280, selling_price: 250, purchase_price: 150, gst_rate: 18, min_stock: 20, unit: 'piece' },
      // Fish & Aquarium
      { id: 14, sku: 'FA001', barcode: '8901234567014', name: 'Fish Food Pellets 100g', category_id: 6, mrp: 180, selling_price: 160, purchase_price: 100, gst_rate: 5, min_stock: 30, unit: 'pack' },
      { id: 15, sku: 'FA002', barcode: '8901234567015', name: 'Aquarium Water Filter Small', category_id: 6, mrp: 850, selling_price: 780, purchase_price: 550, gst_rate: 5, min_stock: 10, unit: 'piece' },
      // Bird Supplies
      { id: 16, sku: 'BS001', barcode: '8901234567016', name: 'Bird Seed Mix 500g', category_id: 7, mrp: 150, selling_price: 135, purchase_price: 90, gst_rate: 5, min_stock: 40, unit: 'pack' },
      { id: 17, sku: 'BS002', barcode: '8901234567017', name: 'Bird Cage Medium Size', category_id: 7, mrp: 1800, selling_price: 1650, purchase_price: 1200, gst_rate: 5, min_stock: 5, unit: 'piece' },
      // Small Pets
      { id: 18, sku: 'SP001', barcode: '8901234567018', name: 'Hamster Food Mix 250g', category_id: 8, mrp: 220, selling_price: 200, purchase_price: 140, gst_rate: 5, min_stock: 25, unit: 'pack' },
      { id: 19, sku: 'SP002', barcode: '8901234567019', name: 'Rabbit Pellets 1kg', category_id: 8, mrp: 350, selling_price: 320, purchase_price: 220, gst_rate: 5, min_stock: 15, unit: 'pack' },
      { id: 20, sku: 'SP003', barcode: '8901234567020', name: 'Guinea Pig Hay 500g', category_id: 8, mrp: 280, selling_price: 250, purchase_price: 170, gst_rate: 5, min_stock: 20, unit: 'pack' }
    ];

    for (const product of products) {
      await db.collection('products').doc(String(product.id)).set({
        ...product,
        is_active: 1,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    await countersRef.doc('products').set({ count: products.length });
    console.log(`Seeded ${products.length} products`);

    // Seed Stock for both branches
    console.log('Seeding stock...');
    let stockId = 0;
    for (const product of products) {
      for (const branch of branches) {
        stockId++;
        const quantity = Math.floor(Math.random() * 50) + 10; // Random stock 10-60
        await db.collection('stock').doc(String(stockId)).set({
          id: stockId,
          product_id: product.id,
          branch_id: branch.id,
          quantity: quantity,
          batch_number: `B${new Date().getFullYear()}${String(stockId).padStart(4, '0')}`,
          expiry_date: product.category_id === 3 ? // Medicines expire sooner
            new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
            new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          manufacturing_date: new Date().toISOString().split('T')[0],
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    await countersRef.doc('stock').set({ count: stockId });
    console.log(`Seeded ${stockId} stock entries`);

    // Seed Suppliers
    console.log('Seeding suppliers...');
    const suppliers = [
      {
        id: 1,
        name: 'Pet Planet Distributors',
        gst_number: '33AABCD1234E1Z5',
        phone: '9876543200',
        email: 'orders@petplanet.in',
        address: 'No. 45, Industrial Area, Chennai 600032',
        contact_person: 'Ramesh Kumar',
        payment_terms: 'Net 30',
        credit_limit: 100000,
        outstanding_amount: 0,
        products_supplied: 'Dog Food, Cat Food, Pet Accessories',
        is_active: 1
      },
      {
        id: 2,
        name: 'VetMed Pharma',
        gst_number: '33EFGHI5678J2K6',
        phone: '9876543201',
        email: 'sales@vetmedpharma.com',
        address: 'No. 12, Pharma Hub, Ambattur, Chennai 600058',
        contact_person: 'Dr. Suresh',
        payment_terms: 'Net 15',
        credit_limit: 50000,
        outstanding_amount: 0,
        products_supplied: 'Pet Medicines, Veterinary Supplies',
        is_active: 1
      },
      {
        id: 3,
        name: 'Aqua World Suppliers',
        gst_number: '33LMNOP9012Q3R7',
        phone: '9876543202',
        email: 'info@aquaworld.in',
        address: 'No. 78, Fish Market Road, Vellore 632001',
        contact_person: 'Anand M',
        payment_terms: 'Net 30',
        credit_limit: 30000,
        outstanding_amount: 0,
        products_supplied: 'Aquarium Supplies, Fish Food, Bird Supplies',
        is_active: 1
      }
    ];

    for (const supplier of suppliers) {
      await db.collection('suppliers').doc(String(supplier.id)).set({
        ...supplier,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    await countersRef.doc('suppliers').set({ count: suppliers.length });
    console.log(`Seeded ${suppliers.length} suppliers`);

    // Seed Sample Customers
    console.log('Seeding customers...');
    const customers = [
      {
        id: 1,
        name: 'Priya Sharma',
        phone: '9876501001',
        email: 'priya.sharma@email.com',
        address: '25, Gandhi Nagar, Vaniyambadi',
        customer_type: 'retail',
        loyalty_points: 150,
        total_purchases: 5200,
        is_active: 1
      },
      {
        id: 2,
        name: 'Karthik R',
        phone: '9876501002',
        email: 'karthik.r@email.com',
        address: '42, Main Street, Alangayam',
        customer_type: 'retail',
        loyalty_points: 280,
        total_purchases: 8500,
        is_active: 1
      },
      {
        id: 3,
        name: 'Lakshmi Pet Shop',
        phone: '9876501003',
        email: 'lakshmi.pets@email.com',
        address: '18, Market Road, Ambur',
        customer_type: 'wholesale',
        gst_number: '33XYZAB1234C5D6',
        loyalty_points: 500,
        total_purchases: 45000,
        is_active: 1
      }
    ];

    for (const customer of customers) {
      await db.collection('customers').doc(String(customer.id)).set({
        ...customer,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    await countersRef.doc('customers').set({ count: customers.length });
    console.log(`Seeded ${customers.length} customers`);

    // Initialize other counters
    await countersRef.doc('sales').set({ count: 0 });
    await countersRef.doc('sale_items').set({ count: 0 });
    await countersRef.doc('online_orders').set({ count: 0 });
    await countersRef.doc('purchase_orders').set({ count: 0 });
    await countersRef.doc('held_sales').set({ count: 0 });
    await countersRef.doc('payments').set({ count: 0 });
    await countersRef.doc('customer_addresses').set({ count: 0 });
    await countersRef.doc('pets').set({ count: 0 });

    console.log('\n✅ Firestore seeding completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('   Admin: username=admin, password=admin123');
    console.log('   Cashier: username=cashier, password=cashier123');
    console.log('\n🏪 Branches: Vaniyambadi Main, Alangayam Branch');
    console.log(`📦 Products: ${products.length} items across 8 categories`);
    console.log(`📊 Stock: ${stockId} entries`);
    console.log(`🚚 Suppliers: ${suppliers.length}`);
    console.log(`👥 Customers: ${customers.length}`);

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedDatabase();
