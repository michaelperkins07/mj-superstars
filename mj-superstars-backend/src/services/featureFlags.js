// ============================================================
// MJ's Superstars - Feature Flags Service
// Dynamic feature control, A/B testing, and gradual rollouts
// ============================================================

import crypto from 'crypto';

// ============================================================
// CONFIGURATION
// ============================================================

// Feature flag definitions with defaults
const FLAGS = {
  // Chat/AI Features
  ENHANCED_AI_RESPONSES: {
    key: 'enhanced_ai_responses',
    description: 'Use enhanced Claude prompts with better context',
    defaultValue: true,
    type: 'boolean',
  },
  AI_VOICE_INPUT: {
    key: 'ai_voice_input',
    description: 'Allow voice input for chat messages',
    defaultValue: false,
    type: 'boolean',
    premiumOnly: true,
  },
  AI_SUGGESTED_PROMPTS: {
    key: 'ai_suggested_prompts',
    description: 'Show AI-generated conversation starters',
    defaultValue: true,
    type: 'boolean',
  },
  LONGER_CONVERSATIONS: {
    key: 'longer_conversations',
    description: 'Extended conversation context window',
    defaultValue: false,
    type: 'boolean',
    premiumOnly: true,
  },

  // Mood Tracking Features
  MOOD_INSIGHTS_V2: {
    key: 'mood_insights_v2',
    description: 'New mood analytics dashboard',
    defaultValue: false,
    type: 'boolean',
    rolloutPercentage: 20,
  },
  MOOD_PREDICTIONS: {
    key: 'mood_predictions',
    description: 'AI-powered mood predictions',
    defaultValue: false,
    type: 'boolean',
    premiumOnly: true,
  },
  MOOD_CORRELATIONS: {
    key: 'mood_correlations',
    description: 'Show mood vs activity correlations',
    defaultValue: true,
    type: 'boolean',
  },

  // Journal Features
  JOURNAL_PROMPTS_AI: {
    key: 'journal_prompts_ai',
    description: 'AI-generated personalized journal prompts',
    defaultValue: false,
    type: 'boolean',
    rolloutPercentage: 50,
  },
  JOURNAL_SEARCH: {
    key: 'journal_search',
    description: 'Full-text search in journal entries',
    defaultValue: true,
    type: 'boolean',
  },

  // Social/Buddy Features
  BUDDY_MATCHING_V2: {
    key: 'buddy_matching_v2',
    description: 'Improved buddy matching algorithm',
    defaultValue: false,
    type: 'boolean',
    rolloutPercentage: 10,
  },
  BUDDY_CHALLENGES: {
    key: 'buddy_challenges',
    description: 'Shared wellness challenges with buddies',
    defaultValue: false,
    type: 'boolean',
    premiumOnly: true,
  },

  // Health Integration
  HEALTH_SYNC_ADVANCED: {
    key: 'health_sync_advanced',
    description: 'Advanced HealthKit/Google Fit sync',
    defaultValue: true,
    type: 'boolean',
  },
  SLEEP_TRACKING: {
    key: 'sleep_tracking',
    description: 'Sleep quality tracking integration',
    defaultValue: false,
    type: 'boolean',
    rolloutPercentage: 30,
  },

  // UI/UX Features
  NEW_ONBOARDING: {
    key: 'new_onboarding',
    description: 'Redesigned onboarding flow',
    defaultValue: false,
    type: 'boolean',
    rolloutPercentage: 25,
  },
  DARK_MODE_AUTO: {
    key: 'dark_mode_auto',
    description: 'Auto dark mode based on time',
    defaultValue: true,
    type: 'boolean',
  },
  HAPTIC_FEEDBACK: {
    key: 'haptic_feedback',
    description: 'Haptic feedback on interactions',
    defaultValue: true,
    type: 'boolean',
  },

  // Notification Features
  SMART_NOTIFICATIONS: {
    key: 'smart_notifications',
    description: 'AI-optimized notification timing',
    defaultValue: false,
    type: 'boolean',
    rolloutPercentage: 15,
  },
  NOTIFICATION_DIGEST: {
    key: 'notification_digest',
    description: 'Daily notification digest instead of individual',
    defaultValue: false,
    type: 'boolean',
  },

  // Subscription Features
  ANNUAL_DISCOUNT: {
    key: 'annual_discount',
    description: 'Show annual subscription discount',
    defaultValue: true,
    type: 'boolean',
  },
  TRIAL_EXTENSION: {
    key: 'trial_extension',
    description: 'Allow trial extension offer',
    defaultValue: false,
    type: 'boolean',
    rolloutPercentage: 10,
  },

  // Analytics & Experiments
  ENHANCED_ANALYTICS: {
    key: 'enhanced_analytics',
    description: 'Detailed user behavior tracking',
    defaultValue: true,
    type: 'boolean',
  },

  // Kill Switches (for emergency disabling)
  KILL_AI_CHAT: {
    key: 'kill_ai_chat',
    description: 'Emergency disable AI chat',
    defaultValue: false,
    type: 'boolean',
    isKillSwitch: true,
  },
  KILL_SUBSCRIPTIONS: {
    key: 'kill_subscriptions',
    description: 'Emergency disable subscriptions',
    defaultValue: false,
    type: 'boolean',
    isKillSwitch: true,
  },
  KILL_NOTIFICATIONS: {
    key: 'kill_notifications',
    description: 'Emergency disable notifications',
    defaultValue: false,
    type: 'boolean',
    isKillSwitch: true,
  },

  // Numeric flags
  MAX_FREE_MESSAGES: {
    key: 'max_free_messages',
    description: 'Max messages per day for free users',
    defaultValue: 10,
    type: 'number',
  },
  MAX_PREMIUM_MESSAGES: {
    key: 'max_premium_messages',
    description: 'Max messages per day for premium users',
    defaultValue: 100,
    type: 'number',
  },
  MOOD_CHECK_REMINDER_HOURS: {
    key: 'mood_check_reminder_hours',
    description: 'Hours between mood check reminders',
    defaultValue: 8,
    type: 'number',
  },
};

