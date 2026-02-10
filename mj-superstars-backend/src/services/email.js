import nodemailer from 'nodemailer';
import crypto from 'crypto';
import pool from '../database/db.js';
import { logger } from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Creates and configures nodemailer transporter
   */
  createTransporter() {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      logger.info('Email transporter configured successfully');
      return transporter;
    } catch (error) {
      logger.error('Failed to create email transporter', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize transporter on service creation
   */
  initializeTransporter() {
    this.transporter = this.createTransporter();
  }

  /**
   * Core email sending function
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} html - HTML email body
   * @param {string} text - Plain text email body
   * @param {UUID} userId - User ID for logging (optional)
   * @param {string} emailType - Type of email being sent
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(to, subject, html, text, userId = null, emailType = 'transactional') {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
        text,
      };

      const info = await this.transporter.sendMail(mailOptions);

      // Log email to database
      if (userId) {
        await pool.query(
          `INSERT INTO email_log (user_id, email_type, recipient, subject, status, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, emailType, to, subject, 'sent', JSON.stringify({ messageId: info.messageId })]
        );
      } else {
        await pool.query(
          `INSERT INTO email_log (email_type, recipient, subject, status, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [emailType, to, subject, 'sent', JSON.stringify({ messageId: info.messageId })]
        );
      }

      logger.info(`Email sent successfully to ${to}`, { messageId: info.messageId, emailType });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Failed to send email to ${to}`, { error: error.message, emailType });

      // Log failed email attempt
      if (userId) {
        await pool.query(
          `INSERT INTO email_log (user_id, email_type, recipient, subject, status, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [userId, emailType, to, 'failed', 'error', JSON.stringify({ error: error.message })]
        );
      }

      throw error;
    }
  }

  /**
   * Send weekly digest email
   * @param {UUID} userId - User ID
   */
  async sendWeeklyDigest(userId) {
    try {
      // Fetch user data
      const userResult = await pool.query('SELECT id, email, first_name FROM users WHERE id = $1', [
        userId,
      ]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Fetch user's stats for the week
      const statsResult = await pool.query(
        `SELECT
          AVG(mood_score) as avg_mood,
          MIN(mood_score) as min_mood,
          MAX(mood_score) as max_mood,
          COUNT(*) as mood_entries,
          (SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND completed_at >= NOW() - INTERVAL '7 days' AND completed_at IS NOT NULL) as tasks_completed,
          (SELECT COALESCE(SUM(points), 0) FROM tasks WHERE user_id = $1 AND completed_at >= NOW() - INTERVAL '7 days' AND completed_at IS NOT NULL) as points_earned,
          (SELECT COUNT(*) FROM journal_entries WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days') as journal_entries,
          (SELECT streak_count FROM users WHERE id = $1) as current_streak,
          (SELECT last_level_up FROM users WHERE id = $1) as last_achievement
        FROM mood_entries
        WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '7 days'`,
        [userId]
      );

      const stats = statsResult.rows[0];

      // Prepare mood trend description
      let moodTrend = 'stable';
      if (stats.max_mood && stats.min_mood) {
        const improvement = stats.max_mood - stats.min_mood;
        if (improvement > 1) moodTrend = 'improving';
        if (improvement < -1) moodTrend = 'declining';
      }

      // Generate HTML email
      const html = this.generateWeeklyDigestTemplate({
        firstName: user.first_name,
        avgMood: stats.avg_mood ? stats.avg_mood.toFixed(1) : 'N/A',
        moodTrend,
        moodEntries: stats.mood_entries || 0,
        tasksCompleted: stats.tasks_completed || 0,
        pointsEarned: stats.points_earned || 0,
        journalEntries: stats.journal_entries || 0,
        currentStreak: stats.current_streak || 0,
        lastAchievement: stats.last_achievement || 'Keep building!',
      });

      const text = `Hi ${user.first_name},\n\nHere's your weekly digest from MJ Superstars!\n\nMood: ${stats.avg_mood ? stats.avg_mood.toFixed(1) : 'N/A'}/10\nStreak: ${stats.current_streak || 0} days\nTasks Completed: ${stats.tasks_completed || 0}\nPoints Earned: ${stats.points_earned || 0}\n\nKeep up the great work!\n\nMJ Superstars Team`;

      await this.sendEmail(
        user.email,
        'Your Weekly Digest - MJ Superstars',
        html,
        text,
        userId,
        'weekly_digest'
      );

      // Update last_digest_sent_at
      await pool.query('UPDATE email_preferences SET last_digest_sent_at = NOW() WHERE user_id = $1', [
        userId,
      ]);

      logger.info(`Weekly digest sent to user ${userId}`);
    } catch (error) {
      logger.error(`Failed to send weekly digest to user ${userId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Send contextual coaching nudge
   * @param {UUID} userId - User ID
   */
  async sendCoachingNudge(userId) {
    try {
      // Fetch user data
      const userResult = await pool.query('SELECT id, email, first_name FROM users WHERE id = $1', [
        userId,
      ]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Check various conditions for nudge type
      const todayMoodResult = await pool.query(
        `SELECT COUNT(*) as count FROM mood_entries
         WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE`,
        [userId]
      );

      const lastJournalResult = await pool.query(
        `SELECT created_at FROM journal_entries
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      const overdueTasksResult = await pool.query(
        `SELECT COUNT(*) as count FROM tasks
         WHERE user_id = $1 AND due_date < CURRENT_DATE AND completed_at IS NULL`,
        [userId]
      );

      const hasMoodToday = todayMoodResult.rows[0].count > 0;
      const lastJournalDate = lastJournalResult.rows[0]?.created_at;
      const daysNoJournal = lastJournalDate
        ? Math.floor((Date.now() - new Date(lastJournalDate).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      const hasOverdueTasks = overdueTasksResult.rows[0].count > 0;

      // Determine nudge type
      let nudgeType = 'general';
      let nudgeTitle = 'Keep the Momentum Going!';
      let nudgeMessage =
        "You're doing amazing on your MJ Superstars journey. Every small step counts!";

      if (!hasMoodToday) {
        nudgeType = 'streak_at_risk';
        nudgeTitle = 'Your Streak is Almost Complete!';
        nudgeMessage =
          "Don't break your streak! Log your mood today to keep your momentum going. You're so close!";
      } else if (hasOverdueTasks) {
        nudgeType = 'overdue_tasks';
        nudgeTitle = 'Clear Those Tasks!';
        nudgeMessage =
          'You have some overdue tasks waiting for you. Knock them out and earn those points!';
      } else if (daysNoJournal >= 3) {
        nudgeType = 'journal_reminder';
        nudgeTitle = 'Time to Reflect!';
        nudgeMessage =
          "It's been a few days since your last journal entry. Take a moment to reflect on your journey.";
      }

      // Generate HTML email
      const html = this.generateNudgeTemplate({
        firstName: user.first_name,
        title: nudgeTitle,
        message: nudgeMessage,
        nudgeType,
      });

      const text = `Hi ${user.first_name},\n\n${nudgeTitle}\n\n${nudgeMessage}\n\nHead to MJ Superstars to continue your journey!\n\nMJ Superstars Team`;

      await this.sendEmail(user.email, nudgeTitle, html, text, userId, `nudge_${nudgeType}`);

      // Update last_nudge_sent_at
      await pool.query('UPDATE email_preferences SET last_nudge_sent_at = NOW() WHERE user_id = $1', [
        userId,
      ]);

      logger.info(`Coaching nudge sent to user ${userId}`, { nudgeType });
    } catch (error) {
      logger.error(`Failed to send coaching nudge to user ${userId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Send buddy progress report
   * @param {UUID} userId - User ID
   */
  async sendBuddyReport(userId) {
    try {
      // Fetch user's email preferences
      const prefsResult = await pool.query(
        'SELECT buddy_email FROM email_preferences WHERE user_id = $1',
        [userId]
      );

      if (prefsResult.rows.length === 0 || !prefsResult.rows[0].buddy_email) {
        logger.info(`No buddy email configured for user ${userId}`);
        return;
      }

      const buddyEmail = prefsResult.rows[0].buddy_email;

      // Fetch user data
      const userResult = await pool.query(
        'SELECT id, first_name, 1 AS level, total_points AS points FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Fetch this week's stats
      const statsResult = await pool.query(
        `SELECT
          (SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND completed_at >= NOW() - INTERVAL '7 days' AND completed_at IS NOT NULL) as tasks_completed,
          (SELECT COALESCE(SUM(points), 0) FROM tasks WHERE user_id = $1 AND completed_at >= NOW() - INTERVAL '7 days' AND completed_at IS NOT NULL) as points_earned,
          (SELECT COALESCE(current_streak, 0) FROM users WHERE id = $1) as current_streak`,
        [userId]
      );

      const stats = statsResult.rows[0];

      // Generate HTML email
      const html = this.generateBuddyReportTemplate({
        userName: user.first_name,
        level: user.level || 1,
        points: user.points || 0,
        streak: stats.current_streak || 0,
        tasksCompleted: stats.tasks_completed || 0,
        pointsEarned: stats.points_earned || 0,
      });

      const text = `Hi there,\n\n${user.first_name} has been crushing their MJ Superstars goals!\n\nLevel: ${user.level || 1}\nStreak: ${stats.current_streak || 0} days\nTasks Completed This Week: ${stats.tasks_completed || 0}\nPoints Earned This Week: ${stats.points_earned || 0}\n\nYou might want to send them an encouraging message!\n\nMJ Superstars Team`;

      await this.sendEmail(
        buddyEmail,
        `${user.first_name}'s Weekly Progress - MJ Superstars`,
        html,
        text,
        userId,
        'buddy_report'
      );

      logger.info(`Buddy report sent for user ${userId} to ${buddyEmail}`);
    } catch (error) {
      logger.error(`Failed to send buddy report for user ${userId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Send streak alert when streak is at risk
   * @param {UUID} userId - User ID
   * @param {number} streakCount - Current streak count
   */
  async sendStreakAlert(userId, streakCount) {
    try {
      // Fetch user data
      const userResult = await pool.query('SELECT id, email, first_name FROM users WHERE id = $1', [
        userId,
      ]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Generate HTML email
      const html = this.generateStreakAlertTemplate({
        firstName: user.first_name,
        streakCount,
      });

      const text = `Hi ${user.first_name},\n\nYour ${streakCount}-day streak is about to end!\n\nLog your mood before midnight to keep your momentum going. You've worked so hard to build this streak!\n\nMJ Superstars Team`;

      await this.sendEmail(
        user.email,
        `Your Streak is Almost Gone! - MJ Superstars`,
        html,
        text,
        userId,
        'streak_alert'
      );

      logger.info(`Streak alert sent to user ${userId}`, { streak: streakCount });
    } catch (error) {
      logger.error(`Failed to send streak alert to user ${userId}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Generate secure unsubscribe token
   * @returns {string} Unsubscribe token
   */
  generateUnsubscribeToken() {
    return crypto.randomBytes(50).toString('hex');
  }

  /**
   * Process unsubscribe request
   * @param {string} token - Unsubscribe token
   */
  async processUnsubscribe(token) {
    try {
      const result = await pool.query(
        'SELECT user_id FROM email_preferences WHERE unsubscribe_token = $1',
        [token]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid unsubscribe token');
      }

      const userId = result.rows[0].user_id;

      // Disable all email preferences
      await pool.query(
        `UPDATE email_preferences
         SET weekly_digest = FALSE, coaching_nudges = FALSE, buddy_sharing = FALSE
         WHERE user_id = $1`,
        [userId]
      );

      logger.info(`User ${userId} unsubscribed from all emails`);
      return userId;
    } catch (error) {
      logger.error('Failed to process unsubscribe', { error: error.message });
      throw error;
    }
  }

  /**
   * Template: Weekly Digest
   */
  generateWeeklyDigestTemplate({
    firstName,
    avgMood,
    moodTrend,
    moodEntries,
    tasksCompleted,
    pointsEarned,
    journalEntries,
    currentStreak,
    lastAchievement,
  }) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #0f0f1e; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #e94560 0%, #ff6b7a 100%); padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; }
    .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.95; }
    .content { padding: 30px 20px; }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
    .stat-box { background-color: #16213e; padding: 15px; border-radius: 8px; border-left: 4px solid #e94560; }
    .stat-box .label { font-size: 12px; text-transform: uppercase; color: #a0a0b0; margin-bottom: 5px; }
    .stat-box .value { font-size: 24px; font-weight: 700; color: #e94560; }
    .stat-trend { font-size: 12px; color: #7a7a8f; margin-top: 5px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 14px; text-transform: uppercase; color: #e94560; font-weight: 700; margin-bottom: 10px; letter-spacing: 1px; }
    .achievement { background-color: #16213e; padding: 15px; border-radius: 8px; margin-bottom: 10px; }
    .achievement-icon { font-size: 24px; margin-right: 10px; }
    .cta-button { display: inline-block; background-color: #e94560; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 15px; }
    .footer { background-color: #16213e; padding: 20px; text-align: center; font-size: 12px; color: #7a7a8f; }
    .footer a { color: #e94560; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly Digest</h1>
      <p>Your MJ Superstars Progress</p>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <p>Here's how amazing you've been this week! Keep crushing those goals.</p>

      <div class="stat-grid">
        <div class="stat-box">
          <div class="label">Mood Score</div>
          <div class="value">${avgMood}</div>
          <div class="stat-trend">Trend: ${moodTrend}</div>
        </div>
        <div class="stat-box">
          <div class="label">Current Streak</div>
          <div class="value">${currentStreak}</div>
          <div class="stat-trend">days</div>
        </div>
        <div class="stat-box">
          <div class="label">Tasks Completed</div>
          <div class="value">${tasksCompleted}</div>
          <div class="stat-trend">this week</div>
        </div>
        <div class="stat-box">
          <div class="label">Points Earned</div>
          <div class="value">${pointsEarned}</div>
          <div class="stat-trend">this week</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Weekly Activity</div>
        <div class="achievement">
          <span class="achievement-icon">📝</span> ${journalEntries} journal entries
        </div>
        <div class="achievement">
          <span class="achievement-icon">✅</span> ${moodEntries} mood check-ins
        </div>
      </div>

      <div class="section">
        <div class="section-title">This Week's Achievement</div>
        <div class="achievement">
          <span class="achievement-icon">🏆</span> ${lastAchievement}
        </div>
      </div>

      <p style="margin-top: 25px; line-height: 1.6;">You're building amazing habits and making real progress. Keep showing up for yourself!</p>
      <a href="${process.env.APP_URL || 'https://mjsuperstars.com'}" class="cta-button">View Full Dashboard</a>
    </div>
    <div class="footer">
      <p>MJ Superstars | Manage your <a href="${process.env.APP_URL || 'https://mjsuperstars.com'}/settings/email">email preferences</a></p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Template: Coaching Nudge
   */
  generateNudgeTemplate({ firstName, title, message, nudgeType }) {
    const iconMap = {
      streak_at_risk: '🔥',
      overdue_tasks: '✅',
      journal_reminder: '📝',
      general: '⭐',
    };

    const icon = iconMap[nudgeType] || '💪';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #0f0f1e; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #e94560 0%, #ff6b7a 100%); padding: 25px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; }
    .content { padding: 30px 20px; }
    .icon { font-size: 48px; text-align: center; margin-bottom: 15px; }
    .message-box { background-color: #16213e; padding: 20px; border-radius: 8px; border-left: 4px solid #e94560; margin-bottom: 20px; }
    .cta-button { display: inline-block; background-color: #e94560; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 15px; }
    .footer { background-color: #16213e; padding: 20px; text-align: center; font-size: 12px; color: #7a7a8f; }
    .footer a { color: #e94560; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>
      <div class="icon">${icon}</div>
      <div class="message-box">
        <p style="margin: 0; font-size: 16px; line-height: 1.6;">${message}</p>
      </div>
      <p>Your MJ Superstars journey is about showing up for yourself, even on the hard days. You've got this!</p>
      <a href="${process.env.APP_URL || 'https://mjsuperstars.com'}/dashboard" class="cta-button">Go to Dashboard</a>
    </div>
    <div class="footer">
      <p>MJ Superstars | You're doing great!</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Template: Buddy Report
   */
  generateBuddyReportTemplate({ userName, level, points, streak, tasksCompleted, pointsEarned }) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #0f0f1e; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #e94560 0%, #ff6b7a 100%); padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; }
    .content { padding: 30px 20px; }
    .stat-box { background-color: #16213e; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #e94560; }
    .stat-label { font-size: 12px; text-transform: uppercase; color: #a0a0b0; }
    .stat-value { font-size: 20px; font-weight: 700; color: #e94560; margin-top: 5px; }
    .footer { background-color: #16213e; padding: 20px; text-align: center; font-size: 12px; color: #7a7a8f; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Your Buddy's Progress</h1>
      <p>${userName} is crushing their goals!</p>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>${userName} has been working hard on their MJ Superstars journey this week. Here's a snapshot of their progress:</p>

      <div class="stat-box">
        <div class="stat-label">Level</div>
        <div class="stat-value">${level}</div>
      </div>

      <div class="stat-box">
        <div class="stat-label">Current Streak</div>
        <div class="stat-value">${streak} days</div>
      </div>

      <div class="stat-box">
        <div class="stat-label">Tasks Completed (This Week)</div>
        <div class="stat-value">${tasksCompleted}</div>
      </div>

      <div class="stat-box">
        <div class="stat-label">Points Earned (This Week)</div>
        <div class="stat-value">${pointsEarned}</div>
      </div>

      <p style="margin-top: 25px; line-height: 1.6;">Why not send ${userName} an encouraging message? A little motivation from a friend can go a long way!</p>
    </div>
    <div class="footer">
      <p>MJ Superstars | Celebrating your buddy's wins!</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Template: Streak Alert
   */
  generateStreakAlertTemplate({ firstName, streakCount }) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #0f0f1e; color: #ffffff; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #1a1a2e; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #ff6b7a 0%, #e94560 100%); padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 32px; font-weight: 700; color: #ffffff; }
    .header p { margin: 8px 0 0 0; font-size: 16px; }
    .content { padding: 30px 20px; }
    .alert-box { background-color: #16213e; border-left: 6px solid #ff6b7a; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .alert-box h2 { margin: 0 0 10px 0; color: #ff6b7a; font-size: 18px; }
    .alert-box p { margin: 0; line-height: 1.6; }
    .streak-counter { background-color: #0f0f1e; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
    .streak-number { font-size: 48px; font-weight: 700; color: #e94560; margin-bottom: 5px; }
    .streak-label { font-size: 14px; text-transform: uppercase; color: #a0a0b0; letter-spacing: 1px; }
    .cta-button { display: inline-block; background-color: #e94560; color: #ffffff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 15px; }
    .footer { background-color: #16213e; padding: 20px; text-align: center; font-size: 12px; color: #7a7a8f; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔥 Don't Break Your Streak!</h1>
      <p>You're one check-in away from losing it</p>
    </div>
    <div class="content">
      <p>Hi ${firstName},</p>

      <div class="streak-counter">
        <div class="streak-number">${streakCount}</div>
        <div class="streak-label">Days in a Row</div>
      </div>

      <div class="alert-box">
        <h2>Your Streak Ends at Midnight!</h2>
        <p>You've worked so hard to build this ${streakCount}-day streak. Don't lose it now! Log your mood before midnight to keep the fire going.</p>
      </div>

      <p>Remember: consistency is the key to transformation. Every single day you show up for yourself is a victory. You've got this!</p>

      <a href="${process.env.APP_URL || 'https://mjsuperstars.com'}/dashboard" class="cta-button">Log Your Mood Now</a>
    </div>
    <div class="footer">
      <p>MJ Superstars | Keep the momentum going!</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

// Export singleton instance

// ============================================================
// Backward-compatible named exports (used by auth.js)
// These use Resend API for transactional emails
// ============================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "White Mike <onboarding@resend.dev>";
const APP_URL = process.env.FRONTEND_URL || "https://mj-superstars-app.onrender.com";

async function sendTransactionalEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not set - skipping email send", { to, subject });
    return { success: false, reason: "no_api_key" };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html, text })
    });
    const data = await response.json();
    if (!response.ok) {
      logger.error("Resend API error:", { status: response.status, error: data });
      return { success: false, reason: "api_error", error: data };
    }
    logger.info("Email sent successfully:", { to, subject, id: data.id });
    return { success: true, id: data.id };
  } catch (error) {
    logger.error("Email send failed:", { to, subject, error: error.message });
    return { success: false, reason: "network_error", error: error.message };
  }
}

export async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,sans-serif;margin:0;padding:0;background:#0f172a;color:#e2e8f0}.container{max-width:480px;margin:0 auto;padding:40px 24px}.logo{text-align:center;margin-bottom:32px}.logo-text{font-size:28px;font-weight:800;color:#7C3AED}.card{background:#1e293b;border-radius:16px;padding:32px 24px;border:1px solid #334155}h1{font-size:22px;color:#f1f5f9}p{font-size:15px;line-height:1.6;color:#94a3b8}.btn{display:inline-block;background:linear-gradient(135deg,#7C3AED,#06B6D4);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:600}.expire{background:#7C3AED20;border:1px solid #7C3AED40;border-radius:8px;padding:12px 16px;font-size:13px;color:#a78bfa;margin-bottom:16px}.footer{text-align:center;margin-top:32px;font-size:12px;color:#475569}</style></head><body><div class="container"><div class="logo"><span class="logo-text">White Mike</span></div><div class="card"><h1>Reset Your Password</h1><p>Someone requested a password reset for your account.</p><div class="expire">This link expires in 1 hour</div><div style="text-align:center"><a href="${resetUrl}" class="btn">Reset Password</a></div><p>If you didn't request this, ignore this email.</p></div><div class="footer"><p>White Mike - Your AI coaching companion</p></div></div></body></html>`;
  return sendTransactionalEmail({ to: email, subject: "Reset your White Mike password", html });
}

export async function sendWelcomeEmail(email, displayName) {
  const name = displayName || "Superstar";
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,sans-serif;margin:0;padding:0;background:#0f172a;color:#e2e8f0}.container{max-width:480px;margin:0 auto;padding:40px 24px}.logo{text-align:center;margin-bottom:32px}.logo-text{font-size:28px;font-weight:800;color:#7C3AED}.card{background:#1e293b;border-radius:16px;padding:32px 24px;border:1px solid #334155}h1{font-size:22px;color:#f1f5f9}p{font-size:15px;line-height:1.6;color:#94a3b8}.highlight{color:#7C3AED;font-weight:600}.footer{text-align:center;margin-top:32px;font-size:12px;color:#475569}</style></head><body><div class="container"><div class="logo"><span class="logo-text">White Mike</span></div><div class="card"><h1>Welcome, ${name}!</h1><p>I'm <span class="highlight">White Mike</span>, your personal AI coach. Everything is reps.</p><p>Start by telling me what's on your mind. Let's get it!</p></div><div class="footer"><p>White Mike - Your AI coaching companion</p></div></div></body></html>`;
  return sendTransactionalEmail({ to: email, subject: `Welcome to White Mike, ${name}!`, html });
}

export default new EmailService();
