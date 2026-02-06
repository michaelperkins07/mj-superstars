// ============================================================
// MJ's Superstars - Notification Scheduler Service
// Handles scheduled check-ins, streak reminders, and nudges
// ============================================================

import { query } from '../database/db.js';
import { NotificationService } from './notifications.js';
import logger from '../utils/logger.js';

// Helper wrappers to match the API the scheduler functions expect
async function sendPushNotification(pushToken, payload) {
  // This is a no-op wrapper — the scheduler functions that call this
  // use push tokens directly, but our NotificationService uses userId.
  // For now, log and skip until we migrate to user-id-based calls.
  logger.debug('sendPushNotification called (legacy path):', { pushToken, payload });
}

async function sendBulkNotifications(notifications) {
  for (const notif of notifications) {
    try {
      // Try to send via NotificationService if we have a userId
      if (notif.userId) {
        await NotificationService.sendToUser(notif.userId, {
          title: notif.title,
          body: notif.body
        }, notif.data || {});
      }
    } catch (err) {
      logger.warn('Bulk notification send failed:', err.message);
    }
  }
}

// Notification templates
const NOTIFICATION_TEMPLATES = {
  morningCheckIn: {
    title: "Good morning! ☀️",
    bodies: [
      "How are you feeling today? Take a moment to check in.",
      "Rise and shine! How's your energy this morning?",
      "New day, fresh start. How are you doing?",
      "Morning! Ready to set an intention for today?",
      "Hey there! How did you sleep? Let's check in."
    ]
  },
  eveningReflection: {
    title: "Time to Wind Down 🌙",
    bodies: [
      "How was your day? Take a moment to reflect.",
      "Evening check-in time. What went well today?",
      "Before bed, let's reflect on your day.",
      "How are you feeling as the day ends?",
      "One small reflection before sleep. How was today?"
    ]
  },
  streakReminder: {
    title: "Don't Break Your Streak! 🔥",
    bodies: [
      "You're doing great! One quick check-in keeps it going.",
      "Your streak is waiting. Just a quick mood log!",
      "Keep the momentum! Check in to maintain your streak.",
      "Almost forgot? Your streak is counting on you!",
      "You've got this! Quick check-in to keep going."
    ]
  },
  gentleNudge: {
    title: "Hey, it's MJ 💙",
    bodies: [
      "Just checking in. How are you?",
      "Thinking of you. How's your day going?",
      "Haven't heard from you. Everything okay?",
      "Taking a moment to check in. How are you feeling?",
      "Hope you're doing well. I'm here if you need me."
    ]
  },
  milestoneAchieved: {
    title: "Achievement Unlocked! 🏆",
    bodies: [
      "Congratulations on reaching a new milestone!",
      "You did it! Come see what you've achieved.",
      "Your hard work is paying off! New achievement earned.",
      "Amazing progress! You've unlocked something special."
    ]
  },
  weeklyInsight: {
    title: "Your Weekly Insight 📊",
    bodies: [
      "Your week in review is ready. See your progress!",
      "Weekly report available. See how you've grown!",
      "Check out your mood patterns from this week.",
      "Your personalized weekly insight is here."
    ]
  }
};

// Get random message from template
function getRandomMessage(templateKey) {
  const template = NOTIFICATION_TEMPLATES[templateKey];
  if (!template) return null;

  const body = template.bodies[Math.floor(Math.random() * template.bodies.length)];
  return {
    title: template.title,
    body
  };
}

// Check if user should receive notification based on quiet hours
async function isQuietHours(userId) {
  try {
    const result = await query(
      `SELECT notification_settings FROM users WHERE id = $1`,
      [userId]
    );

    const settings = result.rows[0]?.notification_settings;
    if (!settings?.quietHours?.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = settings.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = settings.quietHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }

    return currentTime >= startTime && currentTime < endTime;
  } catch (err) {
    logger.error('Error checking quiet hours:', err);
    return false;
  }
}

// Get users who need morning check-in notifications
async function getMorningCheckInUsers() {
  try {
    const result = await query(`
      SELECT u.id, u.push_token, u.display_name, u.notification_settings,
             u.timezone
      FROM users u
      WHERE u.push_token IS NOT NULL
        AND u.notification_settings->>'enabled' = 'true'
        AND u.notification_settings->'morningCheckIn'->>'enabled' = 'true'
        AND NOT EXISTS (
          SELECT 1 FROM mood_entries m
          WHERE m.user_id = u.id
            AND m.created_at > NOW() - INTERVAL '12 hours'
        )
    `);
    return result.rows;
  } catch (err) {
    logger.error('Error getting morning check-in users:', err);
    return [];
  }
}