// ============================================================
// STATE MANAGEMENT
// ============================================================

// In-memory cache (could be Redis in production)
let flagOverrides = new Map();
let userOverrides = new Map();

// ============================================================
// CORE FUNCTIONS
// ============================================================

/**
 * Check if a feature is enabled for a user
 */
function isEnabled(flagKey, user = null, context = {}) {
  const flag = getFlag(flagKey);
  if (!flag) {
    console.warn(`Unknown feature flag: ${flagKey}`);
    return false;
  }

  // Check kill switches first (they override everything)
  if (flag.isKillSwitch) {
    return getFlagValue(flagKey);
  }

  // Check if killed by related kill switch
  if (isKilled(flagKey)) {
    return false;
  }

  // Check user-specific override
  if (user?.id && userOverrides.has(`${user.id}:${flagKey}`)) {
    return userOverrides.get(`${user.id}:${flagKey}`);
  }

  // Check global override
  if (flagOverrides.has(flagKey)) {
    return flagOverrides.get(flagKey);
  }

  // Check premium requirement
  if (flag.premiumOnly && !user?.isPremium) {
    return false;
  }

  // Check rollout percentage
  if (flag.rolloutPercentage !== undefined && user?.id) {
    return isInRollout(user.id, flagKey, flag.rolloutPercentage);
  }

  // Check environment-specific settings
  if (context.environment === 'development') {
    // Enable all non-kill-switch features in development
    return flag.defaultValue !== false || !flag.isKillSwitch;
  }

  return flag.defaultValue;
}

/**
 * Get flag value (for non-boolean flags)
 */
function getFlagValue(flagKey, user = null) {
  const flag = getFlag(flagKey);
  if (!flag) return null;

  // Check overrides
  if (user?.id && userOverrides.has(`${user.id}:${flagKey}`)) {
    return userOverrides.get(`${user.id}:${flagKey}`);
  }

  if (flagOverrides.has(flagKey)) {
    return flagOverrides.get(flagKey);
  }

  return flag.defaultValue;
}

