// ============================================================
// Daily Commitments Routes - 3-Pillar System
// ============================================================

import { Router } from 'express';
import { body, param, query as queryValidator } from 'express-validator';
import { query, transaction } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import validate from '../middleware/validate.js';
import { successResponse } from '../utils/response.js';

const router = Router();
router.use(authenticate);

// ============================================================
// Constants & Friction Challenges
// ============================================================

const FRICTION_CHALLENGES = {
  physical: [
    'Run an extra mile today',
    'Try a cold shower for 2 minutes',
    'Do 50 push-ups in sets throughout the day',
    'Walk instead of taking a vehicle',
    'Try a new physical activity you\'ve never done',
    'Do a full body workout at sunrise',
    'Sprint 100 meters at full speed',
    'Hold a plank for 2 minutes straight',
    'Go for a hike on an unfamiliar trail'
  ],
  mental: [
    'Read 20 pages of something you normally wouldn\'t',
    'Teach someone what you learned yesterday',
    'Listen to an audiobook chapter on a new topic',
    'Learn a new skill for 30 minutes',
    'Write down 3 new ideas or insights',
    'Read a research paper in your field',
    'Learn about a historical event you didn\'t know',
    'Study a new language for 15 minutes',
    'Take an online course lesson'
  ],
  social: [
    'Have a real conversation with a stranger today',
    'Call someone you haven\'t talked to in a month',
    'Volunteer to help someone today',
    'Have a deep conversation with a family member',
    'Introduce two people who might benefit from knowing each other',
    'Write a thoughtful message to someone you admire',
    'Join a community group or meetup',
    'Help a neighbor with something they need',
    'Share something vulnerable with someone you trust'
  ]
};

