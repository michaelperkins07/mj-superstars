// ============================================================
// MJ's Superstars - Analytics Service
// Event tracking and user analytics for product insights
// ============================================================

// Analytics provider - can swap between Mixpanel, Amplitude, PostHog
const ANALYTICS_PROVIDER = 'mixpanel'; // 'mixpanel' | 'amplitude' | 'posthog'

// Track user opt-out preference
let analyticsEnabled = true;
let userId = null;
let userProperties = {};
let sessionId = null;
let sessionStartTime = null;

// Event queue for offline support
const eventQueue = [];
const MAX_QUEUE_SIZE = 100;

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize analytics with user consent
 */
export async function initAnalytics(config = {}) {
  const {
    token,
    debug = false,
    optOut = false
  } = config;

  analyticsEnabled = !optOut;

  if (!analyticsEnabled) {
    console.log('[Analytics] User opted out of tracking');
    return;
  }

  // Load consent preference from storage
  const storedConsent = localStorage.getItem('mj_analytics_consent');
  if (storedConsent === 'false') {
    analyticsEnabled = false;
    return;
  }

  // Initialize session
  sessionId = generateSessionId();
  sessionStartTime = Date.now();

  // Initialize provider
  try {
    if (ANALYTICS_PROVIDER === 'mixpanel' && window.mixpanel) {
      window.mixpanel.init(token || process.env.REACT_APP_MIXPANEL_TOKEN, {
        debug,
        track_pageview: false, // We'll track manually
        persistence: 'localStorage'
      });
    }

    // Process any queued events
    await flushEventQueue();

    console.log('[Analytics] Initialized successfully');
  } catch (err) {
    console.error('[Analytics] Initialization failed:', err);
  }
}

/**
 * Set user consent for analytics
 */
export function setAnalyticsConsent(consent) {
  analyticsEnabled = consent;
  localStorage.setItem('mj_analytics_consent', String(consent));

  if (!consent) {
    // Clear any stored analytics data
    if (window.mixpanel) {
      window.mixpanel.opt_out_tracking();
    }
  } else {
    if (window.mixpanel) {
      window.mixpanel.opt_in_tracking();
    }
  }
}

/**
 * Check if analytics is enabled
 */
export function isAnalyticsEnabled() {
  return analyticsEnabled;
}

// ============================================================
// USER IDENTIFICATION
// ============================================================

/**
 * Identify a user for tracking
 */
export function identifyUser(id, properties = {}) {
  if (!analyticsEnabled) return;

  userId = id;
  userProperties = { ...userProperties, ...properties };

  try {
    if (window.mixpanel) {
      window.mixpanel.identify(id);
      window.mixpanel.people.set(properties);
    }
  } catch (err) {
    console.error('[Analytics] Identify failed:', err);
  }
}

/**
 * Set user properties
 */
export function setUserProperties(properties) {
  if (!analyticsEnabled) return;

  userProperties = { ...userProperties, ...properties };

  try {
    if (window.mixpanel) {
      window.mixpanel.people.set(properties);
    }
  } catch (err) {
    console.error('[Analytics] Set properties failed:', err);
  }
}

/**
 * Increment a user property (for counters)
 */
export function incrementUserProperty(property, value = 1) {
  if (!analyticsEnabled) return;

  try {
    if (window.mixpanel) {
      window.mixpanel.people.increment(property, value);
    }
  } catch (err) {
    console.error('[Analytics] Increment failed:', err);
  }
}

/**
 * Reset user identity (on logout)
 */
export function resetUser() {
  userId = null;
  userProperties = {};

  try {
    if (window.mixpanel) {
      window.mixpanel.reset();
    }
  } catch (err) {
    console.error('[Analytics] Reset failed:', err);
  }
}

// ============================================================
// EVENT TRACKING
// ============================================================

/**
 * Track a custom event
 */
