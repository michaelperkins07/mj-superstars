// ============================================================
// Notification Preferences Routes
// Manage push notification campaign preferences
// ============================================================

import { Router } from 'express';
import { body } from 'express-validator';
import { query } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import validate from '../middleware/validate.js';
import { logger } from '../utils/logger.js';

const router = Router();
router.use(authenticate);

/**
 * GET /api/notification-preferences - Get user's notification preferences
 */
router.get('/',
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT
        id,
        user_id,
        mood_reminder_enabled,
        mood_reminder_time,
        onboarding_drip_enabled,
        re_engagement_enabled,
        streak_reminders_enabled,
        weekly_recap_enabled,
        created_at,
        updated_at
       FROM notification_preferences
       WHERE user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Create default preferences if they don't exist
      const defaultPrefs = await query(
        `INSERT INTO notification_preferences (
          user_id,
          mood_reminder_enabled,
          mood_reminder_time,
          onboarding_drip_enabled,
          re_engagement_enabled,
          streak_reminders_enabled,
          weekly_recap_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id) DO UPDATE
        SET user_id = EXCLUDED.user_id
        RETURNING
          id,
          user_id,
          mood_reminder_enabled,
          mood_reminder_time,
          onboarding_drip_enabled,
          re_engagement_enabled,
          streak_reminders_enabled,
          weekly_recap_enabled,
          created_at,
          updated_at`,
        [req.user.id, true, '09:00', true, true, true, true]
      );

      return res.json({
        success: true,
        preferences: defaultPrefs.rows[0]
      });
    }

    res.json({
      success: true,
      preferences: result.rows[0]
    });
  })
);

/**
 * PUT /api/notification-preferences - Update notification preferences
 */
router.put('/',
  [
    body('mood_reminder_enabled').optional().isBoolean(),
    body('mood_reminder_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('onboarding_drip_enabled').optional().isBoolean(),
    body('re_engagement_enabled').optional().isBoolean(),
    body('streak_reminders_enabled').optional().isBoolean(),
    body('weekly_recap_enabled').optional().isBoolean()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const {
      mood_reminder_enabled,
      mood_reminder_time,
      onboarding_drip_enabled,
      re_engagement_enabled,
      streak_reminders_enabled,
      weekly_recap_enabled
    } = req.body;

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [req.user.id];
    let paramCount = 1;

    if (mood_reminder_enabled !== undefined) {
      paramCount++;
      updateFields.push(`mood_reminder_enabled = $${paramCount}`);
      updateValues.push(mood_reminder_enabled);
    }

    if (mood_reminder_time !== undefined) {
      paramCount++;
      updateFields.push(`mood_reminder_time = $${paramCount}`);
      updateValues.push(mood_reminder_time);
    }

    if (onboarding_drip_enabled !== undefined) {
      paramCount++;
      updateFields.push(`onboarding_drip_enabled = $${paramCount}`);
      updateValues.push(onboarding_drip_enabled);
    }

    if (re_engagement_enabled !== undefined) {
      paramCount++;
      updateFields.push(`re_engagement_enabled = $${paramCount}`);
      updateValues.push(re_engagement_enabled);
    }

    if (streak_reminders_enabled !== undefined) {
      paramCount++;
      updateFields.push(`streak_reminders_enabled = $${paramCount}`);
      updateValues.push(streak_reminders_enabled);
    }

    if (weekly_recap_enabled !== undefined) {
      paramCount++;
      updateFields.push(`weekly_recap_enabled = $${paramCount}`);
      updateValues.push(weekly_recap_enabled);
    }

    if (updateFields.length === 0) {
      throw new APIError('No fields provided to update', 400, 'NO_FIELDS');
    }

    const updateQuery = `
      UPDATE notification_preferences
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE user_id = $1
      RETURNING
        id,
        user_id,
        mood_reminder_enabled,
        mood_reminder_time,
        onboarding_drip_enabled,
        re_engagement_enabled,
        streak_reminders_enabled,
        weekly_recap_enabled,
        created_at,
        updated_at
    `;

    const result = await query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      throw new APIError('Notification preferences not found', 404, 'NOT_FOUND');
    }

    logger.info('Updated notification preferences for user:', req.user.id);

    res.json({
      success: true,
      preferences: result.rows[0]
    });
  })
);

