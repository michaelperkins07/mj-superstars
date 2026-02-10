// ============================================================
// Admin Campaign Management Routes
// For testing, monitoring, and manual campaign operations
// ============================================================

import { Router } from 'express';
import { query } from '../database/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import {
  processCampaigns,
  processReEngagementNudges,
  processStreakReminders,
  sendDailyMoodCheckIn,
  sendOnboardingDripMessage,
  sendWeeklyRecap,
  initializeUserCampaigns,
  getUserPreferences,
  getUserTimezone
} from '../services/campaignScheduler.js';

const router = Router();

// Delegate to requireAdmin from auth middleware
// Supports both ADMIN_EMAILS and x-admin-secret header
const isAdmin = requireAdmin;

// ============================================================
// TESTING ENDPOINTS
// ============================================================

/**
 * POST /api/admin/campaigns/test/mood-check/:userId
 * Send a test daily mood check-in to a specific user
 */
router.post('/test/mood-check/:userId',
  authenticate,
  isAdmin,
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;

    // Verify user exists
    const userResult = await query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new APIError('User not found', 404, 'NOT_FOUND');
    }

    const user = userResult.rows[0];

    await sendDailyMoodCheckIn(userId);

    logger.info('Test daily mood check sent to user:', userId);

    res.json({
      success: true,
      message: 'Test daily mood check-in sent',
      user: {
        id: user.id,
        email: user.email
      }
    });
  })
);

/**
 * POST /api/admin/campaigns/test/onboarding/:userId/:day
 * Send a test onboarding drip message
 */
router.post('/test/onboarding/:userId/:day',
  authenticate,
  isAdmin,
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    const day = parseInt(req.params.day);

    if (isNaN(day) || day < 0 || day > 30) {
      throw new APIError('Invalid day. Must be 0-30.', 400, 'INVALID_DAY');
    }

    // Verify user exists
    const userResult = await query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new APIError('User not found', 404, 'NOT_FOUND');
    }

    const user = userResult.rows[0];

    await sendOnboardingDripMessage(userId, day);

    logger.info('Test onboarding day', day, 'sent to user:', userId);

    res.json({
      success: true,
      message: `Test onboarding day ${day} sent`,
      user: {
        id: user.id,
        email: user.email
      }
    });
  })
);

/**
 * POST /api/admin/campaigns/test/weekly-recap/:userId
 * Send a test weekly recap
 */
router.post('/test/weekly-recap/:userId',
  authenticate,
  isAdmin,
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;

    // Verify user exists
    const userResult = await query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new APIError('User not found', 404, 'NOT_FOUND');
    }

    const user = userResult.rows[0];

    await sendWeeklyRecap(userId);

    logger.info('Test weekly recap sent to user:', userId);

    res.json({
      success: true,
      message: 'Test weekly recap sent',
      user: {
        id: user.id,
        email: user.email
      }
    });
  })
);

// ============================================================
// PROCESSING ENDPOINTS
// ============================================================

/**
 * POST /api/admin/campaigns/process
 * Manually trigger campaign processing
 */
router.post('/process',
  authenticate,
  isAdmin,
  asyncHandler(async (req, res) => {
    const results = await processCampaigns();

    res.json({
      success: true,
      message: 'Campaign processing completed',
      results
    });
  })
);

/**
 * POST /api/admin/campaigns/process/re-engagement
 * Manually process re-engagement nudges
 */
router.post('/process/re-engagement',
  authenticate,
  isAdmin,
  asyncHandler(async (req, res) => {
    const results = await processReEngagementNudges();

    res.json({
      success: true,
      message: 'Re-engagement nudges processed',
      results
    });
  })
);

/**
 * POST /api/admin/campaigns/process/streak-reminders
 * Manually process streak protection reminders
 */
router.post('/process/streak-reminders',
  authenticate,
  isAdmin,
  asyncHandler(async (req, res) => {
    const results = await processStreakReminders();

    res.json({
      success: true,
      message: 'Streak reminders processed',
      results
    });
  })
);

// ============================================================
// MANAGEMENT ENDPOINTS
// ============================================================

/**
 * POST /api/admin/campaigns/initialize/:userId
 * Initialize campaigns for a user
 */
router.post('/initialize/:userId',
  authenticate,
  isAdmin,
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;

    // Verify user exists
    const userResult = await query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      throw new APIError('User not found', 404, 'NOT_FOUND');
    }

    const user = userResult.rows[0];

    await initializeUserCampaigns(userId);

    logger.info('Campaigns initialized for user:', userId);

    res.json({
      success: true,
      message: 'Campaigns initialized',
      user: {
        id: user.id,
        email: user.email
      }
    });
  })
);

/**
 * GET /api/admin/campaigns/user/:userId
 * Get detailed campaign info for a user
 */