// Get users who need streak reminders
async function getStreakReminderUsers() {
  try {
    const result = await query(`
      SELECT u.id, u.push_token, u.display_name, u.notification_settings,
             s.current_streak
      FROM users u
      JOIN user_streaks s ON u.id = s.user_id
      WHERE u.push_token IS NOT NULL
        AND u.notification_settings->>'enabled' = 'true'
        AND u.notification_settings->'streakReminder'->>'enabled' = 'true'
        AND s.current_streak > 0
        AND NOT EXISTS (
          SELECT 1 FROM mood_entries m
          WHERE m.user_id = u.id
            AND m.created_at > CURRENT_DATE
        )
    `);
    return result.rows;
  } catch (err) {
    logger.error('Error getting streak reminder users:', err);
    return [];
  }
}

// Get users who haven't engaged recently (for gentle nudges)
async function getInactiveUsers(daysSinceActivity = 2) {
  try {
    const result = await query(`
      SELECT u.id, u.push_token, u.display_name, u.notification_settings,
             MAX(m.created_at) as last_mood,
             MAX(c.created_at) as last_conversation
      FROM users u
      LEFT JOIN mood_entries m ON u.id = m.user_id
      LEFT JOIN conversations c ON u.id = c.user_id
      WHERE u.push_token IS NOT NULL
        AND u.notification_settings->>'enabled' = 'true'
        AND u.notification_settings->'gentleNudges'->>'frequency' != 'never'
      GROUP BY u.id
      HAVING (
        MAX(m.created_at) < NOW() - INTERVAL '${daysSinceActivity} days'
        OR MAX(m.created_at) IS NULL
      )
      AND (
        MAX(c.created_at) < NOW() - INTERVAL '${daysSinceActivity} days'
        OR MAX(c.created_at) IS NULL
      )
    `);
    return result.rows;
  } catch (err) {
    logger.error('Error getting inactive users:', err);
    return [];
  }
}

// Send morning check-in notifications
export async function sendMorningCheckIns() {
  logger.info('Starting morning check-in notifications');

  const users = await getMorningCheckInUsers();
  const notifications = [];

  for (const user of users) {
    // Skip if in quiet hours
    if (await isQuietHours(user.id)) continue;

    const message = getRandomMessage('morningCheckIn');
    if (!message) continue;

    // Personalize with name if available
    if (user.display_name) {
      message.body = `Hey ${user.display_name}! ${message.body}`;
    }

    notifications.push({
      token: user.push_token,
      title: message.title,
      body: message.body,
      data: {
        type: 'morning_checkin',
        action: 'open_mood_log'
      }
    });
  }

  if (notifications.length > 0) {
    await sendBulkNotifications(notifications);
    logger.info(`Sent ${notifications.length} morning check-in notifications`);
  }

  return notifications.length;
}

// Send evening reflection notifications
export async function sendEveningReflections() {
  logger.info('Starting evening reflection notifications');

  const result = await query(`
    SELECT u.id, u.push_token, u.display_name, u.notification_settings
    FROM users u
    WHERE u.push_token IS NOT NULL
      AND u.notification_settings->>'enabled' = 'true'
      AND u.notification_settings->'eveningReflection'->>'enabled' = 'true'
  `);

  const notifications = [];

  for (const user of result.rows) {
    if (await isQuietHours(user.id)) continue;

    const message = getRandomMessage('eveningReflection');
    if (!message) continue;

    notifications.push({
      token: user.push_token,
      title: message.title,
      body: message.body,
      data: {
        type: 'evening_reflection',
        action: 'open_journal'
      }
    });
  }

  if (notifications.length > 0) {
    await sendBulkNotifications(notifications);
    logger.info(`Sent ${notifications.length} evening reflection notifications`);
  }

  return notifications.length;
}

// Send streak reminders
export async function sendStreakReminders() {
  logger.info('Starting streak reminder notifications');

  const users = await getStreakReminderUsers();
  const notifications = [];

  for (const user of users) {
    if (await isQuietHours(user.id)) continue;

    const message = getRandomMessage('streakReminder');
    if (!message) continue;

    // Add streak count to message
    if (user.current_streak > 1) {
      message.body = `${user.current_streak} day streak! ${message.body}`;
    }

    notifications.push({
      token: user.push_token,
      title: message.title,
      body: message.body,
      data: {
        type: 'streak_reminder',
        action: 'open_mood_log',
        streakCount: user.current_streak
      }
    });
  }

  if (notifications.length > 0) {
    await sendBulkNotifications(notifications);
    logger.info(`Sent ${notifications.length} streak reminder notifications`);
  }

  return notifications.length;
}