/**
 * Get flag definition
 */
function getFlag(flagKey) {
  // Support both FLAG_NAME and flag_name formats
  const upperKey = flagKey.toUpperCase();
  if (FLAGS[upperKey]) {
    return FLAGS[upperKey];
  }

  // Search by key property
  return Object.values(FLAGS).find(f => f.key === flagKey);
}

/**
 * Check if feature is killed
 */
function isKilled(flagKey) {
  const flag = getFlag(flagKey);
  if (!flag) return false;

  // Check related kill switches
  if (flagKey.includes('ai') || flagKey.includes('chat')) {
    return getFlagValue('kill_ai_chat');
  }
  if (flagKey.includes('subscription') || flagKey.includes('payment')) {
    return getFlagValue('kill_subscriptions');
  }
  if (flagKey.includes('notification')) {
    return getFlagValue('kill_notifications');
  }

  return false;
}

/**
 * Deterministic rollout based on user ID
 */
function isInRollout(userId, flagKey, percentage) {
  // Create deterministic hash from userId + flagKey
  const hash = crypto
    .createHash('md5')
    .update(`${userId}:${flagKey}`)
    .digest('hex');

  // Convert first 8 chars to number (0-100)
  const hashNum = parseInt(hash.substring(0, 8), 16) % 100;

  return hashNum < percentage;
}

// ============================================================
// OVERRIDE MANAGEMENT
// ============================================================

/**
 * Set global flag override
 */
function setOverride(flagKey, value) {
  const flag = getFlag(flagKey);
  if (!flag) {
    throw new Error(`Unknown feature flag: ${flagKey}`);
  }
  flagOverrides.set(flagKey, value);
  return true;
}

/**
 * Remove global flag override
 */
function removeOverride(flagKey) {
  return flagOverrides.delete(flagKey);
}

/**
 * Set user-specific override
 */
function setUserOverride(userId, flagKey, value) {
  const flag = getFlag(flagKey);
  if (!flag) {
    throw new Error(`Unknown feature flag: ${flagKey}`);
  }
  userOverrides.set(`${userId}:${flagKey}`, value);
  return true;
}

/**
 * Remove user-specific override
 */
function removeUserOverride(userId, flagKey) {
  return userOverrides.delete(`${userId}:${flagKey}`);
}

/**
 * Clear all overrides for a user
 */
function clearUserOverrides(userId) {
  let count = 0;
  for (const key of userOverrides.keys()) {
    if (key.startsWith(`${userId}:`)) {
      userOverrides.delete(key);
      count++;
    }
  }
  return count;
}

// ============================================================
// BULK OPERATIONS
// ============================================================

/**
 * Get all flags for a user (for syncing to frontend)
 */
function getAllFlags(user = null, context = {}) {
  const result = {};

  for (const [name, flag] of Object.entries(FLAGS)) {
    if (flag.type === 'boolean') {
      result[flag.key] = isEnabled(flag.key, user, context);
    } else {
      result[flag.key] = getFlagValue(flag.key, user);
    }
  }

  return result;
}

/**
 * Get flag metadata (for admin panel)
 */
function getFlagMetadata() {
  return Object.entries(FLAGS).map(([name, flag]) => ({
    name,
    ...flag,
    currentOverride: flagOverrides.get(flag.key),
    hasOverride: flagOverrides.has(flag.key),
  }));
}

// ============================================================
// A/B TESTING
// ============================================================

/**
 * Get A/B test variant for user
 */
function getVariant(experimentKey, variants, userId) {
  if (!userId) {
    return variants[0]; // Default variant for anonymous users
  }

  const hash = crypto
    .createHash('md5')
    .update(`${userId}:${experimentKey}`)
    .digest('hex');

  const hashNum = parseInt(hash.substring(0, 8), 16);
  const variantIndex = hashNum % variants.length;

  return variants[variantIndex];
}

/**
 * Check if user is in A/B test
 */