router.get('/user/:userId',
  authenticate,
  isAdmin,
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;

    // Verify user exists
    const userResult = await query(
      `SELECT id, email, timezone, current_streak, last_active_at FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new APIError('User not found', 404, 'NOT_FOUND');
    }

    const user = userResult.rows[0];

    // Get preferences
    const prefs = await getUserPreferences(userId);

    // Get campaign history
    const historyResult = await query(
      `SELECT
        campaign_type,
        status,
        COUNT(*) as count,
        MAX(sent_at) as last_sent
       FROM campaigns
       WHERE user_id = $1
       GROUP BY campaign_type, status
       ORDER BY campaign_type, status`,
      [userId]
    );

    const campaignSummary = {};
    for (const row of historyResult.rows) {
      if (!campaignSummary[row.campaign_type]) {
        campaignSummary[row.campaign_type] = {
          sent: 0,
          pending: 0,
          failed: 0,
          last_sent: null
        };
      }

      if (row.status === 'sent') {
        campaignSummary[row.campaign_type].sent = row.count;
        campaignSummary[row.campaign_type].last_sent = row.last_sent;
      } else if (row.status === 'pending') {
        campaignSummary[row.campaign_type].pending = row.count;
      } else if (row.status === 'failed') {
        campaignSummary[row.campaign_type].failed = row.count;
      }
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        timezone: user.timezone,
        current_streak: user.current_streak,
        last_active_at: user.last_active_at
      },
      preferences: prefs,
      campaigns: campaignSummary
    });
  })
);

/**
 * GET /api/admin/campaigns/stats
 * Get global campaign statistics
 */
router.get('/stats',
  authenticate,
  isAdmin,
  asyncHandler(async (req, res) => {
    // Overall stats
    const overallStats = await query(
      `SELECT
        campaign_type,
        status,
        COUNT(*) as count
       FROM campaigns
       GROUP BY campaign_type, status
       ORDER BY campaign_type, status`
    );

    // By campaign type
    const byType = {};
    for (const row of overallStats.rows) {
      if (!byType[row.campaign_type]) {
        byType[row.campaign_type] = {
          sent: 0,
          pending: 0,
          failed: 0,
          total: 0
        };
      }

      byType[row.campaign_type][row.status] = row.count;
      byType[row.campaign_type].total += row.count;
    }

    // Daily breakdown
    const dailyStats = await query(
      `SELECT
        DATE(sent_at) as date,
        campaign_type,
        COUNT(*) as count
       FROM campaigns
       WHERE sent_at IS NOT NULL
       AND DATE(sent_at) >= CURRENT_DATE - INTERVAL '30 days'
       GROUP BY DATE(sent_at), campaign_type
       ORDER BY DATE(sent_at) DESC, campaign_type`
    );

    // User adoption
    const adoptionStats = await query(
      `SELECT
        COUNT(DISTINCT user_id) as users_with_prefs,
        COUNT(DISTINCT CASE WHEN mood_reminder_enabled THEN user_id END) as mood_reminders_enabled,
        COUNT(DISTINCT CASE WHEN onboarding_drip_enabled THEN user_id END) as onboarding_enabled,
        COUNT(DISTINCT CASE WHEN re_engagement_enabled THEN user_id END) as re_engagement_enabled,
        COUNT(DISTINCT CASE WHEN streak_reminders_enabled THEN user_id END) as streak_enabled,
        COUNT(DISTINCT CASE WHEN weekly_recap_enabled THEN user_id END) as recap_enabled
       FROM notification_preferences`
    );

    res.json({
      success: true,
      by_type: byType,
      daily_stats: dailyStats.rows,
      adoption: adoptionStats.rows[0]
    });
  })
);

/**
 * GET /api/admin/campaigns/health
 * Check campaign system health
 */
router.get('/health',
  authenticate,
  isAdmin,
  asyncHandler(async (req, res) => {
    // Check tables exist
    const tablesResult = await query(
      `SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='campaigns') as campaigns_exists,
              EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='notification_preferences') as prefs_exists`
    );

    const tables = tablesResult.rows[0];

    // Check recent activity
    const activityResult = await query(
      `SELECT
        COUNT(*) as total_campaigns,
        COUNT(*) FILTER (WHERE status='sent') as sent,
        COUNT(*) FILTER (WHERE status='pending') as pending,
        COUNT(*) FILTER (WHERE status='failed') as failed,
        MAX(sent_at) as last_sent,
        COUNT(DISTINCT user_id) as unique_users
       FROM campaigns`
    );

    const activity = activityResult.rows[0];

    // Check timezone usage
    const timezoneResult = await query(
      `SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE timezone IS NOT NULL) as with_timezone,
        COUNT(*) FILTER (WHERE timezone IS NULL) as without_timezone
       FROM users`
    );

    const timezones = timezoneResult.rows[0];

    const health = {
      status: tables.campaigns_exists && tables.prefs_exists ? 'healthy' : 'degraded',
      database: {
        campaigns_table_exists: tables.campaigns_exists,
        preferences_table_exists: tables.prefs_exists
      },
      activity,
      timezone_coverage: timezones
    };

    res.json({
      success: true,
      health
    });
  })
);

// ============================================================
// DEBUG ENDPOINTS
// ============================================================

/**
 * GET /api/admin/campaigns/debug/upcoming
 * See what campaigns are scheduled to send soon
 */
router.get('/debug/upcoming',
  authenticate,
  isAdmin,
  asyncHandler(async (req, res) => {
    const upcomingResult = await query(
      `SELECT
        c.id,
        c.user_id,
        u.email,
        c.campaign_type,
        c.status,
        c.scheduled_at,
        c.sent_at
       FROM campaigns c
       JOIN users u ON c.user_id = u.id
       WHERE c.status IN ('scheduled', 'pending')
       AND c.scheduled_at >= NOW()
       AND c.scheduled_at <= NOW() + INTERVAL '7 days'
       ORDER BY c.scheduled_at ASC
       LIMIT 100`
    );

    res.json({
      success: true,
      total: upcomingResult.rows.length,
      campaigns: upcomingResult.rows
    });
  })
);

/**
 * GET /api/admin/campaigns/debug/user-prefs/:userId
 * Debug user preferences in detail
 */
router.get('/debug/user-prefs/:userId',
  authenticate,
  isAdmin,
  asyncHandler(async (req, res) => {
    const userId = req.params.userId;

    const prefsResult = await query(
      'SELECT * FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    const userResult = await query(
      `SELECT id, email, timezone, created_at FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new APIError('User not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      user: userResult.rows[0],
      preferences: prefsResult.rows[0] || null
    });
  })
);

export default router;