// ============================================================
// GET /api/commitments/today
// Returns today's commitment status
// ============================================================
router.get('/today',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Check if commitment exists for today
    const existing = await query(
      `SELECT * FROM daily_commitments
       WHERE user_id = $1 AND commitment_date = CURRENT_DATE`,
      [userId]
    );

    let commitment;
    if (existing.rows.length === 0) {
      // Create new commitment for today
      const result = await query(
        `INSERT INTO daily_commitments (user_id, commitment_date)
         VALUES ($1, CURRENT_DATE)
         RETURNING *`,
        [userId]
      );
      commitment = result.rows[0];
    } else {
      commitment = existing.rows[0];
    }

    // Calculate weekly stats
    const weeklyStats = await query(
      `SELECT
         SUM(CASE WHEN physical_completed THEN 1 ELSE 0 END) as physical,
         SUM(CASE WHEN mental_completed THEN 1 ELSE 0 END) as mental,
         SUM(CASE WHEN social_completed THEN 1 ELSE 0 END) as social,
         SUM(CASE WHEN all_three_completed THEN 1 ELSE 0 END) as perfect_days
       FROM daily_commitments
       WHERE user_id = $1
       AND commitment_date >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    // Get current streak
    const streakResult = await query(
      `SELECT current_streak FROM user_streaks
       WHERE user_id = $1 AND streak_type = 'three_pillars'`,
      [userId]
    );

    const streak = streakResult.rows.length > 0 ? streakResult.rows[0].current_streak : 0;
    const stats = weeklyStats.rows[0] || { physical: 0, mental: 0, social: 0, perfect_days: 0 };

    return successResponse(res, {
      id: commitment.id,
      commitment_date: commitment.commitment_date,
      physical_completed: commitment.physical_completed,
      physical_activity: commitment.physical_activity,
      physical_duration: commitment.physical_duration,
      mental_completed: commitment.mental_completed,
      mental_activity: commitment.mental_activity,
      social_completed: commitment.social_completed,
      social_activity: commitment.social_activity,
      all_three_completed: commitment.all_three_completed,
      clear_mind_score: commitment.clear_mind_score,
      daily_reflection: commitment.daily_reflection,
      streak,
      weekly_stats: {
        physical: parseInt(stats.physical) || 0,
        mental: parseInt(stats.mental) || 0,
        social: parseInt(stats.social) || 0,
        perfect_days: parseInt(stats.perfect_days) || 0
      }
    });
  })
);

// ============================================================
// POST /api/commitments/complete/:pillar
// Complete a specific pillar
// ============================================================
router.post('/complete/:pillar',
  [
    param('pillar').isIn(['physical', 'mental', 'social']),
    body('activity').trim().notEmpty().isLength({ max: 500 }),
    body('duration').optional().isInt({ min: 1, max: 1440 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { pillar } = req.params;
    const { activity, duration } = req.body;

    // Validate duration only for physical
    if (pillar === 'physical' && !duration) {
      throw new APIError('Duration is required for physical pillar', 400, 'MISSING_DURATION');
    }

    // Get or create today's commitment
    let commitmentResult = await query(
      `SELECT * FROM daily_commitments
       WHERE user_id = $1 AND commitment_date = CURRENT_DATE`,
      [userId]
    );

    let commitment;
    if (commitmentResult.rows.length === 0) {
      const createResult = await query(
        `INSERT INTO daily_commitments (user_id, commitment_date)
         VALUES ($1, CURRENT_DATE)
         RETURNING *`,
        [userId]
      );
      commitment = createResult.rows[0];
    } else {
      commitment = commitmentResult.rows[0];
    }

    // Check if pillar already completed
    const pillarKey = `${pillar}_completed`;
    if (commitment[pillarKey]) {
      throw new APIError(`${pillar} pillar already completed today`, 400, 'ALREADY_COMPLETED');
    }

    // Update the commitment within a transaction
    const result = await transaction(async (client) => {
      // Build update query based on pillar
      let updateQuery;
      let updateParams;

      if (pillar === 'physical') {
        updateQuery = `UPDATE daily_commitments
         SET physical_completed = true,
             physical_activity = $2,
             physical_duration = $3,
             physical_completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`;
        updateParams = [commitment.id, activity, duration];
      } else if (pillar === 'mental') {
        updateQuery = `UPDATE daily_commitments
         SET mental_completed = true,
             mental_activity = $2,
             mental_completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`;
        updateParams = [commitment.id, activity];
      } else {
        updateQuery = `UPDATE daily_commitments
         SET social_completed = true,
             social_activity = $2,
             social_completed_at = NOW(),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`;
        updateParams = [commitment.id, activity];
      }

      const updatedCommitment = await client.query(updateQuery, updateParams);
      const updated = updatedCommitment.rows[0];

      // Check if all three are now complete
      let allThreeCompleted = false;
      let clearMindScore = 0;

      if (updated.physical_completed && updated.mental_completed && updated.social_completed) {
        allThreeCompleted = true;
        clearMindScore = 100;

        // Update all_three_completed
        await client.query(
          `UPDATE daily_commitments
           SET all_three_completed = true,
               clear_mind_score = 100,
               updated_at = NOW()
           WHERE id = $1`,
          [commitment.id]
        );
      } else {
        // Calculate partial clear_mind_score
        const completed = [updated.physical_completed, updated.mental_completed, updated.social_completed].filter(Boolean).length;
        clearMindScore = Math.round((completed / 3) * 100);

        // Update the clear_mind_score
        await client.query(
          `UPDATE daily_commitments
           SET clear_mind_score = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [clearMindScore, commitment.id]
        );
      }

      // Award gamification points
      const xpPoints = 25;
      let totalXp = xpPoints;

      // Check if all three just completed
      if (allThreeCompleted) {
        totalXp = xpPoints + 50; // 25 for pillar + 50 bonus
      }

      // Update user XP
      await client.query(
        `UPDATE users
         SET xp_points = COALESCE(xp_points, 0) + $1,
             updated_at = NOW()
         WHERE id = $2`,
        [totalXp, userId]
      );

      // Update or create streak
      const streakResult = await client.query(
        `SELECT * FROM user_streaks
         WHERE user_id = $1 AND streak_type = 'three_pillars'`,
        [userId]
      );

      if (streakResult.rows.length === 0) {
        // Create new streak
        await client.query(
          `INSERT INTO user_streaks
           (user_id, streak_type, current_streak, longest_streak, total_completions, last_completed_date, streak_started_date)
           VALUES ($1, 'three_pillars', 1, 1, 1, CURRENT_DATE, CURRENT_DATE)`,
          [userId]
        );
      } else {
        const streak = streakResult.rows[0];
        const lastDate = new Date(streak.last_completed_date);
        const today = new Date();

        let newStreak = streak.current_streak;

        // If last completion was yesterday and today completes all three, increment streak
        if (allThreeCompleted) {
          const daysDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            newStreak = streak.current_streak + 1;
          } else if (daysDiff === 0) {
            // Same day, don't increment
            newStreak = streak.current_streak;
          } else {
            // Gap, reset to 1
            newStreak = 1;
          }
        }

        await client.query(
          `UPDATE user_streaks
           SET current_streak = $1,
               longest_streak = GREATEST(longest_streak, $1),
               total_completions = total_completions + 1,
               last_completed_date = CASE WHEN $2 THEN CURRENT_DATE ELSE last_completed_date END,
               updated_at = NOW()
           WHERE user_id = $3 AND streak_type = 'three_pillars'`,
          [newStreak, allThreeCompleted, userId]
        );
      }

      return { updated, totalXp, allThreeCompleted, clearMindScore };
    });

    logger.info('Commitment pillar completed:', {
      userId,
      pillar,
      allThreeCompleted: result.allThreeCompleted,
      xpAwarded: result.totalXp
    });

    return successResponse(res, {
      id: result.updated.id,
      commitment_date: result.updated.commitment_date,
      physical_completed: result.updated.physical_completed,
      physical_activity: result.updated.physical_activity,
      physical_duration: result.updated.physical_duration,
      mental_completed: result.updated.mental_completed,
      mental_activity: result.updated.mental_activity,
      social_completed: result.updated.social_completed,
      social_activity: result.updated.social_activity,
      all_three_completed: result.allThreeCompleted,
      clear_mind_score: result.clearMindScore,
      xp_awarded: result.totalXp,
      message: result.allThreeCompleted ? 'Congratulations! All 3 pillars complete today!' : `${pillar} pillar completed!`
    });
  })
);

