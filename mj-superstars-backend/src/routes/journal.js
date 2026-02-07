// ============================================================
// Journal Routes
// ============================================================

import { Router } from 'express';
import { body, param } from 'express-validator';
import { query } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { ClaudeService } from '../services/claude.js';
import validate from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

// ============================================================
// GET /api/journal - Get journal entries
// ============================================================
router.get('/',
  asyncHandler(async (req, res) => {
    const { limit = 20, offset = 0, tag } = req.query;

    let whereClause = 'user_id = $1';
    const params = [req.user.id];

    if (tag) {
      whereClause += ` AND tags ? $${params.length + 1}`;
      params.push(tag);
    }

    const result = await query(
      `SELECT id, title, content, prompt_id, prompt_text, mood_score, tags, word_count, created_at
       FROM journal_entries
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM journal_entries WHERE ${whereClause}`,
      params
    );

    // Get all tags
    const tagsResult = await query(
      `SELECT DISTINCT jsonb_array_elements_text(tags) as tag
       FROM journal_entries WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      entries: result.rows,
      total: parseInt(countResult.rows[0].count),
      tags: tagsResult.rows.map(r => r.tag),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  })
);

// ============================================================
// GET /api/journal/:id - Get single entry
// ============================================================
router.get('/:id',
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT * FROM journal_entries WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new APIError('Entry not found', 404, 'NOT_FOUND');
    }

    res.json({ entry: result.rows[0] });
  })
);

// ============================================================
// POST /api/journal - Create entry
// ============================================================
router.post('/',
  [
    body('content').trim().notEmpty().isLength({ max: 50000 }),
    body('title').optional().trim().isLength({ max: 255 }),
    body('prompt_id').optional().trim(),
    body('prompt_text').optional().trim(),
    body('mood_score').optional().isInt({ min: 1, max: 5 }),
    body('tags').optional().isArray()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { content, title, prompt_id, prompt_text, mood_score, tags = [] } = req.body;

    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    const result = await query(
      `INSERT INTO journal_entries
       (user_id, title, content, prompt_id, prompt_text, mood_score, tags, word_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user.id,
        title || null,
        content,
        prompt_id || null,
        prompt_text || null,
        mood_score || null,
        JSON.stringify(tags),
        wordCount
      ]
    );

    res.status(201).json({
      entry: result.rows[0],
      message: 'Entry saved'
    });
  })
);

// ============================================================
// PUT /api/journal/:id - Update entry
// ============================================================
router.put('/:id',
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const { content, title, mood_score, tags } = req.body;

    const wordCount = content ? content.split(/\s+/).filter(w => w.length > 0).length : null;

    const result = await query(
      `UPDATE journal_entries
       SET
         title = COALESCE($3, title),
         content = COALESCE($4, content),
         mood_score = COALESCE($5, mood_score),
         tags = COALESCE($6, tags),
         word_count = COALESCE($7, word_count),
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        req.params.id,
        req.user.id,
        title,
        content,
        mood_score,
        tags ? JSON.stringify(tags) : null,
        wordCount
      ]
    );

    if (result.rows.length === 0) {
      throw new APIError('Entry not found', 404, 'NOT_FOUND');
    }

    res.json({ entry: result.rows[0] });
  })
);

// ============================================================
// DELETE /api/journal/:id - Delete entry
// ============================================================
router.delete('/:id',
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await query(
      `DELETE FROM journal_entries WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new APIError('Entry not found', 404, 'NOT_FOUND');
    }

    res.json({ success: true, message: 'Entry deleted' });
  })
);

