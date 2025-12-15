import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import db from '../config/database.js';

const router = express.Router();

// Initialize Razorpay with test keys (replace with live keys in production)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YourTestKeyId',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'YourTestKeySecret'
});

// Middleware to verify customer token
const verifyCustomerToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bharathi-medicals-customer-secret-key-2024');
    req.customerId = decoded.customerId;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Create Razorpay order
router.post('/create-order', verifyCustomerToken, async (req, res) => {
  try {
    const { amount, currency = 'INR', order_id } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }

    // Amount should be in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(amount * 100);

    const options = {
      amount: amountInPaise,
      currency: currency,
      receipt: `order_${order_id || Date.now()}`,
      notes: {
        customer_id: req.customerId,
        order_id: order_id
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Store payment record
    db.prepare(`
      INSERT INTO payments (order_id, razorpay_order_id, amount, currency, status, customer_id)
      VALUES (?, ?, ?, ?, 'created', ?)
    `).run(order_id || null, razorpayOrder.id, amount, currency, req.customerId);

    res.json({
      success: true,
      data: {
        order_id: razorpayOrder.id,
        amount: amountInPaise,
        currency: razorpayOrder.currency,
        key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YourTestKeyId'
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
});

// Verify payment
router.post('/verify', verifyCustomerToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'YourTestKeySecret')
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      // Update payment record
      db.prepare(`
        UPDATE payments SET
          razorpay_payment_id = ?,
          razorpay_signature = ?,
          status = 'paid',
          paid_at = datetime('now')
        WHERE razorpay_order_id = ?
      `).run(razorpay_payment_id, razorpay_signature, razorpay_order_id);

      // Update online order status
      if (order_id) {
        db.prepare(`
          UPDATE online_orders SET
            payment_status = 'paid',
            payment_id = ?,
            status = 'confirmed',
            updated_at = datetime('now')
          WHERE id = ?
        `).run(razorpay_payment_id, order_id);
      }

      res.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          payment_id: razorpay_payment_id,
          order_id: order_id
        }
      });
    } else {
      // Update payment status to failed
      db.prepare(`
        UPDATE payments SET status = 'failed' WHERE razorpay_order_id = ?
      `).run(razorpay_order_id);

      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: 'Payment verification error' });
  }
});

// Get payment status
router.get('/status/:paymentId', verifyCustomerToken, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await razorpay.payments.fetch(paymentId);

    res.json({
      success: true,
      data: {
        id: payment.id,
        amount: payment.amount / 100,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        vpa: payment.vpa, // UPI ID if paid via UPI
        bank: payment.bank,
        wallet: payment.wallet
      }
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get payment status' });
  }
});

// Webhook for Razorpay events (for production)
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (webhookSecret) {
      const signature = req.headers['x-razorpay-signature'];
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
      }
    }

    const event = req.body.event;
    const payload = req.body.payload;

    switch (event) {
      case 'payment.captured':
        const payment = payload.payment.entity;
        db.prepare(`
          UPDATE payments SET status = 'captured' WHERE razorpay_payment_id = ?
        `).run(payment.id);
        break;

      case 'payment.failed':
        const failedPayment = payload.payment.entity;
        db.prepare(`
          UPDATE payments SET status = 'failed' WHERE razorpay_order_id = ?
        `).run(failedPayment.order_id);
        break;

      case 'refund.created':
        const refund = payload.refund.entity;
        db.prepare(`
          UPDATE payments SET status = 'refunded', refund_id = ? WHERE razorpay_payment_id = ?
        `).run(refund.id, refund.payment_id);
        break;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false });
  }
});

// Initiate refund
router.post('/refund', verifyCustomerToken, async (req, res) => {
  try {
    const { payment_id, amount, reason } = req.body;

    if (!payment_id) {
      return res.status(400).json({ success: false, message: 'Payment ID is required' });
    }

    const refundOptions = {
      speed: 'normal',
      notes: {
        reason: reason || 'Customer requested refund'
      }
    };

    if (amount) {
      refundOptions.amount = Math.round(amount * 100); // Convert to paise
    }

    const refund = await razorpay.payments.refund(payment_id, refundOptions);

    // Update payment record
    db.prepare(`
      UPDATE payments SET status = 'refund_initiated', refund_id = ? WHERE razorpay_payment_id = ?
    `).run(refund.id, payment_id);

    res.json({
      success: true,
      message: 'Refund initiated successfully',
      data: {
        refund_id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ success: false, message: 'Failed to process refund' });
  }
});

// Get Razorpay key (for frontend)
router.get('/key', (req, res) => {
  res.json({
    success: true,
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YourTestKeyId'
  });
});

export default router;
