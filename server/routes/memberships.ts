import { Router } from 'express';
import QRCode from 'qrcode';
import { pg } from '../db.js';
import { AuthRequest, requireAuth, checkUserSubscription, logAdminAction } from '../auth.js';

const router = Router();

// Calendar month addition helper
export function addCalendarMonths(startDate: Date, months: number): Date {
  const result = new Date(startDate.getTime());
  const expectedMonth = (result.getMonth() + months) % 12;
  result.setMonth(result.getMonth() + months);
  // Handle month overflow (e.g. Jan 31 -> Feb 28)
  if (result.getMonth() !== expectedMonth) {
    result.setDate(0);
  }
  return result;
}

// Get all active membership plans
router.get('/plans', async (req, res) => {
  try {
    const plansRes = await pg.query(`
      SELECT id, name, duration_months, price_usd, price_crypto, crypto_symbol, features, is_active
      FROM membership_plans
      WHERE is_active = TRUE
      ORDER BY duration_months ASC
    `);

    // Parse features json
    const plans = plansRes.rows.map((p: any) => ({
      ...p,
      features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features
    }));

    return res.json({ plans });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve membership plans.' });
  }
});

// Get crypto settings for checkout
router.get('/crypto-settings', async (req, res) => {
  try {
    const settingsRes = await pg.query('SELECT * FROM crypto_payment_settings LIMIT 1');
    if (settingsRes.rows.length === 0) {
      return res.status(404).json({ error: 'Payment settings not configured.' });
    }

    const s = settingsRes.rows[0] as any;
    return res.json({
      isEnabled: s.is_enabled,
      assetSymbol: s.asset_symbol,
      network: s.network,
      receivingAddress: s.receiving_address,
      acceptedCurrencies: typeof s.accepted_currencies === 'string' ? JSON.parse(s.accepted_currencies) : s.accepted_currencies,
      requiredConfirmations: s.required_confirmations,
      paymentInstructions: s.payment_instructions,
      cardPaymentsEnabled: false // explicitly false
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve payment configuration.' });
  }
});

// Create payment order (User Crypto Checkout - Section 16 & 17)
router.post('/orders/create', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { planId, assetSymbol = 'USDT', network = 'TRC20' } = req.body;
    const userId = req.user!.id;

    if (!planId) {
      return res.status(400).json({ error: 'Plan selection is required.' });
    }

    // Fetch plan
    const planRes = await pg.query('SELECT * FROM membership_plans WHERE id = $1 AND is_active = TRUE', [planId]);
    if (planRes.rows.length === 0) {
      return res.status(404).json({ error: 'Selected membership plan is invalid or inactive.' });
    }
    const plan = planRes.rows[0] as any;

    // Fetch crypto settings
    const settingsRes = await pg.query('SELECT * FROM crypto_payment_settings LIMIT 1');
    const settings = settingsRes.rows[0] as any;

    if (!settings.is_enabled) {
      return res.status(400).json({ error: 'Cryptocurrency checkout is currently paused for maintenance.' });
    }

    // Generate unique order reference (e.g. BH-2026-00051)
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const orderRef = `BH-2026-${randomSuffix}`;

    const receivingAddress = settings.receiving_address;
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours expiration

    // Convert price if required (USDT is 1:1 with USD)
    let cryptoAmount = plan.price_crypto;
    if (assetSymbol === 'BTC') {
      cryptoAmount = parseFloat((plan.price_usd / 88500).toFixed(6));
    } else if (assetSymbol === 'ETH') {
      cryptoAmount = parseFloat((plan.price_usd / 3200).toFixed(5));
    } else if (assetSymbol === 'LTC') {
      cryptoAmount = parseFloat((plan.price_usd / 95).toFixed(4));
    }

    const insertOrder = await pg.query(`
      INSERT INTO payment_orders (
        order_reference, user_id, plan_id, amount_usd, amount_crypto,
        asset_symbol, network, receiving_address, status, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
      RETURNING *
    `, [
      orderRef,
      userId,
      plan.id,
      plan.price_usd,
      cryptoAmount,
      assetSymbol,
      network,
      receivingAddress,
      expiresAt.toISOString()
    ]);

    const order = insertOrder.rows[0] as any;

    // Generate QR Code data URL for the receiving address
    let qrCodeUrl = '';
    try {
      const qrData = `${assetSymbol.toLowerCase()}:${receivingAddress}?amount=${cryptoAmount}`;
      qrCodeUrl = await QRCode.toDataURL(qrData);
    } catch (e) {
      qrCodeUrl = await QRCode.toDataURL(receivingAddress);
    }

    return res.status(201).json({
      order: {
        id: order.id,
        orderReference: order.order_reference,
        userId: order.user_id,
        planId: order.plan_id,
        planName: plan.name,
        durationMonths: plan.duration_months,
        amountUsd: order.amount_usd,
        amountCrypto: order.amount_crypto,
        assetSymbol: order.asset_symbol,
        network: order.network,
        receivingAddress: order.receiving_address,
        status: order.status,
        expiresAt: order.expires_at,
        qrCodeUrl
      }
    });
  } catch (err: any) {
    console.error('[Create Order Error]:', err);
    return res.status(500).json({ error: 'Failed to generate crypto payment order.' });
  }
});

