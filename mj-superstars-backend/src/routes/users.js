// ============================================================
// User Profile Routes
// ============================================================

import { Router } from 'express';
import { body } from 'express-validator';
import { query } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';

const router = Router();
router.use(authenticate);

// ============================================================
// GET /api/users/me - Get current user profile
// ============================================================
router.get('/me',
  asyncHandler(async (req, res) => {
    const user = await query(
      `SELECT id, email, display_name, avatar_url, timezone, onboarding_completed,
              communication_style, is_premium, premium_expires_at, created_at, last_active_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    const personalization = await query(
      `SELECT * FROM user_personalization WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      user: user.rows[0],
      personalization: personalization.rows[0] || {}
    });
  })
);

// ============================================================
// PUT /api/users/me - Update profile
// ============================================================
router.put('/me',
  [
    body('display_name').optional().trim().isLength({ max: 100 }),
    body('timezone').optional().trim(),
    body('avatar_url').optional().isURL()
  ],
  asyncHandler(async (req, res) => {
    const { display_name, timezone, avatar_url } = req.body;

    const result = await query(
      `UPDATE users
       SET
         display_name = COALESCE($2, display_name),
         timezone = COALESCE($3, timezone),
         avatar_url = COALESCE($4, avatar_url),
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, display_name, avatar_url, timezone`,
      [req.user.id, display_name, timezone, avatar_url]
    );

    res.json({ user: result.rows[0] });
  })
);

// ============================================================
// PUT /api/users/me/communication-style - Update communication style
// ============================================================
router.put('/me/communication-style',
  asyncHandler(async (req, res) => {
    const { formality, emoji_usage, message_length, tone } = req.body;

    const style = {
      formality: formality ?? 0.5,
      emoji_usage: emoji_usage ?? 0.5,
      message_length: message_length ?? 'medium',
      tone: tone ?? 'supportive'
    };

    const result = await query(
      `UPDATE users SET communication_style = $2, updated_at = NOW()
       WHERE id = $1 RETURNING communication_style`,
      [req.user.id, JSON.stringify(style)]
    );

    res.json({
      communication_style: result.rows[0].communication_style,
      message: 'Communication preferences updated'
    });
  })
);

// ============================================================
// PUT /api/users/me/personalization - Update personalization data
// ============================================================
router.put('/me/personalization',
  asyncHandler(async (req, res) => {
    const {
      people,
      work_context,
      triggers,
      comforts,
      interests,
      goals,
      values,
      preferred_name,
      preferred_pronouns,
      health_context
    } = req.body;

    const result = await query(
      `UPDATE user_personalization
       SET
         people = COALESCE($2, people),
         work_context = COALESCE($3, work_context),
         triggers = COALESCE($4, triggers),
         comforts = COALESCE($5, comforts),
         interests = COALESCE($6, interests),
         goals = COALESCE($7, goals),
         values = COALESCE($8, values),
         preferred_name = COALESCE($9, preferred_name),
         preferred_pronouns = COALESCE($10, preferred_pronouns),
         health_context = COALESCE($11, health_context),
         updated_at = NOW()
       WHERE user_id = $1
       RETURNING *`,
      [
        req.user.id,
        people ? JSON.stringify(people) : null,
        work_context ? JSON.stringify(work_context) : null,
        triggers ? JSON.stringify(triggers) : null,
        comforts ? JSON.stringify(comforts) : null,
        interests ? JSON.stringify(interests) : null,
        goals ? JSON.stringify(goals) : null,
        values ? JSON.stringify(values) : null,
        preferred_name,
        preferred_pronouns,
        health_context ? JSON.stringify(health_context) : null
      ]
    );

    res.json({ personalization: result.rows[0] });
  })
);

// ============================================================
// POST /api/users/me/onboarding - Complete onboarding
// ============================================================
router.post('/me/onboarding',
  asyncHandler(async (req, res) => {
    const { onboarding_data } = req.body;

    await query(
      `UPDATE users
       SET onboarding_completed = true, onboarding_data = $2, updated_at = NOW()
       WHERE id = $1`,
      [req.user.id, JSON.stringify(onboarding_data || {})]
    );

    // Process onboarding data into personalization
    if (onboarding_data) {
      const {
        preferred_name,
        challenges,
        goals,
        interests,
        communication_preference
      } = onboarding_data;

      await query(
        `UPDATE user_personalization
         SET
           preferred_name = COALESCE($2, preferred_name),
           goals = COALESCE($3, goals),
           interests = COALESCE($4, interests),
           updated_at = NOW()
         WHERE user_id = $1`,
        [
          req.user.id,
          preferred_name,
          goals ? JSON.stringify(goals) : null,
          interests ? JSON.stringify(interests) : null
        ]
      );

      if (communication_preference) {
        await query(
          `UPDATE users SET communication_style = $2 WHERE id = $1`,
          [req.user.id, JSON.stringify(communication_preference)]
        );
      }
    }

    res.json({ message: 'Onboarding completed', onboarding_completed: true });
  })
);

// ============================================================
// DELETE /api/users/me - Delete account
// ============================================================
router.delete('/me',
  asyncHandler(async (req, res) => {
    // Soft delete
    await query(
      `UPDATE users SET deleted_at = NOW(), is_active = false WHERE id = $1`,
      [req.user.id]
    );

    res.json({ message: 'Account scheduled for deletion' });
  })
);

// ============================================================
// GET /api/users/me/export - Export user data
// ============================================================
router.get('/me/export',
  asyncHandler(async (req, res) => {
    // Gather all user data
    const userData = await query(`SELECT * FROM users WHERE id = $1`, [req.user.id]);
    const personalization = await query(`SELECT * FROM user_personalization WHERE user_id = $1`, [req.user.id]);
    const conversations = await query(`SELECT * FROM conversations WHERE user_id = $1`, [req.user.id]);
    const messages = await query(`SELECT * FROM messages WHERE user_id = $1`, [req.user.id]);
    const moods = await query(`SELECT * FROM mood_entries WHERE user_id = $1`, [req.user.id]);
    const tasks = await query(`SELECT * FROM tasks WHERE user_id = $1`, [req.user.id]);
    const journal = await query(`SELECT * FROM journal_entries WHERE user_id = $1`, [req.user.id]);
    const intentions = await query(`SELECT * FROM morning_intentions WHERE user_id = $1`, [req.user.id]);
    const reflections = await query(`SELECT * FROM evening_reflections WHERE user_id = $1`, [req.user.id]);

    const exportData = {
      exported_at: new Date().toISOString(),
      user: userData.rows[0],
      personalization: personalization.rows[0],
      conversations: conversations.rows,
      messages: messages.rows,
      mood_entries: moods.rows,
      tasks: tasks.rows,
      journal_entries: journal.rows,
      morning_intentions: intentions.rows,
      evening_reflections: reflections.rows
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="mj-superstars-export-${Date.now()}.json"`);
    res.json(exportData);
  })
);

export default router;
