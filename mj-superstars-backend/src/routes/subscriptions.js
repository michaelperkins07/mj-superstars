// ============================================================
// MJ's Superstars - Subscription Management Routes
// ============================================================

import { Router } from 'express';
import { query } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();
router.use(authenticate);

// ============================================================
// GET /api/subscriptions/status
// ============================================================

router.get('/status',
  asyncHandler(async (req, res) => {
    // Check if subscriptions table exists, gracefully handle if not
    try {
      const result = await query(
        `SELECT id, user_id, product_id, purchase_date, expiration_date,
                is_active, is_trial, trial_end_date, auto_renews
         FROM subscriptions
         WHERE user_id = $1 AND is_active = true
         ORDER BY expiration_date DESC
         LIMIT 1`,
        [req.user.id]
      );

      const subscription = result.rows[0] || null;

      res.json({
        success: true,
        isPremium: !!subscription && subscription.is_active,
        subscription: subscription ? {
          productId: subscription.product_id,
          purchaseDate: subscription.purchase_date,
          expirationDate: subscription.expiration_date,
          isTrialPeriod: subscription.is_trial,
          trialEndDate: subscription.trial_end_date,
          willAutoRenew: subscription.auto_renews
        } : null
      });
    } catch (error) {
      // Table may not exist yet — return default free-tier status
      if (error.code === '42P01') {
        logger.warn('Subscriptions table does not exist yet — returning free-tier default');
        return res.json({
          success: true,
          isPremium: false,
          subscription: null
        });
      }
      throw error;
    }
  })
);

// ============================================================
// POST /api/subscriptions/verify - Verify App Store receipt
// ============================================================

router.post('/verify',
  asyncHandler(async (req, res) => {
    const { receipt, product_id, transaction_id } = req.body;

    if (!receipt || !product_id) {
      return res.status(400).json({
        error: 'Missing receipt or product_id',
        code: 'MISSING_PARAMS'
      });
    }

    // TODO: Implement App Store Server API v2 verification
    // For now, log and acknowledge
    logger.info('Subscription verification request:', {
      userId: req.user.id,
      productId: product_id,
      transactionId: transaction_id
    });

    res.json({
      success: true,
      verified: true,
      message: 'Receipt acknowledged (server-side verification pending setup)'
    });
  })
);

// ============================================================
// POST /api/subscriptions/sync - Sync subscription state from client
// ============================================================

router.post('/sync',
  asyncHandler(async (req, res) => {
    const { product_id, is_active, expiration_date, is_trial, auto_renews } = req.body;

    logger.info('Subscription sync:', {
      userId: req.user.id,
      productId: product_id,
      isActive: is_active
    });

    // Update user's premium status
    try {
      await query(
        `UPDATE users SET is_premium = $1 WHERE id = $2`,
        [!!is_active, req.user.id]
      );
    } catch (error) {
      logger.warn('Could not update user premium status:', error.message);
    }

    res.json({
      success: true,
      message: 'Subscription state synced'
    });
  })
);

export default router;
