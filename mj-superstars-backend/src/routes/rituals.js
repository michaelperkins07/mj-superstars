// ============================================================
// Daily Rituals Routes (Morning & Evening)
// ============================================================

import { Router } from 'express';
import { body, param } from 'express-validator';
import { query, transaction } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();
router.use(authenticate);

// ============================================================
// MORNING INTENTIONS
// ============================================================

// GET /api/rituals/morning/today - Get today's intention
router.get('/morning/today',
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT * FROM morning_intentions
       WHERE user_id = $1 AND date = CURRENT_DATE`,
      [req.user.id]
    );

    const streak = await query(
      `SELECT current_streak, longest_streak FROM user_streaks
       WHERE user_id = $1 AND streak_type = 'morning_ritual'`,
      [req.user.id]
    );

    res.json({
      intention: result.rows[0] || null,
      streak: streak.rows[0] || { current_streak: 0, longest_streak: 0 },
      completed: result.rows.length > 0
    });
  })
);

// GET /api/rituals/morning/history - Get intention history
router.get('/morning/history',
  asyncHandler(async (req, res) => {
    const { limit = 30 } = req.query;

    const result = await query(
      `SELECT * FROM morning_intentions
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT $2`,
      [req.user.id, parseInt(limit)]
    );

    res.json({ intentions: result.rows });
  })
);

// POST /api/rituals/morning - Set today's intention
router.post('/morning',
  [
    body('intention_text').trim().notEmpty().isLength({ max: 500 }),
    body('focus_word').optional().trim().isLength({ max: 50 }),
    body('mood_score').optional().isInt({ min: 1, max: 5 })
  ],
  asyncHandler(async (req, res) => {
    const { intention_text, focus_word, mood_score } = req.body;

    const result = await transaction(async (client) => {
      // Upsert intention
      const intention = await client.query(
        `INSERT INTO morning_intentions (user_id, intention_text, focus_word, mood_score, date)
         VALUES ($1, $2, $3, $4, CURRENT_DATE)
         ON CONFLICT (user_id, date)
         DO UPDATE SET intention_text = $2, focus_word = $3, mood_score = $4
         RETURNING *`,
        [req.user.id, intention_text, focus_word || null, mood_score || null]
      );

      // Update streak
      await client.query(
        `INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, total_completions, last_completed_date, streak_started_date)
         VALUES ($1, 'morning_ritual', 1, 1, 1, CURRENT_DATE, CURRENT_DATE)
         ON CONFLICT (user_id, streak_type)
         DO UPDATE SET
           current_streak = CASE
             WHEN user_streaks.last_completed_date = CURRENT_DATE THEN user_streaks.current_streak
             WHEN user_streaks.last_completed_date = CURRENT_DATE - 1 THEN user_streaks.current_streak + 1
             ELSE 1
           END,
           longest_streak = GREATEST(user_streaks.longest_streak,
             CASE WHEN user_streaks.last_completed_date = CURRENT_DATE - 1 THEN user_streaks.current_streak + 1 ELSE 1 END),
           total_completions = user_streaks.total_completions + CASE WHEN user_streaks.last_completed_date = CURRENT_DATE THEN 0 ELSE 1 END,
           last_completed_date = CURRENT_DATE,
           streak_started_date = CASE WHEN user_streaks.last_completed_date < CURRENT_DATE - 1 THEN CURRENT_DATE ELSE user_streaks.streak_started_date END,
           updated_at = NOW()`,
        [req.user.id]
      );

      // Get updated streak
      const streak = await client.query(
        `SELECT current_streak, longest_streak FROM user_streaks
         WHERE user_id = $1 AND streak_type = 'morning_ritual'`,
        [req.user.id]
      );

      return {
        intention: intention.rows[0],
        streak: streak.rows[0]
      };
    });

    logger.info('Morning intention set:', { userId: req.user.id });

    res.status(201).json({
      intention: result.intention,
      streak: result.streak,
      message: 'Your intention is set! Have a great day ☀️'
    });
  })
);

// PUT /api/rituals/morning/reflect - Add end-of-day reflection to intention
router.put('/morning/reflect',
  [
    body('reflection').trim().isLength({ max: 1000 }),
    body('intention_met').isBoolean()
  ],
  asyncHandler(async (req, res) => {
    const { reflection, intention_met } = req.body;

    const result = await query(
      `UPDATE morning_intentions
       SET reflection = $3, intention_met = $4, reflected_at = NOW()
       WHERE user_id = $1 AND date = CURRENT_DATE
       RETURNING *`,
      [req.user.id, reflection, intention_met]
    );

    if (result.rows.length === 0) {
      throw new APIError('No intention set for today', 404, 'NOT_FOUND');
    }

    res.json({
      intention: result.rows[0],
      message: 'Reflection saved'
    });
  })
);

// ============================================================
// EVENING REFLECTIONS
// ============================================================

// GET /api/rituals/evening/today - Get today's reflection
router.get('/evening/today',
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT * FROM evening_reflections
       WHERE user_id = $1 AND date = CURRENT_DATE`,
      [req.user.id]
    );

    const streak = await query(
      `SELECT current_streak, longest_streak FROM user_streaks
       WHERE user_id = $1 AND streak_type = 'evening_reflection'`,
      [req.user.id]
    );

    res.json({
      reflection: result.rows[0] || null,
      streak: streak.rows[0] || { current_streak: 0, longest_streak: 0 },
      completed: result.rows.length > 0
    });
  })
);

