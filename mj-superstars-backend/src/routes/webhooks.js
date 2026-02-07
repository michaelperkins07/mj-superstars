// ============================================================
// MJ's Superstars - Webhook API Routes
// Manage webhooks for external integrations + App Store notifications
// ============================================================

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { query } from '../database/db.js';
import webhooks, { WebhookEvents, EventCategories } from '../services/webhooks.js';
import appStoreVerification from '../services/appStoreVerification.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// ============================================================
// APP STORE SERVER NOTIFICATIONS V2 (PUBLIC)
// Receive and process App Store Server notifications
// ============================================================

/**
 * POST /api/webhooks/app-store
 * Handle Apple App Store Server Notifications v2
 * These are NOT authenticated (Apple sends them)
 */
router.post('/app-store',
  asyncHandler(async (req, res) => {
    const { signedPayload } = req.body;

    if (!signedPayload) {
      logger.warn('App Store notification received without signedPayload');
      return res.status(400).json({
        success: false,
        error: 'Missing signedPayload'
      });
    }

    try {
      // Verify and decode the notification
      const notification = await appStoreVerification.handleNotificationSafe(signedPayload);

      if (!notification.valid && !notification.gracefulDegrade) {
        logger.warn('App Store notification verification failed:', notification.error);
        return res.status(400).json({
          success: false,
          error: 'Notification verification failed'
        });
      }

      logger.info('App Store notification processed:', {
        notificationType: notification.notificationType,
        subtype: notification.subtype
      });

      const notificationType = notification.notificationType;
      const subtype = notification.subtype;
      const txnInfo = notification.transactionInfo;

      // Handle different notification types
      if (notificationType === 'SUBSCRIPTION_EVENT') {
        await handleSubscriptionEvent(subtype, txnInfo, notification);
      } else if (notificationType === 'TRANSACTION' || notificationType === 'RENEWAL') {
        await handleTransactionEvent(subtype, txnInfo, notification);
      } else if (notificationType === 'REFUND') {
        await handleRefundEvent(subtype, txnInfo, notification);
      }

      // Always respond with 200 to acknowledge receipt
      res.json({
        success: true,
        message: 'Notification processed'
      });
    } catch (error) {
      logger.error('App Store notification processing error:', error.message);

      // Still acknowledge to prevent Apple from resending
      res.status(200).json({
        success: true,
        message: 'Notification received (processing failed, will retry)'
      });
    }
  })
);

/**
 * Handle subscription events (renewal, upgrade, downgrade, etc.)
 */