/**
 * POST /api/notification-preferences/disable-all - Disable all notifications
 */
router.post('/disable-all',
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE notification_preferences
       SET
         mood_reminder_enabled = false,
         onboarding_drip_enabled = false,
         re_engagement_enabled = false,
         streak_reminders_enabled = false,
         weekly_recap_enabled = false,
         updated_at = NOW()
       WHERE user_id = $1
       RETURNING
         id,
         user_id,
         mood_reminder_enabled,
         mood_reminder_time,
         onboarding_drip_enabled,
         re_engagement_enabled,
         streak_reminders_enabled,
         weekly_recap_enabled,
         created_at,
         updated_at`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw new APIError('Notification preferences not found', 404, 'NOT_FOUND');
    }

    logger.info('Disabled all notifications for user:', req.user.id);

    res.json({
      success: true,
      message: 'All notifications disabled',
      preferences: result.rows[0]
    });
  })
);

/**
 * POST /api/notification-preferences/enable-all - Enable all notifications
 */
router.post('/enable-all',
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE notification_preferences
       SET
         mood_reminder_enabled = true,
         onboarding_drip_enabled = true,
         re_engagement_enabled = true,
         streak_reminders_enabled = true,
         weekly_recap_enabled = true,
         updated_at = NOW()
       WHERE user_id = $1
       RETURNING
         id,
         user_id,
         mood_reminder_enabled,
         mood_reminder_time,
         onboarding_drip_enabled,
         re_engagement_enabled,
         streak_reminders_enabled,
         weekly_recap_enabled,
         created_at,
         updated_at`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      throw new APIError('Notification preferences not found', 404, 'NOT_FOUND');
    }

    logger.info('Enabled all notifications for user:', req.user.id);

    res.json({
      success: true,
      message: 'All notifications enabled',
      preferences: result.rows[0]
    });
  })
);

/**
 * GET /api/notification-preferences/history - Get campaign history
 */
router.get('/history',
  asyncHandler(async (req, res) => {
    const { limit = 50, campaign_type } = req.query;

    let historyQuery = `
      SELECT
        id,
        campaign_type,
        status,
        metadata,
        scheduled_at,
        sent_at,
        created_at
       FROM campaigns
       WHERE user_id = $1
    `;

    const queryParams = [req.user.id];

    if (campaign_type) {
      historyQuery += ` AND campaign_type = $2`;
      queryParams.push(campaign_type);
    }

    historyQuery += ` ORDER BY sent_at DESC NULLS LAST LIMIT $${queryParams.length + 1}`;
    queryParams.push(parseInt(limit));

    const result = await query(historyQuery, queryParams);

    res.json({
      success: true,
      total: result.rows.length,
      campaigns: result.rows
    });
  })
);

/**
 * GET /api/notification-preferences/stats - Get campaign statistics
 */
router.get('/stats',
  asyncHandler(async (req, res) => {
    const stats = await query(
      `SELECT
        campaign_type,
        status,
        COUNT(*) as count,
        MAX(sent_at) as last_sent
       FROM campaigns
       WHERE user_id = $1
       GROUP BY campaign_type, status
       ORDER BY campaign_type, status`,
      [req.user.id]
    );

    const summaryByType = {};
    for (const row of stats.rows) {
      if (!summaryByType[row.campaign_type]) {
        summaryByType[row.campaign_type] = {
          campaign_type: row.campaign_type,
          sent: 0,
          pending: 0,
          failed: 0,
          last_sent: null
        };
      }

      if (row.status === 'sent') {
        summaryByType[row.campaign_type].sent = row.count;
        summaryByType[row.campaign_type].last_sent = row.last_sent;
      } else if (row.status === 'pending') {
        summaryByType[row.campaign_type].pending = row.count;
      } else if (row.status === 'failed') {
        summaryByType[row.campaign_type].failed = row.count;
      }
    }

    res.json({
      success: true,
      statistics: Object.values(summaryByType)
    });
  })
);

export default router;