// GET /api/rituals/evening/history - Get reflection history
router.get('/evening/history',
  asyncHandler(async (req, res) => {
    const { limit = 30 } = req.query;

    const result = await query(
      `SELECT * FROM evening_reflections
       WHERE user_id = $1
       ORDER BY date DESC
       LIMIT $2`,
      [req.user.id, parseInt(limit)]
    );

    res.json({ reflections: result.rows });
  })
);

// POST /api/rituals/evening - Complete evening reflection
router.post('/evening',
  [
    body('went_well').optional().trim().isLength({ max: 1000 }),
    body('let_go').optional().trim().isLength({ max: 1000 }),
    body('grateful_for').optional().trim().isLength({ max: 1000 }),
    body('tomorrow_intention').optional().trim().isLength({ max: 500 }),
    body('evening_mood').optional().isInt({ min: 1, max: 5 }),
    body('sleep_readiness').optional().isInt({ min: 1, max: 5 })
  ],
  asyncHandler(async (req, res) => {
    const {
      went_well,
      let_go,
      grateful_for,
      tomorrow_intention,
      evening_mood,
      sleep_readiness
    } = req.body;

    const result = await transaction(async (client) => {
      // Upsert reflection
      const reflection = await client.query(
        `INSERT INTO evening_reflections
         (user_id, went_well, let_go, grateful_for, tomorrow_intention, evening_mood, sleep_readiness, date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
         ON CONFLICT (user_id, date)
         DO UPDATE SET
           went_well = COALESCE($2, evening_reflections.went_well),
           let_go = COALESCE($3, evening_reflections.let_go),
           grateful_for = COALESCE($4, evening_reflections.grateful_for),
           tomorrow_intention = COALESCE($5, evening_reflections.tomorrow_intention),
           evening_mood = COALESCE($6, evening_reflections.evening_mood),
           sleep_readiness = COALESCE($7, evening_reflections.sleep_readiness)
         RETURNING *`,
        [req.user.id, went_well, let_go, grateful_for, tomorrow_intention, evening_mood, sleep_readiness]
      );

      // Update streak
      await client.query(
        `INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, total_completions, last_completed_date, streak_started_date)
         VALUES ($1, 'evening_reflection', 1, 1, 1, CURRENT_DATE, CURRENT_DATE)
         ON CONFLICT (user_id, streak_type)
         DO UPDATE SET
           current_streak = CASE
             WHEN user_streaks.last_completed_date = CURRENT_DATE THEN user_streaks.current_streak
             WHEN user_streaks.last_completed_date = CURRENT_DATE - 1 THEN user_streaks.current_streak + 1
             ELSE 1
           END,
           longest_streak = GREATEST(user_streaks.longest_streak,
             CASE WHEN user_streaks.last_completed_date = CURRENT_DATE - 1 THEN user_streaks.current_streak + 1 ELSE 1 END),
           total_completions = user_streaks.total_completions + CASE WHEN user_streaks.last_completed_date = CURRENT_DATE THEN 0 ELSE 1 END,
           last_completed_date = CURRENT_DATE,
           streak_started_date = CASE WHEN user_streaks.last_completed_date < CURRENT_DATE - 1 THEN CURRENT_DATE ELSE user_streaks.streak_started_date END,
           updated_at = NOW()`,
        [req.user.id]
      );

      // Log mood if provided
      if (evening_mood) {
        await client.query(
          `INSERT INTO mood_entries (user_id, mood_score, source, time_of_day)
           VALUES ($1, $2, 'check_in', 'night')`,
          [req.user.id, evening_mood]
        );
      }

      // Get updated streak
      const streak = await client.query(
        `SELECT current_streak, longest_streak FROM user_streaks
         WHERE user_id = $1 AND streak_type = 'evening_reflection'`,
        [req.user.id]
      );

      return {
        reflection: reflection.rows[0],
        streak: streak.rows[0]
      };
    });

    logger.info('Evening reflection completed:', { userId: req.user.id });

    res.status(201).json({
      reflection: result.reflection,
      streak: result.streak,
      message: 'Rest well tonight 🌙'
    });
  })
);

// ============================================================
// RITUAL PROMPTS
// ============================================================

// GET /api/rituals/prompts - Get ritual prompts
router.get('/prompts',
  asyncHandler(async (req, res) => {
    const { type = 'morning' } = req.query;

    const morningPrompts = [
      "What's one word you want to embody today?",
      "What would make today great?",
      "What's one thing you're looking forward to?",
      "How do you want to feel by the end of today?",
      "What's one small act of kindness you can do today?",
      "What challenge might you face today, and how will you handle it?",
      "What are you grateful for this morning?"
    ];

    const eveningPrompts = {
      went_well: [
        "What went well today?",
        "What's one thing you're proud of from today?",
        "What made you smile today?"
      ],
      let_go: [
        "What can you let go of from today?",
        "What's something you don't need to carry into tomorrow?",
        "What would feel lighter to release?"
      ],
      grateful_for: [
        "What are you grateful for right now?",
        "Who or what made today better?",
        "What simple pleasure did you enjoy today?"
      ],
      tomorrow_intention: [
        "What's one thing you want to focus on tomorrow?",
        "How do you want tomorrow to be different?",
        "What's one goal for tomorrow?"
      ]
    };

    res.json({
      prompts: type === 'morning' ? morningPrompts : eveningPrompts
    });
  })
);

export default router;
