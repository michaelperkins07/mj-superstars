// ============================================================
// Conversation Routes
// ============================================================

import { Router } from 'express';
import { body, param, query as queryValidator } from 'express-validator';
import { query, transaction } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { ClaudeService } from '../services/claude.js';
import { logger } from '../utils/logger.js';
import validate from '../middleware/validate.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ============================================================
// GET /api/conversations - List user's conversations
// ============================================================
router.get('/',
  asyncHandler(async (req, res) => {
    const { limit = 20, offset = 0, active_only = 'false' } = req.query;

    let whereClause = 'user_id = $1';
    if (active_only === 'true') {
      whereClause += ' AND is_active = true';
    }

    const result = await query(
      `SELECT id, title, summary, started_at, ended_at, message_count,
              initial_mood, final_mood, topics, is_active, created_at
       FROM conversations
       WHERE ${whereClause}
       ORDER BY updated_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, parseInt(limit), parseInt(offset)]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM conversations WHERE ${whereClause}`,
      [req.user.id]
    );

    res.json({
      conversations: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  })
);

// ============================================================
// POST /api/conversations - Start new conversation
// ============================================================
router.post('/',
  [
    body('initial_mood').optional().isInt({ min: 1, max: 5 }),
    body('title').optional().trim().isLength({ max: 255 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { initial_mood, title } = req.body;

    // End any active conversations
    await query(
      `UPDATE conversations SET is_active = false, ended_at = NOW()
       WHERE user_id = $1 AND is_active = true`,
      [req.user.id]
    );

    // Create new conversation
    const result = await query(
      `INSERT INTO conversations (user_id, title, initial_mood)
       VALUES ($1, $2, $3)
       RETURNING id, title, initial_mood, started_at, is_active`,
      [req.user.id, title || null, initial_mood || null]
    );

    logger.info('New conversation started:', {
      userId: req.user.id,
      conversationId: result.rows[0].id
    });

    res.status(201).json({
      conversation: result.rows[0],
      message: 'Conversation started'
    });
  })
);

// ============================================================
// GET /api/conversations/:id - Get conversation with messages
// ============================================================
router.get('/:id',
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { message_limit = 50 } = req.query;

    // Get conversation
    const convResult = await query(
      `SELECT * FROM conversations WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (convResult.rows.length === 0) {
      throw new APIError('Conversation not found', 404, 'NOT_FOUND');
    }

    // Get messages
    const msgResult = await query(
      `SELECT id, role, content, mood_detected, topics, intent,
              is_voice, audio_url, audio_duration, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC
       LIMIT $2`,
      [id, parseInt(message_limit)]
    );

    res.json({
      conversation: convResult.rows[0],
      messages: msgResult.rows
    });
  })
);

// ============================================================
// POST /api/conversations/:id/messages - Send message to MJ
// ============================================================
router.post('/:id/messages',
  [
    param('id').isUUID(),
    body('content').trim().notEmpty().isLength({ max: 10000 }),
    body('is_voice').optional().isBoolean(),
    body('audio_url').optional().isURL()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { content, is_voice = false, audio_url, audio_duration } = req.body;

    // Verify conversation exists and belongs to user
    const convResult = await query(
      `SELECT * FROM conversations WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (convResult.rows.length === 0) {
      throw new APIError('Conversation not found', 404, 'NOT_FOUND');
    }

    // Get user context for Claude
    const userContext = await getUserContext(req.user.id);

    // Get conversation history (last 20 messages for context)
    const historyResult = await query(
      `SELECT role, content FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [id]
    );
    const history = historyResult.rows.reverse();

    // Save user message
    const userMsgResult = await query(
      `INSERT INTO messages (conversation_id, user_id, role, content, is_voice, audio_url, audio_duration)
       VALUES ($1, $2, 'user', $3, $4, $5, $6)
       RETURNING id, created_at`,
      [id, req.user.id, content, is_voice, audio_url || null, audio_duration || null]
    );

    // Get response from Claude
    const claudeResponse = await ClaudeService.chat({
      message: content,
      history,
      userContext,
      userId: req.user.id,
      conversationId: id
    });

    // Save assistant message
    const mjMsgResult = await query(
      `INSERT INTO messages (conversation_id, user_id, role, content, mood_detected, topics, intent, input_tokens, output_tokens)
       VALUES ($1, $2, 'assistant', $3, $4, $5, $6, $7, $8)
       RETURNING id, content, mood_detected, topics, intent, created_at`,
      [
        id,
        req.user.id,
        claudeResponse.content,
        claudeResponse.mood_detected,
        JSON.stringify(claudeResponse.topics || []),
        claudeResponse.intent,
        claudeResponse.usage?.input_tokens,
        claudeResponse.usage?.output_tokens
      ]
    );

    // Update conversation
    await query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Extract and store personalization insights (async, don't wait)
    extractPersonalizationAsync(req.user.id, userMsgResult.rows[0].id, content);

    // Emit via Socket.IO if available
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user.id}`).emit('new_message', {
        conversation_id: id,
        message: mjMsgResult.rows[0]
      });
    }

    res.json({
      user_message: {
        id: userMsgResult.rows[0].id,
        role: 'user',
        content,
        created_at: userMsgResult.rows[0].created_at
      },
      mj_response: mjMsgResult.rows[0],
      suggestions: claudeResponse.suggestions || []
    });
  })
);

// ============================================================
// POST /api/conversations/:id/end - End conversation
// ============================================================
router.post('/:id/end',
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { final_mood, summary } = req.body;

    const result = await query(
      `UPDATE conversations
       SET is_active = false, ended_at = NOW(), final_mood = $3, summary = $4
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id, final_mood || null, summary || null]
    );

    if (result.rows.length === 0) {
      throw new APIError('Conversation not found', 404, 'NOT_FOUND');
    }

    // Update check-in streak
    await updateStreak(req.user.id, 'check_in');

    res.json({
      conversation: result.rows[0],
      message: 'Conversation ended'
    });
  })
);

// ============================================================
// DELETE /api/conversations/:id - Delete conversation
// ============================================================
router.delete('/:id',
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await query(
      `DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new APIError('Conversation not found', 404, 'NOT_FOUND');
    }

    res.json({ success: true, message: 'Conversation deleted' });
  })
);

