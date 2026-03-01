// ============================================================
// Apple Push Notification Service (APNs) Integration
// Uses @parse/node-apn for HTTP/2-based push to iOS devices
// ============================================================

import apn from '@parse/node-apn';
import { query } from '../database/db.js';
import { logger } from '../utils/logger.js';

let apnProvider = null;

/**
 * Initialize APNs provider with .p8 key
 * Required env vars:
 *   APNS_KEY_ID     - Key ID from Apple Developer portal
 *   APNS_TEAM_ID    - Team ID from Apple Developer portal
 *   APNS_KEY_PATH   - Path to .p8 key file (or use APNS_KEY_CONTENT)
 *   APNS_KEY_CONTENT - Raw .p8 key content (base64-encoded, for Render)
 *   APNS_BUNDLE_ID  - App bundle ID (com.mjsuperstars.app)
 *   APNS_PRODUCTION - "true" for production, omit for sandbox
 */
export function initAPNS() {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID || 'com.mjsuperstars.app';
  const isProduction = process.env.APNS_PRODUCTION === 'true';

  if (!keyId || !teamId) {
    logger.warn('APNs not configured: missing APNS_KEY_ID or APNS_TEAM_ID');
    return null;
  }

  // Support either file path or inline key content (base64 for Render)
  const options = {
    token: {
      keyId,
      teamId,
    },
    production: isProduction,
  };

  if (process.env.APNS_KEY_CONTENT) {
    // Decode base64 key content (for deployment platforms like Render)
    options.token.key = Buffer.from(process.env.APNS_KEY_CONTENT, 'base64').toString('utf8');
  } else if (process.env.APNS_KEY_PATH) {
    options.token.key = process.env.APNS_KEY_PATH;
  } else {
    logger.warn('APNs not configured: missing APNS_KEY_CONTENT or APNS_KEY_PATH');
    return null;
  }

  try {
    apnProvider = new apn.Provider(options);
    logger.info(`APNs initialized (${isProduction ? 'production' : 'sandbox'}, bundle: ${bundleId})`);
    return apnProvider;
  } catch (error) {
    logger.error('Failed to initialize APNs:', error.message);
    return null;
  }
}

/**
 * Send a push notification to a specific iOS device token
 */
export async function sendAPNS(deviceToken, payload) {
  if (!apnProvider) {
    logger.debug('APNs not initialized, skipping push');
    return { sent: false, reason: 'apns_not_configured' };
  }

  const bundleId = process.env.APNS_BUNDLE_ID || 'com.mjsuperstars.app';

  const notification = new apn.Notification();
  notification.topic = bundleId;
  notification.expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour
  notification.sound = payload.sound || 'default';
  notification.alert = {
    title: payload.title,
    body: payload.body,
  };
  notification.badge = payload.badge || 0;

  // Custom data payload
  if (payload.data) {
    notification.payload = payload.data;
  }

  // Category for actionable notifications
  if (payload.category) {
    notification.category = payload.category;
  }

  // Thread ID for notification grouping
  if (payload.threadId) {
    notification.threadId = payload.threadId;
  }

  try {
    const result = await apnProvider.send(notification, deviceToken);

    if (result.failed && result.failed.length > 0) {
      const failure = result.failed[0];
      logger.warn('APNs delivery failed:', {
        deviceToken: deviceToken.substring(0, 10) + '...',
        status: failure.status,
        response: failure.response,
      });

      // Handle invalid/expired tokens
      if (failure.status === 410 || failure.response?.reason === 'Unregistered') {
        await deactivateDeviceToken(deviceToken);
      }

      return { sent: false, reason: failure.response?.reason || 'unknown' };
    }

    return { sent: true };
  } catch (error) {
    logger.error('APNs send error:', error.message);
    return { sent: false, reason: error.message };
  }
}

/**
 * Send push notification to all of a user's iOS devices
 */
export async function sendToUserIOS(userId, payload) {
  try {
    const result = await query(
      `SELECT device_token FROM push_subscriptions
       WHERE user_id = $1 AND device_type = 'ios' AND is_active = true`,
      [userId]
    );

    if (result.rows.length === 0) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const row of result.rows) {
      const pushResult = await sendAPNS(row.device_token, payload);
      if (pushResult.sent) {
        sent++;
      } else {
        failed++;
      }
    }

    return { sent, failed };
  } catch (error) {
    logger.error('sendToUserIOS error:', error.message);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Deactivate an invalid device token
 */
async function deactivateDeviceToken(deviceToken) {
  try {
    await query(
      `UPDATE push_subscriptions SET is_active = false
       WHERE device_token = $1 AND device_type = 'ios'`,
      [deviceToken]
    );
    logger.info('Deactivated invalid iOS device token');
  } catch (error) {
    logger.warn('Failed to deactivate device token:', error.message);
  }
}

/**
 * Shutdown APNs provider gracefully
 */
export function shutdownAPNS() {
  if (apnProvider) {
    apnProvider.shutdown();
    apnProvider = null;
    logger.info('APNs provider shut down');
  }
}

export default {
  initAPNS,
  sendAPNS,
  sendToUserIOS,
  shutdownAPNS,
};
