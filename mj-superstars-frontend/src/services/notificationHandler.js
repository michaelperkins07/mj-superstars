// ============================================================
// MJ's Superstars - Notification Handler Service
// Handles notification actions and deep linking
// ============================================================

import { isNative, PushService, LocalNotificationService, AppService } from './native';

// Navigation actions mapped to screens/routes
const NOTIFICATION_ACTIONS = {
  open_mood_log: {
    screen: 'MoodLog',
    params: {}
  },
  open_chat: {
    screen: 'Chat',
    params: { startNew: true }
  },
  open_journal: {
    screen: 'Journal',
    params: { mode: 'reflection' }
  },
  open_progress: {
    screen: 'Progress',
    params: {}
  },
  open_achievements: {
    screen: 'Progress',
    params: { tab: 'achievements' }
  },
  open_tasks: {
    screen: 'Tasks',
    params: {}
  },
  open_breathing: {
    screen: 'Breathing',
    params: {}
  },
  open_coping: {
    screen: 'CopingTools',
    params: {}
  }
};

// Notification event listeners storage
let listeners = [];
let navigationCallback = null;

/**
 * Set the navigation callback function
 * This should be called from your app's root component
 */
export function setNavigationHandler(callback) {
  navigationCallback = callback;
}

/**
 * Handle a notification action
 */
export function handleNotificationAction(action, data = {}) {
  const actionConfig = NOTIFICATION_ACTIONS[action];

  if (!actionConfig) {
    console.warn('Unknown notification action:', action);
    return;
  }

  // Call navigation callback if set
  if (navigationCallback) {
    navigationCallback(actionConfig.screen, {
      ...actionConfig.params,
      ...data,
      fromNotification: true
    });
  } else {
    // Fallback: store for later processing
    localStorage.setItem('mj_pending_navigation', JSON.stringify({
      screen: actionConfig.screen,
      params: { ...actionConfig.params, ...data }
    }));
  }
}

/**
 * Check for pending navigation from notification
 */
export function checkPendingNavigation() {
  const pending = localStorage.getItem('mj_pending_navigation');
  if (pending) {
    localStorage.removeItem('mj_pending_navigation');
    try {
      return JSON.parse(pending);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Initialize notification handlers
 */
export async function initNotificationHandlers() {
  if (!isNative) {
    console.log('Notification handlers: Web mode - limited functionality');
    return;
  }

  // Handle push notification taps
  const pushTapListener = PushService.onPushTapped((notification) => {
    console.log('Push notification tapped:', notification);

    const data = notification?.notification?.data || notification?.data || {};
    const action = data.action || data.type;

    if (action) {
      handleNotificationAction(action, data);
    }
  });
  listeners.push(pushTapListener);

  // Handle push notifications received while app is open
  const pushReceiveListener = PushService.onPushReceived((notification) => {
    console.log('Push notification received:', notification);

    // Optionally show an in-app toast/banner
    // This is called when the app is in the foreground
    showInAppNotification(notification);
  });
  listeners.push(pushReceiveListener);

  // Handle local notification taps
  const localTapListener = LocalNotificationService.onTapped((notification) => {
    console.log('Local notification tapped:', notification);

    const data = notification?.notification?.extra || notification?.extra || {};
    const action = data.action || 'open_mood_log'; // Default action

    handleNotificationAction(action, data);
  });
  listeners.push(localTapListener);

  // Handle app URL opens (deep links)
  const urlListener = AppService.onUrlOpen((event) => {
    console.log('App URL opened:', event.url);
    handleDeepLink(event.url);
  });
  listeners.push(urlListener);

  console.log('Notification handlers initialized');
}

/**
 * Clean up notification handlers
 */
export function cleanupNotificationHandlers() {
  listeners.forEach(listener => {
    if (listener?.remove) {
      listener.remove();
    }
  });
  listeners = [];
}

/**
 * Handle deep links (mjsuperstars://action/...)
 */
export function handleDeepLink(url) {
  try {
    const parsed = new URL(url);

    // Handle mjsuperstars:// scheme
    if (parsed.protocol === 'mjsuperstars:') {
      const action = parsed.hostname || parsed.pathname.replace('/', '');
      const params = Object.fromEntries(parsed.searchParams);

      handleNotificationAction(action, params);
      return true;
    }

    // Handle https://mjsuperstars.app/... universal links
    if (parsed.hostname === 'mjsuperstars.app') {
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const action = pathParts[0];
      const params = Object.fromEntries(parsed.searchParams);

      if (action) {
        handleNotificationAction(`open_${action}`, params);
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error('Error parsing deep link:', err);
    return false;
  }
}

/**
 * Show in-app notification banner
 */
let inAppNotificationCallback = null;

export function setInAppNotificationHandler(callback) {
  inAppNotificationCallback = callback;
}

function showInAppNotification(notification) {
  const title = notification?.title || notification?.notification?.title;
  const body = notification?.body || notification?.notification?.body;
  const data = notification?.data || notification?.notification?.data || {};

  if (inAppNotificationCallback) {
    inAppNotificationCallback({
      title,
      body,
      data,
      onPress: () => {
        const action = data.action || data.type;
        if (action) {
          handleNotificationAction(action, data);
        }
      }
    });
  }
}

/**
 * Request notification permission with analytics tracking
 */
export async function requestNotificationPermission() {
  if (!isNative) {
    // Web fallback - check Notification API
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
    return false;
  }

  const granted = await PushService.requestPermission();

  // Track permission result for analytics
  if (granted) {
    console.log('Notification permission granted');
    // Track: analytics.track('notification_permission_granted')
  } else {
    console.log('Notification permission denied');
    // Track: analytics.track('notification_permission_denied')
  }

  return granted;
}

/**
 * Get notification permission status
 */
export async function getNotificationPermissionStatus() {
  if (!isNative) {
    if ('Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  }

  return await PushService.checkPermission();
}

/**
 * Clear all delivered notifications
 */
export async function clearAllNotifications() {
  if (!isNative) return;

  await PushService.removeAllDelivered();
}

/**
 * Update badge count
 */
export async function updateBadgeCount(count) {
  if (!isNative) return;

  // Badge API varies by platform
  // For iOS, this is typically handled by the push notification
  // Or use a native plugin for direct badge updates
  console.log('Badge count update:', count);
}

export default {
  setNavigationHandler,
  setInAppNotificationHandler,
  initNotificationHandlers,
  cleanupNotificationHandlers,
  handleNotificationAction,
  handleDeepLink,
  checkPendingNavigation,
  requestNotificationPermission,
  getNotificationPermissionStatus,
  clearAllNotifications,
  updateBadgeCount
};
