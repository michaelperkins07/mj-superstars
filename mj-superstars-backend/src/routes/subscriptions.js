// ============================================================
// Top Performer - Subscription Management Routes
// ============================================================

import { Router } from 'express';
import { query } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import appStoreVerification from '../services/appStoreVerification.js';

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
// POST /api/subscriptions/verify
// Verify App Store transaction and upsert subscription
// ============================================================

router.post('/verify',
  asyncHandler(async (req, res) => {
    const { transactionId, receipt } = req.body;
    const product_id = req.body.product_id || req.body.productId;
    const userId = req.user.id;

    if (!transactionId && !receipt) {
      return res.status(400).json({
        success: false,
        error: 'Missing transactionId or receipt',
        code: 'MISSING_PARAMS'
      });
    }

    logger.info('Subscription verification request:', {
      userId,
      transactionId,
      productId: product_id
    });

    try {
      // Verify the transaction with Apple's servers
      const verification = await appStoreVerification.verifyTransactionSafe(
        transactionId || receipt
      );

      if (!verification.valid && !verification.gracefulDegrade) {
        logger.warn('Transaction verification failed:', verification.error);
        return res.status(400).json({
          success: false,
          verified: false,
          error: verification.error,
          code: 'VERIFICATION_FAILED'
        });
      }

      // Extract subscription details from verified transaction
      const txnInfo = verification.transactionInfo;
      const isActive = txnInfo && txnInfo.expiresDate && parseInt(txnInfo.expiresDate, 10) > Date.now();
      const productId = txnInfo?.productId || product_id;
      const purchaseDate = txnInfo?.purchaseDate ? new Date(parseInt(txnInfo.purchaseDate, 10)) : new Date();
      const expirationDate = txnInfo?.expiresDate ? new Date(parseInt(txnInfo.expiresDate, 10)) : null;
      const isTrialPeriod = txnInfo?.isTrialPeriod || false;

      try {
        // Try to upsert into subscriptions table
        const result = await query(
          `INSERT INTO subscriptions (
            user_id, transaction_id, product_id, purchase_date, expiration_date,
            is_active, is_trial, auto_renews, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (transaction_id) DO UPDATE SET
            is_active = $6,
            expiration_date = $5,
            auto_renews = $8,
            updated_at = NOW()
          RETURNING id, user_id, product_id, purchase_date, expiration_date, is_active`,
          [
            userId,
            transactionId || receipt,
            productId,
            purchaseDate,
            expirationDate,
            isActive,
            isTrialPeriod,
            txnInfo && !txnInfo.revocationDate // auto_renews if not revoked
          ]
        );

        const subscription = result.rows[0];

        // Update user's premium status and subscription info
        try {
          await query(
            `UPDATE users SET is_premium = $1, subscription_product_id = $2,
             subscription_expires_at = $3, subscription_status = $4 WHERE id = $5`,
            [isActive, productId, expirationDate, isActive ? 'active' : 'expired', userId]
          );
          logger.info('Updated user premium status:', { userId, isPremium: isActive });
        } catch (error) {
          // Fallback: just update is_premium if other columns don't exist
          try {
            await query(`UPDATE users SET is_premium = $1 WHERE id = $2`, [isActive, userId]);
          } catch (innerErr) {
            logger.warn('Could not update user premium status:', innerErr.message);
          }
        }

        logger.info('Subscription verified and stored:', {
          userId,
          transactionId,
          isActive,
          productId
        });

        res.json({
          success: true,
          verified: verification.valid,
          subscription: {
            id: subscription.id,
            transactionId: subscription.transaction_id || transactionId || receipt,
            productId: subscription.product_id,
            purchaseDate: subscription.purchase_date,
            expirationDate: subscription.expiration_date,
            isActive: subscription.is_active,
            isTrialPeriod: isTrialPeriod
          },
          gracefulDegrade: verification.gracefulDegrade || false
        });
      } catch (dbError) {
        // If subscriptions table doesn't exist, still return success with verified status
        if (dbError.code === '42P01') {
          logger.warn('Subscriptions table does not exist yet, skipping DB upsert');
          return res.json({
            success: true,
            verified: verification.valid,
            subscription: {
              transactionId: transactionId || receipt,
              productId: productId,
              purchaseDate: purchaseDate,
              expirationDate: expirationDate,
              isActive: isActive,
              isTrialPeriod: isTrialPeriod
            },
            message: 'Transaction verified (table not yet created)',
            gracefulDegrade: true
          });
        }
        throw dbError;
      }
    } catch (error) {
      logger.error('Subscription verification error:', {
        userId,
        transactionId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        verified: false,
        error: 'Verification service error',
        code: 'VERIFICATION_ERROR'
      });
    }
  })
);

// ============================================================
// POST /api/subscriptions/sync - Sync subscription state from client
// ============================================================

router.post('/sync',
  asyncHandler(async (req, res) => {
    // Accept both camelCase (from iOS client) and snake_case field names
    const productId = req.body.productId || req.body.product_id;
    const transactionId = req.body.transactionId || req.body.transaction_id;
    const originalTransactionId = req.body.originalTransactionId || req.body.original_transaction_id;
    const receipt = req.body.receipt;
    const isActive = req.body.isActive ?? req.body.is_active ?? true;
    const expirationDate = req.body.expirationDate || req.body.expiration_date;
    const isTrial = req.body.isTrialPeriod ?? req.body.is_trial ?? false;
    const autoRenews = req.body.autoRenews ?? req.body.auto_renews ?? true;
    const userId = req.user.id;

    logger.info('Subscription sync:', {
      userId,
      productId,
      transactionId,
      isActive
    });

    // If we have a transactionId, try to upsert into subscriptions table
    if (transactionId) {
      try {
        await query(
          `INSERT INTO subscriptions (
            user_id, transaction_id, product_id, purchase_date, expiration_date,
            is_active, is_trial, auto_renews, updated_at
          ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, NOW())
          ON CONFLICT (transaction_id) DO UPDATE SET
            is_active = $5,
            expiration_date = $4,
            auto_renews = $7,
            updated_at = NOW()`,
          [
            userId,
            transactionId,
            productId,
            expirationDate ? new Date(expirationDate) : null,
            !!isActive,
            !!isTrial,
            !!autoRenews
          ]
        );
        logger.info('Subscription record upserted:', { userId, transactionId });
      } catch (dbError) {
        if (dbError.code !== '42P01') {
          logger.warn('Could not upsert subscription:', dbError.message);
        }
      }
    }

    // Update user's premium status
    try {
      await query(
        `UPDATE users SET is_premium = $1, subscription_product_id = $2, subscription_expires_at = $3 WHERE id = $4`,
        [!!isActive, productId || null, expirationDate ? new Date(expirationDate) : null, userId]
      );
      logger.info('User premium status synced:', { userId, isPremium: isActive });
    } catch (error) {
      // Fallback: just update is_premium if other columns don't exist yet
      try {
        await query(
          `UPDATE users SET is_premium = $1 WHERE id = $2`,
          [!!isActive, userId]
        );
      } catch (innerError) {
        if (innerError.code !== '42P01') {
          logger.warn('Could not update user premium status:', innerError.message);
        }
      }
    }

    res.json({
      success: true,
      message: 'Subscription state synced'
    });
  })
);

export default router;
