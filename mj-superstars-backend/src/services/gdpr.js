// ============================================================
// MJ's Superstars - GDPR Compliance Service
// Data export, deletion, and consent management
// ============================================================

import { pool } from '../database/db.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';
import { Readable } from 'stream';

// ============================================================
// CONFIGURATION
// ============================================================

const EXPORT_EXPIRY_HOURS = 48;
const DATA_RETENTION_DAYS = {
  deletedUsers: 30, // Keep anonymized data for 30 days
  exportRequests: 90, // Keep export request logs for 90 days
  consentLogs: 365 * 7, // Keep consent logs for 7 years
};

// ============================================================
// DATA EXPORT
// ============================================================

/**
 * Export all user data (GDPR Right to Data Portability)
 */
async function exportUserData(userId) {
  const client = await pool.connect();

  try {
    // Collect all user data
    const userData = {
      exportDate: new Date().toISOString(),
      requestId: crypto.randomUUID(),
      user: await getUserProfile(client, userId),
      moods: await getUserMoods(client, userId),
      conversations: await getUserConversations(client, userId),
      journalEntries: await getUserJournalEntries(client, userId),
      tasks: await getUserTasks(client, userId),
      healthData: await getUserHealthData(client, userId),
      subscriptionHistory: await getSubscriptionHistory(client, userId),
      notifications: await getUserNotificationSettings(client, userId),
      consents: await getUserConsents(client, userId),
      analytics: await getUserAnalytics(client, userId),
    };

    // Log the export request
    await logExportRequest(client, userId, userData.requestId);

    return userData;
  } finally {
    client.release();
  }
}

/**
 * Generate downloadable export file
 */
async function generateExportFile(userId, format = 'json') {
  const data = await exportUserData(userId);

  if (format === 'json') {
    return {
      content: JSON.stringify(data, null, 2),
      contentType: 'application/json',
      filename: `mj-superstars-data-${userId}-${Date.now()}.json`,
    };
  }

  // CSV format for specific data types
  if (format === 'csv') {
    const csvData = convertToCSV(data);
    return {
      content: csvData,
      contentType: 'text/csv',
      filename: `mj-superstars-data-${userId}-${Date.now()}.csv`,
    };
  }

  throw new Error('Unsupported export format');
}

/**
 * Get export stream for large datasets
 */
function createExportStream(userId) {
  return new Readable({
    async read() {
      try {
        const data = await exportUserData(userId);
        this.push(JSON.stringify(data, null, 2));
        this.push(null);
      } catch (error) {
        this.destroy(error);
      }
    },
  });
}

// ============================================================
// DATA COLLECTION HELPERS
// ============================================================

