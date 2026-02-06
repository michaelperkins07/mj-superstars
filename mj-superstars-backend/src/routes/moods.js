// ============================================================
// Mood Tracking Routes
// ============================================================

import { Router } from 'express';
import { body, query as queryValidator, param } from 'express-validator';
import { query } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();
router.use(authenticate);

// ============================================================
// GET /api/moods - Get mood history
// ============================================================
router.get('/',
  asyncHandler(async (req, res) => {
    const {
      limit = 30,
      offset = 0,
      start_date,
      end_date,
      time_of_day
    } = req.query;

    let whereClause = 'user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (start_date) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (time_of_day) {
      whereClause += ` AND time_of_day = $${paramIndex}`;
      params.push(time_of_day);
      paramIndex++;
    }

    const result = await query(
      `SELECT id, mood_score, energy_level, anxiety_level, note, activities,
              triggers, source, time_of_day, created_at
       FROM mood_entries
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    // Get aggregate stats
    const stats = await query(
      `SELECT
         AVG(mood_score)::NUMERIC(3,2) as avg_mood,
         AVG(energy_level)::NUMERIC(3,2) as avg_energy,
         AVG(anxiety_level)::NUMERIC(3,2) as avg_anxiety,
         COUNT(*) as total_entries
       FROM mood_entries
       WHERE ${whereClause}`,
      params
    );

    res.json({
      entries: result.rows,
      stats: stats.rows[0],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  })
);

// ============================================================
// POST /api/moods - Log mood
// ============================================================
router.post('/',
  [
    body('mood_score').isInt({ min: 1, max: 5 }),
    body('energy_level').optional().isInt({ min: 1, max: 5 }),
    body('anxiety_level').optional().isInt({ min: 1, max: 5 }),
    body('note').optional().trim().isLength({ max: 1000 }),
    body('activities').optional().isArray(),
    body('triggers').optional().isArray(),
    body('source').optional().isIn(['manual', 'check_in', 'conversation', 'widget'])
  ],
  asyncHandler(async (req, res) => {
    const {
      mood_score,
      energy_level,
      anxiety_level,
      note,
      activities = [],
      triggers = [],
      source = 'manual',
      conversation_id
    } = req.body;

    // Determine time of day
    const hour = new Date().getHours();
    let time_of_day;
    if (hour >= 5 && hour < 12) time_of_day = 'morning';
    else if (hour >= 12 && hour < 17) time_of_day = 'afternoon';
    else if (hour >= 17 && hour < 21) time_of_day = 'evening';
    else time_of_day = 'night';

    const result = await query(
      `INSERT INTO mood_entries
       (user_id, mood_score, energy_level, anxiety_level, note, activities, triggers, source, conversation_id, time_of_day, day_of_week)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, EXTRACT(DOW FROM NOW()))
       RETURNING *`,
      [
        req.user.id,
        mood_score,
        energy_level || null,
        anxiety_level || null,
        note || null,
        JSON.stringify(activities),
        JSON.stringify(triggers),
        source,
        conversation_id || null,
        time_of_day
      ]
    );

    logger.info('Mood logged:', {
      userId: req.user.id,
      mood: mood_score,
      source
    });

    res.status(201).json({
      entry: result.rows[0],
      message: 'Mood logged successfully'
    });
  })
);

// ============================================================
// GET /api/moods/trends - Get mood trends
// ============================================================
router.get('/trends',
  asyncHandler(async (req, res) => {
    const { period = '7d' } = req.query;

    let interval;
    switch (period) {
      case '7d': interval = '7 days'; break;
      case '30d': interval = '30 days'; break;
      case '90d': interval = '90 days'; break;
      default: interval = '7 days';
    }

    // Daily averages
    const dailyTrends = await query(
      `SELECT
         DATE(created_at) as date,
         AVG(mood_score)::NUMERIC(3,2) as avg_mood,
         AVG(energy_level)::NUMERIC(3,2) as avg_energy,
         AVG(anxiety_level)::NUMERIC(3,2) as avg_anxiety,
         COUNT(*) as entry_count
       FROM mood_entries
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [req.user.id]
    );

    // Time of day patterns
    const timePatterns = await query(
      `SELECT
         time_of_day,
         AVG(mood_score)::NUMERIC(3,2) as avg_mood,
         COUNT(*) as count
       FROM mood_entries
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY time_of_day`,
      [req.user.id]
    );

    // Day of week patterns
    const dayPatterns = await query(
      `SELECT
         day_of_week,
         AVG(mood_score)::NUMERIC(3,2) as avg_mood,
         COUNT(*) as count
       FROM mood_entries
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY day_of_week
       ORDER BY day_of_week`,
      [req.user.id]
    );

    // Top activities correlation
    const activityCorrelation = await query(
      `SELECT
         activity,
         AVG(mood_score)::NUMERIC(3,2) as avg_mood,
         COUNT(*) as count
       FROM mood_entries,
         LATERAL jsonb_array_elements_text(activities) as activity
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY activity
       HAVING COUNT(*) >= 3
       ORDER BY avg_mood DESC
       LIMIT 10`,
      [req.user.id]
    );

    // Top triggers
    const triggerCorrelation = await query(
      `SELECT
         trigger,
         AVG(mood_score)::NUMERIC(3,2) as avg_mood,
         COUNT(*) as count
       FROM mood_entries,
         LATERAL jsonb_array_elements_text(triggers) as trigger
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${interval}'
       GROUP BY trigger
       HAVING COUNT(*) >= 2
       ORDER BY avg_mood ASC
       LIMIT 10`,
      [req.user.id]
    );

    res.json({
      period,
      daily: dailyTrends.rows,
      by_time_of_day: timePatterns.rows,
      by_day_of_week: dayPatterns.rows,
      positive_activities: activityCorrelation.rows,
      common_triggers: triggerCorrelation.rows
    });
  })
);

// ============================================================
// GET /api/moods/today - Get today's moods
// ============================================================
router.get('/today',
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT id, mood_score, energy_level, anxiety_level, note, time_of_day, created_at
       FROM mood_entries
       WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      entries: result.rows,
      count: result.rows.length
    });
  })
);

// ============================================================
// DELETE /api/moods/:id - Delete mood entry
// ============================================================
router.delete('/:id',
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    const result = await query(
      `DELETE FROM mood_entries WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new APIError('Mood entry not found', 404, 'NOT_FOUND');
    }

    res.json({ message: 'Mood entry deleted' });
  })
);

export default router;
