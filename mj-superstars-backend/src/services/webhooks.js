// ============================================================
// MJ's Superstars - Webhook Service
// Event-driven integrations with external systems
// ============================================================

import crypto from 'crypto';
import pool from '../database/db.js';
import { logger } from '../utils/logger.js';
import jobQueue from './jobQueue.js';

// ============================================================
// CONFIGURATION
// ============================================================

const MAX_WEBHOOKS_PER_USER = 10;
const WEBHOOK_TIMEOUT_MS = 30000;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAYS = [60, 300, 1800, 7200, 21600]; // seconds

// ============================================================
// EVENT TYPES
// ============================================================

const WebhookEvents = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Subscription events
  SUBSCRIPTION_STARTED: 'subscription.started',
  SUBSCRIPTION_RENEWED: 'subscription.renewed',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_EXPIRED: 'subscription.expired',

  // Mood events
  MOOD_LOGGED: 'mood.logged',
  MOOD_STREAK_UPDATED: 'mood.streak_updated',
  MOOD_MILESTONE: 'mood.milestone',

  // Conversation events
  CONVERSATION_STARTED: 'conversation.started',
  CONVERSATION_MESSAGE: 'conversation.message',

  // Journal events
  JOURNAL_ENTRY_CREATED: 'journal.entry_created',

  // Task events
  TASK_CREATED: 'task.created',
  TASK_COMPLETED: 'task.completed',

  // Buddy events
  BUDDY_CONNECTED: 'buddy.connected',
  BUDDY_ACTIVITY: 'buddy.activity',

  // Achievement events
  ACHIEVEMENT_UNLOCKED: 'achievement.unlocked',

  // Health events
  HEALTH_DATA_SYNCED: 'health.data_synced',
};

// Event categories for filtering
const EventCategories = {
  USER: ['user.created', 'user.updated', 'user.deleted'],
  SUBSCRIPTION: ['subscription.started', 'subscription.renewed', 'subscription.cancelled', 'subscription.expired'],
  MOOD: ['mood.logged', 'mood.streak_updated', 'mood.milestone'],
  CONVERSATION: ['conversation.started', 'conversation.message'],
  JOURNAL: ['journal.entry_created'],
  TASK: ['task.created', 'task.completed'],
  BUDDY: ['buddy.connected', 'buddy.activity'],
  ACHIEVEMENT: ['achievement.unlocked'],
  HEALTH: ['health.data_synced'],
};

// ============================================================
// WEBHOOK MANAGEMENT
// ============================================================

/**
 * Create a new webhook
 */
async function createWebhook(userId, data) {
  const { url, events, description, secret } = data;

  // Validate URL
  if (!isValidWebhookUrl(url)) {
    throw new Error('Invalid webhook URL. Must be HTTPS.');
  }

  // Check webhook limit
  const count = await getWebhookCount(userId);
  if (count >= MAX_WEBHOOKS_PER_USER) {
    throw new Error(`Maximum ${MAX_WEBHOOKS_PER_USER} webhooks allowed per user`);
  }

  // Validate events
  const validEvents = events.filter(e => Object.values(WebhookEvents).includes(e));
  if (validEvents.length === 0) {
    throw new Error('At least one valid event type is required');
  }

  // Generate secret if not provided
  const webhookSecret = secret || generateWebhookSecret();

  const result = await pool.query(
    `INSERT INTO webhooks
      (user_id, url, events, description, secret, active, created_at)
     VALUES ($1, $2, $3, $4, $5, true, NOW())
     RETURNING id, url, events, description, active, created_at`,
    [userId, url, JSON.stringify(validEvents), description, webhookSecret]
  );

  const webhook = result.rows[0];

  // Test the webhook
  await sendTestEvent(webhook.id);

  return {
    ...webhook,
    secret: webhookSecret, // Only return secret on creation
  };
}

/**
 * Update a webhook
 */
async function updateWebhook(webhookId, userId, data) {
  const { url, events, description, active } = data;

  const updates = [];
  const values = [webhookId, userId];
  let paramIndex = 3;

  if (url !== undefined) {
    if (!isValidWebhookUrl(url)) {
      throw new Error('Invalid webhook URL. Must be HTTPS.');
    }
    updates.push(`url = $${paramIndex++}`);
    values.push(url);
  }

  if (events !== undefined) {
    const validEvents = events.filter(e => Object.values(WebhookEvents).includes(e));
    if (validEvents.length === 0) {
      throw new Error('At least one valid event type is required');
    }
    updates.push(`events = $${paramIndex++}`);
    values.push(JSON.stringify(validEvents));
  }

  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description);
  }

  if (active !== undefined) {
    updates.push(`active = $${paramIndex++}`);
    values.push(active);
  }

  if (updates.length === 0) {
    throw new Error('No updates provided');
  }

  updates.push('updated_at = NOW()');

  const result = await pool.query(
    `UPDATE webhooks SET ${updates.join(', ')}
     WHERE id = $1 AND user_id = $2
     RETURNING id, url, events, description, active, created_at, updated_at`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Webhook not found');
  }

  return result.rows[0];
}

