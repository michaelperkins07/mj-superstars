// ============================================================
// MJ's Superstars - Enhanced Storage Service
// Wrapper around localStorage with API sync capability
// Maintains backward compatibility with existing code
// ============================================================

import { TokenManager } from './api';

// All storage keys used in the app
export const STORAGE_KEYS = {
  // Auth & User
  API_KEY: 'mj_api_key',
  MCP_URL: 'mj_mcp_url',
  USER_PROFILE: 'mj_user_profile',

  // Communication Style
  STYLE_ANALYSIS: 'mj_style_analysis',
  SOCIAL_STYLE: 'mj_social_style',

  // Location
  LOCATION_DATA: 'mj_location_data',

  // Habits
  HABITS_LOG: 'mj_habits_log',

  // Emotional Learning
  INTERVENTION_LOG: 'mj_intervention_log',
  EMOTIONAL_PATTERNS: 'mj_emotional_patterns',

  // Conversations
  SESSION_MEMORIES: 'mj_session_memories',
  BREAKTHROUGHS: 'mj_breakthroughs',
  ONGOING_STRUGGLES: 'mj_ongoing_struggles',
  CONVERSATIONS: 'mj_conversations',

  // Interests & Content
  USER_INTERESTS: 'mj_user_interests',
  INTEREST_MENTIONS: 'mj_interest_mentions',
  CACHED_CONTENT: 'mj_cached_content',
  COMEDY_PREFS: 'mj_comedy_prefs',
  SHARED_CONTENT: 'mj_shared_content',

  // Tasks & Accountability
  DAILY_TASKS: 'mj_daily_tasks',
  TASK_HISTORY: 'mj_task_history',
  CHECK_IN_SCHEDULE: 'mj_checkin_schedule',
  CHECK_IN_LOG: 'mj_checkin_log',
  PROCRASTINATION_PATTERNS: 'mj_procrastination_patterns',
  ACCOUNTABILITY_SETTINGS: 'mj_accountability_settings',
  NOTIFICATION_PERMISSION: 'mj_notification_permission',

  // iOS & Apple Integration
  HEALTH_DATA: 'mj_health_data',
  HEALTH_SETTINGS: 'mj_health_settings',
  PUSH_TOKEN: 'mj_push_token',
  PUSH_SETTINGS: 'mj_push_settings',
  WIDGET_DATA: 'mj_widget_data',
  OFFLINE_QUEUE: 'mj_offline_queue',
  SYNC_STATUS: 'mj_sync_status',
  SYNC_QUEUE: 'mj_sync_queue',
  DEVICE_INFO: 'mj_device_info',

  // Mood & Wellness
  MOOD_LOG: 'mj_mood_log',
  MOOD_SETTINGS: 'mj_mood_settings',

  // Breathing & Meditation
  BREATHING_SESSIONS: 'mj_breathing_sessions',
  BREATHING_FAVORITES: 'mj_breathing_favorites',

  // Voice Features
  VOICE_SETTINGS: 'mj_voice_settings',
  VOICE_MESSAGES: 'mj_voice_messages',

  // Crisis Support
  CRISIS_CONTACTS: 'mj_crisis_contacts',
  GROUNDING_HISTORY: 'mj_grounding_history',

  // Coping Tools
  COPING_TOOLS: 'mj_coping_tools',
  SAFETY_PLAN: 'mj_safety_plan',

  // Progress
  STREAKS: 'mj_streaks',
  ACHIEVEMENTS: 'mj_achievements',
  DAILY_AFFIRMATION: 'mj_daily_affirmation',

  // Journal
  JOURNAL_ENTRIES: 'mj_journal_entries',

  // Rituals
  MORNING_INTENTIONS: 'mj_morning_intentions',
  EVENING_REFLECTIONS: 'mj_evening_reflections'
};

// Keys that should sync with the backend
const SYNCABLE_KEYS = new Set([
  STORAGE_KEYS.USER_PROFILE,
  STORAGE_KEYS.MOOD_LOG,
  STORAGE_KEYS.DAILY_TASKS,
  STORAGE_KEYS.CONVERSATIONS,
  STORAGE_KEYS.COPING_TOOLS,
  STORAGE_KEYS.JOURNAL_ENTRIES,
  STORAGE_KEYS.MORNING_INTENTIONS,
  STORAGE_KEYS.EVENING_REFLECTIONS,
  STORAGE_KEYS.STREAKS,
  STORAGE_KEYS.ACHIEVEMENTS,
  STORAGE_KEYS.SAFETY_PLAN,
  STORAGE_KEYS.CHECK_IN_SCHEDULE
]);