function isInExperiment(experimentKey, userId, percentage = 100) {
  if (!userId) return false;

  const hash = crypto
    .createHash('md5')
    .update(`${userId}:${experimentKey}:experiment`)
    .digest('hex');

  const hashNum = parseInt(hash.substring(0, 8), 16) % 100;
  return hashNum < percentage;
}

// ============================================================
// EXPRESS MIDDLEWARE
// ============================================================

/**
 * Middleware to attach feature flags to request
 */
function featureFlagsMiddleware() {
  return (req, res, next) => {
    const user = req.user || null;
    const context = {
      environment: process.env.NODE_ENV || 'development',
      platform: req.headers['x-platform'] || 'web',
      appVersion: req.headers['x-app-version'],
    };

    // Attach flags to request
    req.flags = {
      isEnabled: (key) => isEnabled(key, user, context),
      getValue: (key) => getFlagValue(key, user),
      getAll: () => getAllFlags(user, context),
      getVariant: (key, variants) => getVariant(key, variants, user?.id),
      isInExperiment: (key, percentage) => isInExperiment(key, user?.id, percentage),
    };

    next();
  };
}

// ============================================================
// CONVENIENCE HELPERS
// ============================================================

const features = {
  // Chat features
  enhancedAI: (user) => isEnabled('enhanced_ai_responses', user),
  voiceInput: (user) => isEnabled('ai_voice_input', user),
  suggestedPrompts: (user) => isEnabled('ai_suggested_prompts', user),
  longerConversations: (user) => isEnabled('longer_conversations', user),

  // Mood features
  moodInsightsV2: (user) => isEnabled('mood_insights_v2', user),
  moodPredictions: (user) => isEnabled('mood_predictions', user),
  moodCorrelations: (user) => isEnabled('mood_correlations', user),

  // Journal features
  aiJournalPrompts: (user) => isEnabled('journal_prompts_ai', user),
  journalSearch: (user) => isEnabled('journal_search', user),

  // Buddy features
  buddyMatchingV2: (user) => isEnabled('buddy_matching_v2', user),
  buddyChallenges: (user) => isEnabled('buddy_challenges', user),

  // Health features
  advancedHealthSync: (user) => isEnabled('health_sync_advanced', user),
  sleepTracking: (user) => isEnabled('sleep_tracking', user),

  // UI features
  newOnboarding: (user) => isEnabled('new_onboarding', user),
  darkModeAuto: (user) => isEnabled('dark_mode_auto', user),
  hapticFeedback: (user) => isEnabled('haptic_feedback', user),

  // Notification features
  smartNotifications: (user) => isEnabled('smart_notifications', user),
  notificationDigest: (user) => isEnabled('notification_digest', user),

  // Limits
  maxMessages: (user) => user?.isPremium
    ? getFlagValue('max_premium_messages')
    : getFlagValue('max_free_messages'),
  moodReminderHours: () => getFlagValue('mood_check_reminder_hours'),

  // Kill switches
  isAIChatKilled: () => getFlagValue('kill_ai_chat'),
  isSubscriptionsKilled: () => getFlagValue('kill_subscriptions'),
  isNotificationsKilled: () => getFlagValue('kill_notifications'),
};

// ============================================================
// EXPORTS
// ============================================================

export {
  // Core
  isEnabled,
  getFlagValue,
  getFlag,
  isKilled,
  isInRollout,

  // Overrides
  setOverride,
  removeOverride,
  setUserOverride,
  removeUserOverride,
  clearUserOverrides,

  // Bulk
  getAllFlags,
  getFlagMetadata,

  // A/B Testing
  getVariant,
  isInExperiment,

  // Middleware
  featureFlagsMiddleware,

  // Convenience
  features,

  // Constants
  FLAGS,
};

export default {
  isEnabled,
  getFlagValue,
  getFlag,
  getAllFlags,
  getFlagMetadata,
  setOverride,
  removeOverride,
  setUserOverride,
  removeUserOverride,
  getVariant,
  isInExperiment,
  featureFlagsMiddleware,
  features,
  FLAGS,
};
