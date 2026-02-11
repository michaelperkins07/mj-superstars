// ============================================================
// Push Notification Campaign Scheduler Service
// Handles multi-campaign notification scheduling with timezones
// ============================================================

import { query } from '../database/db.js';
import { logger } from '../utils/logger.js';
import NotificationService from './notifications.js';
import { addDelayedJob, addScheduledJob } from './jobQueue.js';

/**
 * Campaign Templates - Messages for different campaign types
 */
const campaignTemplates = {
  onboardingDrip: {
    day0: {
      title: 'Welcome to Top Performer! 🌟',
      body: 'Glad to have you here. Let\'s start your journey together.'
    },
    day1: {
      title: 'How are you doing? 👋',
      body: 'Coach Mike here. Ready for your first check-in?'
    },
    day3: {
      title: 'You\'re doing great! 💪',
      body: 'Three days in - let\'s keep this momentum going.'
    },
    day5: {
      title: 'Explore your features 🔍',
      body: 'Did you know about our Mood Insights? Take a look!'
    },
    day7: {
      title: 'One Week Milestone! 🎉',
      body: 'Seven days with us - you\'re building something amazing.'
    },
    day14: {
      title: 'Two weeks of progress 📈',
      body: 'You\'re making real changes. Keep going!'
    },
    day30: {
      title: 'One Month Down! 🏆',
      body: 'Look how far you\'ve come. This is just the beginning.'
    }
  },
  dailyMoodCheck: [
    {
      title: 'How\'s your vibe? ✨',
      body: 'Quick mood check-in with Coach Mike'
    },
    {
      title: 'Checking in 💭',
      body: 'How are you feeling right now?'
    },
    {
      title: 'Daily reflection 🌱',
      body: 'Share your mood and let\'s talk about it'
    },
    {
      title: 'Hey there! 👋',
      body: 'Got a minute to log your mood?'
    },
    {
      title: 'Mood time ✏️',
      body: 'What\'s on your mind today?'
    }
  ],
  reEngagement: {
    day3: {
      title: 'We miss you! 💙',
      body: 'Three days since we last chatted. Everything okay?'
    },
    day7: {
      title: 'Just checking in 👀',
      body: 'It\'s been a week - we\'d love to hear from you.'
    },
    day14: {
      title: 'Still here for you 🙌',
      body: 'We\'re still here whenever you need us.'
    },
    day30: {
      title: 'One last thing... 💌',
      body: 'Your journey matters. Come back anytime.'
    }
  },
  streakProtection: {
    title: 'Your streak is on the line! 🔥',
    body: 'Just one more mood entry to keep your streak alive.'
  },
  weeklyRecap: {
    title: 'Your weekly recap is ready 📊',
    body: 'See what you\'ve accomplished this week!'
  }
};

/**
 * Get user notification preferences
 */