export function trackEvent(eventName, properties = {}) {
  if (!analyticsEnabled) return;

  const enrichedProperties = {
    ...properties,
    session_id: sessionId,
    session_duration_seconds: sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 1000) : null,
    timestamp: new Date().toISOString(),
    platform: getPlatform(),
    app_version: process.env.REACT_APP_VERSION || '1.0.0'
  };

  try {
    if (window.mixpanel) {
      window.mixpanel.track(eventName, enrichedProperties);
    } else {
      // Queue event for later
      queueEvent(eventName, enrichedProperties);
    }
  } catch (err) {
    console.error('[Analytics] Track event failed:', err);
    queueEvent(eventName, enrichedProperties);
  }
}

/**
 * Track page/screen view
 */
export function trackScreen(screenName, properties = {}) {
  trackEvent('Screen View', {
    screen_name: screenName,
    ...properties
  });
}

// ============================================================
// MJ's SUPERSTARS SPECIFIC EVENTS
// ============================================================

// --- Onboarding Events ---

export function trackOnboardingStarted() {
  trackEvent('Onboarding Started');
}

export function trackOnboardingStepCompleted(step, data = {}) {
  trackEvent('Onboarding Step Completed', {
    step_number: step,
    step_name: data.stepName,
    ...data
  });
}

export function trackOnboardingCompleted(data = {}) {
  trackEvent('Onboarding Completed', {
    total_duration_seconds: data.durationSeconds,
    ...data
  });
  setUserProperties({ onboarding_completed: true, onboarding_completed_at: new Date().toISOString() });
}

export function trackOnboardingSkipped(step) {
  trackEvent('Onboarding Skipped', { skipped_at_step: step });
}

// --- Authentication Events ---

export function trackSignUp(method = 'email') {
  trackEvent('Sign Up', { method });
  incrementUserProperty('lifetime_sign_ups');
}

export function trackLogin(method = 'email') {
  trackEvent('Login', { method });
}

export function trackLogout() {
  trackEvent('Logout');
}

// --- Mood Tracking Events ---

export function trackMoodLogged(data) {
  trackEvent('Mood Logged', {
    mood_score: data.score,
    mood_label: data.label,
    has_note: !!data.note,
    factors_count: data.factors?.length || 0,
    factors: data.factors,
    source: data.source || 'app' // app, watch, widget, notification
  });
  incrementUserProperty('total_mood_logs');
  setUserProperties({ last_mood_logged_at: new Date().toISOString() });
}

export function trackMoodTrend(data) {
  trackEvent('Mood Trend Viewed', {
    time_range: data.range, // 'week', 'month', 'year'
    average_mood: data.average,
    mood_variance: data.variance
  });
}

// --- Chat/Conversation Events ---

export function trackChatSessionStarted() {
  trackEvent('Chat Session Started');
}

export function trackMessageSent(data) {
  trackEvent('Message Sent', {
    message_length: data.length,
    is_voice: data.isVoice || false,
    suggested_reply_used: data.suggestedReplyUsed || false
  });
  incrementUserProperty('total_messages_sent');
}

export function trackSuggestedReplyUsed(replyType) {
  trackEvent('Suggested Reply Used', { reply_type: replyType });
}

export function trackVoiceModeUsed(durationSeconds) {
  trackEvent('Voice Mode Used', { duration_seconds: durationSeconds });
}

// --- Task Events ---

export function trackTaskCreated(data) {
  trackEvent('Task Created', {
    has_due_date: !!data.dueDate,
    category: data.category,
    priority: data.priority
  });
  incrementUserProperty('total_tasks_created');
}

export function trackTaskCompleted(data) {
  trackEvent('Task Completed', {
    category: data.category,
    days_to_complete: data.daysToComplete,
    was_overdue: data.wasOverdue
  });
  incrementUserProperty('total_tasks_completed');
}

export function trackTaskDeleted() {
  trackEvent('Task Deleted');
}

// --- Journal Events ---

export function trackJournalEntryCreated(data) {
  trackEvent('Journal Entry Created', {
    prompt_type: data.promptType, // 'guided', 'freeform', 'gratitude'
    word_count: data.wordCount,
    has_prompt: !!data.prompt
  });
  incrementUserProperty('total_journal_entries');
}

// --- Ritual Events ---

export function trackRitualStarted(ritualType) {
  trackEvent('Ritual Started', { ritual_type: ritualType }); // 'morning', 'evening'
}

