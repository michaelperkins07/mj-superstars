// ============================================================
// Notification Service
// ============================================================

import webPush from 'web-push';
import { query } from '../database/db.js';
import { logger } from '../utils/logger.js';
import { sendToUserIOS } from './apns.js';

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@mj-superstars.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export const NotificationService = {
  /**
   * Send push notification to a user
   */
  async sendToUser(userId, notification, data = {}) {
    try {
      // Get active subscriptions
      const subscriptions = await query(
        `SELECT * FROM push_subscriptions WHERE user_id = $1 AND is_active = true`,
        [userId]
      );

      if (subscriptions.rows.length === 0) {
        logger.debug('No active subscriptions for user:', userId);
        return { sent: 0 };
      }

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icon-192.png',
        badge: notification.badge || '/badge-72.png',
        data: {
          ...data,
          timestamp: Date.now()
        }
      });

      let sent = 0;
      let failed = 0;

      for (const sub of subscriptions.rows) {
        try {
          const parsedKeys = typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys;
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: parsedKeys
            },
            payload
          );
          sent++;
        } catch (error) {
          failed++;
          logger.warn('Push notification failed:', {
            userId,
            endpoint: sub.endpoint,
            error: error.message
          });

          // Deactivate invalid subscriptions
          if (error.statusCode === 404 || error.statusCode === 410) {
            await query(
              `UPDATE push_subscriptions SET is_active = false WHERE id = $1`,
              [sub.id]
            );
          }
        }
      }

      // Also send to iOS devices via APNs
      let iosSent = 0;
      let iosFailed = 0;
      try {
        const iosResult = await sendToUserIOS(userId, {
          title: notification.title,
          body: notification.body,
          data: { ...data, timestamp: Date.now() },
        });
        iosSent = iosResult.sent;
        iosFailed = iosResult.failed;
      } catch (iosError) {
        logger.warn('iOS push notification failed:', { userId, error: iosError.message });
      }

      // Log notification
      await query(
        `INSERT INTO notification_history (user_id, notification_type, title, body, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, data.type || 'general', notification.title, notification.body, JSON.stringify(data)]
      );

      return { sent: sent + iosSent, failed: failed + iosFailed };
    } catch (error) {
      logger.error('Notification service error:', error);
      throw error;
    }
  },

  /**
   * Send check-in notification
   */
  async sendCheckIn(userId, type = 'daily') {
    const templates = {
      daily: {
        title: 'Hey, checking in! 👋',
        body: 'How are you feeling today? MJ would love to hear from you.'
      },
      morning: {
        title: 'Good morning! ☀️',
        body: "Ready to set your intention for today?"
      },
      evening: {
        title: 'Time to wind down 🌙',
        body: "Let's reflect on your day together."
      },
      gentle: {
        title: "It's been a while 💭",
        body: "Just wanted to check in. MJ is here whenever you need."
      },
      celebration: {
        title: "You're on a streak! 🔥",
        body: "Keep up the amazing work!"
      }
    };

    const notification = templates[type] || templates.daily;

    return this.sendToUser(userId, notification, { type: `checkin_${type}` });
  },

  /**
   * Send task reminder
   */
  async sendTaskReminder(userId, task) {
    return this.sendToUser(userId, {
      title: 'Task Reminder 📝',
      body: `Don't forget: ${task.title}`
    }, {
      type: 'task_reminder',
      task_id: task.id
    });
  },

  /**
   * Send achievement notification
   */
  async sendAchievement(userId, achievement) {
    return this.sendToUser(userId, {
      title: `Achievement Unlocked! ${achievement.icon || '🏆'}`,
      body: achievement.name
    }, {
      type: 'achievement',
      achievement_id: achievement.id
    });
  },

  /**
   * Send streak milestone notification
   */
  async sendStreakMilestone(userId, streakType, days) {
    return this.sendToUser(userId, {
      title: `${days} Day Streak! 🔥`,
      body: `You've maintained your ${streakType.replace('_', ' ')} streak for ${days} days!`
    }, {
      type: 'streak_milestone',
      streak_type: streakType,
      days
    });
  },

  /**
   * Send weekly story notification
   */
  async sendWeeklyStoryReady(userId) {
    return this.sendToUser(userId, {
      title: 'Your Weekly Story is Ready 📖',
      body: "See how far you've come this week!"
    }, {
      type: 'weekly_story'
    });
  },

  /**
   * Process scheduled check-ins (called by cron job)
   */
  async processScheduledCheckIns() {
    // Timezone-aware: compare scheduled_time against the user's local time
    // We query all active check-ins and filter by each user's timezone
    const allCheckIns = await query(
      `SELECT sc.*, u.display_name, u.timezone
       FROM scheduled_checkins sc
       JOIN users u ON sc.user_id = u.id
       WHERE sc.is_active = true
       AND (sc.last_sent_at IS NULL OR sc.last_sent_at < CURRENT_DATE)`
    );

    let processed = 0;

    for (const checkin of allCheckIns.rows) {
      try {
        const tz = checkin.timezone || 'America/New_York';
        const now = new Date();

        // Get current time in user's timezone
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const parts = formatter.formatToParts(now);
        const userHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
        const userMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
        const userTime = `${userHour.toString().padStart(2, '0')}:${userMinute.toString().padStart(2, '0')}`;

        // Get day of week in user's timezone
        const dayFormatter = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          weekday: 'short',
        });
        const dayStr = dayFormatter.format(now);
        const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        const userDayOfWeek = dayMap[dayStr] ?? now.getUTCDay();

        // Check if this check-in is due now in the user's timezone
        if (checkin.scheduled_time === userTime &&
            checkin.days_of_week.includes(userDayOfWeek)) {
          await this.sendCheckIn(checkin.user_id, checkin.checkin_type);
          await query(
            `UPDATE scheduled_checkins SET last_sent_at = NOW() WHERE id = $1`,
            [checkin.id]
          );
          processed++;
        }
      } catch (err) {
        logger.warn('Failed to process check-in:', { id: checkin.id, error: err.message });
      }
    }

    logger.info(`Processed ${processed} scheduled check-ins`);
    return { processed };
  },

  /**
   * Send gentle nudge to inactive users (called by cron job)
   */
  async sendGentleNudges() {
    // Find users inactive for 2-3 days
    const inactiveUsers = await query(
      `SELECT id, display_name FROM users
       WHERE is_active = true
       AND last_active_at < NOW() - INTERVAL '2 days'
       AND last_active_at > NOW() - INTERVAL '4 days'
       AND id NOT IN (
         SELECT user_id FROM notification_history
         WHERE notification_type = 'checkin_gentle'
         AND sent_at > NOW() - INTERVAL '3 days'
       )`
    );

    logger.info(`Sending gentle nudges to ${inactiveUsers.rows.length} users`);

    for (const user of inactiveUsers.rows) {
      await this.sendCheckIn(user.id, 'gentle');
    }

    return { sent: inactiveUsers.rows.length };
  }
};

export default NotificationService;