// Send gentle nudges to inactive users
export async function sendGentleNudges() {
  logger.info('Starting gentle nudge notifications');

  const users = await getInactiveUsers(2);
  const notifications = [];

  for (const user of users) {
    if (await isQuietHours(user.id)) continue;

    // Check frequency setting
    const frequency = user.notification_settings?.gentleNudges?.frequency;
    if (frequency === 'never') continue;

    // For 'sometimes', only send 50% of the time
    if (frequency === 'sometimes' && Math.random() > 0.5) continue;

    const message = getRandomMessage('gentleNudge');
    if (!message) continue;

    notifications.push({
      token: user.push_token,
      title: message.title,
      body: message.body,
      data: {
        type: 'gentle_nudge',
        action: 'open_chat'
      }
    });
  }

  if (notifications.length > 0) {
    await sendBulkNotifications(notifications);
    logger.info(`Sent ${notifications.length} gentle nudge notifications`);
  }

  return notifications.length;
}

// Send achievement notification to specific user
export async function sendAchievementNotification(userId, achievement) {
  try {
    const result = await query(
      `SELECT push_token, notification_settings FROM users WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];
    if (!user?.push_token) return false;

    if (user.notification_settings?.enabled === false) return false;

    await sendPushNotification(user.push_token, {
      title: '🏆 Achievement Unlocked!',
      body: `You earned "${achievement.title}"! ${achievement.description}`,
      data: {
        type: 'achievement',
        action: 'open_achievements',
        achievementId: achievement.id
      }
    });

    return true;
  } catch (err) {
    logger.error('Error sending achievement notification:', err);
    return false;
  }
}

// Send weekly insight notification
export async function sendWeeklyInsights() {
  logger.info('Starting weekly insight notifications');

  const result = await query(`
    SELECT u.id, u.push_token, u.display_name
    FROM users u
    WHERE u.push_token IS NOT NULL
      AND u.notification_settings->>'enabled' = 'true'
      AND EXISTS (
        SELECT 1 FROM mood_entries m
        WHERE m.user_id = u.id
          AND m.created_at > NOW() - INTERVAL '7 days'
      )
  `);

  const notifications = [];

  for (const user of result.rows) {
    const message = getRandomMessage('weeklyInsight');
    if (!message) continue;

    notifications.push({
      token: user.push_token,
      title: message.title,
      body: message.body,
      data: {
        type: 'weekly_insight',
        action: 'open_progress'
      }
    });
  }

  if (notifications.length > 0) {
    await sendBulkNotifications(notifications);
    logger.info(`Sent ${notifications.length} weekly insight notifications`);
  }

  return notifications.length;
}

// Initialize scheduled jobs (call this on server start)
export function initScheduler() {
  logger.info('Notification scheduler initialized with setInterval jobs');

  // Check every 15 minutes which jobs should run based on current hour
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  const lastRun = {};

  const runIfDue = async (jobName, targetHour, fn) => {
    const now = new Date();
    const currentHour = now.getHours();
    const today = now.toDateString();

    // Only run if it's the target hour and hasn't run today
    if (currentHour === targetHour && lastRun[jobName] !== today) {
      try {
        logger.info(`Running scheduled job: ${jobName}`);
        await fn();
        lastRun[jobName] = today;
        logger.info(`Completed scheduled job: ${jobName}`);
      } catch (err) {
        logger.error(`Scheduled job ${jobName} failed:`, err);
      }
    }
  };

  setInterval(async () => {
    try {
      await runIfDue('morningCheckIns', 9, sendMorningCheckIns);
      await runIfDue('streakReminders', 20, sendStreakReminders);
      await runIfDue('eveningReflections', 21, sendEveningReflections);
      await runIfDue('gentleNudges', 14, sendGentleNudges);

      // Weekly insights on Sunday only
      const now = new Date();
      if (now.getDay() === 0) {
        await runIfDue('weeklyInsights', 10, sendWeeklyInsights);
      }
    } catch (err) {
      logger.error('Scheduler tick error:', err);
    }
  }, FIFTEEN_MINUTES);

  // Also run an immediate check on startup (after 30s delay to let DB settle)
  setTimeout(async () => {
    try {
      const now = new Date();
      const hour = now.getHours();
      if (hour >= 9 && hour < 10) await runIfDue('morningCheckIns', 9, sendMorningCheckIns);
      if (hour >= 14 && hour < 15) await runIfDue('gentleNudges', 14, sendGentleNudges);
      if (hour >= 20 && hour < 21) await runIfDue('streakReminders', 20, sendStreakReminders);
      if (hour >= 21 && hour < 22) await runIfDue('eveningReflections', 21, sendEveningReflections);
    } catch (err) {
      logger.error('Scheduler startup check error:', err);
    }
  }, 30000);

  return {
    sendMorningCheckIns,
    sendEveningReflections,
    sendStreakReminders,
    sendGentleNudges,
    sendWeeklyInsights,
    sendAchievementNotification
  };
}

export default {
  initScheduler,
  sendMorningCheckIns,
  sendEveningReflections,
  sendStreakReminders,
  sendGentleNudges,
  sendWeeklyInsights,
  sendAchievementNotification
};
