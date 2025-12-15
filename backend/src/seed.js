import db, { initializeDatabase } from './config/database.js';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
  console.log('Starting database seeding...');

  // Initialize database tables
  initializeDatabase();

  // Disable foreign key checks for clean reset
  db.exec('PRAGMA foreign_keys = OFF');

  // Clear existing data in reverse dependency order
  const tables = [
    'transfer_items', 'stock_transfers', 'po_items', 'purchase_orders',
    'sale_items', 'sales', 'held_sales', 'stock_adjustments', 'stock',
    'pets', 'customers', 'suppliers', 'products', 'categories', 'users', 'branches',
    'online_orders'
  ];

  tables.forEach(table => {
    try {
      db.exec(`DELETE FROM ${table}`);
      db.exec(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
    } catch (e) {
      // Table might not exist yet
    }
  });

  // Re-enable foreign key checks
  db.exec('PRAGMA foreign_keys = ON');

  // Seed Branches - Bharathi Medicals (Vet & Pet Shop)
  const branches = [
    { name: 'Vaniyambadi - Jinah Road', code: 'VJR', address: 'Jinah Road, Vaniyambadi, Tamil Nadu - 635751', phone: '+91 98765 43210', email: 'jinahroad@bharathimedicals.com', manager_name: 'Mr. Senthil Kumar', manager_phone: '+91 98765 43210', opening_hours: '8:00 AM - 10:00 PM', staff_count: 6, status: 'active' },
    { name: 'Vaniyambadi - Malangu Road', code: 'VMR', address: 'Malangu Road, Vaniyambadi, Tamil Nadu - 635751', phone: '+91 98765 43211', email: 'malangu@bharathimedicals.com', manager_name: 'Mr. Ravi Kumar', manager_phone: '+91 98765 43211', opening_hours: '8:00 AM - 10:00 PM', staff_count: 5, status: 'active' },
    { name: 'Alangayam', code: 'ALG', address: 'Main Road, Alangayam, Tamil Nadu - 635701', phone: '+91 98765 43212', email: 'alangayam@bharathimedicals.com', manager_name: 'Mr. Prakash', manager_phone: '+91 98765 43212', opening_hours: '8:00 AM - 9:30 PM', staff_count: 4, status: 'active' },
    { name: 'Tirupathur - Teachers Colony', code: 'TTC', address: 'Teachers Colony, Tirupathur, Tamil Nadu - 635601', phone: '+91 98765 43213', email: 'teacherscolony@bharathimedicals.com', manager_name: 'Mr. Murali', manager_phone: '+91 98765 43213', opening_hours: '8:00 AM - 10:00 PM', staff_count: 5, status: 'active' },
    { name: 'Tirupathur - Railway Road', code: 'TRR', address: 'Railway Road, Tirupathur, Tamil Nadu - 635601', phone: '+91 98765 43214', email: 'railwayroad@bharathimedicals.com', manager_name: 'Mr. Suresh', manager_phone: '+91 98765 43214', opening_hours: '8:00 AM - 10:00 PM', staff_count: 5, status: 'active' },
    { name: 'Ambur', code: 'AMB', address: 'Main Bazaar, Ambur, Tamil Nadu - 635802', phone: '+91 98765 43215', email: 'ambur@bharathimedicals.com', manager_name: 'Mr. Karthik', manager_phone: '+91 98765 43215', opening_hours: '8:00 AM - 10:00 PM', staff_count: 6, status: 'active' },
    { name: 'Thiruvannamalai', code: 'TVM', address: 'Car Street, Thiruvannamalai, Tamil Nadu - 606601', phone: '+91 98765 43216', email: 'tvm@bharathimedicals.com', manager_name: 'Mr. Bala', manager_phone: '+91 98765 43216', opening_hours: '7:00 AM - 10:00 PM', staff_count: 7, status: 'active' },
    { name: 'Mathanur', code: 'MTN', address: 'Bus Stand Road, Mathanur, Tamil Nadu - 635810', phone: '+91 98765 43217', email: 'mathanur@bharathimedicals.com', manager_name: 'Mr. Velu', manager_phone: '+91 98765 43217', opening_hours: '8:00 AM - 9:00 PM', staff_count: 4, status: 'active' }
  ];

  const insertBranch = db.prepare(`
    INSERT INTO branches (name, code, address, phone, email, manager_name, manager_phone, opening_hours, staff_count, status)
    VALUES (@name, @code, @address, @phone, @email, @manager_name, @manager_phone, @opening_hours, @staff_count, @status)
  `);

  branches.forEach(branch => insertBranch.run(branch));
  console.log('Branches seeded!');

  // Seed Categories - Vet & Pet Shop
  const categories = [
    { name: 'Dog Food', gst_rate: 5, icon: '🐕', color: '#8B4513' },
    { name: 'Cat Food', gst_rate: 5, icon: '🐱', color: '#FF6B35' },
    { name: 'Pet Medicines', gst_rate: 12, icon: '💊', color: '#EF4444' },
    { name: 'Pet Accessories', gst_rate: 18, icon: '🎾', color: '#3B82F6' },
    { name: 'Grooming Products', gst_rate: 18, icon: '✂️', color: '#EC4899' },
    { name: 'Aquarium & Fish', gst_rate: 5, icon: '🐠', color: '#06B6D4' },
    { name: 'Bird Supplies', gst_rate: 5, icon: '🐦', color: '#84CC16' },
    { name: 'Small Pets & Others', gst_rate: 5, icon: '🐹', color: '#F59E0B' }
  ];

  const insertCategory = db.prepare(`
    INSERT INTO categories (name, gst_rate, icon, color)
    VALUES (@name, @gst_rate, @icon, @color)
  `);

  categories.forEach(cat => insertCategory.run(cat));
  console.log('Categories seeded!');

  // Seed Products - Vet & Pet Shop (50+ products)
  const products = [
    // Dog Food (GST 5%) - Category 1
    { sku: 'DOG001', barcode: '8901234567890', name: 'Pedigree Adult Chicken & Vegetables 3kg', description: 'Complete nutrition for adult dogs', category_id: 1, mrp: 650, selling_price: 580, purchase_price: 420, gst_rate: 5, min_stock: 30, unit: 'pack' },
    { sku: 'DOG002', barcode: '8901234567891', name: 'Royal Canin Maxi Adult 4kg', description: 'For large breed adult dogs', category_id: 1, mrp: 2200, selling_price: 1980, purchase_price: 1450, gst_rate: 5, min_stock: 20, unit: 'pack' },
    { sku: 'DOG003', barcode: '8901234567892', name: 'Drools Puppy Chicken & Egg 1.2kg', description: 'For growing puppies', category_id: 1, mrp: 380, selling_price: 340, purchase_price: 250, gst_rate: 5, min_stock: 40, unit: 'pack' },
    { sku: 'DOG004', barcode: '8901234567893', name: 'Pedigree Meat Jerky Stix 80g', description: 'Tasty dog treats', category_id: 1, mrp: 120, selling_price: 105, purchase_price: 75, gst_rate: 5, min_stock: 60, unit: 'pack' },
    { sku: 'DOG005', barcode: '8901234567894', name: 'Farmina N&D Grain Free 2.5kg', description: 'Premium grain-free dog food', category_id: 1, mrp: 2800, selling_price: 2500, purchase_price: 1850, gst_rate: 5, min_stock: 15, unit: 'pack' },
    { sku: 'DOG006', barcode: '8901234567895', name: 'Pedigree Puppy Milk 400g', description: 'Milk replacer for puppies', category_id: 1, mrp: 450, selling_price: 400, purchase_price: 290, gst_rate: 5, min_stock: 25, unit: 'pack' },
    { sku: 'DOG007', barcode: '8901234567896', name: 'Himalaya Healthy Pet Food 1.2kg', description: 'Nutritious vegetarian dog food', category_id: 1, mrp: 320, selling_price: 285, purchase_price: 205, gst_rate: 5, min_stock: 35, unit: 'pack' },
    { sku: 'DOG008', barcode: '8901234567897', name: 'Drools Absolute Calcium Bone Jar', description: 'Calcium-rich dog treats', category_id: 1, mrp: 250, selling_price: 220, purchase_price: 160, gst_rate: 5, min_stock: 40, unit: 'jar' },

    // Cat Food (GST 5%) - Category 2
    { sku: 'CAT001', barcode: '8901234567900', name: 'Whiskas Adult Tuna 1.2kg', description: 'Complete cat food with tuna', category_id: 2, mrp: 550, selling_price: 490, purchase_price: 360, gst_rate: 5, min_stock: 30, unit: 'pack' },
    { sku: 'CAT002', barcode: '8901234567901', name: 'Royal Canin Kitten 2kg', description: 'For growing kittens', category_id: 2, mrp: 1650, selling_price: 1480, purchase_price: 1100, gst_rate: 5, min_stock: 20, unit: 'pack' },
    { sku: 'CAT003', barcode: '8901234567902', name: 'Me-O Adult Ocean Fish 1.2kg', description: 'Delicious ocean fish flavor', category_id: 2, mrp: 380, selling_price: 340, purchase_price: 248, gst_rate: 5, min_stock: 35, unit: 'pack' },
    { sku: 'CAT004', barcode: '8901234567903', name: 'Whiskas Temptations Treats 85g', description: 'Crunchy cat treats', category_id: 2, mrp: 150, selling_price: 135, purchase_price: 95, gst_rate: 5, min_stock: 50, unit: 'pack' },
    { sku: 'CAT005', barcode: '8901234567904', name: 'Sheba Wet Cat Food 85g (Pack of 6)', description: 'Premium wet cat food', category_id: 2, mrp: 420, selling_price: 375, purchase_price: 275, gst_rate: 5, min_stock: 40, unit: 'pack' },
    { sku: 'CAT006', barcode: '8901234567905', name: 'Farmina Matisse Kitten 1.5kg', description: 'Italian premium kitten food', category_id: 2, mrp: 1200, selling_price: 1080, purchase_price: 790, gst_rate: 5, min_stock: 25, unit: 'pack' },

    // Pet Medicines (GST 12%) - Category 3
    { sku: 'MED001', barcode: '8901234567910', name: 'Frontline Plus for Dogs (Large)', description: 'Flea & tick treatment for large dogs', category_id: 3, mrp: 850, selling_price: 760, purchase_price: 550, gst_rate: 12, min_stock: 25, unit: 'pipette' },
    { sku: 'MED002', barcode: '8901234567911', name: 'Drontal Plus Dewormer (Dogs)', description: 'Broad spectrum dewormer for dogs', category_id: 3, mrp: 320, selling_price: 285, purchase_price: 205, gst_rate: 12, min_stock: 40, unit: 'tablet' },
    { sku: 'MED003', barcode: '8901234567912', name: 'Himalaya Erina EP Powder 150g', description: 'Anti-tick powder for pets', category_id: 3, mrp: 180, selling_price: 160, purchase_price: 115, gst_rate: 12, min_stock: 35, unit: 'bottle' },
    { sku: 'MED004', barcode: '8901234567913', name: 'Petveda Skin & Coat Supplement', description: 'For healthy skin and coat', category_id: 3, mrp: 450, selling_price: 400, purchase_price: 290, gst_rate: 12, min_stock: 30, unit: 'bottle' },
    { sku: 'MED005', barcode: '8901234567914', name: 'Bayer Advocate for Cats', description: 'Monthly parasite prevention', category_id: 3, mrp: 720, selling_price: 650, purchase_price: 470, gst_rate: 12, min_stock: 20, unit: 'pipette' },
    { sku: 'MED006', barcode: '8901234567915', name: 'Vetoquinol Vet Eye Drops 10ml', description: 'For eye infections in pets', category_id: 3, mrp: 285, selling_price: 255, purchase_price: 185, gst_rate: 12, min_stock: 30, unit: 'bottle' },
    { sku: 'MED007', barcode: '8901234567916', name: 'Petcare Tick Spray 100ml', description: 'Tick & flea spray', category_id: 3, mrp: 220, selling_price: 195, purchase_price: 140, gst_rate: 12, min_stock: 40, unit: 'bottle' },
    { sku: 'MED008', barcode: '8901234567917', name: 'Himalaya Digyton Plus 100ml', description: 'Digestive tonic for pets', category_id: 3, mrp: 195, selling_price: 175, purchase_price: 125, gst_rate: 12, min_stock: 35, unit: 'bottle' },
    { sku: 'MED009', barcode: '8901234567918', name: 'Nutri-Vet Multi-Vite Chewables', description: 'Daily vitamin supplement', category_id: 3, mrp: 550, selling_price: 490, purchase_price: 355, gst_rate: 12, min_stock: 25, unit: 'bottle' },
    { sku: 'MED010', barcode: '8901234567919', name: 'Beaphar Worming Syrup 45ml', description: 'Deworming syrup for puppies/kittens', category_id: 3, mrp: 280, selling_price: 250, purchase_price: 180, gst_rate: 12, min_stock: 30, unit: 'bottle' },

    // Pet Accessories (GST 18%) - Category 4
    { sku: 'ACC001', barcode: '8901234567920', name: 'Adjustable Dog Collar (Medium)', description: 'Comfortable nylon collar', category_id: 4, mrp: 350, selling_price: 310, purchase_price: 220, gst_rate: 18, min_stock: 40, unit: 'piece' },
    { sku: 'ACC002', barcode: '8901234567921', name: 'Retractable Dog Leash 5m', description: 'Extendable walking leash', category_id: 4, mrp: 650, selling_price: 580, purchase_price: 410, gst_rate: 18, min_stock: 25, unit: 'piece' },
    { sku: 'ACC003', barcode: '8901234567922', name: 'Stainless Steel Pet Bowl (Medium)', description: 'Durable feeding bowl', category_id: 4, mrp: 280, selling_price: 250, purchase_price: 175, gst_rate: 18, min_stock: 50, unit: 'piece' },
    { sku: 'ACC004', barcode: '8901234567923', name: 'Pet Bed Cushion (Large)', description: 'Soft comfortable pet bed', category_id: 4, mrp: 1200, selling_price: 1080, purchase_price: 780, gst_rate: 18, min_stock: 15, unit: 'piece' },
    { sku: 'ACC005', barcode: '8901234567924', name: 'Cat Scratching Post', description: 'Durable sisal scratching post', category_id: 4, mrp: 850, selling_price: 760, purchase_price: 540, gst_rate: 18, min_stock: 20, unit: 'piece' },
    { sku: 'ACC006', barcode: '8901234567925', name: 'Pet Carrier Bag (Medium)', description: 'Travel carrier for small pets', category_id: 4, mrp: 1500, selling_price: 1350, purchase_price: 960, gst_rate: 18, min_stock: 12, unit: 'piece' },
    { sku: 'ACC007', barcode: '8901234567926', name: 'Dog Chew Toys Set (5 pcs)', description: 'Assorted chew toys', category_id: 4, mrp: 450, selling_price: 400, purchase_price: 285, gst_rate: 18, min_stock: 35, unit: 'set' },
    { sku: 'ACC008', barcode: '8901234567927', name: 'Cat Litter Tray with Scoop', description: 'Easy-clean litter box', category_id: 4, mrp: 550, selling_price: 490, purchase_price: 350, gst_rate: 18, min_stock: 25, unit: 'piece' },
    { sku: 'ACC009', barcode: '8901234567928', name: 'Pet Water Dispenser 2L', description: 'Automatic water fountain', category_id: 4, mrp: 950, selling_price: 850, purchase_price: 610, gst_rate: 18, min_stock: 18, unit: 'piece' },
    { sku: 'ACC010', barcode: '8901234567929', name: 'Dog Harness (Adjustable)', description: 'No-pull walking harness', category_id: 4, mrp: 480, selling_price: 430, purchase_price: 305, gst_rate: 18, min_stock: 30, unit: 'piece' },

    // Grooming Products (GST 18%) - Category 5
    { sku: 'GRM001', barcode: '8901234567930', name: 'Pet Shampoo Anti-Tick 500ml', description: 'Medicated anti-tick shampoo', category_id: 5, mrp: 320, selling_price: 285, purchase_price: 200, gst_rate: 18, min_stock: 40, unit: 'bottle' },
    { sku: 'GRM002', barcode: '8901234567931', name: 'Slicker Brush for Dogs', description: 'For removing tangles and loose fur', category_id: 5, mrp: 350, selling_price: 310, purchase_price: 220, gst_rate: 18, min_stock: 35, unit: 'piece' },
    { sku: 'GRM003', barcode: '8901234567932', name: 'Pet Nail Clipper', description: 'Safe nail trimming for pets', category_id: 5, mrp: 280, selling_price: 250, purchase_price: 175, gst_rate: 18, min_stock: 40, unit: 'piece' },
    { sku: 'GRM004', barcode: '8901234567933', name: 'Himalaya Erina Coat Cleanser 450ml', description: 'Herbal pet shampoo', category_id: 5, mrp: 380, selling_price: 340, purchase_price: 245, gst_rate: 18, min_stock: 35, unit: 'bottle' },
    { sku: 'GRM005', barcode: '8901234567934', name: 'Pet Cologne Spray 100ml', description: 'Fresh fragrance spray', category_id: 5, mrp: 280, selling_price: 250, purchase_price: 175, gst_rate: 18, min_stock: 45, unit: 'bottle' },
    { sku: 'GRM006', barcode: '8901234567935', name: 'Deshedding Tool for Dogs', description: 'Reduces shedding by 90%', category_id: 5, mrp: 650, selling_price: 580, purchase_price: 415, gst_rate: 18, min_stock: 25, unit: 'piece' },
    { sku: 'GRM007', barcode: '8901234567936', name: 'Pet Ear Cleaner 100ml', description: 'Gentle ear cleaning solution', category_id: 5, mrp: 220, selling_price: 195, purchase_price: 140, gst_rate: 18, min_stock: 40, unit: 'bottle' },
    { sku: 'GRM008', barcode: '8901234567937', name: 'Cat Litter Sand 5kg', description: 'Clumping cat litter', category_id: 5, mrp: 450, selling_price: 400, purchase_price: 285, gst_rate: 18, min_stock: 30, unit: 'pack' },

    // Aquarium & Fish (GST 5%) - Category 6
    { sku: 'AQU001', barcode: '8901234567940', name: 'Taiyo Aini Fish Food 100g', description: 'Complete nutrition for aquarium fish', category_id: 6, mrp: 150, selling_price: 135, purchase_price: 95, gst_rate: 5, min_stock: 50, unit: 'pack' },
    { sku: 'AQU002', barcode: '8901234567941', name: 'Aquarium Filter (Small)', description: 'Internal filter for small tanks', category_id: 6, mrp: 450, selling_price: 400, purchase_price: 285, gst_rate: 5, min_stock: 20, unit: 'piece' },
    { sku: 'AQU003', barcode: '8901234567942', name: 'Fish Tank Heater 50W', description: 'Thermostat controlled heater', category_id: 6, mrp: 650, selling_price: 580, purchase_price: 420, gst_rate: 5, min_stock: 15, unit: 'piece' },
    { sku: 'AQU004', barcode: '8901234567943', name: 'Aquarium Gravel 2kg', description: 'Colorful tank gravel', category_id: 6, mrp: 180, selling_price: 160, purchase_price: 115, gst_rate: 5, min_stock: 35, unit: 'pack' },
    { sku: 'AQU005', barcode: '8901234567944', name: 'Fish Net (Medium)', description: 'Soft mesh fish net', category_id: 6, mrp: 85, selling_price: 75, purchase_price: 52, gst_rate: 5, min_stock: 50, unit: 'piece' },
    { sku: 'AQU006', barcode: '8901234567945', name: 'Aquarium Air Pump', description: 'Oxygen pump for tanks', category_id: 6, mrp: 380, selling_price: 340, purchase_price: 245, gst_rate: 5, min_stock: 25, unit: 'piece' },
    { sku: 'AQU007', barcode: '8901234567946', name: 'Water Conditioner 100ml', description: 'Removes chlorine from tap water', category_id: 6, mrp: 150, selling_price: 135, purchase_price: 95, gst_rate: 5, min_stock: 40, unit: 'bottle' },

    // Bird Supplies (GST 5%) - Category 7
    { sku: 'BRD001', barcode: '8901234567950', name: 'Mixed Bird Seeds 1kg', description: 'Nutritious seed mix for birds', category_id: 7, mrp: 180, selling_price: 160, purchase_price: 115, gst_rate: 5, min_stock: 40, unit: 'pack' },
    { sku: 'BRD002', barcode: '8901234567951', name: 'Bird Cage (Medium)', description: 'Spacious cage with accessories', category_id: 7, mrp: 1200, selling_price: 1080, purchase_price: 780, gst_rate: 5, min_stock: 12, unit: 'piece' },
    { sku: 'BRD003', barcode: '8901234567952', name: 'Cuttlefish Bone (Pack of 2)', description: 'Calcium supplement for birds', category_id: 7, mrp: 120, selling_price: 105, purchase_price: 75, gst_rate: 5, min_stock: 50, unit: 'pack' },
    { sku: 'BRD004', barcode: '8901234567953', name: 'Bird Water Feeder', description: 'Automatic water dispenser', category_id: 7, mrp: 180, selling_price: 160, purchase_price: 115, gst_rate: 5, min_stock: 35, unit: 'piece' },
    { sku: 'BRD005', barcode: '8901234567954', name: 'Parrot Food Premium 500g', description: 'Complete parrot nutrition', category_id: 7, mrp: 280, selling_price: 250, purchase_price: 180, gst_rate: 5, min_stock: 30, unit: 'pack' },
    { sku: 'BRD006', barcode: '8901234567955', name: 'Bird Swing Toy', description: 'Fun swing for cage birds', category_id: 7, mrp: 150, selling_price: 135, purchase_price: 95, gst_rate: 5, min_stock: 40, unit: 'piece' },

    // Small Pets & Others (GST 5%) - Category 8
    { sku: 'SML001', barcode: '8901234567960', name: 'Rabbit Food Pellets 1kg', description: 'Complete rabbit nutrition', category_id: 8, mrp: 250, selling_price: 220, purchase_price: 158, gst_rate: 5, min_stock: 30, unit: 'pack' },
    { sku: 'SML002', barcode: '8901234567961', name: 'Hamster Bedding 1kg', description: 'Soft wood shavings', category_id: 8, mrp: 180, selling_price: 160, purchase_price: 115, gst_rate: 5, min_stock: 35, unit: 'pack' },
    { sku: 'SML003', barcode: '8901234567962', name: 'Guinea Pig Food Mix 500g', description: 'Vitamin enriched food', category_id: 8, mrp: 220, selling_price: 195, purchase_price: 140, gst_rate: 5, min_stock: 30, unit: 'pack' },
    { sku: 'SML004', barcode: '8901234567963', name: 'Hamster Wheel Exercise', description: 'Silent spinner wheel', category_id: 8, mrp: 350, selling_price: 310, purchase_price: 220, gst_rate: 5, min_stock: 25, unit: 'piece' },
    { sku: 'SML005', barcode: '8901234567964', name: 'Small Animal Cage', description: 'Multi-level cage for hamsters', category_id: 8, mrp: 950, selling_price: 850, purchase_price: 615, gst_rate: 5, min_stock: 15, unit: 'piece' },
    { sku: 'SML006', barcode: '8901234567965', name: 'Hay Timothy Grass 500g', description: 'Essential fiber for rabbits/guinea pigs', category_id: 8, mrp: 280, selling_price: 250, purchase_price: 180, gst_rate: 5, min_stock: 35, unit: 'pack' }
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (sku, barcode, name, description, category_id, mrp, selling_price, purchase_price, gst_rate, min_stock, unit)
    VALUES (@sku, @barcode, @name, @description, @category_id, @mrp, @selling_price, @purchase_price, @gst_rate, @min_stock, @unit)
  `);

  products.forEach(product => insertProduct.run(product));
  console.log('Products seeded!');

  // Seed Stock for all branches and products
  const branchIds = [1, 2, 3, 4, 5, 6, 7, 8];
  const productIds = Array.from({ length: products.length }, (_, i) => i + 1);

  const insertStock = db.prepare(`
    INSERT INTO stock (product_id, branch_id, quantity, batch_number, expiry_date)
    VALUES (@product_id, @branch_id, @quantity, @batch_number, @expiry_date)
  `);

  branchIds.forEach(branchId => {
    productIds.forEach(productId => {
      // Random quantity between 5 and 100
      const quantity = Math.floor(Math.random() * 96) + 5;
      const batchNumber = `BTH${String(branchId).padStart(2, '0')}${String(productId).padStart(4, '0')}`;

      // Expiry date - some products expire soon, some later (pet food/medicines have shorter shelf life)
      const daysToExpiry = Math.floor(Math.random() * 365) + 60;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + daysToExpiry);

      insertStock.run({
        product_id: productId,
        branch_id: branchId,
        quantity,
        batch_number: batchNumber,
        expiry_date: expiryDate.toISOString().split('T')[0]
      });
    });
  });
  console.log('Stock seeded!');

  // Add some low stock items for testing
  db.exec(`UPDATE stock SET quantity = 3 WHERE product_id = 1 AND branch_id = 1`);
  db.exec(`UPDATE stock SET quantity = 5 WHERE product_id = 2 AND branch_id = 2`);
  db.exec(`UPDATE stock SET quantity = 2 WHERE product_id = 9 AND branch_id = 1`);
  db.exec(`UPDATE stock SET quantity = 4 WHERE product_id = 15 AND branch_id = 3`);

  // Add some expiring soon items
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 25);
  db.exec(`UPDATE stock SET expiry_date = '${thirtyDaysFromNow.toISOString().split('T')[0]}' WHERE product_id IN (9, 10, 15, 16) AND branch_id = 1`);

  // Seed Customers - Pet Owners in Local Area
  const customers = [
    { name: 'Rajesh Kumar', phone: '+91 98765 11111', email: 'rajesh.kumar@email.com', address: '45 Main Road, Vaniyambadi', customer_type: 'retail', loyalty_points: 250 },
    { name: 'Lakshmi Devi', phone: '+91 98765 22222', email: 'lakshmi.devi@email.com', address: '123 Jinah Road, Vaniyambadi', customer_type: 'retail', loyalty_points: 180 },
    { name: 'Dr. Anand Vet Clinic', phone: '+91 98765 33333', email: 'anand.vetclinic@email.com', address: 'Teachers Colony, Tirupathur', customer_type: 'wholesale', gst_number: '33AABCA1234B1Z5', loyalty_points: 0 },
    { name: 'Murugan Pet Shop', phone: '+91 98765 44444', email: 'murugan.petshop@email.com', address: 'Main Bazaar, Ambur', customer_type: 'wholesale', gst_number: '33AABCM5678C2Z5', loyalty_points: 0 },
    { name: 'Selvi Ammal', phone: '+91 98765 55555', email: 'selvi.a@email.com', address: '34 Bus Stand Road, Alangayam', customer_type: 'retail', loyalty_points: 320 },
    { name: 'Mohammed Farooq', phone: '+91 98765 66666', email: 'farooq.m@email.com', address: '56 Railway Road, Tirupathur', customer_type: 'retail', loyalty_points: 150 },
    { name: 'Sundar Rajan', phone: '+91 98765 77777', email: 'sundar.r@email.com', address: 'Car Street, Thiruvannamalai', customer_type: 'retail', loyalty_points: 90 },
    { name: 'Karthik S', phone: '+91 98765 88888', email: 'karthik.s@email.com', address: '89 Malangu Road, Vaniyambadi', customer_type: 'retail', loyalty_points: 210 },
    { name: 'Happy Paws Animal Hospital', phone: '+91 98765 99999', email: 'happypaws@email.com', address: 'Hospital Road, Tirupathur', customer_type: 'wholesale', gst_number: '33AABCG9012D3Z5', loyalty_points: 0 },
    { name: 'Deepa K', phone: '+91 98765 00000', email: 'deepa.k@email.com', address: '67 Temple Street, Mathanur', customer_type: 'retail', loyalty_points: 175 },
    { name: 'Velu Animal Care', phone: '+91 98764 11111', email: 'veluanimalcare@email.com', address: '34 Main Road, Ambur', customer_type: 'wholesale', gst_number: '33AABCV3456E4Z5', loyalty_points: 0 },
    { name: 'Saravanan', phone: '+91 98764 22222', email: 'saravanan@email.com', address: '56 Market Street, Alangayam', customer_type: 'retail', loyalty_points: 280 }
  ];

  const insertCustomer = db.prepare(`
    INSERT INTO customers (name, phone, email, address, customer_type, gst_number, loyalty_points)
    VALUES (@name, @phone, @email, @address, @customer_type, @gst_number, @loyalty_points)
  `);

  customers.forEach(customer => insertCustomer.run({
    ...customer,
    gst_number: customer.gst_number || null
  }));
  console.log('Customers seeded!');

  // Seed Pets for customers
  const pets = [
    { customer_id: 1, name: 'Bruno', species: 'Dog', breed: 'German Shepherd', age_years: 3, age_months: 6, gender: 'male', weight: 32, color: 'Black & Tan', notes: 'Vaccinated, friendly' },
    { customer_id: 1, name: 'Milo', species: 'Dog', breed: 'Labrador', age_years: 2, age_months: 0, gender: 'male', weight: 28, color: 'Golden', notes: 'Active, loves swimming' },
    { customer_id: 2, name: 'Whiskers', species: 'Cat', breed: 'Persian', age_years: 4, age_months: 2, gender: 'female', weight: 4.5, color: 'White', notes: 'Indoor cat, regular grooming needed' },
    { customer_id: 5, name: 'Rocky', species: 'Dog', breed: 'Indie', age_years: 5, age_months: 0, gender: 'male', weight: 18, color: 'Brown', notes: 'Rescue dog, very loyal' },
    { customer_id: 6, name: 'Luna', species: 'Cat', breed: 'Siamese', age_years: 1, age_months: 8, gender: 'female', weight: 3.2, color: 'Cream & Brown', notes: 'Playful, vocal' },
    { customer_id: 7, name: 'Max', species: 'Dog', breed: 'Pomeranian', age_years: 2, age_months: 4, gender: 'male', weight: 3.5, color: 'Orange', notes: 'Small but energetic' },
    { customer_id: 8, name: 'Cleo', species: 'Cat', breed: 'British Shorthair', age_years: 3, age_months: 0, gender: 'female', weight: 5, color: 'Grey', notes: 'Calm, loves sleeping' },
    { customer_id: 8, name: 'Goldie', species: 'Fish', breed: 'Goldfish', age_years: 1, age_months: 0, gender: 'unknown', weight: null, color: 'Orange', notes: 'In 20L tank' },
    { customer_id: 10, name: 'Buddy', species: 'Dog', breed: 'Beagle', age_years: 4, age_months: 6, gender: 'male', weight: 12, color: 'Tricolor', notes: 'Excellent sense of smell, food motivated' },
    { customer_id: 12, name: 'Tweety', species: 'Bird', breed: 'Budgerigar', age_years: 2, age_months: 0, gender: 'male', weight: null, color: 'Green & Yellow', notes: 'Can say a few words' }
  ];

  const insertPet = db.prepare(`
    INSERT INTO pets (customer_id, name, species, breed, age_years, age_months, gender, weight, color, notes)
    VALUES (@customer_id, @name, @species, @breed, @age_years, @age_months, @gender, @weight, @color, @notes)
  `);

  pets.forEach(pet => insertPet.run({
    ...pet,
    weight: pet.weight || null
  }));
  console.log('Pets seeded!');

  // Seed Suppliers - Pet Product Distributors
  const suppliers = [
    { name: 'Mars Petcare India', gst_number: '27AABCM1234A1Z5', phone: '+91 44 12345678', email: 'orders@marspetcare.com', address: 'Mumbai, Maharashtra', contact_person: 'Rahul Mehta', payment_terms: 'Net 30', credit_limit: 500000, products_supplied: 'Pedigree, Whiskas, Sheba' },
    { name: 'Royal Canin Distributors', gst_number: '29AABCR5678B2Z5', phone: '+91 80 87654321', email: 'sales@royalcanin.com', address: 'Bangalore, Karnataka', contact_person: 'Priya Nair', payment_terms: 'Net 15', credit_limit: 400000, products_supplied: 'Royal Canin Pet Food' },
    { name: 'Himalaya Animal Health', gst_number: '33AABCH9012C3Z5', phone: '+91 44 23456789', email: 'supply@himalayapet.com', address: 'Bangalore, Karnataka', contact_person: 'Dr. Sharma', payment_terms: 'Net 45', credit_limit: 300000, products_supplied: 'Pet Medicines, Grooming' },
    { name: 'Drools Pet Food', gst_number: '29AABCD3456D4Z5', phone: '+91 80 34567890', email: 'orders@drools.in', address: 'Delhi', contact_person: 'Amit Kumar', payment_terms: 'Net 30', credit_limit: 350000, products_supplied: 'Drools Dog & Cat Food' },
    { name: 'Bayer Animal Health', gst_number: '27AABCB7890E5Z5', phone: '+91 22 45678901', email: 'sales@bayer-ah.com', address: 'Mumbai, Maharashtra', contact_person: 'Arun Raj', payment_terms: 'Net 30', credit_limit: 400000, products_supplied: 'Flea/Tick Treatment, Dewormers' },
    { name: 'Farmina Pet Foods', gst_number: '27AABCF2345F6Z5', phone: '+91 22 56789012', email: 'b2b@farmina.in', address: 'Mumbai, Maharashtra', contact_person: 'Neha Kapoor', payment_terms: 'Net 30', credit_limit: 450000, products_supplied: 'Premium Pet Food' },
    { name: 'Chennai Pet Supplies', gst_number: '33AABCP6789G7Z5', phone: '+91 44 67890123', email: 'sales@chennaipetsupplies.in', address: 'Chennai, Tamil Nadu', contact_person: 'Ravi Shankar', payment_terms: 'Net 15', credit_limit: 250000, products_supplied: 'All Pet Accessories' }
  ];

  const insertSupplier = db.prepare(`
    INSERT INTO suppliers (name, gst_number, phone, email, address, contact_person, payment_terms, credit_limit, products_supplied)
    VALUES (@name, @gst_number, @phone, @email, @address, @contact_person, @payment_terms, @credit_limit, @products_supplied)
  `);

  suppliers.forEach(supplier => insertSupplier.run(supplier));
  console.log('Suppliers seeded!');

  // Seed Users - Bharathi Medicals Staff
  const passwordHash = bcrypt.hashSync('admin123', 10);
  const cashierHash = bcrypt.hashSync('cashier123', 10);

  const users = [
    { username: 'admin', email: 'admin@bharathimedicals.com', password_hash: passwordHash, full_name: 'System Administrator', role: 'admin', branch_id: 1 },
    { username: 'senthil', email: 'senthil@bharathimedicals.com', password_hash: passwordHash, full_name: 'Mr. Senthil Kumar', role: 'manager', branch_id: 1 },
    { username: 'ravi', email: 'ravi@bharathimedicals.com', password_hash: passwordHash, full_name: 'Mr. Ravi Kumar', role: 'manager', branch_id: 2 },
    { username: 'prakash', email: 'prakash@bharathimedicals.com', password_hash: passwordHash, full_name: 'Mr. Prakash', role: 'manager', branch_id: 3 },
    { username: 'murali', email: 'murali@bharathimedicals.com', password_hash: passwordHash, full_name: 'Mr. Murali', role: 'manager', branch_id: 4 },
    { username: 'suresh', email: 'suresh@bharathimedicals.com', password_hash: passwordHash, full_name: 'Mr. Suresh', role: 'manager', branch_id: 5 },
    { username: 'karthik', email: 'karthik@bharathimedicals.com', password_hash: passwordHash, full_name: 'Mr. Karthik', role: 'manager', branch_id: 6 },
    { username: 'bala', email: 'bala@bharathimedicals.com', password_hash: passwordHash, full_name: 'Mr. Bala', role: 'manager', branch_id: 7 },
    { username: 'velu', email: 'velu@bharathimedicals.com', password_hash: passwordHash, full_name: 'Mr. Velu', role: 'manager', branch_id: 8 },
    { username: 'cashier1', email: 'cashier1@bharathimedicals.com', password_hash: cashierHash, full_name: 'Arun Kumar', role: 'cashier', branch_id: 1 },
    { username: 'cashier2', email: 'cashier2@bharathimedicals.com', password_hash: cashierHash, full_name: 'Divya S', role: 'cashier', branch_id: 2 }
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, full_name, role, branch_id)
    VALUES (@username, @email, @password_hash, @full_name, @role, @branch_id)
  `);

  users.forEach(user => insertUser.run(user));
  console.log('Users seeded!');

  // Seed some sample sales
  const today = new Date().toISOString();
  const yesterday = new Date(Date.now() - 86400000).toISOString();

  const sampleSales = [
    { invoice_number: 'INV-2024-0001', branch_id: 1, customer_id: 1, user_id: 1, subtotal: 1950, gst_amount: 97.50, discount: 0, grand_total: 2047.50, payment_method: 'cash', status: 'completed' },
    { invoice_number: 'INV-2024-0002', branch_id: 1, customer_id: 2, user_id: 1, subtotal: 850, gst_amount: 42.50, discount: 50, grand_total: 842.50, payment_method: 'upi', status: 'completed' },
    { invoice_number: 'INV-2024-0003', branch_id: 2, customer_id: 4, user_id: 3, subtotal: 2450, gst_amount: 294, discount: 100, grand_total: 2644, payment_method: 'card', status: 'completed' },
    { invoice_number: 'INV-2024-0004', branch_id: 1, customer_id: 6, user_id: 1, subtotal: 650, gst_amount: 32.50, discount: 0, grand_total: 682.50, payment_method: 'cash', status: 'completed' },
    { invoice_number: 'INV-2024-0005', branch_id: 3, customer_id: null, user_id: 4, subtotal: 1200, gst_amount: 60, discount: 0, grand_total: 1260, payment_method: 'upi', status: 'completed' }
  ];

  const insertSale = db.prepare(`
    INSERT INTO sales (invoice_number, branch_id, customer_id, user_id, subtotal, gst_amount, discount, grand_total, payment_method, status)
    VALUES (@invoice_number, @branch_id, @customer_id, @user_id, @subtotal, @gst_amount, @discount, @grand_total, @payment_method, @status)
  `);

  sampleSales.forEach(sale => insertSale.run(sale));

  // Add sale items (using pet products)
  const saleItems = [
    { sale_id: 1, product_id: 1, quantity: 2, unit_price: 580, gst_rate: 5, gst_amount: 58, discount: 0, subtotal: 1218 },
    { sale_id: 1, product_id: 17, quantity: 1, unit_price: 760, gst_rate: 12, gst_amount: 91.20, discount: 0, subtotal: 851.20 },
    { sale_id: 2, product_id: 9, quantity: 1, unit_price: 490, gst_rate: 5, gst_amount: 24.50, discount: 50, subtotal: 464.50 },
    { sale_id: 2, product_id: 31, quantity: 1, unit_price: 285, gst_rate: 18, gst_amount: 51.30, discount: 0, subtotal: 336.30 },
    { sale_id: 3, product_id: 2, quantity: 1, unit_price: 1980, gst_rate: 5, gst_amount: 99, discount: 0, subtotal: 2079 },
    { sale_id: 3, product_id: 23, quantity: 1, unit_price: 310, gst_rate: 18, gst_amount: 55.80, discount: 0, subtotal: 365.80 },
    { sale_id: 4, product_id: 3, quantity: 2, unit_price: 340, gst_rate: 5, gst_amount: 34, discount: 0, subtotal: 714 },
    { sale_id: 5, product_id: 5, quantity: 1, unit_price: 2500, gst_rate: 5, gst_amount: 125, discount: 0, subtotal: 2625 }
  ];

  const insertSaleItem = db.prepare(`
    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, gst_rate, gst_amount, discount, subtotal)
    VALUES (@sale_id, @product_id, @quantity, @unit_price, @gst_rate, @gst_amount, @discount, @subtotal)
  `);

  saleItems.forEach(item => insertSaleItem.run(item));
  console.log('Sample sales seeded!');

  console.log('\n=== Database seeding completed successfully! ===');
  console.log('\nLogin credentials:');
  console.log('Admin: username=admin, password=admin123');
  console.log('Cashier: username=cashier1, password=cashier123');
}

seedDatabase();