export function trackRitualCompleted(data) {
  trackEvent('Ritual Completed', {
    ritual_type: data.type,
    duration_seconds: data.durationSeconds,
    steps_completed: data.stepsCompleted
  });
  incrementUserProperty(`${data.type}_rituals_completed`);
}

// --- Coping Tools Events ---

export function trackCopingToolUsed(data) {
  trackEvent('Coping Tool Used', {
    tool_name: data.toolName, // 'breathing', 'grounding', 'affirmation', etc.
    duration_seconds: data.durationSeconds,
    completed: data.completed
  });
  incrementUserProperty('coping_tools_used');
}

export function trackBreathingExerciseCompleted(data) {
  trackEvent('Breathing Exercise Completed', {
    pattern: data.pattern, // '4-7-8', 'box', etc.
    cycles_completed: data.cycles,
    duration_seconds: data.durationSeconds
  });
}

// --- Streak & Gamification Events ---

export function trackStreakMilestone(days) {
  trackEvent('Streak Milestone', { streak_days: days });
  setUserProperties({ max_streak_days: days });
}

export function trackStreakBroken(previousStreak) {
  trackEvent('Streak Broken', { previous_streak_days: previousStreak });
}

export function trackAchievementUnlocked(data) {
  trackEvent('Achievement Unlocked', {
    achievement_id: data.id,
    achievement_name: data.name,
    category: data.category
  });
  incrementUserProperty('achievements_unlocked');
}

export function trackLevelUp(newLevel) {
  trackEvent('Level Up', { new_level: newLevel });
  setUserProperties({ current_level: newLevel });
}

// --- Notification Events ---

export function trackNotificationPermissionRequested() {
  trackEvent('Notification Permission Requested');
}

export function trackNotificationPermissionGranted() {
  trackEvent('Notification Permission Granted');
  setUserProperties({ notifications_enabled: true });
}

export function trackNotificationPermissionDenied() {
  trackEvent('Notification Permission Denied');
  setUserProperties({ notifications_enabled: false });
}

export function trackNotificationReceived(data) {
  trackEvent('Notification Received', {
    notification_type: data.type,
    was_app_open: data.wasAppOpen
  });
}

export function trackNotificationTapped(data) {
  trackEvent('Notification Tapped', {
    notification_type: data.type,
    action: data.action
  });
}

// --- Health Integration Events ---

export function trackHealthKitConnected() {
  trackEvent('HealthKit Connected');
  setUserProperties({ healthkit_connected: true });
}

export function trackHealthInsightViewed(insightType) {
  trackEvent('Health Insight Viewed', { insight_type: insightType });
}

// --- Apple Watch Events ---

export function trackWatchAppUsed(action) {
  trackEvent('Watch App Used', { action }); // 'mood_logged', 'breathing_started', etc.
}

// --- Subscription Events ---

export function trackSubscriptionViewed() {
  trackEvent('Subscription Screen Viewed');
}

export function trackSubscriptionStarted(data) {
  trackEvent('Subscription Started', {
    plan: data.plan, // 'monthly', 'yearly'
    price: data.price,
    trial: data.isTrial
  });
  setUserProperties({ subscription_plan: data.plan, subscription_started_at: new Date().toISOString() });
}

export function trackSubscriptionCanceled(data) {
  trackEvent('Subscription Canceled', {
    plan: data.plan,
    days_subscribed: data.daysSubscribed,
    reason: data.reason
  });
}

export function trackTrialStarted(plan) {
  trackEvent('Trial Started', { plan });
  setUserProperties({ trial_started_at: new Date().toISOString() });
}

export function trackTrialConverted(plan) {
  trackEvent('Trial Converted', { plan });
}

// --- Error & Performance Events ---

export function trackError(data) {
  trackEvent('Error Occurred', {
    error_type: data.type,
    error_message: data.message,
    screen: data.screen,
    component: data.component
  });
}

export function trackPerformance(data) {
  trackEvent('Performance Metric', {
    metric_name: data.name,
    value_ms: data.value,
    screen: data.screen
  });
}