// ============================================================
// Helper Functions
// ============================================================

async function getUserContext(userId) {
  // Get personalization data
  const personalization = await query(
    `SELECT * FROM user_personalization WHERE user_id = $1`,
    [userId]
  );

  // Get recent moods
  const recentMoods = await query(
    `SELECT mood_score, note, created_at FROM mood_entries
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
    [userId]
  );

  // Get today's tasks
  const tasks = await query(
    `SELECT title, status, category FROM tasks
     WHERE user_id = $1 AND (due_date = CURRENT_DATE OR due_date IS NULL)
     ORDER BY created_at DESC LIMIT 10`,
    [userId]
  );

  // Get morning intention
  const intention = await query(
    `SELECT intention_text, focus_word FROM morning_intentions
     WHERE user_id = $1 AND date = CURRENT_DATE`,
    [userId]
  );

  // Get streaks
  const streaks = await query(
    `SELECT streak_type, current_streak FROM user_streaks WHERE user_id = $1`,
    [userId]
  );

  // Get communication style
  const user = await query(
    `SELECT display_name, communication_style FROM users WHERE id = $1`,
    [userId]
  );

  return {
    personalization: personalization.rows[0] || {},
    recentMoods: recentMoods.rows,
    todayTasks: tasks.rows,
    morningIntention: intention.rows[0] || null,
    streaks: streaks.rows,
    userName: user.rows[0]?.display_name || 'friend',
    communicationStyle: user.rows[0]?.communication_style || {}
  };
}

async function updateStreak(userId, streakType) {
  await query(
    `INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, total_completions, last_completed_date, streak_started_date)
     VALUES ($1, $2, 1, 1, 1, CURRENT_DATE, CURRENT_DATE)
     ON CONFLICT (user_id, streak_type)
     DO UPDATE SET
       current_streak = CASE
         WHEN user_streaks.last_completed_date = CURRENT_DATE THEN user_streaks.current_streak
         WHEN user_streaks.last_completed_date = CURRENT_DATE - 1 THEN user_streaks.current_streak + 1
         ELSE 1
       END,
       longest_streak = GREATEST(user_streaks.longest_streak, user_streaks.current_streak + 1),
       total_completions = user_streaks.total_completions + 1,
       last_completed_date = CURRENT_DATE,
       streak_started_date = CASE
         WHEN user_streaks.last_completed_date < CURRENT_DATE - 1 THEN CURRENT_DATE
         ELSE user_streaks.streak_started_date
       END,
       updated_at = NOW()`,
    [userId, streakType]
  );
}

async function extractPersonalizationAsync(userId, messageId, content) {
  try {
    const extractions = await ClaudeService.extractPersonalization(content);

    for (const extraction of extractions) {
      await query(
        `INSERT INTO personalization_extractions (user_id, message_id, extraction_type, extracted_data, confidence)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, messageId, extraction.type, JSON.stringify(extraction.data), extraction.confidence]
      );
    }
  } catch (error) {
    logger.error('Failed to extract personalization:', error);
  }
}

export default router;
