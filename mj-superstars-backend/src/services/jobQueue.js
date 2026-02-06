// ============================================================
// MJ's Superstars - Background Job Queue Service
// Redis-backed job processing with Bull
// ============================================================

import Bull from 'bull';
import { logger } from '../utils/logger.js';

// ============================================================
// CONFIGURATION
// ============================================================

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 500, // Keep last 500 failed jobs
};

// Queue configurations
const QUEUE_CONFIGS = {
  notifications: {
    name: 'notifications',
    concurrency: 10,
    limiter: {
      max: 100,
      duration: 1000, // 100 notifications per second
    },
  },
  email: {
    name: 'email',
    concurrency: 5,
    limiter: {
      max: 30,
      duration: 1000, // 30 emails per second
    },
  },
  ai: {
    name: 'ai',
    concurrency: 3, // Limit concurrent AI calls
    limiter: {
      max: 20,
      duration: 60000, // 20 AI calls per minute
    },
  },
  analytics: {
    name: 'analytics',
    concurrency: 5,
  },
  scheduled: {
    name: 'scheduled',
    concurrency: 2,
  },
  exports: {
    name: 'exports',
    concurrency: 2,
  },
  webhooks: {
    name: 'webhooks',
    concurrency: 10,
    limiter: {
      max: 50,
      duration: 1000,
    },
  },
};

// ============================================================
// QUEUE INSTANCES
// ============================================================

const queues = new Map();
let initialized = false;

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize all job queues
 */
function init() {
  if (initialized) return;

  for (const [key, config] of Object.entries(QUEUE_CONFIGS)) {
    const queue = createQueue(config);
    queues.set(key, queue);
  }

  initialized = true;
  logger.info('✅ Job queues initialized');
}

/**
 * Create a Bull queue with configuration
 */