// ============================================================
// GET /api/commitments/history
// Get commitment history (last 30 days by default)
// ============================================================
router.get('/history',
  [queryValidator('days').optional().isInt({ min: 1, max: 365 })]
  ,
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 30;

    const result = await query(
      `SELECT *
       FROM daily_commitments
       WHERE user_id = $1
       AND commitment_date >= CURRENT_DATE - INTERVAL '${days} days'
       ORDER BY commitment_date DESC`,
      [userId]
    );

    return successResponse(res, {
      commitments: result.rows,
      total: result.rows.length,
      days_queried: days
    });
  })
);

// ============================================================
// GET /api/commitments/stats
// Get aggregated statistics
// ============================================================
router.get('/stats',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Current streak
    const streakResult = await query(
      `SELECT current_streak, longest_streak FROM user_streaks
       WHERE user_id = $1 AND streak_type = 'three_pillars'`,
      [userId]
    );

    const currentStreak = streakResult.rows.length > 0 ? streakResult.rows[0].current_streak : 0;
    const longestStreak = streakResult.rows.length > 0 ? streakResult.rows[0].longest_streak : 0;

    // Total perfect days
    const perfectDaysResult = await query(
      `SELECT COUNT(*) as count FROM daily_commitments
       WHERE user_id = $1 AND all_three_completed = true`,
      [userId]
    );

    const totalPerfectDays = parseInt(perfectDaysResult.rows[0].count) || 0;

    // This week stats
    const thisWeekResult = await query(
      `SELECT
         SUM(CASE WHEN physical_completed THEN 1 ELSE 0 END) as physical,
         SUM(CASE WHEN mental_completed THEN 1 ELSE 0 END) as mental,
         SUM(CASE WHEN social_completed THEN 1 ELSE 0 END) as social,
         SUM(CASE WHEN all_three_completed THEN 1 ELSE 0 END) as perfect
       FROM daily_commitments
       WHERE user_id = $1
       AND commitment_date >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    const thisWeek = thisWeekResult.rows[0] || { physical: 0, mental: 0, social: 0, perfect: 0 };

    // This month stats
    const thisMonthResult = await query(
      `SELECT
         SUM(CASE WHEN physical_completed THEN 1 ELSE 0 END) as physical,
         SUM(CASE WHEN mental_completed THEN 1 ELSE 0 END) as mental,
         SUM(CASE WHEN social_completed THEN 1 ELSE 0 END) as social,
         SUM(CASE WHEN all_three_completed THEN 1 ELSE 0 END) as perfect
       FROM daily_commitments
       WHERE user_id = $1
       AND commitment_date >= DATE_TRUNC('month', CURRENT_DATE)`,
      [userId]
    );

    const thisMonth = thisMonthResult.rows[0] || { physical: 0, mental: 0, social: 0, perfect: 0 };

    // Average clear mind score
    const avgScoreResult = await query(
      `SELECT AVG(clear_mind_score) as avg_score FROM daily_commitments
       WHERE user_id = $1 AND commitment_date >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId]
    );

    const avgClearMindScore = avgScoreResult.rows[0].avg_score ? Math.round(avgScoreResult.rows[0].avg_score) : 0;

    // Pillar strengths
    const pillarStrengthsResult = await query(
      `SELECT
         ROUND(100.0 * SUM(CASE WHEN physical_completed THEN 1 ELSE 0 END) / COUNT(*), 1) as physical_pct,
         ROUND(100.0 * SUM(CASE WHEN mental_completed THEN 1 ELSE 0 END) / COUNT(*), 1) as mental_pct,
         ROUND(100.0 * SUM(CASE WHEN social_completed THEN 1 ELSE 0 END) / COUNT(*), 1) as social_pct
       FROM daily_commitments
       WHERE user_id = $1 AND commitment_date >= CURRENT_DATE - INTERVAL '30 days'`,
      [userId]
    );

    let strongest = 'balanced';
    let needsWork = 'balanced';

    if (pillarStrengthsResult.rows.length > 0) {
      const { physical_pct, mental_pct, social_pct } = pillarStrengthsResult.rows[0];

      // Find strongest
      const scores = { physical: physical_pct, mental: mental_pct, social: social_pct };
      const pillars = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      strongest = pillars[0][1] ? pillars[0][0] : 'balanced';
      needsWork = pillars[pillars.length - 1][1] ? pillars[pillars.length - 1][0] : 'balanced';
    }

    return successResponse(res, {
      current_streak: currentStreak,
      longest_streak: longestStreak,
      total_perfect_days: totalPerfectDays,
      this_week: {
        physical: parseInt(thisWeek.physical) || 0,
        mental: parseInt(thisWeek.mental) || 0,
        social: parseInt(thisWeek.social) || 0,
        perfect: parseInt(thisWeek.perfect) || 0
      },
      this_month: {
        physical: parseInt(thisMonth.physical) || 0,
        mental: parseInt(thisMonth.mental) || 0,
        social: parseInt(thisMonth.social) || 0,
        perfect: parseInt(thisMonth.perfect) || 0
      },
      average_clear_mind_score: avgClearMindScore,
      pillar_strengths: {
        strongest,
        needs_work: needsWork
      }
    });
  })
);