export async function getUserPreferences(userId) {
  try {
    const result = await query(
      `SELECT
        mood_reminder_enabled,
        mood_reminder_time,
        onboarding_drip_enabled,
        re_engagement_enabled,
        streak_reminders_enabled,
        weekly_recap_enabled
       FROM notification_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return getDefaultPreferences();
    }

    return result.rows[0];
  } catch (error) {
    logger.warn('Failed to get user preferences:', error.message);
    return getDefaultPreferences();
  }
}

/**
 * Get default notification preferences
 */
function getDefaultPreferences() {
  return {
    mood_reminder_enabled: true,
    mood_reminder_time: '09:00',
    onboarding_drip_enabled: true,
    re_engagement_enabled: true,
    streak_reminders_enabled: true,
    weekly_recap_enabled: true
  };
}

/**
 * Get user's timezone
 */
export async function getUserTimezone(userId) {
  try {
    const result = await query(
      `SELECT COALESCE(timezone, 'America/New_York') as timezone
       FROM users WHERE id = $1`,
      [userId]
    );

    return result.rows[0]?.timezone || 'America/New_York';
  } catch (error) {
    logger.warn('Failed to get user timezone:', error.message);
    return 'America/New_York';
  }
}

/**
 * Get current time in user's timezone
 */
function getUserLocalTime(timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());
  const hour = parts.find(p => p.type === 'hour')?.value || '00';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';

  return `${hour}:${minute}`;
}

/**
 * Get day of week in user's timezone (0=Sunday, 6=Saturday)
 */
function getUserDayOfWeek(timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  });

  const dayStr = formatter.format(new Date());
  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return dayMap[dayStr] ?? new Date().getUTCDay();
}

/**
 * Calculate milliseconds until a specific time in user's timezone
 */
function getDelayToUserTime(timezone, targetTime) {
  const now = new Date();
  const userLocalTime = getUserLocalTime(timezone);
  const [userHour, userMinute] = userLocalTime.split(':').map(Number);
  const [targetHour, targetMinute] = targetTime.split(':').map(Number);

  const userTotalMinutes = userHour * 60 + userMinute;
  const targetTotalMinutes = targetHour * 60 + targetMinute;

  let delayMinutes = targetTotalMinutes - userTotalMinutes;

  if (delayMinutes <= 0) {
    // Schedule for tomorrow
    delayMinutes += 24 * 60;
  }

  return delayMinutes * 60 * 1000; // Convert to milliseconds
}

/**
 * 1. ONBOARDING DRIP SEQUENCE
 * Triggered when a new user signs up
 */
export async function scheduleOnboardingDrip(userId) {
  try {
    const prefs = await getUserPreferences(userId);

    if (!prefs.onboarding_drip_enabled) {
      logger.debug('Onboarding drip disabled for user:', userId);
      return;
    }

    const timezone = await getUserTimezone(userId);
    const now = new Date();

    // Day 0: 2 hours after signup
    await addDelayedJob('scheduled', 'campaign_onboarding_day0',
      { userId, campaignType: 'onboarding_drip', day: 0 },
      2 * 60 * 60 * 1000
    );

    // Day 1: 9 AM user's timezone
    // getDelayToUserTime already calculates ms until 9 AM in the user's timezone
    // For future days, add (day * 24h) to that base delay
    const baseDelay = getDelayToUserTime(timezone, '09:00');

    await addDelayedJob('scheduled', 'campaign_onboarding_day1',
      { userId, campaignType: 'onboarding_drip', day: 1 },
      baseDelay // getDelayToUserTime already handles "next occurrence" of 9 AM
    );

    // Days 3, 5, 7, 14, 30 at 9 AM
    // Each adds (day - 1) * 24h to the base delay (since base delay targets tomorrow's 9 AM)
    const daysSchedule = [3, 5, 7, 14, 30];
    for (const day of daysSchedule) {
      const dayDelay = baseDelay + ((day - 1) * 24 * 60 * 60 * 1000);

      await addDelayedJob('scheduled', `campaign_onboarding_day${day}`,
        { userId, campaignType: 'onboarding_drip', day },
        dayDelay
      );
    }

    // Record in campaigns table
    await recordCampaignScheduled(userId, 'onboarding_drip', 'scheduled');

    logger.info('Onboarding drip scheduled for user:', userId);
  } catch (error) {
    logger.error('Failed to schedule onboarding drip:', error.message);
  }
}

/**
 * 2. DAILY MOOD CHECK-IN
 * Scheduled daily at user's preferred time
 */
export async function scheduleDailyMoodCheckIn(userId) {
  try {
    const prefs = await getUserPreferences(userId);

    if (!prefs.mood_reminder_enabled) {
      logger.debug('Mood reminders disabled for user:', userId);
      return;
    }

    const timezone = await getUserTimezone(userId);
    const reminderTime = prefs.mood_reminder_time || '09:00';

    // Schedule daily at user's preferred time
    // Using a cron expression: 0 9 * * * (9 AM every day - will need adjustment for timezone)
    await addScheduledJob('scheduled', 'campaign_daily_mood',
      { userId, campaignType: 'daily_mood_check' },
      '0 9 * * *' // This will run at 9 UTC, needs to be adjusted per user
    );

    logger.info('Daily mood check-in scheduled for user:', userId);
  } catch (error) {
    logger.error('Failed to schedule daily mood check-in:', error.message);
  }
}

/**
 * 3. RE-ENGAGEMENT NUDGES
 * Triggered when user hasn't opened app
 */
export async function scheduleReEngagementNudges(userId) {
  try {
    const prefs = await getUserPreferences(userId);

    if (!prefs.re_engagement_enabled) {
      logger.debug('Re-engagement nudges disabled for user:', userId);
      return;
    }

    // These will be checked and sent by processCampaigns()
    await recordCampaignScheduled(userId, 're_engagement', 'pending');

    logger.info('Re-engagement nudges scheduled for user:', userId);
  } catch (error) {
    logger.error('Failed to schedule re-engagement nudges:', error.message);
  }
}

/**
 * 4. STREAK PROTECTION REMINDERS
 * Sent if user has a 3+ day streak and hasn't logged today
 */
export async function enableStreakReminders(userId) {
  try {
    const prefs = await getUserPreferences(userId);

    if (!prefs.streak_reminders_enabled) {
      logger.debug('Streak reminders disabled for user:', userId);
      return;
    }

    const timezone = await getUserTimezone(userId);

    // Schedule for 7 PM in user's timezone daily
    await addScheduledJob('scheduled', 'campaign_streak_protection',
      { userId, campaignType: 'streak_protection' },
      '0 19 * * *' // 7 PM UTC, needs timezone adjustment
    );

    logger.info('Streak reminders enabled for user:', userId);
  } catch (error) {
    logger.error('Failed to enable streak reminders:', error.message);
  }
}

/**
 * 5. WEEKLY RECAP
 * Every Sunday at 10 AM in user's timezone
 */
export async function enableWeeklyRecap(userId) {
  try {
    const prefs = await getUserPreferences(userId);

    if (!prefs.weekly_recap_enabled) {
      logger.debug('Weekly recap disabled for user:', userId);
      return;
    }

    // Sunday at 10 AM
    await addScheduledJob('scheduled', 'campaign_weekly_recap',
      { userId, campaignType: 'weekly_recap' },
      '0 10 * * 0' // 10 AM UTC on Sundays, needs timezone adjustment
    );

    logger.info('Weekly recap scheduled for user:', userId);
  } catch (error) {
    logger.error('Failed to enable weekly recap:', error.message);
  }
}

/**
 * Send onboarding drip message
 */
export async function sendOnboardingDripMessage(userId, day) {
  try {
    const prefs = await getUserPreferences(userId);

    if (!prefs.onboarding_drip_enabled) {
      return;
    }

    const template = campaignTemplates.onboardingDrip[`day${day}`];
    if (!template) {
      logger.warn('No template for onboarding day:', day);
      return;
    }

    await NotificationService.sendToUser(userId, template, {
      type: 'campaign_onboarding',
      campaign_type: 'onboarding_drip',
      day
    });

    await recordCampaignSent(userId, 'onboarding_drip', day);
    logger.info('Onboarding drip day', day, 'sent to user:', userId);
  } catch (error) {
    logger.error('Failed to send onboarding drip message:', error.message);
  }
}

/**
 * Send daily mood check-in
 */
export async function sendDailyMoodCheckIn(userId) {
  try {
    const prefs = await getUserPreferences(userId);

    if (!prefs.mood_reminder_enabled) {
      return;
    }

    // Check if user already logged mood today
    const result = await query(
      `SELECT id FROM moods
       WHERE user_id = $1
       AND DATE(created_at) = CURRENT_DATE`,
      [userId]
    );

    if (result.rows.length > 0) {
      logger.debug('User already logged mood today:', userId);
      return;
    }

    // Pick a random template
    const template = campaignTemplates.dailyMoodCheck[
      Math.floor(Math.random() * campaignTemplates.dailyMoodCheck.length)
    ];

    await NotificationService.sendToUser(userId, template, {
      type: 'campaign_daily_mood',
      campaign_type: 'daily_mood_check'
    });

    await recordCampaignSent(userId, 'daily_mood_check');
    logger.info('Daily mood check-in sent to user:', userId);
  } catch (error) {
    logger.error('Failed to send daily mood check-in:', error.message);
  }
}

/**
 * Check and send re-engagement nudges based on inactivity
 */
export async function processReEngagementNudges() {
  try {
    const result = await query(
      `SELECT id, user_id FROM users
       WHERE is_active = true
       AND last_login_at < NOW() - INTERVAL '3 days'
       AND created_at < NOW() - INTERVAL '7 days'`
    );

    let sent = 0;

    for (const user of result.rows) {
      try {
        const prefs = await getUserPreferences(user.user_id);
        if (!prefs.re_engagement_enabled) continue;

        // Check last time we sent a re-engagement message
        const lastSent = await query(
          `SELECT sent_at FROM campaigns
           WHERE user_id = $1 AND campaign_type = 're_engagement'
           ORDER BY sent_at DESC LIMIT 1`,
          [user.user_id]
        );

        const lastSentTime = lastSent.rows[0]?.sent_at;
        const daysSinceLastSent = lastSentTime
          ? Math.floor((Date.now() - new Date(lastSentTime).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const daysSinceLogin = Math.floor((Date.now() - new Date(user.last_login_at).getTime()) / (1000 * 60 * 60 * 24));

        let nudgeType = null;
        let template = null;

        if (daysSinceLogin >= 30 && daysSinceLastSent >= 30) {
          nudgeType = 'day30';
          template = campaignTemplates.reEngagement.day30;
        } else if (daysSinceLogin >= 14 && daysSinceLastSent >= 14) {
          nudgeType = 'day14';
          template = campaignTemplates.reEngagement.day14;
        } else if (daysSinceLogin >= 7 && daysSinceLastSent >= 7) {
          nudgeType = 'day7';
          template = campaignTemplates.reEngagement.day7;
        } else if (daysSinceLogin >= 3 && daysSinceLastSent >= 3) {
          nudgeType = 'day3';
          template = campaignTemplates.reEngagement.day3;
        }

        if (template) {
          await NotificationService.sendToUser(user.user_id, template, {
            type: 'campaign_re_engagement',
            campaign_type: 're_engagement',
            nudge_type: nudgeType
          });

          await recordCampaignSent(user.user_id, 're_engagement', nudgeType);
          sent++;
        }
      } catch (error) {
        logger.warn('Failed to process re-engagement for user:', user.user_id, error.message);
      }
    }

    logger.info('Re-engagement nudges sent:', sent);
    return { sent };
  } catch (error) {
    logger.error('Failed to process re-engagement nudges:', error.message);
    return { sent: 0 };
  }
}

/**
 * Check and send streak protection reminders
 */
export async function processStreakReminders() {
  try {
    // Get users with 3+ day streaks who haven't logged today
    const result = await query(
      `SELECT u.id, COALESCE(u.timezone, 'America/New_York') as timezone FROM users u
       WHERE u.current_streak >= 3
       AND NOT EXISTS (
         SELECT 1 FROM moods m
         WHERE m.user_id = u.id
         AND DATE(m.created_at AT TIME ZONE COALESCE(u.timezone, 'America/New_York')) = CURRENT_DATE AT TIME ZONE COALESCE(u.timezone, 'America/New_York')
       )
       AND u.is_active = true`
    );

    let sent = 0;

    for (const user of result.rows) {
      try {
        const prefs = await getUserPreferences(user.id);
        if (!prefs.streak_reminders_enabled) continue;

        const timezone = user.timezone || 'America/New_York';
        const userLocalTime = getUserLocalTime(timezone);
        const [userHour] = userLocalTime.split(':').map(Number);

        // Only send at 7 PM or later in user's timezone
        if (userHour < 19) continue;

        // Check if we already sent today
        const alreadySent = await query(
          `SELECT id FROM campaigns
           WHERE user_id = $1
           AND campaign_type = 'streak_protection'
           AND DATE(sent_at) = CURRENT_DATE`,
          [user.id]
        );

        if (alreadySent.rows.length > 0) continue;

        const template = campaignTemplates.streakProtection;

        await NotificationService.sendToUser(user.id, template, {
          type: 'campaign_streak_protection',
          campaign_type: 'streak_protection'
        });

        await recordCampaignSent(user.id, 'streak_protection');
        sent++;
      } catch (error) {
        logger.warn('Failed to process streak reminder for user:', user.id, error.message);
      }
    }

    logger.info('Streak protection reminders sent:', sent);
    return { sent };
  } catch (error) {
    logger.error('Failed to process streak reminders:', error.message);
    return { sent: 0 };
  }
}

/**
 * Send weekly recap notification
 */
export async function sendWeeklyRecap(userId) {
  try {
    const prefs = await getUserPreferences(userId);

    if (!prefs.weekly_recap_enabled) {
      return;
    }

    // Check if we already sent this week
    const alreadySent = await query(
      `SELECT id FROM campaigns
       WHERE user_id = $1
       AND campaign_type = 'weekly_recap'
       AND DATE(sent_at) >= CURRENT_DATE - INTERVAL '7 days'`,
      [userId]
    );

    if (alreadySent.rows.length > 0) {
      logger.debug('Weekly recap already sent this week for user:', userId);
      return;
    }

    const template = campaignTemplates.weeklyRecap;

    await NotificationService.sendToUser(userId, template, {
      type: 'campaign_weekly_recap',
      campaign_type: 'weekly_recap'
    });

    await recordCampaignSent(userId, 'weekly_recap');
    logger.info('Weekly recap sent to user:', userId);
  } catch (error) {
    logger.error('Failed to send weekly recap:', error.message);
  }
}

/**
 * Main processor - runs on cron schedule
 * Should be called daily/hourly depending on needs
 */
export async function processCampaigns() {
  try {
    logger.info('Starting campaign processing...');

    const results = {
      reEngagement: { sent: 0 },
      streakReminders: { sent: 0 },
      dailyMoodChecks: { sent: 0 }
    };

    // Process re-engagement nudges
    results.reEngagement = await processReEngagementNudges();

    // Process streak protection reminders
    results.streakReminders = await processStreakReminders();

    // Process daily mood check-ins for all users with the feature enabled
    const moodUsers = await query(
      `SELECT u.id FROM users u
       JOIN notification_preferences np ON u.id = np.user_id
       WHERE np.mood_reminder_enabled = true
       AND u.is_active = true`
    );

    for (const user of moodUsers.rows) {
      try {
        const timezone = await getUserTimezone(user.id);
        const userTime = getUserLocalTime(timezone);
        const prefs = await getUserPreferences(user.id);

        // Check if it's the right time for this user
        if (userTime === prefs.mood_reminder_time) {
          await sendDailyMoodCheckIn(user.id);
          results.dailyMoodChecks.sent++;
        }
      } catch (error) {
        logger.warn('Failed to process daily mood check for user:', user.id, error.message);
      }
    }

    logger.info('Campaign processing completed:', results);
    return results;
  } catch (error) {
    logger.error('Campaign processing failed:', error.message);
    throw error;
  }
}

/**
 * Record campaign scheduled in database
 */
async function recordCampaignScheduled(userId, campaignType, status = 'scheduled') {
  try {
    await query(
      `INSERT INTO campaigns (user_id, campaign_type, status, scheduled_at)
       VALUES ($1, $2, $3, NOW())`,
      [userId, campaignType, status]
    );
  } catch (error) {
    logger.warn('Failed to record campaign scheduled:', error.message);
  }
}

/**
 * Record campaign sent in database
 */
async function recordCampaignSent(userId, campaignType, metadata = null) {
  try {
    await query(
      `INSERT INTO campaigns (user_id, campaign_type, status, metadata, sent_at)
       VALUES ($1, $2, 'sent', $3, NOW())`,
      [userId, campaignType, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (error) {
    logger.warn('Failed to record campaign sent:', error.message);
  }
}

/**
 * Initialize all campaigns for a new user
 */
export async function initializeUserCampaigns(userId) {
  try {
    // Create default notification preferences
    await query(
      `INSERT INTO notification_preferences (
        user_id,
        mood_reminder_enabled,
        mood_reminder_time,
        onboarding_drip_enabled,
        re_engagement_enabled,
        streak_reminders_enabled,
        weekly_recap_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) DO NOTHING`,
      [userId, true, '09:00', true, true, true, true]
    );

    // Schedule campaigns
    await scheduleOnboardingDrip(userId);
    await scheduleDailyMoodCheckIn(userId);
    await scheduleReEngagementNudges(userId);
    await enableStreakReminders(userId);
    await enableWeeklyRecap(userId);

    logger.info('User campaigns initialized:', userId);
  } catch (error) {
    logger.error('Failed to initialize user campaigns:', error.message);
  }
}

export default {
  scheduleOnboardingDrip,
  scheduleDailyMoodCheckIn,
  scheduleReEngagementNudges,
  enableStreakReminders,
  enableWeeklyRecap,
  sendOnboardingDripMessage,
  sendDailyMoodCheckIn,
  processReEngagementNudges,
  processStreakReminders,
  sendWeeklyRecap,
  processCampaigns,
  initializeUserCampaigns,
  getUserPreferences,
  getUserTimezone
};