function createQueue(config) {
  const options = {
    redis: REDIS_URL,
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  };

  if (config.limiter) {
    options.limiter = config.limiter;
  }

  const queue = new Bull(config.name, options);

  // Event handlers
  queue.on('error', (error) => {
    logger.error(`Queue ${config.name} error:`, error);
  });

  queue.on('failed', (job, error) => {
    logger.error(`Job ${job.id} in ${config.name} failed:`, error.message);
  });

  queue.on('completed', (job) => {
    logger.debug(`Job ${job.id} in ${config.name} completed`);
  });

  queue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} in ${config.name} stalled`);
  });

  return queue;
}

/**
 * Get a queue by name
 */
function getQueue(name) {
  if (!initialized) init();
  return queues.get(name);
}

// ============================================================
// JOB TYPES
// ============================================================

const JobTypes = {
  // Notifications
  SEND_PUSH: 'send_push',
  SEND_BULK_PUSH: 'send_bulk_push',
  SCHEDULE_NOTIFICATION: 'schedule_notification',

  // Email
  SEND_EMAIL: 'send_email',
  SEND_WELCOME_EMAIL: 'send_welcome_email',
  SEND_PASSWORD_RESET: 'send_password_reset',
  SEND_SUBSCRIPTION_EMAIL: 'send_subscription_email',

  // AI
  PROCESS_AI_RESPONSE: 'process_ai_response',
  GENERATE_INSIGHTS: 'generate_insights',
  SUMMARIZE_JOURNAL: 'summarize_journal',

  // Analytics
  TRACK_EVENT: 'track_event',
  AGGREGATE_DAILY_STATS: 'aggregate_daily_stats',
  GENERATE_REPORT: 'generate_report',

  // Scheduled
  MOOD_REMINDER: 'mood_reminder',
  STREAK_CHECK: 'streak_check',
  DAILY_SUMMARY: 'daily_summary',
  INACTIVE_USER_NUDGE: 'inactive_user_nudge',

  // Exports
  EXPORT_USER_DATA: 'export_user_data',
  GENERATE_PDF_REPORT: 'generate_pdf_report',

  // Webhooks
  SEND_WEBHOOK: 'send_webhook',
  RETRY_WEBHOOK: 'retry_webhook',
};

// ============================================================
// JOB CREATION HELPERS
// ============================================================

/**
 * Add a job to a queue
 */
async function addJob(queueName, type, data, options = {}) {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  const jobOptions = { ...DEFAULT_JOB_OPTIONS, ...options };

  const job = await queue.add(type, data, jobOptions);
  logger.debug(`Job ${job.id} added to ${queueName}: ${type}`);

  return job;
}

/**
 * Add a delayed job
 */
async function addDelayedJob(queueName, type, data, delay, options = {}) {
  return addJob(queueName, type, data, { ...options, delay });
}

/**
 * Add a scheduled job (cron-like)
 */
async function addScheduledJob(queueName, type, data, cron, options = {}) {
  const queue = getQueue(queueName);
  if (!queue) {
    throw new Error(`Queue not found: ${queueName}`);
  }

  const jobOptions = {
    ...DEFAULT_JOB_OPTIONS,
    ...options,
    repeat: { cron },
  };

  return queue.add(type, data, jobOptions);
}

// ============================================================
// NOTIFICATION JOBS
// ============================================================

const notificationJobs = {
  /**
   * Send a push notification
   */
  async sendPush(userId, title, body, data = {}) {
    return addJob('notifications', JobTypes.SEND_PUSH, {
      userId,
      title,
      body,
      data,
    });
  },

  /**
   * Send push to multiple users
   */
  async sendBulkPush(userIds, title, body, data = {}) {
    return addJob('notifications', JobTypes.SEND_BULK_PUSH, {
      userIds,
      title,
      body,
      data,
    });
  },

  /**
   * Schedule a notification for later
   */
  async scheduleNotification(userId, title, body, sendAt, data = {}) {
    const delay = new Date(sendAt).getTime() - Date.now();
    if (delay < 0) {
      // Send immediately if time has passed
      return this.sendPush(userId, title, body, data);
    }
    return addDelayedJob('notifications', JobTypes.SCHEDULE_NOTIFICATION, {
      userId,
      title,
      body,
      data,
    }, delay);
  },
};

// ============================================================
// EMAIL JOBS
// ============================================================

const emailJobs = {
  /**
   * Send a generic email
   */
  async sendEmail(to, subject, template, variables = {}) {
    return addJob('email', JobTypes.SEND_EMAIL, {
      to,
      subject,
      template,
      variables,
    });
  },

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(userId, email, name) {
    return addJob('email', JobTypes.SEND_WELCOME_EMAIL, {
      userId,
      email,
      name,
    }, { priority: 1 }); // High priority
  },

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, resetToken) {
    return addJob('email', JobTypes.SEND_PASSWORD_RESET, {
      email,
      resetToken,
    }, { priority: 1 });
  },

  /**
   * Send subscription confirmation
   */
  async sendSubscriptionEmail(userId, email, type) {
    return addJob('email', JobTypes.SEND_SUBSCRIPTION_EMAIL, {
      userId,
      email,
      type, // 'started', 'renewed', 'cancelled', 'expired'
    });
  },
};

// ============================================================
// AI JOBS
// ============================================================

const aiJobs = {
  /**
   * Process AI response asynchronously (for complex prompts)
   */
  async processAIResponse(conversationId, userId, message) {
    return addJob('ai', JobTypes.PROCESS_AI_RESPONSE, {
      conversationId,
      userId,
      message,
    });
  },

  /**
   * Generate weekly insights for user
   */
  async generateInsights(userId, timeframe = '7d') {
    return addJob('ai', JobTypes.GENERATE_INSIGHTS, {
      userId,
      timeframe,
    });
  },

  /**
   * Summarize journal entries
   */
  async summarizeJournal(userId, entryIds) {
    return addJob('ai', JobTypes.SUMMARIZE_JOURNAL, {
      userId,
      entryIds,
    });
  },
};

// ============================================================
// ANALYTICS JOBS
// ============================================================

const analyticsJobs = {
  /**
   * Track an event asynchronously
   */
  async trackEvent(userId, event, properties = {}) {
    return addJob('analytics', JobTypes.TRACK_EVENT, {
      userId,
      event,
      properties,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Aggregate daily stats (scheduled)
   */
  async scheduleDailyAggregation() {
    return addScheduledJob('analytics', JobTypes.AGGREGATE_DAILY_STATS, {}, '0 2 * * *'); // 2 AM daily
  },

  /**
   * Generate admin report
   */
  async generateReport(reportType, dateRange) {
    return addJob('analytics', JobTypes.GENERATE_REPORT, {
      reportType,
      dateRange,
    });
  },
};

// ============================================================
// SCHEDULED JOBS
// ============================================================

const scheduledJobs = {
  /**
   * Send mood reminder to user
   */
  async queueMoodReminder(userId, scheduledTime) {
    const delay = new Date(scheduledTime).getTime() - Date.now();
    return addDelayedJob('scheduled', JobTypes.MOOD_REMINDER, { userId }, Math.max(0, delay));
  },

  /**
   * Check and update user streaks (daily)
   */
  async scheduleStreakCheck() {
    return addScheduledJob('scheduled', JobTypes.STREAK_CHECK, {}, '0 0 * * *'); // Midnight daily
  },

  /**
   * Send daily summary to users
   */
  async scheduleDailySummary() {
    return addScheduledJob('scheduled', JobTypes.DAILY_SUMMARY, {}, '0 20 * * *'); // 8 PM daily
  },

  /**
   * Nudge inactive users
   */
  async scheduleInactiveUserNudge() {
    return addScheduledJob('scheduled', JobTypes.INACTIVE_USER_NUDGE, {}, '0 10 * * *'); // 10 AM daily
  },
};

// ============================================================
// EXPORT JOBS
// ============================================================

const exportJobs = {
  /**
   * Export all user data (GDPR)
   */
  async exportUserData(userId, email) {
    return addJob('exports', JobTypes.EXPORT_USER_DATA, {
      userId,
      email,
      requestedAt: new Date().toISOString(),
    }, {
      attempts: 2,
      timeout: 5 * 60 * 1000, // 5 minute timeout
    });
  },

  /**
   * Generate PDF report
   */
  async generatePDFReport(userId, reportType, dateRange) {
    return addJob('exports', JobTypes.GENERATE_PDF_REPORT, {
      userId,
      reportType,
      dateRange,
    });
  },
};

// ============================================================
// WEBHOOK JOBS
// ============================================================

const webhookJobs = {
  /**
   * Send a webhook
   */
  async sendWebhook(webhookId, url, event, payload) {
    return addJob('webhooks', JobTypes.SEND_WEBHOOK, {
      webhookId,
      url,
      event,
      payload,
      timestamp: new Date().toISOString(),
    });
  },
};

// ============================================================
// QUEUE MANAGEMENT
// ============================================================

/**
 * Get queue status
 */
async function getQueueStatus(queueName) {
  const queue = getQueue(queueName);
  if (!queue) return null;

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    name: queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}

/**
 * Get all queue statuses
 */
async function getAllQueueStatuses() {
  const statuses = {};
  for (const [name] of queues) {
    statuses[name] = await getQueueStatus(name);
  }
  return statuses;
}

/**
 * Pause a queue
 */
async function pauseQueue(queueName) {
  const queue = getQueue(queueName);
  if (queue) await queue.pause();
}

/**
 * Resume a queue
 */
async function resumeQueue(queueName) {
  const queue = getQueue(queueName);
  if (queue) await queue.resume();
}

/**
 * Clean old jobs
 */
async function cleanQueue(queueName, grace = 24 * 60 * 60 * 1000) {
  const queue = getQueue(queueName);
  if (!queue) return;

  await queue.clean(grace, 'completed');
  await queue.clean(grace * 7, 'failed');
}

/**
 * Clean all queues
 */
async function cleanAllQueues() {
  for (const [name] of queues) {
    await cleanQueue(name);
  }
}

/**
 * Graceful shutdown
 */
async function shutdown() {
  logger.info('Shutting down job queues...');

  const closePromises = [];
  for (const [name, queue] of queues) {
    closePromises.push(queue.close().then(() => {
      logger.debug(`Queue ${name} closed`);
    }));
  }

  await Promise.all(closePromises);
  logger.info('Job queues shut down');
}

// ============================================================
// EXPORTS
// ============================================================

export {
  init,
  getQueue,
  addJob,
  addDelayedJob,
  addScheduledJob,
  JobTypes,
  notificationJobs,
  emailJobs,
  aiJobs,
  analyticsJobs,
  scheduledJobs,
  exportJobs,
  webhookJobs,
  getQueueStatus,
  getAllQueueStatuses,
  pauseQueue,
  resumeQueue,
  cleanQueue,
  cleanAllQueues,
  shutdown,
};

export default {
  init,
  getQueue,
  addJob,
  addDelayedJob,
  addScheduledJob,
  JobTypes,
  notifications: notificationJobs,
  email: emailJobs,
  ai: aiJobs,
  analytics: analyticsJobs,
  scheduled: scheduledJobs,
  exports: exportJobs,
  webhooks: webhookJobs,
  getQueueStatus,
  getAllQueueStatuses,
  pauseQueue,
  resumeQueue,
  cleanQueue,
  cleanAllQueues,
  shutdown,
};
