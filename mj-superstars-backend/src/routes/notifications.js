// ============================================================
// Notification Routes
// ============================================================

import { Router } from 'express';
import { body } from 'express-validator';
import { query } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { NotificationService } from '../services/notifications.js';

const router = Router();
router.use(authenticate);

// ============================================================
// GET /api/notifications/history - Get notification history
// ============================================================
router.get('/history',
  asyncHandler(async (req, res) => {
    const { limit = 50 } = req.query;

    const result = await query(
      `SELECT * FROM notification_history
       WHERE user_id = $1
       ORDER BY sent_at DESC
       LIMIT $2`,
      [req.user.id, parseInt(limit)]
    );

    res.json({ notifications: result.rows });
  })
);

// ============================================================
// POST /api/notifications/subscribe - Subscribe to push notifications
// ============================================================
router.post('/subscribe',
  [
    body('endpoint').notEmpty(),
    body('keys').isObject(),
    body('device_type').optional().isIn(['ios', 'android', 'web'])
  ],
  asyncHandler(async (req, res) => {
    const { endpoint, keys, device_type } = req.body;

    // Upsert subscription
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, keys, device_type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO UPDATE SET keys = $3, is_active = true`,
      [req.user.id, endpoint, JSON.stringify(keys), device_type || 'web']
    );

    res.json({ message: 'Subscribed to notifications' });
  })
);

// ============================================================
// DELETE /api/notifications/unsubscribe - Unsubscribe
// ============================================================
router.delete('/unsubscribe',
  asyncHandler(async (req, res) => {
    const { endpoint } = req.body;

    if (endpoint) {
      await query(
        `UPDATE push_subscriptions SET is_active = false WHERE user_id = $1 AND endpoint = $2`,
        [req.user.id, endpoint]
      );
    } else {
      await query(
        `UPDATE push_subscriptions SET is_active = false WHERE user_id = $1`,
        [req.user.id]
      );
    }

    res.json({ message: 'Unsubscribed from notifications' });
  })
);

// ============================================================
// GET /api/notifications/scheduled - Get scheduled check-ins
// ============================================================
router.get('/scheduled',
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT * FROM scheduled_checkins WHERE user_id = $1 ORDER BY scheduled_time`,
      [req.user.id]
    );

    res.json({ scheduled: result.rows });
  })
);

// ============================================================
// POST /api/notifications/scheduled - Create scheduled check-in
// ============================================================
router.post('/scheduled',
  [
    body('checkin_type').isIn(['daily', 'mood', 'task_reminder', 'custom']),
    body('scheduled_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('days_of_week').isArray(),
    body('message_template').optional().trim()
  ],
  asyncHandler(async (req, res) => {
    const { checkin_type, scheduled_time, days_of_week, message_template } = req.body;

    const result = await query(
      `INSERT INTO scheduled_checkins (user_id, checkin_type, scheduled_time, days_of_week, message_template)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, checkin_type, scheduled_time, days_of_week, message_template]
    );

    res.status(201).json({ scheduled: result.rows[0] });
  })
);

// ============================================================
// PUT /api/notifications/scheduled/:id - Update scheduled check-in
// ============================================================
router.put('/scheduled/:id',
  asyncHandler(async (req, res) => {
    const { scheduled_time, days_of_week, message_template, is_active } = req.body;

    const result = await query(
      `UPDATE scheduled_checkins
       SET
         scheduled_time = COALESCE($3, scheduled_time),
         days_of_week = COALESCE($4, days_of_week),
         message_template = COALESCE($5, message_template),
         is_active = COALESCE($6, is_active)
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.id, scheduled_time, days_of_week, message_template, is_active]
    );

    if (result.rows.length === 0) {
      throw new APIError('Check-in not found', 404, 'NOT_FOUND');
    }

    res.json({ scheduled: result.rows[0] });
  })
);

// ============================================================
// DELETE /api/notifications/scheduled/:id - Delete scheduled check-in
// ============================================================
router.delete('/scheduled/:id',
  asyncHandler(async (req, res) => {
    const result = await query(
      `DELETE FROM scheduled_checkins WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      throw new APIError('Check-in not found', 404, 'NOT_FOUND');
    }

    res.json({ message: 'Check-in deleted' });
  })
);

// ============================================================
// POST /api/notifications/test - Send test notification
// ============================================================
router.post('/test',
  asyncHandler(async (req, res) => {
    const subscriptions = await query(
      `SELECT * FROM push_subscriptions WHERE user_id = $1 AND is_active = true`,
      [req.user.id]
    );

    if (subscriptions.rows.length === 0) {
      throw new APIError('No active subscriptions', 400, 'NO_SUBSCRIPTIONS');
    }

    await NotificationService.sendToUser(req.user.id, {
      title: 'Test Notification 🔔',
      body: 'This is a test notification from MJ!'
    });

    res.json({ message: 'Test notification sent' });
  })
);

export default router;
