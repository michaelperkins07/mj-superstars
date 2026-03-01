import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../database/db.js';
import emailService from '../services/email.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /
 * Get user's email preferences (auto-create default if doesn't exist)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    let result = await pool.query('SELECT * FROM email_preferences WHERE user_id = $1', [userId]);

    // Auto-create default preferences if they don't exist
    if (result.rows.length === 0) {
      const unsubscribeToken = emailService.generateUnsubscribeToken();

      await pool.query(
        `INSERT INTO email_preferences (
          user_id,
          weekly_digest,
          coaching_nudges,
          buddy_sharing,
          digest_day,
          digest_time,
          nudge_frequency,
          unsubscribe_token
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, true, true, false, 'monday', '09:00', 'daily', unsubscribeToken]
      );

      result = await pool.query('SELECT * FROM email_preferences WHERE user_id = $1', [userId]);

      logger.info(`Created default email preferences for user ${userId}`);
    }

    const preferences = result.rows[0];

    res.status(200).json({
      success: true,
      data: {
        id: preferences.id,
        weekly_digest: preferences.weekly_digest,
        coaching_nudges: preferences.coaching_nudges,
        buddy_sharing: preferences.buddy_sharing,
        buddy_email: preferences.buddy_email,
        digest_day: preferences.digest_day,
        digest_time: preferences.digest_time,
        nudge_frequency: preferences.nudge_frequency,
        last_digest_sent_at: preferences.last_digest_sent_at,
        last_nudge_sent_at: preferences.last_nudge_sent_at,
        created_at: preferences.created_at,
        updated_at: preferences.updated_at,
      },
    });
  } catch (error) {
    logger.error('Error fetching email preferences', { userId: req.user.id, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email preferences',
    });
  }
});

/**
 * PUT /
 * Update email preferences
 */
router.put('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      weekly_digest,
      coaching_nudges,
      buddy_sharing,
      buddy_email,
      digest_day,
      digest_time,
      nudge_frequency,
    } = req.body;

    // Validate inputs
    if (digest_day && !['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(digest_day)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid digest_day. Must be a day of the week.',
      });
    }

    if (nudge_frequency && !['daily', 'weekdays', 'custom'].includes(nudge_frequency)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid nudge_frequency. Must be daily, weekdays, or custom.',
      });
    }

    if (buddy_sharing && !buddy_email) {
      return res.status(400).json({
        success: false,
        error: 'buddy_email is required when buddy_sharing is enabled.',
      });
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [userId];
    let paramCount = 1;

    if (weekly_digest !== undefined) {
      paramCount++;
      updateFields.push(`weekly_digest = $${paramCount}`);
      updateValues.push(weekly_digest);
    }

    if (coaching_nudges !== undefined) {
      paramCount++;
      updateFields.push(`coaching_nudges = $${paramCount}`);
      updateValues.push(coaching_nudges);
    }

    if (buddy_sharing !== undefined) {
      paramCount++;
      updateFields.push(`buddy_sharing = $${paramCount}`);
      updateValues.push(buddy_sharing);
    }

    if (buddy_email !== undefined) {
      paramCount++;
      updateFields.push(`buddy_email = $${paramCount}`);
      updateValues.push(buddy_email);
    }

    if (digest_day !== undefined) {
      paramCount++;
      updateFields.push(`digest_day = $${paramCount}`);
      updateValues.push(digest_day);
    }

    if (digest_time !== undefined) {
      paramCount++;
      updateFields.push(`digest_time = $${paramCount}`);
      updateValues.push(digest_time);
    }

    if (nudge_frequency !== undefined) {
      paramCount++;
      updateFields.push(`nudge_frequency = $${paramCount}`);
      updateValues.push(nudge_frequency);
    }

    // Always update the updated_at timestamp
    paramCount++;
    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) {
      // Only updated_at was added, nothing to update
      return res.status(400).json({
        success: false,
        error: 'No fields provided to update.',
      });
    }

    const query = `
      UPDATE email_preferences
      SET ${updateFields.join(', ')}
      WHERE user_id = $1
      RETURNING *
    `;

    const result = await pool.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email preferences not found.',
      });
    }

    const preferences = result.rows[0];

    logger.info(`Updated email preferences for user ${userId}`);

    res.status(200).json({
      success: true,
      data: {
        id: preferences.id,
        weekly_digest: preferences.weekly_digest,
        coaching_nudges: preferences.coaching_nudges,
        buddy_sharing: preferences.buddy_sharing,
        buddy_email: preferences.buddy_email,
        digest_day: preferences.digest_day,
        digest_time: preferences.digest_time,
        nudge_frequency: preferences.nudge_frequency,
        last_digest_sent_at: preferences.last_digest_sent_at,
        last_nudge_sent_at: preferences.last_nudge_sent_at,
        updated_at: preferences.updated_at,
      },
    });
  } catch (error) {
    logger.error('Error updating email preferences', { userId: req.user.id, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update email preferences',
    });
  }
});

/**
 * POST /send-test
 * Send a test digest email to the user
 */
router.post('/send-test', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Verify user has email preferences
    const prefsResult = await pool.query(
      'SELECT id FROM email_preferences WHERE user_id = $1',
      [userId]
    );

    if (prefsResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Email preferences not found. Please initialize preferences first.',
      });
    }

    // Send the test digest email
    await emailService.sendWeeklyDigest(userId);

    logger.info(`Test digest email sent to user ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Test digest email sent successfully',
    });
  } catch (error) {
    logger.error('Error sending test digest email', { userId: req.user.id, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to send test digest email',
    });
  }
});

/**
 * GET /unsubscribe/:token
 * Handle unsubscribe link (no auth required)
 */
router.get('/unsubscribe/:token', async (req, res) => {
  try {
    const token = req.params.token;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Unsubscribe token is required.',
      });
    }

    const userId = await emailService.processUnsubscribe(token);

    logger.info(`User ${userId} unsubscribed via token`);

    res.status(200).json({
      success: true,
      message: 'You have been unsubscribed from all Top Performer emails. You can manage your preferences anytime in your account settings.',
    });
  } catch (error) {
    logger.error('Error processing unsubscribe', { error: error.message });

    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process unsubscribe request',
    });
  }
});

/**
 * GET /log
 * Get user's email history (paginated)
 */
router.get('/log', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit cannot exceed 100.',
      });
    }

    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM email_log WHERE user_id = $1',
      [userId]
    );

    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const result = await pool.query(
      `SELECT id, email_type, recipient, subject, status, metadata, created_at
       FROM email_log
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2
       OFFSET $3`,
      [userId, limit, offset]
    );

    const logs = result.rows.map((row) => ({
      id: row.id,
      email_type: row.email_type,
      recipient: row.recipient,
      subject: row.subject,
      status: row.status,
      metadata: row.metadata,
      created_at: row.created_at,
    }));

    const totalPages = Math.ceil(total / limit);

    logger.info(`Retrieved email log for user ${userId}`, { page, limit, total });

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          total_pages: totalPages,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching email log', { userId: req.user.id, error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch email log',
    });
  }
});

export default router;
