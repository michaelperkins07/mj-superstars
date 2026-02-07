// ============================================================
// Task Management Routes
// ============================================================

import { Router } from 'express';
import { body, param, query as queryValidator } from 'express-validator';
import { query, transaction } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import validate from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

// Points system
const POINTS = {
  tiny: 5,
  small: 10,
  medium: 25,
  large: 50
};

// ============================================================
// GET /api/tasks - Get tasks
// ============================================================
router.get('/',
  asyncHandler(async (req, res) => {
    const {
      status,
      category,
      due_date,
      limit = 50,
      offset = 0
    } = req.query;

    let whereClause = 'user_id = $1';
    const params = [req.user.id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (category) {
      whereClause += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (due_date) {
      whereClause += ` AND due_date = $${paramIndex}`;
      params.push(due_date);
      paramIndex++;
    }

    const result = await query(
      `SELECT * FROM tasks
       WHERE ${whereClause}
       ORDER BY
         CASE WHEN status = 'pending' THEN 0 WHEN status = 'in_progress' THEN 1 ELSE 2 END,
         due_date ASC NULLS LAST,
         created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );

    const countResult = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
         COUNT(*) as total
       FROM tasks WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      tasks: result.rows,
      counts: countResult.rows[0]
    });
  })
);

// ============================================================
// GET /api/tasks/today - Get today's tasks
// ============================================================
router.get('/today',
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT * FROM tasks
       WHERE user_id = $1
       AND (due_date = CURRENT_DATE OR (due_date IS NULL AND status = 'pending'))
       ORDER BY
         CASE WHEN status = 'pending' THEN 0 WHEN status = 'in_progress' THEN 1 ELSE 2 END,
         created_at ASC`,
      [req.user.id]
    );

    const completedToday = await query(
      `SELECT COUNT(*) as count FROM tasks
       WHERE user_id = $1 AND status = 'completed' AND DATE(completed_at) = CURRENT_DATE`,
      [req.user.id]
    );

    res.json({
      tasks: result.rows,
      completed_today: parseInt(completedToday.rows[0].count)
    });
  })
);

// ============================================================
// POST /api/tasks - Create task
// ============================================================
router.post('/',
  [
    body('title').trim().notEmpty().isLength({ max: 255 }),
    body('description').optional().trim(),
    body('category').optional().isIn(['self_care', 'work', 'health', 'social', 'personal']),
    body('difficulty').optional().isIn(['tiny', 'small', 'medium', 'large']),
    body('due_date').optional().isDate(),
    body('due_time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('estimated_minutes').optional().isInt({ min: 1, max: 480 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const {
      title,
      description,
      category,
      difficulty = 'medium',
      due_date,
      due_time,
      estimated_minutes,
      is_recurring,
      recurrence_rule,
      suggested_by_mj,
      suggestion_context
    } = req.body;

    const result = await query(
      `INSERT INTO tasks
       (user_id, title, description, category, difficulty, due_date, due_time,
        estimated_minutes, is_recurring, recurrence_rule, suggested_by_mj, suggestion_context)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        req.user.id, title, description || null, category || null,
        difficulty, due_date || null, due_time || null,
        estimated_minutes || null, is_recurring || false,
        recurrence_rule ? JSON.stringify(recurrence_rule) : null,
        suggested_by_mj || false, suggestion_context || null
      ]
    );

    res.status(201).json({
      task: result.rows[0],
      message: 'Task created'
    });
  })
);

// ============================================================
// PUT /api/tasks/:id - Update task
// ============================================================
router.put('/:id',
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const allowedFields = ['title', 'description', 'category', 'difficulty',
                          'due_date', 'due_time', 'estimated_minutes', 'status'];
    const setClause = [];
    const values = [req.user.id, id];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      throw new APIError('No valid fields to update', 400, 'INVALID_UPDATE');
    }

    setClause.push('updated_at = NOW()');

    const result = await query(
      `UPDATE tasks
       SET ${setClause.join(', ')}
       WHERE id = $2 AND user_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new APIError('Task not found', 404, 'NOT_FOUND');
    }

    res.json({ task: result.rows[0] });
  })
);

// ============================================================
// POST /api/tasks/:id/complete - Mark task complete
// ============================================================
router.post('/:id/complete',
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { mood_before, mood_after, notes } = req.body;

    const taskResult = await query(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (taskResult.rows.length === 0) {
      throw new APIError('Task not found', 404, 'NOT_FOUND');
    }

    const task = taskResult.rows[0];
    const points = POINTS[task.difficulty] || POINTS.medium;

    const result = await transaction(async (client) => {
      // Update task
      const updatedTask = await client.query(
        `UPDATE tasks
         SET status = 'completed', completed_at = NOW(), points_awarded = $3, streak_contribution = true
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [id, req.user.id, points]
      );

      // Record completion
      await client.query(
        `INSERT INTO task_completions (task_id, user_id, mood_before, mood_after, notes, points_earned)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, req.user.id, mood_before || null, mood_after || null, notes || null, points]
      );

      // Update streak
      await client.query(
        `INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, total_completions, last_completed_date, streak_started_date)
         VALUES ($1, 'task_completion', 1, 1, 1, CURRENT_DATE, CURRENT_DATE)
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
           updated_at = NOW()`,
        [req.user.id]
      );

      // Check for achievements
      const totalCompleted = await client.query(
        `SELECT COUNT(*) as count FROM tasks WHERE user_id = $1 AND status = 'completed'`,
        [req.user.id]
      );

      const achievements = [];
      const count = parseInt(totalCompleted.rows[0].count);

      // Milestone achievements
      const milestones = [1, 10, 25, 50, 100, 250, 500];
      if (milestones.includes(count)) {
        const achievement = await client.query(
          `INSERT INTO achievements (user_id, achievement_type, achievement_name, achievement_description, tier, points, icon)
           VALUES ($1, 'task_milestone', $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING
           RETURNING *`,
          [
            req.user.id,
            `${count} Tasks Complete`,
            `Completed ${count} tasks!`,
            count >= 100 ? 'gold' : count >= 25 ? 'silver' : 'bronze',
            count * 10,
            '🏆'
          ]
        );
        if (achievement.rows.length > 0) {
          achievements.push(achievement.rows[0]);
        }
      }

      return {
        task: updatedTask.rows[0],
        points_earned: points,
        achievements
      };
    });

    logger.info('Task completed:', {
      userId: req.user.id,
      taskId: id,
      points
    });

    res.json({
      task: result.task,
      points_earned: result.points_earned,
      achievements: result.achievements,
      message: 'Task completed! 🎉'
    });
  })
);