/**
 * Delete a webhook
 */
async function deleteWebhook(webhookId, userId) {
  const result = await pool.query(
    `DELETE FROM webhooks WHERE id = $1 AND user_id = $2 RETURNING id`,
    [webhookId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Webhook not found');
  }

  return { success: true, deleted: webhookId };
}

/**
 * Get user's webhooks
 */
async function getUserWebhooks(userId) {
  const result = await pool.query(
    `SELECT id, url, events, description, active, created_at, updated_at,
            last_triggered_at, failure_count
     FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Get a specific webhook
 */
async function getWebhook(webhookId, userId) {
  const result = await pool.query(
    `SELECT id, url, events, description, active, created_at, updated_at,
            last_triggered_at, failure_count
     FROM webhooks WHERE id = $1 AND user_id = $2`,
    [webhookId, userId]
  );
  return result.rows[0] || null;
}

/**
 * Get webhook count for user
 */
async function getWebhookCount(userId) {
  const result = await pool.query(
    `SELECT COUNT(*) FROM webhooks WHERE user_id = $1`,
    [userId]
  );
  return parseInt(result.rows[0].count);
}

/**
 * Regenerate webhook secret
 */
async function regenerateSecret(webhookId, userId) {
  const newSecret = generateWebhookSecret();

  const result = await pool.query(
    `UPDATE webhooks SET secret = $3, updated_at = NOW()
     WHERE id = $1 AND user_id = $2 RETURNING id`,
    [webhookId, userId, newSecret]
  );

  if (result.rows.length === 0) {
    throw new Error('Webhook not found');
  }

  return { success: true, secret: newSecret };
}

// ============================================================
// EVENT TRIGGERING
// ============================================================

/**
 * Trigger webhooks for an event
 */
async function triggerEvent(event, userId, payload) {
  // Get all active webhooks for this user that listen to this event
  const result = await pool.query(
    `SELECT id, url, secret, events FROM webhooks
     WHERE user_id = $1 AND active = true AND events @> $2`,
    [userId, JSON.stringify([event])]
  );

  const webhooks = result.rows;

  if (webhooks.length === 0) {
    return { triggered: 0 };
  }

  // Queue webhook deliveries
  const jobs = [];
  for (const webhook of webhooks) {
    const job = await jobQueue.webhooks.sendWebhook(
      webhook.id,
      webhook.url,
      event,
      {
        ...payload,
        userId,
      }
    );
    jobs.push(job.id);
  }

  // Update last triggered timestamp
  await pool.query(
    `UPDATE webhooks SET last_triggered_at = NOW()
     WHERE id = ANY($1)`,
    [webhooks.map(w => w.id)]
  );

  return {
    triggered: webhooks.length,
    jobIds: jobs,
  };
}

/**
 * Send a test event to a webhook
 */
async function sendTestEvent(webhookId) {
  const result = await pool.query(
    `SELECT url, secret FROM webhooks WHERE id = $1`,
    [webhookId]
  );

  if (result.rows.length === 0) {
    throw new Error('Webhook not found');
  }

  const { url, secret } = result.rows[0];

  const testPayload = {
    event: 'webhook.test',
    data: {
      message: 'This is a test event from MJ\'s Superstars',
      webhookId,
      timestamp: new Date().toISOString(),
    },
  };

  return await deliverWebhook(url, testPayload, secret);
}

// ============================================================
// WEBHOOK DELIVERY
// ============================================================

/**
 * Deliver a webhook payload
 */
async function deliverWebhook(url, payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(payload);

  // Generate signature
  const signature = generateSignature(body, timestamp, secret);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-MJ-Webhook-Signature': signature,
        'X-MJ-Webhook-Timestamp': timestamp.toString(),
        'X-MJ-Webhook-Event': payload.event,
        'User-Agent': 'MJ-Superstars-Webhook/1.0',
      },
      body,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    const success = response.ok;

    // Log delivery attempt
    await logDelivery(payload.webhookId || null, {
      url,
      event: payload.event,
      status: response.status,
      success,
    });

    return {
      success,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    // Log failed delivery
    await logDelivery(payload.webhookId || null, {
      url,
      event: payload.event,
      status: 0,
      success: false,
      error: error.message,
    });

    throw error;
  }
}

/**
 * Record webhook delivery failure
 */
async function recordFailure(webhookId) {
  const result = await pool.query(
    `UPDATE webhooks
     SET failure_count = failure_count + 1,
         active = CASE WHEN failure_count >= $2 THEN false ELSE active END
     WHERE id = $1
     RETURNING failure_count, active`,
    [webhookId, MAX_RETRY_ATTEMPTS]
  );

  return result.rows[0];
}

/**
 * Reset failure count on success
 */
async function recordSuccess(webhookId) {
  await pool.query(
    `UPDATE webhooks SET failure_count = 0 WHERE id = $1`,
    [webhookId]
  );
}

// ============================================================
// SIGNATURE & VERIFICATION
// ============================================================

/**
 * Generate webhook signature
 */
function generateSignature(payload, timestamp, secret) {
  const signaturePayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');
  return `v1=${signature}`;
}

/**
 * Verify webhook signature (for receivers)
 */
function verifySignature(payload, timestamp, signature, secret) {
  const expectedSignature = generateSignature(payload, timestamp, secret);

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Generate a new webhook secret
 */
function generateWebhookSecret() {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Validate webhook URL
 */
function isValidWebhookUrl(url) {
  try {
    const parsed = new URL(url);
    // Require HTTPS in production
    if (process.env.NODE_ENV === 'production') {
      return parsed.protocol === 'https:';
    }
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Log webhook delivery attempt
 */
async function logDelivery(webhookId, data) {
  try {
    await pool.query(
      `INSERT INTO webhook_logs
        (webhook_id, url, event, status_code, success, error, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [webhookId, data.url, data.event, data.status, data.success, data.error]
    );
  } catch (error) {
    logger.error('Failed to log webhook delivery:', error);
  }
}

/**
 * Get webhook delivery logs
 */
async function getWebhookLogs(webhookId, limit = 50) {
  const result = await pool.query(
    `SELECT event, status_code, success, error, created_at
     FROM webhook_logs WHERE webhook_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [webhookId, limit]
  );
  return result.rows;
}

// ============================================================
// CONVENIENCE EVENT TRIGGERS
// ============================================================

const events = {
  // User events
  userCreated: (userId, data) =>
    triggerEvent(WebhookEvents.USER_CREATED, userId, data),
  userUpdated: (userId, data) =>
    triggerEvent(WebhookEvents.USER_UPDATED, userId, data),
  userDeleted: (userId, data) =>
    triggerEvent(WebhookEvents.USER_DELETED, userId, data),

  // Subscription events
  subscriptionStarted: (userId, data) =>
    triggerEvent(WebhookEvents.SUBSCRIPTION_STARTED, userId, data),
  subscriptionRenewed: (userId, data) =>
    triggerEvent(WebhookEvents.SUBSCRIPTION_RENEWED, userId, data),
  subscriptionCancelled: (userId, data) =>
    triggerEvent(WebhookEvents.SUBSCRIPTION_CANCELLED, userId, data),
  subscriptionExpired: (userId, data) =>
    triggerEvent(WebhookEvents.SUBSCRIPTION_EXPIRED, userId, data),

  // Mood events
  moodLogged: (userId, data) =>
    triggerEvent(WebhookEvents.MOOD_LOGGED, userId, data),
  streakUpdated: (userId, data) =>
    triggerEvent(WebhookEvents.MOOD_STREAK_UPDATED, userId, data),
  moodMilestone: (userId, data) =>
    triggerEvent(WebhookEvents.MOOD_MILESTONE, userId, data),

  // Conversation events
  conversationStarted: (userId, data) =>
    triggerEvent(WebhookEvents.CONVERSATION_STARTED, userId, data),
  messageReceived: (userId, data) =>
    triggerEvent(WebhookEvents.CONVERSATION_MESSAGE, userId, data),

  // Journal events
  journalEntryCreated: (userId, data) =>
    triggerEvent(WebhookEvents.JOURNAL_ENTRY_CREATED, userId, data),

  // Task events
  taskCreated: (userId, data) =>
    triggerEvent(WebhookEvents.TASK_CREATED, userId, data),
  taskCompleted: (userId, data) =>
    triggerEvent(WebhookEvents.TASK_COMPLETED, userId, data),

  // Achievement events
  achievementUnlocked: (userId, data) =>
    triggerEvent(WebhookEvents.ACHIEVEMENT_UNLOCKED, userId, data),
};

// ============================================================
// EXPORTS
// ============================================================

export {
  // Webhook management
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getUserWebhooks,
  getWebhook,
  regenerateSecret,

  // Event triggering
  triggerEvent,
  sendTestEvent,
  events,

  // Delivery
  deliverWebhook,
  recordFailure,
  recordSuccess,

  // Signature
  generateSignature,
  verifySignature,
  generateWebhookSecret,

  // Logs
  getWebhookLogs,

  // Constants
  WebhookEvents,
  EventCategories,
};

export default {
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getUserWebhooks,
  getWebhook,
  regenerateSecret,
  triggerEvent,
  sendTestEvent,
  events,
  deliverWebhook,
  verifySignature,
  getWebhookLogs,
  WebhookEvents,
  EventCategories,
};
