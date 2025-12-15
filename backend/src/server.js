import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database.js';
// Server configured

// Import routes
import authRoutes from './routes/auth.js';
import branchRoutes from './routes/branches.js';
import productRoutes from './routes/products.js';
import stockRoutes from './routes/stock.js';
import customerRoutes from './routes/customers.js';
import salesRoutes from './routes/sales.js';
import supplierRoutes from './routes/suppliers.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import onlineOrderRoutes from './routes/onlineOrders.js';
import customerAuthRoutes from './routes/customerAuth.js';
import exportRoutes from './routes/exports.js';
import paymentRoutes from './routes/payments.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database
initializeDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/online', onlineOrderRoutes);
app.use('/api/customer', customerAuthRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/payments', paymentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Bharathi Medicals Vet & Pet Shop API is running!' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`🐾 Bharathi Medicals Vet & Pet Shop Server running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}/api`);
});