// ============================================================
// POST /api/tasks/:id/skip - Skip task
// ============================================================
router.post('/:id/skip',
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await query(
      `UPDATE tasks
       SET status = 'skipped', updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new APIError('Task not found', 404, 'NOT_FOUND');
    }

    res.json({
      task: result.rows[0],
      message: 'Task skipped - no pressure!'
    });
  })
);

// ============================================================
// DELETE /api/tasks/:id - Delete task
// ============================================================
router.delete('/:id',
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    const result = await query(
      `DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new APIError('Task not found', 404, 'NOT_FOUND');
    }

    res.json({ success: true, message: 'Task deleted' });
  })
);

// ============================================================
// POST /api/tasks/suggest - Get MJ task suggestions
// ============================================================
router.post('/suggest',
  asyncHandler(async (req, res) => {
    const { context, mood, energy } = req.body;

    // Get user's pending tasks
    const pending = await query(
      `SELECT title, category, difficulty FROM tasks
       WHERE user_id = $1 AND status = 'pending'
       ORDER BY due_date ASC NULLS LAST
       LIMIT 10`,
      [req.user.id]
    );

    // For now, return default suggestions based on mood/energy
    // In production, this would use Claude to generate personalized suggestions
    let suggestions = [];

    if (energy && energy <= 2) {
      suggestions = [
        { title: 'Drink a glass of water 💧', difficulty: 'tiny', category: 'self_care' },
        { title: 'Take 5 deep breaths', difficulty: 'tiny', category: 'self_care' },
        { title: 'Stretch for 2 minutes', difficulty: 'tiny', category: 'health' }
      ];
    } else if (mood && mood <= 2) {
      suggestions = [
        { title: 'Text a friend', difficulty: 'small', category: 'social' },
        { title: 'Go for a short walk', difficulty: 'small', category: 'health' },
        { title: 'Listen to your favorite song', difficulty: 'tiny', category: 'self_care' }
      ];
    } else {
      suggestions = [
        { title: 'Tackle one thing on your to-do list', difficulty: 'medium', category: 'personal' },
        { title: 'Move your body for 15 minutes', difficulty: 'small', category: 'health' },
        { title: 'Do something creative', difficulty: 'medium', category: 'personal' }
      ];
    }

    res.json({
      suggestions,
      pending_tasks: pending.rows
    });
  })
);

export default router;
