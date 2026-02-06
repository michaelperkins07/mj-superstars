// ============================================================
// MJ's Superstars - Job Processor Worker
// Processes background jobs from queues
// ============================================================

import jobQueue, { JobTypes, getQueue } from '../services/jobQueue.js';
import { logger } from '../utils/logger.js';
import errorTracking from '../services/errorTracking.js';

// Import services for job processing
// import notificationService from '../services/notifications.js';
// import emailService from '../services/email.js';
// import aiService from '../services/claude.js';
// import analyticsService from '../services/analytics.js';

// ============================================================
// NOTIFICATION PROCESSORS
// ============================================================

const notificationProcessors = {
  async [JobTypes.SEND_PUSH](job) {
    const { userId, title, body, data } = job.data;
    logger.debug(`Processing push notification for user ${userId}`);

    // Import dynamically to avoid circular dependencies
    const { sendPushNotification } = await import('../services/notifications.js');

    await sendPushNotification(userId, {
      title,
      body,
      data,
    });

    return { success: true, userId };
  },

  async [JobTypes.SEND_BULK_PUSH](job) {
    const { userIds, title, body, data } = job.data;
    logger.debug(`Processing bulk push for ${userIds.length} users`);

    const { sendBulkPush } = await import('../services/notifications.js');

    const results = await sendBulkPush(userIds, { title, body, data });

    return {
      success: true,
      sent: results.sent,
      failed: results.failed,
    };
  },

  async [JobTypes.SCHEDULE_NOTIFICATION](job) {
    // This is executed when the delay expires
    return notificationProcessors[JobTypes.SEND_PUSH](job);
  },
};

// ============================================================
// EMAIL PROCESSORS
// ============================================================

const emailProcessors = {
  async [JobTypes.SEND_EMAIL](job) {
    const { to, subject, template, variables } = job.data;
    logger.debug(`Processing email to ${to}`);

    // For now, log the email (replace with actual email service)
    logger.info(`📧 Email to ${to}: ${subject}`);

    // Example with actual email service:
    // const { sendEmail } = await import('../services/email.js');
    // await sendEmail({ to, subject, template, variables });

    return { success: true, to };
  },

  async [JobTypes.SEND_WELCOME_EMAIL](job) {
    const { userId, email, name } = job.data;
    logger.debug(`Processing welcome email for ${email}`);

    // Placeholder - replace with actual email sending
    logger.info(`📧 Welcome email to ${email} (${name})`);

    return { success: true, email };
  },

  async [JobTypes.SEND_PASSWORD_RESET](job) {
    const { email, resetToken } = job.data;
    logger.debug(`Processing password reset email for ${email}`);

    // Placeholder - replace with actual email sending
    logger.info(`📧 Password reset email to ${email}`);

    return { success: true, email };
  },

  async [JobTypes.SEND_SUBSCRIPTION_EMAIL](job) {
    const { userId, email, type } = job.data;
    logger.debug(`Processing subscription ${type} email for ${email}`);

    const subjects = {
      started: 'Welcome to MJ\'s Superstars Premium! 🌟',
      renewed: 'Your subscription has been renewed',
      cancelled: 'We\'re sad to see you go',
      expired: 'Your premium access has expired',
    };

    logger.info(`📧 Subscription ${type} email to ${email}`);

    return { success: true, email, type };
  },
};

// ============================================================
// AI PROCESSORS
// ============================================================

const aiProcessors = {
  async [JobTypes.PROCESS_AI_RESPONSE](job) {
    const { conversationId, userId, message } = job.data;
    logger.debug(`Processing AI response for conversation ${conversationId}`);

    // This would process complex AI requests asynchronously
    // and store the result or push to the user via WebSocket

    const { processMessage } = await import('../services/claude.js');

    const response = await processMessage(userId, conversationId, message);

    // Notify user via WebSocket that response is ready
    // const io = getIO();
    // io.to(`user:${userId}`).emit('ai_response', { conversationId, response });

    return { success: true, conversationId, responseLength: response?.length };
  },

  async [JobTypes.GENERATE_INSIGHTS](job) {
    const { userId, timeframe } = job.data;
    logger.debug(`Generating insights for user ${userId}`);

    // Generate AI-powered insights from user's data
    // This is a placeholder - implement actual insight generation

    return { success: true, userId, timeframe };
  },

  async [JobTypes.SUMMARIZE_JOURNAL](job) {
    const { userId, entryIds } = job.data;
    logger.debug(`Summarizing journal entries for user ${userId}`);

    // Summarize multiple journal entries
    // This is a placeholder - implement actual summarization

    return { success: true, userId, entryCount: entryIds.length };
  },
};

// ============================================================
// ANALYTICS PROCESSORS
// ============================================================

const analyticsProcessors = {
  async [JobTypes.TRACK_EVENT](job) {
    const { userId, event, properties, timestamp } = job.data;

    // Send to analytics service (Mixpanel, etc.)
    // const analytics = await import('../services/analytics.js');
    // await analytics.track(userId, event, properties);

    logger.debug(`Analytics: ${event} for user ${userId}`);

    return { success: true, event };
  },

  async [JobTypes.AGGREGATE_DAILY_STATS](job) {
    logger.info('Running daily stats aggregation...');

    // Aggregate stats from the previous day
    // - User signups
    // - Active users
    // - Messages sent
    // - Moods logged
    // etc.

    // Placeholder implementation
    const stats = {
      date: new Date().toISOString().split('T')[0],
      processed: true,
    };

    logger.info('Daily stats aggregation complete');
    return { success: true, stats };
  },

  async [JobTypes.GENERATE_REPORT](job) {
    const { reportType, dateRange } = job.data;
    logger.debug(`Generating ${reportType} report`);

    // Generate admin reports

    return { success: true, reportType };
  },
};