// ============================================================
// GET /api/commitments/friction
// Get daily friction challenge
// ============================================================
router.get('/friction',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Get user's weakest pillar from this month
    const pillarResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE physical_completed) as physical,
         COUNT(*) FILTER (WHERE mental_completed) as mental,
         COUNT(*) FILTER (WHERE social_completed) as social
       FROM daily_commitments
       WHERE user_id = $1
       AND commitment_date >= DATE_TRUNC('month', CURRENT_DATE)`,
      [userId]
    );

    const counts = pillarResult.rows[0] || { physical: 0, mental: 0, social: 0 };

    // Find weakest pillar
    const weakestMap = {
      physical: parseInt(counts.physical) || 0,
      mental: parseInt(counts.mental) || 0,
      social: parseInt(counts.social) || 0
    };

    const weakestPillar = Object.entries(weakestMap)
      .sort((a, b) => a[1] - b[1])[0][0];

    // Use day of year to pick consistent challenge
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const challengeIndex = dayOfYear % FRICTION_CHALLENGES[weakestPillar].length;
    const challenge = FRICTION_CHALLENGES[weakestPillar][challengeIndex];

    return successResponse(res, {
      pillar: weakestPillar,
      challenge,
      description: `Today's friction challenge: ${challenge}`,
      rationale: `Your ${weakestPillar} pillar needs some attention this month. Push your comfort zone!`
    });
  })
);

// ============================================================
// POST /api/commitments/:id/reflect
// Add daily reflection
// ============================================================
router.post('/:id/reflect',
  [
    param('id').isUUID(),
    body('reflection').trim().notEmpty().isLength({ max: 1000 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reflection } = req.body;
    const userId = req.user.id;

    const result = await query(
      `UPDATE daily_commitments
       SET daily_reflection = $1,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [reflection, id, userId]
    );

    if (result.rows.length === 0) {
      throw new APIError('Commitment not found', 404, 'NOT_FOUND');
    }

    return successResponse(res, result.rows[0]);
  })
);

export default router;
