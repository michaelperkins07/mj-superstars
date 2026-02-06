// ============================================================
// AI Insights Routes
// ============================================================

import { Router } from 'express';
import { query } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate);

// ============================================================
// GET /api/insights - Get user's insights
// ============================================================
router.get('/',
  asyncHandler(async (req, res) => {
    const { unread_only = 'false', limit = 20 } = req.query;

    let whereClause = 'user_id = $1';
    if (unread_only === 'true') {
      whereClause += ' AND is_new = true';
    }

    const result = await query(
      `SELECT * FROM user_insights
       WHERE ${whereClause}
       ORDER BY generated_at DESC
       LIMIT $2`,
      [req.user.id, parseInt(limit)]
    );

    res.json({ insights: result.rows });
  })
);

// ============================================================
// PUT /api/insights/:id/read - Mark insight as read
// ============================================================
router.put('/:id/read',
  asyncHandler(async (req, res) => {
    await query(
      `UPDATE user_insights SET is_new = false, viewed_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Marked as read' });
  })
);

// ============================================================
// GET /api/insights/mood-patterns - Analyze mood patterns
// ============================================================
router.get('/mood-patterns',
  asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;

    // Get mood by time of day
    const timePatterns = await query(
      `SELECT
         time_of_day,
         AVG(mood_score)::NUMERIC(3,2) as avg_mood,
         COUNT(*) as count
       FROM mood_entries
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY time_of_day`,
      [req.user.id]
    );

    // Get mood by day of week
    const dayPatterns = await query(
      `SELECT
         day_of_week,
         AVG(mood_score)::NUMERIC(3,2) as avg_mood,
         COUNT(*) as count
       FROM mood_entries
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY day_of_week
       ORDER BY day_of_week`,
      [req.user.id]
    );

    // Get activities that correlate with better mood
    const positiveActivities = await query(
      `SELECT
         activity,
         AVG(mood_score)::NUMERIC(3,2) as avg_mood,
         COUNT(*) as frequency
       FROM mood_entries,
         LATERAL jsonb_array_elements_text(activities) as activity
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY activity
       HAVING COUNT(*) >= 3
       ORDER BY avg_mood DESC
       LIMIT 5`,
      [req.user.id]
    );

    // Get triggers that correlate with lower mood
    const triggers = await query(
      `SELECT
         trigger,
         AVG(mood_score)::NUMERIC(3,2) as avg_mood,
         COUNT(*) as frequency
       FROM mood_entries,
         LATERAL jsonb_array_elements_text(triggers) as trigger
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY trigger
       HAVING COUNT(*) >= 2
       ORDER BY avg_mood ASC
       LIMIT 5`,
      [req.user.id]
    );

    res.json({
      period_days: parseInt(days),
      by_time_of_day: timePatterns.rows,
      by_day_of_week: dayPatterns.rows,
      positive_activities: positiveActivities.rows,
      mood_triggers: triggers.rows
    });
  })
);

// ============================================================
// GET /api/insights/progress-summary - Get progress summary
// ============================================================
router.get('/progress-summary',
  asyncHandler(async (req, res) => {
    const { period = '7d' } = req.query;

    let interval;
    switch (period) {
      case '7d': interval = '7 days'; break;
      case '30d': interval = '30 days'; break;
      case '90d': interval = '90 days'; break;
      default: interval = '7 days';
    }

    // Get various stats
    const stats = await query(
      `SELECT
         (SELECT COUNT(*) FROM conversations WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${interval}') as conversations,
         (SELECT COUNT(*) FROM messages WHERE user_id = $1 AND role = 'user' AND created_at >= NOW() - INTERVAL '${interval}') as messages_sent,
         (SELECT COUNT(*) FROM mood_entries WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${interval}') as mood_logs,
         (SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status = 'completed' AND completed_at >= NOW() - INTERVAL '${interval}') as tasks_completed,
         (SELECT COUNT(*) FROM journal_entries WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${interval}') as journal_entries,
         (SELECT COUNT(*) FROM morning_intentions WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${interval}') as morning_rituals,
         (SELECT COUNT(*) FROM evening_reflections WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${interval}') as evening_rituals`,
      [req.user.id]
    );

    // Get mood trend
    const moodTrend = await query(
      `SELECT
         AVG(mood_score)::NUMERIC(3,2) as avg_mood,
         MIN(mood_score) as min_mood,
         MAX(mood_score) as max_mood
       FROM mood_entries
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${interval}'`,
      [req.user.id]
    );

    // Get achievements earned in period
    const achievements = await query(
      `SELECT * FROM achievements
       WHERE user_id = $1 AND earned_at >= NOW() - INTERVAL '${interval}'`,
      [req.user.id]
    );

    // Get current streaks
    const streaks = await query(
      `SELECT streak_type, current_streak FROM user_streaks WHERE user_id = $1 AND current_streak > 0`,
      [req.user.id]
    );

    res.json({
      period,
      stats: stats.rows[0],
      mood: moodTrend.rows[0],
      achievements: achievements.rows,
      active_streaks: streaks.rows
    });
  })
);

// ============================================================
// GET /api/insights/conversation-themes - Analyze conversation themes
// ============================================================
router.get('/conversation-themes',
  asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;

    // Get topic frequencies from messages
    const topics = await query(
      `SELECT
         topic,
         COUNT(*) as frequency
       FROM messages,
         LATERAL jsonb_array_elements_text(topics) as topic
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY topic
       ORDER BY frequency DESC
       LIMIT 10`,
      [req.user.id]
    );

    // Get intent distribution
    const intents = await query(
      `SELECT
         intent,
         COUNT(*) as count
       FROM messages
       WHERE user_id = $1 AND intent IS NOT NULL AND created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY intent
       ORDER BY count DESC`,
      [req.user.id]
    );

    res.json({
      period_days: parseInt(days),
      common_topics: topics.rows,
      conversation_intents: intents.rows
    });
  })
);

export default router;