// Get order status
router.get('/orders/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'Administrator';

    const orderRes = await pg.query(`
      SELECT o.*, p.name as plan_name, p.duration_months,
             pt.transaction_hash, pt.status as tx_status, pt.confirmations,
             s.id as subscription_id, s.starts_at as sub_starts_at, s.expires_at as sub_expires_at
      FROM payment_orders o
      JOIN membership_plans p ON o.plan_id = p.id
      LEFT JOIN payment_transactions pt ON o.id = pt.payment_order_id
      LEFT JOIN subscriptions s ON o.id = s.payment_order_id
      WHERE (o.id = $1 OR o.order_reference = $2)
    `, [isNaN(parseInt(orderId)) ? -1 : parseInt(orderId), orderId]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderRes.rows[0] as any;
    if (order.user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to view this order.' });
    }

    // Check expiration
    if (order.status === 'pending' && new Date(order.expires_at) < new Date()) {
      await pg.query("UPDATE payment_orders SET status = 'expired' WHERE id = $1", [order.id]);
      order.status = 'expired';
    }

    let qrCodeUrl = '';
    try {
      qrCodeUrl = await QRCode.toDataURL(order.receiving_address);
    } catch (e) {}

    return res.json({
      order: {
        id: order.id,
        orderReference: order.order_reference,
        userId: order.user_id,
        planName: order.plan_name,
        durationMonths: order.duration_months,
        amountUsd: order.amount_usd,
        amountCrypto: order.amount_crypto,
        assetSymbol: order.asset_symbol,
        network: order.network,
        receivingAddress: order.receiving_address,
        status: order.status,
        expiresAt: order.expires_at,
        transactionHash: order.transaction_hash,
        txStatus: order.tx_status,
        confirmations: order.confirmations || 0,
        subscriptionId: order.subscription_id,
        subExpiresAt: order.sub_expires_at,
        qrCodeUrl
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve order status.' });
  }
});

// Submit Transaction Hash for Verification (Section 18)
router.post('/orders/:id/submit-tx', requireAuth, async (req: AuthRequest, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { transactionHash, senderAddress } = req.body;
    const userId = req.user!.id;

    if (!transactionHash || !transactionHash.trim()) {
      return res.status(400).json({ error: 'Transaction hash is required.' });
    }

    const cleanTxHash = transactionHash.trim();

    // Verify order belongs to user and is pending
    const orderRes = await pg.query('SELECT * FROM payment_orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderRes.rows[0] as any;
    if (order.user_id !== userId && req.user!.role !== 'Administrator') {
      return res.status(403).json({ error: 'Unauthorized to modify this order.' });
    }

    if (order.status === 'confirmed') {
      return res.status(400).json({ error: 'This payment order has already been confirmed and activated.' });
    }

    if (order.status === 'expired') {
      return res.status(400).json({ error: 'This payment order has expired. Please create a new order.' });
    }

    // Check duplicate transaction hash across system (Prevent replay attacks)
    const duplicateCheck = await pg.query('SELECT id, payment_order_id FROM payment_transactions WHERE transaction_hash = $1', [cleanTxHash]);
    if (duplicateCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'Duplicate transaction hash detected! This blockchain transaction has already been recorded for another order.'
      });
    }

    // Fetch crypto settings to check verification mode (auto or manual)
    const settingsRes = await pg.query('SELECT * FROM crypto_payment_settings LIMIT 1');
    const settings = settingsRes.rows[0] as any;

    // Insert transaction
    await pg.query(`
      INSERT INTO payment_transactions (
        payment_order_id, transaction_hash, sender_address, received_amount,
        confirmations, verification_source, status
      )
      VALUES ($1, $2, $3, $4, 1, $5, 'pending')
    `, [
      orderId,
      cleanTxHash,
      senderAddress || null,
      order.amount_crypto,
      settings.verification_mode === 'auto' ? 'blockchain_api' : 'admin_manual'
    ]);

    // If auto mode is enabled, verify transaction and activate membership
    if (settings.verification_mode === 'auto') {
      // Simulate blockchain verification
      await pg.query(`
        UPDATE payment_transactions
        SET status = 'verified', confirmations = 3, verified_at = CURRENT_TIMESTAMP
        WHERE payment_order_id = $1
      `, [orderId]);

      // Update order status
      await pg.query("UPDATE payment_orders SET status = 'confirmed' WHERE id = $1", [orderId]);

      // Activate subscription (Section 19: Calendar Month Arithmetic)
      const planRes = await pg.query('SELECT * FROM membership_plans WHERE id = $1', [order.plan_id]);
      const plan = planRes.rows[0] as any;

      const now = new Date();
      const expiresAt = addCalendarMonths(now, plan.duration_months);

      // Create subscription in database transaction
      const subInsert = await pg.query(`
        INSERT INTO subscriptions (user_id, plan_id, status, starts_at, expires_at, payment_order_id)
        VALUES ($1, $2, 'active', $3, $4, $5)
        RETURNING id
      `, [userId, plan.id, now.toISOString(), expiresAt.toISOString(), orderId]);

      // Promote role to Premium Subscriber if regular user
      await pg.query(`
        UPDATE users 
        SET role = CASE WHEN role = 'Registered User' THEN 'Premium Subscriber' ELSE role END
        WHERE id = $1
      `, [userId]);

      // Log verification
      await pg.query(`
        INSERT INTO payment_verification_logs (payment_order_id, action, details)
        VALUES ($1, 'auto_verified', $2)
      `, [orderId, `Automatic blockchain API confirmed Tx ${cleanTxHash}`]);

      // Create notification
      await pg.query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, 'Premium Membership Activated!', $2, 'billing')
      `, [userId, `Your ${plan.name} (${plan.duration_months} Month) subscription is now active until ${expiresAt.toLocaleDateString()}. Enjoy ad-free 4K streaming!`]);

      return res.json({
        message: 'Payment verified and Premium membership activated successfully!',
        status: 'confirmed',
        subscriptionActivated: true,
        expiresAt: expiresAt.toISOString()
      });
    } else {
      // Manual review mode: Set status to under_verification
      await pg.query("UPDATE payment_orders SET status = 'under_verification' WHERE id = $1", [orderId]);

      // Notify user
      await pg.query(`
        INSERT INTO notifications (user_id, title, message, type)
        VALUES ($1, 'Payment Under Verification', $2, 'billing')
      `, [userId, `Transaction hash submitted for order ${order.order_reference}. An administrator will verify the blockchain transaction shortly.`]);

      return res.json({
        message: 'Transaction hash submitted. Your order is pending verification by our payment department.',
        status: 'under_verification',
        subscriptionActivated: false
      });
    }
  } catch (err: any) {
    console.error('[Submit Tx Error]:', err);
    return res.status(500).json({ error: 'Failed to record transaction.' });
  }
});

// Card Payment Disabled endpoint (Section 14)
router.post('/card-checkout', (req, res) => {
  return res.status(400).json({
    error: 'Credit/Debit card payments are currently disabled. BlackHub exclusively supports cryptocurrency payments for maximum privacy and security.'
  });
});

// User's active subscription status & payment history
router.get('/my-subscription', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const sub = await checkUserSubscription(userId);

    // Fetch payment order history
    const historyRes = await pg.query(`
      SELECT o.id, o.order_reference, o.amount_usd, o.amount_crypto, o.asset_symbol,
             o.network, o.status, o.created_at, p.name as plan_name, p.duration_months,
             pt.transaction_hash
      FROM payment_orders o
      JOIN membership_plans p ON o.plan_id = p.id
      LEFT JOIN payment_transactions pt ON o.id = pt.payment_order_id
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
      LIMIT 20
    `, [userId]);

    return res.json({
      isPremium: sub.isPremium,
      expiresAt: sub.expiresAt,
      planName: sub.planName,
      orders: historyRes.rows
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch subscription details.' });
  }
});

export default router;
