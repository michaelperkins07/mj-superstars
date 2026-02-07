// ============================================================
// Content Feed Routes
// ============================================================

import { Router } from 'express';
import { query } from '../database/db.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { ClaudeService } from '../services/claude.js';

const router = Router();

// ============================================================
// GET /api/content/feed - Get personalized content feed
// ============================================================
router.get('/feed',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { type, limit = 10 } = req.query;
    const userId = req.user?.id;

    let whereClause = 'is_active = true';
    const params = [];

    if (type) {
      whereClause += ` AND content_type = $${params.length + 1}`;
      params.push(type);
    }

    // Get content, excluding recently seen items for logged-in users
    let excludeClause = '';
    if (userId) {
      excludeClause = `AND id NOT IN (
        SELECT content_id FROM content_interactions
        WHERE user_id = $${params.length + 1}
        AND interaction_type = 'viewed'
        AND created_at > NOW() - INTERVAL '24 hours'
      )`;
      params.push(userId);
    }

    const result = await query(
      `SELECT * FROM content_items
       WHERE ${whereClause} ${excludeClause}
       ORDER BY RANDOM()
       LIMIT $${params.length + 1}`,
      [...params, parseInt(limit)]
    );

    res.json({ items: result.rows });
  })
);

// ============================================================
// GET /api/content/daily-affirmation - Get personalized affirmation
// ============================================================
router.get('/daily-affirmation',
  authenticate,
  asyncHandler(async (req, res) => {
    // Get user context
    const moodResult = await query(
      `SELECT mood_score FROM mood_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    const personalization = await query(
      `SELECT * FROM user_personalization WHERE user_id = $1`,
      [req.user.id]
    );

    const intentionResult = await query(
      `SELECT intention_text, focus_word FROM morning_intentions WHERE user_id = $1 AND date = CURRENT_DATE`,
      [req.user.id]
    );

    const userContext = {
      userName: req.user.display_name || 'friend',
      recentMoods: moodResult.rows,
      personalization: personalization.rows[0] || {},
      morningIntention: intentionResult.rows[0] || null
    };

    const affirmation = await ClaudeService.generateAffirmation(userContext);

    res.json({ affirmation });
  })
);

// ============================================================
// GET /api/content/quotes - Get quotes
// ============================================================
router.get('/quotes',
  asyncHandler(async (req, res) => {
    const { category, limit = 5 } = req.query;

    let whereClause = "content_type = 'quote' AND is_active = true";
    const params = [];

    if (category) {
      whereClause += ` AND categories ? $${params.length + 1}`;
      params.push(category);
    }

    const result = await query(
      `SELECT id, body as quote, author, categories FROM content_items
       WHERE ${whereClause}
       ORDER BY RANDOM()
       LIMIT $${params.length + 1}`,
      [...params, parseInt(limit)]
    );

    res.json({ quotes: result.rows });
  })
);

// ============================================================
// GET /api/content/challenges - Get daily challenges
// ============================================================
router.get('/challenges',
  authenticate,
  asyncHandler(async (req, res) => {
    const { mood, limit = 3 } = req.query;

    let whereClause = "content_type = 'challenge' AND is_active = true";
    const params = [];

    // Filter by mood if provided
    if (mood) {
      whereClause += ` AND $${params.length + 1} = ANY(mood_target)`;
      params.push(parseInt(mood));
    }

    const result = await query(
      `SELECT id, title, body as description, categories FROM content_items
       WHERE ${whereClause}
       ORDER BY RANDOM()
       LIMIT $${params.length + 1}`,
      [...params, parseInt(limit)]
    );

    res.json({ challenges: result.rows });
  })
);

// ============================================================
// POST /api/content/:id/interact - Log content interaction
// ============================================================
router.post('/:id/interact',
  authenticate,
  asyncHandler(async (req, res) => {
    const { interaction_type } = req.body;

    const validTypes = ['viewed', 'liked', 'saved', 'shared', 'dismissed'];
    if (!validTypes.includes(interaction_type)) {
      return res.status(400).json({ error: 'Invalid interaction type' });
    }

    await query(
      `INSERT INTO content_interactions (user_id, content_id, interaction_type)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [req.user.id, req.params.id, interaction_type]
    );

    res.json({ success: true, message: 'Interaction logged' });
  })
);

// ============================================================
// GET /api/content/saved - Get user's saved content
// ============================================================
router.get('/saved',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT ci.*, ci2.created_at as saved_at
       FROM content_items ci
       JOIN content_interactions ci2 ON ci.id = ci2.content_id
       WHERE ci2.user_id = $1 AND ci2.interaction_type = 'saved'
       ORDER BY ci2.created_at DESC`,
      [req.user.id]
    );

    res.json({ saved: result.rows });
  })
);

export default router;