// ============================================================
// SCHEDULED TASK PROCESSORS
// ============================================================

const scheduledProcessors = {
  async [JobTypes.MOOD_REMINDER](job) {
    const { userId } = job.data;
    logger.debug(`Sending mood reminder to user ${userId}`);

    // Check if user should receive reminder
    // Send push notification if appropriate

    const { sendPushNotification } = await import('../services/notifications.js');

    await sendPushNotification(userId, {
      title: 'How are you feeling? 🌟',
      body: 'Take a moment to check in with MJ',
      data: { type: 'mood_reminder' },
    });

    return { success: true, userId };
  },

  async [JobTypes.STREAK_CHECK](job) {
    logger.info('Running daily streak check...');

    // Check all users for streak maintenance
    // Update streak counts
    // Send streak notifications

    const { pool } = await import('../database/db.js');

    // Get users who logged mood yesterday but not today
    // Reset their streaks if needed

    logger.info('Streak check complete');
    return { success: true };
  },

  async [JobTypes.DAILY_SUMMARY](job) {
    logger.info('Sending daily summaries...');

    // Get users who want daily summaries
    // Generate personalized summary
    // Send push notification

    return { success: true };
  },

  async [JobTypes.INACTIVE_USER_NUDGE](job) {
    logger.info('Checking for inactive users...');

    // Find users who haven't been active in X days
    // Send re-engagement notification

    return { success: true };
  },
};

// ============================================================
// EXPORT PROCESSORS
// ============================================================

const exportProcessors = {
  async [JobTypes.EXPORT_USER_DATA](job) {
    const { userId, email, requestedAt } = job.data;
    logger.info(`Exporting data for user ${userId}`);

    // Collect all user data (GDPR compliance)
    // - Profile
    // - Moods
    // - Conversations
    // - Journal entries
    // - etc.

    // Generate downloadable file
    // Send email with download link

    logger.info(`Data export complete for user ${userId}`);
    return { success: true, userId };
  },

  async [JobTypes.GENERATE_PDF_REPORT](job) {
    const { userId, reportType, dateRange } = job.data;
    logger.debug(`Generating PDF report for user ${userId}`);

    // Generate PDF report
    // Store in cloud storage
    // Notify user

    return { success: true, userId, reportType };
  },
};

// ============================================================
// WEBHOOK PROCESSORS
// ============================================================

const webhookProcessors = {
  async [JobTypes.SEND_WEBHOOK](job) {
    const { webhookId, url, event, payload, timestamp } = job.data;
    logger.debug(`Sending webhook ${webhookId} to ${url}`);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Timestamp': timestamp,
          'X-Webhook-ID': webhookId,
        },
        body: JSON.stringify({
          event,
          data: payload,
          timestamp,
        }),
        signal: AbortSignal.timeout(30000), // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      return { success: true, webhookId, status: response.status };
    } catch (error) {
      logger.error(`Webhook ${webhookId} failed:`, error.message);
      throw error; // Will be retried
    }
  },
};

// ============================================================
// PROCESSOR REGISTRATION
// ============================================================

const processors = {
  notifications: notificationProcessors,
  email: emailProcessors,
  ai: aiProcessors,
  analytics: analyticsProcessors,
  scheduled: scheduledProcessors,
  exports: exportProcessors,
  webhooks: webhookProcessors,
};

/**
 * Register all processors with their queues
 */
function registerProcessors() {
  for (const [queueName, queueProcessors] of Object.entries(processors)) {
    const queue = getQueue(queueName);
    if (!queue) {
      logger.warn(`Queue not found: ${queueName}`);
      continue;
    }

    // Get concurrency from queue config
    const concurrency = queue.opts?.limiter?.max || 5;

    queue.process(concurrency, async (job) => {
      const processor = queueProcessors[job.name];

      if (!processor) {
        throw new Error(`No processor for job type: ${job.name}`);
      }

      try {
        const result = await processor(job);
        return result;
      } catch (error) {
        // Track error in Sentry
        errorTracking.captureException(error, {
          tags: {
            queue: queueName,
            jobType: job.name,
          },
          extra: {
            jobId: job.id,
            jobData: job.data,
            attempt: job.attemptsMade,
          },
        });
        throw error;
      }
    });

    logger.info(`Registered processors for queue: ${queueName}`);
  }
}

// ============================================================
// WORKER STARTUP
// ============================================================

/**
 * Start the job processor worker
 */
async function startWorker() {
  logger.info('Starting job processor worker...');

  // Initialize queues
  jobQueue.init();

  // Register all processors
  registerProcessors();

  // Set up scheduled jobs
  await setupScheduledJobs();

  logger.info('✅ Job processor worker started');
}

/**
 * Set up recurring scheduled jobs
 */
async function setupScheduledJobs() {
  const { scheduledJobs } = jobQueue;

  // Daily streak check at midnight
  await scheduledJobs.scheduleStreakCheck();

  // Daily summary at 8 PM
  await scheduledJobs.scheduleDailySummary();

  // Inactive user nudge at 10 AM
  await scheduledJobs.scheduleInactiveUserNudge();

  // Daily analytics aggregation at 2 AM
  await jobQueue.analyticsJobs.scheduleDailyAggregation();

  logger.info('Scheduled jobs configured');
}

// ============================================================
// EXPORTS
// ============================================================

export {
  startWorker,
  registerProcessors,
  setupScheduledJobs,
  processors,
};

export default {
  startWorker,
  registerProcessors,
  setupScheduledJobs,
  processors,
};