async function getUserProfile(client, userId) {
  const result = await client.query(
    `SELECT id, email, name, created_at, updated_at, timezone,
            notification_preferences, privacy_settings
     FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function getUserMoods(client, userId) {
  const result = await client.query(
    `SELECT id, mood_score, energy_level, factors, notes,
            created_at, weather, location_general
     FROM moods WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getUserConversations(client, userId) {
  const result = await client.query(
    `SELECT c.id, c.title, c.created_at, c.updated_at,
            json_agg(
              json_build_object(
                'id', m.id,
                'role', m.role,
                'content', m.content,
                'created_at', m.created_at
              ) ORDER BY m.created_at
            ) as messages
     FROM conversations c
     LEFT JOIN messages m ON m.conversation_id = c.id
     WHERE c.user_id = $1
     GROUP BY c.id
     ORDER BY c.updated_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getUserJournalEntries(client, userId) {
  const result = await client.query(
    `SELECT id, title, content, mood_before, mood_after,
            tags, created_at, updated_at
     FROM journal_entries WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getUserTasks(client, userId) {
  const result = await client.query(
    `SELECT id, title, description, status, priority, due_date,
            completed_at, created_at
     FROM tasks WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getUserHealthData(client, userId) {
  const result = await client.query(
    `SELECT id, date, steps, sleep_hours, sleep_quality,
            heart_rate_avg, calories_burned, workout_minutes,
            mindfulness_minutes, created_at
     FROM health_summaries WHERE user_id = $1 ORDER BY date DESC`,
    [userId]
  );
  return result.rows;
}

async function getSubscriptionHistory(client, userId) {
  const result = await client.query(
    `SELECT id, status, product_id, transaction_id,
            started_at, expires_at, cancelled_at, created_at
     FROM subscription_history WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getUserNotificationSettings(client, userId) {
  const result = await client.query(
    `SELECT device_token, platform, notification_preferences,
            created_at, updated_at
     FROM user_devices WHERE user_id = $1`,
    [userId]
  );
  return result.rows;
}

async function getUserConsents(client, userId) {
  const result = await client.query(
    `SELECT consent_type, granted, granted_at, revoked_at,
            ip_address, user_agent
     FROM user_consents WHERE user_id = $1 ORDER BY granted_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getUserAnalytics(client, userId) {
  const result = await client.query(
    `SELECT event_name, event_properties, created_at
     FROM analytics_events WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 1000`,
    [userId]
  );
  return result.rows;
}

// ============================================================
// DATA DELETION (Right to be Forgotten)
// ============================================================

/**
 * Delete all user data (GDPR Right to Erasure)
 */
async function deleteUserData(userId, options = {}) {
  const { hardDelete = false, reason = 'user_request' } = options;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Log deletion request first
    const deletionId = crypto.randomUUID();
    await logDeletionRequest(client, userId, deletionId, reason);

    if (hardDelete) {
      // Permanently delete all data
      await hardDeleteUserData(client, userId);
    } else {
      // Soft delete: anonymize and mark as deleted
      await softDeleteUserData(client, userId);
    }

    await client.query('COMMIT');

    logger.info(`User data deleted: ${userId} (${hardDelete ? 'hard' : 'soft'})`);

    return {
      success: true,
      deletionId,
      method: hardDelete ? 'hard_delete' : 'soft_delete',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to delete user data:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function softDeleteUserData(client, userId) {
  const anonymizedEmail = `deleted_${crypto.randomUUID()}@deleted.mj`;

  // Anonymize user profile
  await client.query(
    `UPDATE users SET
      email = $2,
      name = 'Deleted User',
      password_hash = NULL,
      deleted_at = NOW(),
      notification_preferences = NULL,
      privacy_settings = NULL
     WHERE id = $1`,
    [userId, anonymizedEmail]
  );

  // Anonymize conversation content
  await client.query(
    `UPDATE messages SET content = '[deleted]'
     WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = $1)`,
    [userId]
  );

  // Delete sensitive journal content
  await client.query(
    `UPDATE journal_entries SET content = '[deleted]', title = '[deleted]'
     WHERE user_id = $1`,
    [userId]
  );

  // Delete personal notes from moods
  await client.query(
    `UPDATE moods SET notes = NULL, location_general = NULL
     WHERE user_id = $1`,
    [userId]
  );

  // Delete device tokens
  await client.query(
    `DELETE FROM user_devices WHERE user_id = $1`,
    [userId]
  );

  // Delete AI memories
  await client.query(
    `DELETE FROM ai_memories WHERE user_id = $1`,
    [userId]
  );
}

async function hardDeleteUserData(client, userId) {
  // Delete in order due to foreign key constraints
  const deleteTables = [
    'analytics_events',
    'user_devices',
    'ai_memories',
    'messages',
    'conversations',
    'moods',
    'journal_entries',
    'tasks',
    'health_summaries',
    'subscription_history',
    'notifications',
    'buddy_activities',
    'buddies',
    'user_consents',
  ];

  for (const table of deleteTables) {
    await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
  }

  // Finally delete user
  await client.query('DELETE FROM users WHERE id = $1', [userId]);
}

// ============================================================
// CONSENT MANAGEMENT
// ============================================================

const ConsentTypes = {
  TERMS_OF_SERVICE: 'terms_of_service',
  PRIVACY_POLICY: 'privacy_policy',
  MARKETING_EMAIL: 'marketing_email',
  PUSH_NOTIFICATIONS: 'push_notifications',
  ANALYTICS: 'analytics',
  AI_TRAINING: 'ai_training',
  HEALTH_DATA: 'health_data',
  THIRD_PARTY_SHARING: 'third_party_sharing',
};

/**
 * Record user consent
 */
async function recordConsent(userId, consentType, granted, metadata = {}) {
  const client = await pool.connect();

  try {
    // Check if consent record exists
    const existing = await client.query(
      `SELECT id FROM user_consents WHERE user_id = $1 AND consent_type = $2`,
      [userId, consentType]
    );

    if (existing.rows.length > 0) {
      // Update existing consent
      await client.query(
        `UPDATE user_consents SET
          granted = $3,
          ${granted ? 'granted_at = NOW()' : 'revoked_at = NOW()'},
          ip_address = $4,
          user_agent = $5,
          updated_at = NOW()
         WHERE user_id = $1 AND consent_type = $2`,
        [userId, consentType, granted, metadata.ip, metadata.userAgent]
      );
    } else {
      // Insert new consent record
      await client.query(
        `INSERT INTO user_consents
          (user_id, consent_type, granted, granted_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          consentType,
          granted,
          granted ? new Date() : null,
          metadata.ip,
          metadata.userAgent,
        ]
      );
    }

    // Log consent change for audit trail
    await logConsentChange(client, userId, consentType, granted, metadata);

    return { success: true, consentType, granted };
  } finally {
    client.release();
  }
}

/**
 * Get user's current consents
 */
async function getUserConsentStatus(userId) {
  const result = await pool.query(
    `SELECT consent_type, granted, granted_at, revoked_at
     FROM user_consents WHERE user_id = $1`,
    [userId]
  );

  const consents = {};
  for (const type of Object.values(ConsentTypes)) {
    const record = result.rows.find(r => r.consent_type === type);
    consents[type] = {
      granted: record?.granted ?? false,
      grantedAt: record?.granted_at,
      revokedAt: record?.revoked_at,
    };
  }

  return consents;
}

/**
 * Check if user has granted a specific consent
 */
async function hasConsent(userId, consentType) {
  const result = await pool.query(
    `SELECT granted FROM user_consents
     WHERE user_id = $1 AND consent_type = $2`,
    [userId, consentType]
  );
  return result.rows[0]?.granted ?? false;
}

/**
 * Withdraw all marketing consents
 */
async function withdrawMarketingConsents(userId, metadata = {}) {
  const marketingConsents = [
    ConsentTypes.MARKETING_EMAIL,
    ConsentTypes.THIRD_PARTY_SHARING,
  ];

  for (const type of marketingConsents) {
    await recordConsent(userId, type, false, metadata);
  }

  return { success: true, withdrawn: marketingConsents };
}

// ============================================================
// AUDIT LOGGING
// ============================================================

async function logExportRequest(client, userId, requestId) {
  await client.query(
    `INSERT INTO gdpr_audit_log
      (user_id, action, request_id, created_at)
     VALUES ($1, 'data_export', $2, NOW())`,
    [userId, requestId]
  );
}

async function logDeletionRequest(client, userId, deletionId, reason) {
  await client.query(
    `INSERT INTO gdpr_audit_log
      (user_id, action, request_id, metadata, created_at)
     VALUES ($1, 'data_deletion', $2, $3, NOW())`,
    [userId, deletionId, JSON.stringify({ reason })]
  );
}

async function logConsentChange(client, userId, consentType, granted, metadata) {
  await client.query(
    `INSERT INTO gdpr_audit_log
      (user_id, action, metadata, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [
      userId,
      granted ? 'consent_granted' : 'consent_revoked',
      JSON.stringify({ consentType, ...metadata }),
    ]
  );
}

// ============================================================
// DATA RETENTION
// ============================================================

/**
 * Clean up old data based on retention policies
 */
async function runDataRetentionCleanup() {
  const client = await pool.connect();

  try {
    // Clean up soft-deleted users after retention period
    await client.query(
      `DELETE FROM users
       WHERE deleted_at IS NOT NULL
       AND deleted_at < NOW() - INTERVAL '${DATA_RETENTION_DAYS.deletedUsers} days'`
    );

    // Clean up old export request logs
    await client.query(
      `DELETE FROM gdpr_audit_log
       WHERE action = 'data_export'
       AND created_at < NOW() - INTERVAL '${DATA_RETENTION_DAYS.exportRequests} days'`
    );

    // Keep consent logs for compliance (7 years)
    // These are NOT deleted in regular cleanup

    logger.info('Data retention cleanup completed');
  } finally {
    client.release();
  }
}

// ============================================================
// UTILITIES
// ============================================================

function convertToCSV(data) {
  // Convert structured data to CSV format
  const sections = [];

  // User profile
  if (data.user) {
    sections.push('=== USER PROFILE ===');
    sections.push(objectToCSV([data.user]));
  }

  // Moods
  if (data.moods?.length) {
    sections.push('\n=== MOOD HISTORY ===');
    sections.push(objectToCSV(data.moods));
  }

  // Journal entries
  if (data.journalEntries?.length) {
    sections.push('\n=== JOURNAL ENTRIES ===');
    sections.push(objectToCSV(data.journalEntries));
  }

  // Tasks
  if (data.tasks?.length) {
    sections.push('\n=== TASKS ===');
    sections.push(objectToCSV(data.tasks));
  }

  return sections.join('\n');
}

function objectToCSV(array) {
  if (!array.length) return '';

  const headers = Object.keys(array[0]);
  const rows = array.map(obj =>
    headers.map(h => JSON.stringify(obj[h] ?? '')).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

// ============================================================
// EXPORTS
// ============================================================

export {
  // Data Export
  exportUserData,
  generateExportFile,
  createExportStream,

  // Data Deletion
  deleteUserData,

  // Consent Management
  ConsentTypes,
  recordConsent,
  getUserConsentStatus,
  hasConsent,
  withdrawMarketingConsents,

  // Data Retention
  runDataRetentionCleanup,
  DATA_RETENTION_DAYS,
};

export default {
  exportUserData,
  generateExportFile,
  createExportStream,
  deleteUserData,
  ConsentTypes,
  recordConsent,
  getUserConsentStatus,
  hasConsent,
  withdrawMarketingConsents,
  runDataRetentionCleanup,
};
