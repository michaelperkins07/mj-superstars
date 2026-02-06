// ============================================================
// MJ's Superstars - Frontend Feature Flags Service
// Client-side feature flag management with caching
// ============================================================

import { Preferences } from '@capacitor/preferences';

// ============================================================
// CONFIGURATION
// ============================================================

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const CACHE_KEY = 'mj_feature_flags';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STALE_WHILE_REVALIDATE = 60 * 60 * 1000; // 1 hour

// Default flags (fallback when offline/error)
const DEFAULT_FLAGS = {
  // Chat/AI
  enhanced_ai_responses: true,
  ai_voice_input: false,
  ai_suggested_prompts: true,
  longer_conversations: false,

  // Mood
  mood_insights_v2: false,
  mood_predictions: false,
  mood_correlations: true,

  // Journal
  journal_prompts_ai: false,
  journal_search: true,

  // Buddy
  buddy_matching_v2: false,
  buddy_challenges: false,

  // Health
  health_sync_advanced: true,
  sleep_tracking: false,

  // UI
  new_onboarding: false,
  dark_mode_auto: true,
  haptic_feedback: true,

  // Notifications
  smart_notifications: false,
  notification_digest: false,

  // Subscription
  annual_discount: true,
  trial_extension: false,

  // Analytics
  enhanced_analytics: true,

  // Kill switches (always false by default)
  kill_ai_chat: false,
  kill_subscriptions: false,
  kill_notifications: false,

  // Limits
  max_free_messages: 10,
  max_premium_messages: 100,
  mood_check_reminder_hours: 8,
};

// ============================================================
// STATE
// ============================================================

let flags = { ...DEFAULT_FLAGS };
let lastFetch = 0;
let fetchPromise = null;
let listeners = new Set();
let initialized = false;

// ============================================================
// INITIALIZATION
// ============================================================

/**
 * Initialize feature flags (load from cache, then fetch)
 */
async function init() {
  if (initialized) return flags;

  try {
    // Load from cache first
    const cached = await loadFromCache();
    if (cached) {
      flags = { ...DEFAULT_FLAGS, ...cached.flags };
      lastFetch = cached.timestamp;
      notifyListeners();
    }

    // Fetch fresh flags in background
    fetchFlags().catch(console.error);

    initialized = true;
  } catch (error) {
    console.error('Error initializing feature flags:', error);
  }

  return flags;
}

// ============================================================
// FETCHING
// ============================================================

/**
 * Fetch flags from server
 */