// Simple in-memory cache for faster reads
const memoryCache = new Map();

/**
 * Enhanced storage service with API sync capabilities
 */
export const storage = {
  /**
   * Get a value from storage (memory cache first, then localStorage)
   */
  get(key) {
    try {
      // Check memory cache first
      if (memoryCache.has(key)) {
        return memoryCache.get(key);
      }

      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      memoryCache.set(key, parsed);
      return parsed;
    } catch (e) {
      console.error(`Storage get error for ${key}:`, e);
      return null;
    }
  },

  /**
   * Set a value in storage and optionally queue for sync
   */
  set(key, value) {
    try {
      // Update memory cache
      memoryCache.set(key, value);

      // Persist to localStorage
      localStorage.setItem(key, JSON.stringify(value));

      // Mark for sync if syncable
      if (SYNCABLE_KEYS.has(key) && TokenManager.isAuthenticated()) {
        this.queueForSync(key, value);
      }
    } catch (e) {
      console.error(`Storage set error for ${key}:`, e);
    }
  },

  /**
   * Remove a value from storage
   */
  remove(key) {
    memoryCache.delete(key);
    localStorage.removeItem(key);
  },

  /**
   * Clear all MJ storage keys
   */
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      this.remove(key);
    });
  },

  /**
   * Queue a change for backend sync
   */
  queueForSync(key, value) {
    if (!navigator.onLine) {
      const queue = this.get(STORAGE_KEYS.SYNC_QUEUE) || [];
      queue.push({
        key,
        value,
        timestamp: new Date().toISOString(),
        action: 'update'
      });
      // Store directly without recursion
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
    }
  },

  /**
   * Get the offline sync queue
   */
  getSyncQueue() {
    return this.get(STORAGE_KEYS.SYNC_QUEUE) || [];
  },

  /**
   * Clear the sync queue
   */
  clearSyncQueue() {
    this.remove(STORAGE_KEYS.SYNC_QUEUE);
  },

  /**
   * Update sync queue with remaining items after partial sync
   */
  updateSyncQueue(remainingItems) {
    if (remainingItems.length > 0) {
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(remainingItems));
    } else {
      this.clearSyncQueue();
    }
  },

  /**
   * Check if there are pending syncs
   */
  hasPendingSyncs() {
    const queue = this.getSyncQueue();
    return queue.length > 0;
  },

  /**
   * Get storage statistics
   */
  getStats() {
    let totalSize = 0;
    const keyStats = {};

    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        const size = new Blob([item]).size;
        totalSize += size;
        keyStats[key] = {
          size,
          sizeHuman: formatBytes(size)
        };
      }
    });

    return {
      totalSize,
      totalSizeHuman: formatBytes(totalSize),
      keys: keyStats,
      hasPendingSyncs: this.hasPendingSyncs(),
      pendingSyncCount: this.getSyncQueue().length
    };
  },

  /**
   * Export all data as JSON
   */
  exportAll() {
    const data = {};
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      const value = this.get(key);
      if (value !== null) {
        data[name] = value;
      }
    });
    return data;
  },

  /**
   * Import data from JSON
   */
  importAll(data) {
    Object.entries(data).forEach(([name, value]) => {
      const key = STORAGE_KEYS[name];
      if (key) {
        this.set(key, value);
      }
    });
  }
};

// Helper function to format bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Hook for using storage with React
 * Provides reactive updates when storage changes
 */
export function useStorage(key, initialValue = null) {
  const { useState, useEffect, useCallback } = require('react');

  const [value, setValue] = useState(() => {
    const stored = storage.get(key);
    return stored !== null ? stored : initialValue;
  });

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key) {
        const newValue = e.newValue ? JSON.parse(e.newValue) : null;
        setValue(newValue);
        memoryCache.set(key, newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  // Update storage and state together
  const setStoredValue = useCallback((newValue) => {
    const valueToStore = typeof newValue === 'function' ? newValue(value) : newValue;
    setValue(valueToStore);
    storage.set(key, valueToStore);
  }, [key, value]);

  // Remove from storage
  const removeValue = useCallback(() => {
    setValue(null);
    storage.remove(key);
  }, [key]);

  return [value, setStoredValue, removeValue];
}

// Default export for backward compatibility
export default storage;