// --- Session Events ---

export function trackSessionStart() {
  trackEvent('Session Started');
}

export function trackSessionEnd() {
  const durationSeconds = sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 1000) : 0;
  trackEvent('Session Ended', { duration_seconds: durationSeconds });
}

// --- Feature Usage Events ---

export function trackFeatureUsed(featureName, data = {}) {
  trackEvent('Feature Used', {
    feature_name: featureName,
    ...data
  });
}

// ============================================================
// FUNNEL TRACKING
// ============================================================

export const Funnels = {
  ONBOARDING: 'onboarding',
  FIRST_MOOD_LOG: 'first_mood_log',
  SUBSCRIPTION_CONVERSION: 'subscription_conversion',
  BUDDY_ACTIVATION: 'buddy_activation'
};

export function trackFunnelStep(funnelName, stepNumber, stepName, data = {}) {
  trackEvent('Funnel Step', {
    funnel_name: funnelName,
    step_number: stepNumber,
    step_name: stepName,
    ...data
  });
}

// ============================================================
// A/B TESTING
// ============================================================

const experiments = {};

/**
 * Register user in an experiment
 */
export function enrollInExperiment(experimentName, variant) {
  experiments[experimentName] = variant;

  trackEvent('Experiment Enrolled', {
    experiment_name: experimentName,
    variant
  });

  setUserProperties({ [`experiment_${experimentName}`]: variant });
}

/**
 * Get experiment variant for user
 */
export function getExperimentVariant(experimentName) {
  return experiments[experimentName] || null;
}

/**
 * Track experiment conversion
 */
export function trackExperimentConversion(experimentName, conversionType) {
  const variant = experiments[experimentName];
  if (!variant) return;

  trackEvent('Experiment Conversion', {
    experiment_name: experimentName,
    variant,
    conversion_type: conversionType
  });
}

// ============================================================
// UTILITIES
// ============================================================

function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getPlatform() {
  if (window.Capacitor?.isNativePlatform?.()) {
    return window.Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
  }
  return 'web';
}

function queueEvent(eventName, properties) {
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    eventQueue.shift(); // Remove oldest event
  }
  eventQueue.push({ eventName, properties, timestamp: Date.now() });

  // Persist queue to storage
  try {
    localStorage.setItem('mj_analytics_queue', JSON.stringify(eventQueue));
  } catch (e) {
    // Storage full or unavailable
  }
}

async function flushEventQueue() {
  // Load persisted queue
  try {
    const stored = localStorage.getItem('mj_analytics_queue');
    if (stored) {
      const storedEvents = JSON.parse(stored);
      eventQueue.push(...storedEvents);
      localStorage.removeItem('mj_analytics_queue');
    }
  } catch (e) {
    // Parse error
  }

  // Send all queued events
  while (eventQueue.length > 0) {
    const event = eventQueue.shift();
    try {
      if (window.mixpanel) {
        window.mixpanel.track(event.eventName, event.properties);
      }
    } catch (e) {
      // Re-queue on failure
      eventQueue.unshift(event);
      break;
    }
  }
}

// ============================================================
// REACT HOOK
// ============================================================

export function useAnalytics() {
  return {
    // Core
    trackEvent,
    trackScreen,
    identifyUser,
    setUserProperties,

    // App-specific
    trackMoodLogged,
    trackMessageSent,
    trackTaskCompleted,
    trackJournalEntryCreated,
    trackRitualCompleted,
    trackCopingToolUsed,
    trackAchievementUnlocked,
    trackStreakMilestone,
    trackFeatureUsed,
    trackError,

    // Experiments
    enrollInExperiment,
    getExperimentVariant,
    trackExperimentConversion,

    // Settings
    isEnabled: isAnalyticsEnabled,
    setConsent: setAnalyticsConsent
  };
}

export default {
  init: initAnalytics,
  identify: identifyUser,
  track: trackEvent,
  screen: trackScreen,
  setUserProperties,
  setConsent: setAnalyticsConsent,
  isEnabled: isAnalyticsEnabled,
  reset: resetUser,
  useAnalytics
};