// ============================================================
// GET /api/journal/prompts/generate - Get AI-generated prompt
// ============================================================
router.get('/prompts/generate',
  asyncHandler(async (req, res) => {
    const { type = 'reflection' } = req.query;

    // Get user context for personalization
    const moodResult = await query(
      `SELECT mood_score FROM mood_entries WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    const intentionResult = await query(
      `SELECT intention_text FROM morning_intentions WHERE user_id = $1 AND date = CURRENT_DATE`,
      [req.user.id]
    );

    const userContext = {
      userName: req.user.display_name || 'friend',
      recentMoods: moodResult.rows,
      morningIntention: intentionResult.rows[0] || null
    };

    const prompt = await ClaudeService.generateJournalPrompt(userContext, type);

    res.json({ prompt, type });
  })
);

// ============================================================
// GET /api/journal/prompts/library - Get prompt library
// ============================================================
router.get('/prompts/library',
  asyncHandler(async (req, res) => {
    const prompts = {
      reflection: [
        { id: 'ref_1', text: "What's something you learned about yourself recently?" },
        { id: 'ref_2', text: "Describe a moment today when you felt most like yourself." },
        { id: 'ref_3', text: "What would you tell your younger self about this week?" },
        { id: 'ref_4', text: "What patterns do you notice in your thoughts lately?" },
        { id: 'ref_5', text: "What's something you've been avoiding thinking about?" }
      ],
      gratitude: [
        { id: 'grat_1', text: "What's a small comfort you often overlook?" },
        { id: 'grat_2', text: "Who made your life a little easier this week?" },
        { id: 'grat_3', text: "What part of your daily routine are you grateful for?" },
        { id: 'grat_4', text: "What's something your body did for you today?" },
        { id: 'grat_5', text: "What problem do you have that you're actually grateful for?" }
      ],
      growth: [
        { id: 'grow_1', text: "What challenge taught you something valuable?" },
        { id: 'grow_2', text: "How have you changed in the past year?" },
        { id: 'grow_3', text: "What's a mistake that led to something good?" },
        { id: 'grow_4', text: "What would 'being brave' look like for you right now?" },
        { id: 'grow_5', text: "What's one habit you'd like to build, and why?" }
      ],
      emotions: [
        { id: 'emo_1', text: "If your current emotion had a color and shape, what would it be?" },
        { id: 'emo_2', text: "What does your inner critic say, and what would a kind friend say instead?" },
        { id: 'emo_3', text: "What emotion have you been pushing away?" },
        { id: 'emo_4', text: "When did you last feel truly at peace? Describe that moment." },
        { id: 'emo_5', text: "What does your anxiety/stress want to protect you from?" }
      ],
      future: [
        { id: 'fut_1', text: "What do you hope to feel more of next month?" },
        { id: 'fut_2', text: "Describe your ideal ordinary day, one year from now." },
        { id: 'fut_3', text: "What's one small step you could take toward a dream?" },
        { id: 'fut_4', text: "What would you do if you knew you couldn't fail?" },
        { id: 'fut_5', text: "What legacy do you want to leave in your daily life?" }
      ]
    };

    res.json({ prompts });
  })
);

// ============================================================
// GET /api/journal/stats - Get journaling stats
// ============================================================
router.get('/stats',
  asyncHandler(async (req, res) => {
    const stats = await query(
      `SELECT
         COUNT(*) as total_entries,
         SUM(word_count) as total_words,
         AVG(word_count)::INTEGER as avg_words,
         MAX(word_count) as longest_entry,
         COUNT(DISTINCT DATE(created_at)) as days_journaled
       FROM journal_entries
       WHERE user_id = $1`,
      [req.user.id]
    );

    // Get streak
    const streakResult = await query(
      `WITH dates AS (
         SELECT DISTINCT DATE(created_at) as date
         FROM journal_entries
         WHERE user_id = $1
         ORDER BY date DESC
       ),
       streaks AS (
         SELECT date,
                date - (ROW_NUMBER() OVER (ORDER BY date DESC))::INTEGER * INTERVAL '1 day' as grp
         FROM dates
       )
       SELECT COUNT(*) as streak
       FROM streaks
       WHERE grp = (SELECT grp FROM streaks WHERE date = CURRENT_DATE)`,
      [req.user.id]
    );

    res.json({
      ...stats.rows[0],
      current_streak: parseInt(streakResult.rows[0]?.streak || 0)
    });
  })
);

export default router;