async function fetchFlags(force = false) {
  // Return existing promise if already fetching
  if (fetchPromise && !force) {
    return fetchPromise;
  }

  // Check if cache is still fresh
  const now = Date.now();
  if (!force && lastFetch && (now - lastFetch) < CACHE_DURATION) {
    return flags;
  }

  fetchPromise = (async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {
        'Content-Type': 'application/json',
        'X-Platform': getPlatform(),
        'X-App-Version': process.env.REACT_APP_VERSION || '1.0.0',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/flags`, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch flags: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.flags) {
        flags = { ...DEFAULT_FLAGS, ...data.flags };
        lastFetch = now;

        // Save to cache
        await saveToCache(flags);

        // Notify listeners
        notifyListeners();
      }

      return flags;
    } catch (error) {
      console.error('Error fetching feature flags:', error);

      // Use cached flags if fetch fails
      const cached = await loadFromCache();
      if (cached && (now - cached.timestamp) < STALE_WHILE_REVALIDATE) {
        flags = { ...DEFAULT_FLAGS, ...cached.flags };
      }

      return flags;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

/**
 * Force refresh flags
 */
async function refresh() {
  return fetchFlags(true);
}

// ============================================================
// FLAG ACCESS
// ============================================================

/**
 * Check if a feature is enabled
 */
function isEnabled(flagKey) {
  const value = flags[flagKey];

  // Handle boolean flags
  if (typeof value === 'boolean') {
    return value;
  }

  // Handle truthy/falsy values
  return Boolean(value);
}

/**
 * Get flag value (for non-boolean flags)
 */
function getValue(flagKey, defaultValue = null) {
  if (flagKey in flags) {
    return flags[flagKey];
  }
  return defaultValue;
}

/**
 * Get all flags
 */
function getAllFlags() {
  return { ...flags };
}

// ============================================================
// CONVENIENCE HELPERS
// ============================================================

const features = {
  // Chat/AI
  get enhancedAI() { return isEnabled('enhanced_ai_responses'); },
  get voiceInput() { return isEnabled('ai_voice_input'); },
  get suggestedPrompts() { return isEnabled('ai_suggested_prompts'); },
  get longerConversations() { return isEnabled('longer_conversations'); },

  // Mood
  get moodInsightsV2() { return isEnabled('mood_insights_v2'); },
  get moodPredictions() { return isEnabled('mood_predictions'); },
  get moodCorrelations() { return isEnabled('mood_correlations'); },

  // Journal
  get aiJournalPrompts() { return isEnabled('journal_prompts_ai'); },
  get journalSearch() { return isEnabled('journal_search'); },

  // Buddy
  get buddyMatchingV2() { return isEnabled('buddy_matching_v2'); },
  get buddyChallenges() { return isEnabled('buddy_challenges'); },

  // Health
  get advancedHealthSync() { return isEnabled('health_sync_advanced'); },
  get sleepTracking() { return isEnabled('sleep_tracking'); },

  // UI
  get newOnboarding() { return isEnabled('new_onboarding'); },
  get darkModeAuto() { return isEnabled('dark_mode_auto'); },
  get hapticFeedback() { return isEnabled('haptic_feedback'); },

  // Notifications
  get smartNotifications() { return isEnabled('smart_notifications'); },
  get notificationDigest() { return isEnabled('notification_digest'); },

  // Subscription
  get annualDiscount() { return isEnabled('annual_discount'); },
  get trialExtension() { return isEnabled('trial_extension'); },

  // Analytics
  get enhancedAnalytics() { return isEnabled('enhanced_analytics'); },

  // Kill switches
  get isAIChatKilled() { return isEnabled('kill_ai_chat'); },
  get isSubscriptionsKilled() { return isEnabled('kill_subscriptions'); },
  get isNotificationsKilled() { return isEnabled('kill_notifications'); },

  // Limits
  get maxFreeMessages() { return getValue('max_free_messages', 10); },
  get maxPremiumMessages() { return getValue('max_premium_messages', 100); },
  get moodReminderHours() { return getValue('mood_check_reminder_hours', 8); },
};

// ============================================================
// CACHING
// ============================================================

async function loadFromCache() {
  try {
    const { value } = await Preferences.get({ key: CACHE_KEY });
    if (value) {
      return JSON.parse(value);
    }
  } catch (error) {
    // Fallback to localStorage
    try {
      const value = localStorage.getItem(CACHE_KEY);
      if (value) {
        return JSON.parse(value);
      }
    } catch (e) {
      console.error('Error loading flags from cache:', e);
    }
  }
  return null;
}

async function saveToCache(flagData) {
  const cacheData = {
    flags: flagData,
    timestamp: Date.now(),
  };

  try {
    await Preferences.set({
      key: CACHE_KEY,
      value: JSON.stringify(cacheData),
    });
  } catch (error) {
    // Fallback to localStorage
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.error('Error saving flags to cache:', e);
    }
  }
}

async function clearCache() {
  try {
    await Preferences.remove({ key: CACHE_KEY });
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Error clearing flags cache:', error);
  }
}

// ============================================================
// LISTENERS
// ============================================================

/**
 * Subscribe to flag changes
 */
function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners() {
  listeners.forEach(listener => {
    try {
      listener(flags);
    } catch (error) {
      console.error('Error in flag listener:', error);
    }
  });
}

// ============================================================
// A/B TESTING
// ============================================================

/**
 * Get experiment variant
 */
async function getVariant(experimentKey, variants = ['control', 'variant']) {
  try {
    const token = localStorage.getItem('auth_token');
    const anonymousId = getAnonymousId();

    const headers = {
      'Content-Type': 'application/json',
      'X-Anonymous-ID': anonymousId,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const params = new URLSearchParams({
      variants: variants.join(','),
    });

    const response = await fetch(
      `${API_URL}/api/flags/experiment/${experimentKey}?${params}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error('Failed to get experiment variant');
    }

    const data = await response.json();
    return data.variant || variants[0];
  } catch (error) {
    console.error('Error getting experiment variant:', error);
    return variants[0]; // Default to control
  }
}

// ============================================================
// UTILITIES
// ============================================================

function getPlatform() {
  if (typeof window !== 'undefined') {
    if (window.Capacitor?.isNativePlatform()) {
      return window.Capacitor.getPlatform();
    }
    return 'web';
  }
  return 'unknown';
}

function getAnonymousId() {
  let id = localStorage.getItem('anonymous_id');
  if (!id) {
    id = 'anon_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('anonymous_id', id);
  }
  return id;
}

// ============================================================
// REACT HOOK
// ============================================================

import { useState, useEffect, useCallback } from 'react';

/**
 * React hook for feature flags
 */
export function useFeatureFlags() {
  const [currentFlags, setCurrentFlags] = useState(flags);

  useEffect(() => {
    // Initialize if not done
    init();

    // Subscribe to changes
    const unsubscribe = subscribe(setCurrentFlags);

    return unsubscribe;
  }, []);

  const checkFlag = useCallback((key) => isEnabled(key), [currentFlags]);
  const getFlag = useCallback((key, defaultVal) => getValue(key, defaultVal), [currentFlags]);

  return {
    flags: currentFlags,
    isEnabled: checkFlag,
    getValue: getFlag,
    refresh,
    features,
  };
}

/**
 * React hook for a specific feature flag
 */
export function useFeature(flagKey) {
  const [enabled, setEnabled] = useState(() => isEnabled(flagKey));

  useEffect(() => {
    init();

    const unsubscribe = subscribe(() => {
      setEnabled(isEnabled(flagKey));
    });

    return unsubscribe;
  }, [flagKey]);

  return enabled;
}

/**
 * React hook for A/B experiments
 */
export function useExperiment(experimentKey, variants = ['control', 'variant']) {
  const [variant, setVariant] = useState(variants[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVariant(experimentKey, variants)
      .then(setVariant)
      .finally(() => setLoading(false));
  }, [experimentKey]);

  return { variant, loading };
}

// ============================================================
// EXPORTS
// ============================================================

export {
  init,
  fetchFlags,
  refresh,
  isEnabled,
  getValue,
  getAllFlags,
  features,
  subscribe,
  getVariant,
  clearCache,
};

export default {
  init,
  fetchFlags,
  refresh,
  isEnabled,
  getValue,
  getAllFlags,
  features,
  subscribe,
  getVariant,
  clearCache,
  useFeatureFlags,
  useFeature,
  useExperiment,
};