async function handleSubscriptionEvent(subtype, txnInfo, notification) {
  if (!txnInfo) {
    logger.debug('No transaction info in subscription event');
    return;
  }

  const transactionId = txnInfo.transactionId || txnInfo.originalTransactionId;
  const productId = txnInfo.productId;
  const expiresDate = txnInfo.expiresDate ? new Date(parseInt(txnInfo.expiresDate, 10)) : null;
  const revocationDate = txnInfo.revocationDate ? new Date(parseInt(txnInfo.revocationDate, 10)) : null;

  logger.info('Handling subscription event:', {
    subtype,
    transactionId,
    productId,
    expiresDate,
    revoked: !!revocationDate
  });

  // Try to find the user associated with this subscription
  try {
    const result = await query(
      `SELECT user_id FROM subscriptions WHERE transaction_id = $1 LIMIT 1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      logger.debug('No subscription found for transaction:', transactionId);
      return;
    }

    const userId = result.rows[0].user_id;

    // Update subscription status based on event
    const isActive = !revocationDate && expiresDate && expiresDate > new Date();

    await query(
      `UPDATE subscriptions SET
        is_active = $1,
        expiration_date = $2,
        auto_renews = $3,
        updated_at = NOW()
      WHERE transaction_id = $4`,
      [isActive, expiresDate, !revocationDate, transactionId]
    );

    // Update user's premium status
    await query(
      `UPDATE users SET is_premium = $1 WHERE id = $2`,
      [isActive, userId]
    );

    logger.info('Updated subscription:', {
      userId,
      transactionId,
      isActive,
      subtype
    });
  } catch (error) {
    if (error.code === '42P01') {
      logger.debug('Subscriptions table does not exist yet');
      return;
    }
    logger.error('Failed to update subscription:', error.message);
  }
}

/**
 * Handle transaction events (purchase, renewal)
 */
async function handleTransactionEvent(subtype, txnInfo, notification) {
  if (!txnInfo) {
    logger.debug('No transaction info in transaction event');
    return;
  }

  logger.info('Handling transaction event:', {
    subtype,
    transactionId: txnInfo.transactionId,
    productId: txnInfo.productId
  });

  // Transaction events are typically initial purchases or renewals
  // They're also captured via subscription events, so minimal action needed here
}

/**
 * Handle refund/revocation events
 */
async function handleRefundEvent(subtype, txnInfo, notification) {
  if (!txnInfo) {
    logger.debug('No transaction info in refund event');
    return;
  }

  const transactionId = txnInfo.transactionId || txnInfo.originalTransactionId;

  logger.info('Handling refund event:', {
    subtype,
    transactionId,
    productId: txnInfo.productId
  });

  try {
    const result = await query(
      `SELECT user_id FROM subscriptions WHERE transaction_id = $1 LIMIT 1`,
      [transactionId]
    );

    if (result.rows.length === 0) {
      logger.debug('No subscription found for refunded transaction:', transactionId);
      return;
    }

    const userId = result.rows[0].user_id;

    // Mark subscription as inactive
    await query(
      `UPDATE subscriptions SET
        is_active = false,
        updated_at = NOW()
      WHERE transaction_id = $1`,
      [transactionId]
    );

    // Update user's premium status
    await query(
      `UPDATE users SET is_premium = false WHERE id = $1`,
      [userId]
    );

    logger.info('Processed refund/revocation:', {
      userId,
      transactionId,
      subtype
    });
  } catch (error) {
    if (error.code === '42P01') {
      logger.debug('Subscriptions table does not exist yet');
      return;
    }
    logger.error('Failed to process refund:', error.message);
  }
}

// ============================================================
// USER-DEFINED WEBHOOKS (AUTHENTICATED)
// ============================================================

// All subsequent webhook routes require authentication
router.use(authenticateToken);

// ============================================================
// WEBHOOK CRUD
// ============================================================

/**
 * GET /api/webhooks
 * List all webhooks for the current user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const userWebhooks = await webhooks.getUserWebhooks(userId);

    res.json({
      success: true,
      webhooks: userWebhooks,
      count: userWebhooks.length,
    });
  } catch (error) {
    logger.error('Error fetching webhooks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhooks',
    });
  }
});

/**
 * GET /api/webhooks/:id
 * Get a specific webhook
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const webhookId = req.params.id;

    const webhook = await webhooks.getWebhook(webhookId, userId);

    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    res.json({
      success: true,
      webhook,
    });
  } catch (error) {
    logger.error('Error fetching webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook',
    });
  }
});

/**
 * POST /api/webhooks
 * Create a new webhook
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { url, events, description } = req.body;

    // Validation
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required',
      });
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one event type is required',
        availableEvents: Object.values(WebhookEvents),
      });
    }

    const webhook = await webhooks.createWebhook(userId, {
      url,
      events,
      description,
    });

    res.status(201).json({
      success: true,
      message: 'Webhook created. A test event has been sent.',
      webhook,
      note: 'Save your webhook secret securely. It will not be shown again.',
    });
  } catch (error) {
    logger.error('Error creating webhook:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create webhook',
    });
  }
});

/**
 * PATCH /api/webhooks/:id
 * Update a webhook
 */
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const webhookId = req.params.id;
    const { url, events, description, active } = req.body;

    const webhook = await webhooks.updateWebhook(webhookId, userId, {
      url,
      events,
      description,
      active,
    });

    res.json({
      success: true,
      message: 'Webhook updated',
      webhook,
    });
  } catch (error) {
    logger.error('Error updating webhook:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update webhook',
    });
  }
});

/**
 * DELETE /api/webhooks/:id
 * Delete a webhook
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const webhookId = req.params.id;

    await webhooks.deleteWebhook(webhookId, userId);

    res.json({
      success: true,
      message: 'Webhook deleted',
    });
  } catch (error) {
    logger.error('Error deleting webhook:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delete webhook',
    });
  }
});

// ============================================================
// WEBHOOK ACTIONS
// ============================================================

/**
 * POST /api/webhooks/:id/test
 * Send a test event to a webhook
 */
router.post('/:id/test', async (req, res) => {
  try {
    const userId = req.user.id;
    const webhookId = req.params.id;

    // Verify ownership
    const webhook = await webhooks.getWebhook(webhookId, userId);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    const result = await webhooks.sendTestEvent(webhookId);

    res.json({
      success: result.success,
      message: result.success ? 'Test event sent successfully' : 'Test event failed',
      status: result.status,
    });
  } catch (error) {
    logger.error('Error sending test event:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test event',
    });
  }
});

/**
 * POST /api/webhooks/:id/regenerate-secret
 * Regenerate webhook secret
 */
router.post('/:id/regenerate-secret', async (req, res) => {
  try {
    const userId = req.user.id;
    const webhookId = req.params.id;

    const result = await webhooks.regenerateSecret(webhookId, userId);

    res.json({
      success: true,
      message: 'Secret regenerated',
      secret: result.secret,
      note: 'Save your new webhook secret securely. It will not be shown again.',
    });
  } catch (error) {
    logger.error('Error regenerating secret:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to regenerate secret',
    });
  }
});

/**
 * POST /api/webhooks/:id/toggle
 * Toggle webhook active state
 */
router.post('/:id/toggle', async (req, res) => {
  try {
    const userId = req.user.id;
    const webhookId = req.params.id;

    const webhook = await webhooks.getWebhook(webhookId, userId);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    const updated = await webhooks.updateWebhook(webhookId, userId, {
      active: !webhook.active,
    });

    res.json({
      success: true,
      message: `Webhook ${updated.active ? 'enabled' : 'disabled'}`,
      active: updated.active,
    });
  } catch (error) {
    logger.error('Error toggling webhook:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to toggle webhook',
    });
  }
});

// ============================================================
// LOGS & HISTORY
// ============================================================

/**
 * GET /api/webhooks/:id/logs
 * Get delivery logs for a webhook
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const userId = req.user.id;
    const webhookId = req.params.id;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    // Verify ownership
    const webhook = await webhooks.getWebhook(webhookId, userId);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    const logs = await webhooks.getWebhookLogs(webhookId, limit);

    res.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error) {
    logger.error('Error fetching webhook logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook logs',
    });
  }
});

// ============================================================
// INFORMATION
// ============================================================

/**
 * GET /api/webhooks/info/events
 * List available webhook events
 */
router.get('/info/events', (req, res) => {
  res.json({
    success: true,
    events: WebhookEvents,
    categories: EventCategories,
    description: {
      'user.*': 'Triggered when user account changes',
      'subscription.*': 'Triggered on subscription lifecycle events',
      'mood.*': 'Triggered when moods are logged or milestones reached',
      'conversation.*': 'Triggered on chat activity',
      'journal.*': 'Triggered when journal entries are created',
      'task.*': 'Triggered when tasks are created or completed',
      'buddy.*': 'Triggered on buddy activity',
      'achievement.*': 'Triggered when achievements are unlocked',
      'health.*': 'Triggered when health data is synced',
    },
  });
});

/**
 * GET /api/webhooks/info/signature
 * Information about verifying webhook signatures
 */
router.get('/info/signature', (req, res) => {
  res.json({
    success: true,
    verification: {
      algorithm: 'HMAC-SHA256',
      header: 'X-MJ-Webhook-Signature',
      timestampHeader: 'X-MJ-Webhook-Timestamp',
      format: 'v1={signature}',
      signaturePayload: '{timestamp}.{body}',
    },
    example: {
      javascript: `
const crypto = require('crypto');

function verifyWebhook(body, timestamp, signature, secret) {
  const payload = \`\${timestamp}.\${JSON.stringify(body)}\`;
  const expected = 'v1=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`,
      python: `
import hmac
import hashlib

def verify_webhook(body, timestamp, signature, secret):
    payload = f"{timestamp}.{body}"
    expected = 'v1=' + hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)`,
    },
    tips: [
      'Always verify timestamps to prevent replay attacks',
      'Reject requests older than 5 minutes',
      'Use timing-safe comparison for signatures',
      'Log failed verifications for debugging',
    ],
  });
});

export default router;
