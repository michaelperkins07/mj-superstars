// ============================================================
// MJ's Superstars - Native Platform Detection & Services
// Detects Capacitor native environment and provides
// platform-specific APIs with web fallbacks
// ============================================================

// ============================================================
// PLATFORM DETECTION
// ============================================================

/**
 * Check if running in a Capacitor native app (iOS/Android)
 */
export const isNative = !!(
  typeof window !== 'undefined' &&
  window.Capacitor &&
  window.Capacitor.isNativePlatform &&
  window.Capacitor.isNativePlatform()
);

/**
 * Get the current platform
 */
export const platform = (() => {
  if (!isNative) return 'web';
  if (window.Capacitor?.getPlatform) {
    return window.Capacitor.getPlatform(); // 'ios', 'android', or 'web'
  }
  return 'web';
})();

export const isIOS = platform === 'ios';
export const isAndroid = platform === 'android';
export const isWeb = platform === 'web';

// ============================================================
// CAPACITOR PLUGIN LOADER
// ============================================================

/**
 * Safely load a Capacitor plugin
 * Returns null if not available (web environment or plugin not installed)
 */
function getCapPlugin(pluginName) {
  try {
    if (window.Capacitor?.Plugins?.[pluginName]) {
      return window.Capacitor.Plugins[pluginName];
    }
  } catch (e) {
    // Plugin not available
  }
  return null;
}

// ============================================================
// HAPTICS SERVICE
// ============================================================

const HapticsPlugin = getCapPlugin('Haptics');

export const HapticsService = {
  /**
   * Light impact feedback - for selections, toggles
   */
  async light() {
    if (HapticsPlugin) {
      try {
        await HapticsPlugin.impact({ style: 'LIGHT' });
      } catch (e) {
        console.warn('Haptics light failed:', e);
      }
    }
  },

  /**
   * Medium impact feedback - for confirmations
   */
  async medium() {
    if (HapticsPlugin) {
      try {
        await HapticsPlugin.impact({ style: 'MEDIUM' });
      } catch (e) {
        console.warn('Haptics medium failed:', e);
      }
    }
  },

  /**
   * Heavy impact feedback - for important actions
   */
  async heavy() {
    if (HapticsPlugin) {
      try {
        await HapticsPlugin.impact({ style: 'HEAVY' });
      } catch (e) {
        console.warn('Haptics heavy failed:', e);
      }
    }
  },

  /**
   * Success notification feedback
   */
  async success() {
    if (HapticsPlugin) {
      try {
        await HapticsPlugin.notification({ type: 'SUCCESS' });
      } catch (e) {
        console.warn('Haptics success failed:', e);
      }
    }
  },

  /**
   * Warning notification feedback
   */
  async warning() {
    if (HapticsPlugin) {
      try {
        await HapticsPlugin.notification({ type: 'WARNING' });
      } catch (e) {
        console.warn('Haptics warning failed:', e);
      }
    }
  },

  /**
   * Error notification feedback
   */
  async error() {
    if (HapticsPlugin) {
      try {
        await HapticsPlugin.notification({ type: 'ERROR' });
      } catch (e) {
        console.warn('Haptics error failed:', e);
      }
    }
  },

  /**
   * Selection changed feedback - for pickers, sliders
   */
  async selection() {
    if (HapticsPlugin) {
      try {
        await HapticsPlugin.selectionStart();
        await HapticsPlugin.selectionChanged();
        await HapticsPlugin.selectionEnd();
      } catch (e) {
        console.warn('Haptics selection failed:', e);
      }
    }
  }
};

// ============================================================
// STATUS BAR SERVICE
// ============================================================

const StatusBarPlugin = getCapPlugin('StatusBar');

export const StatusBarService = {
  async setStyle(style = 'DARK') {
    if (StatusBarPlugin) {
      try {
        await StatusBarPlugin.setStyle({ style });
      } catch (e) { /* not available */ }
    }
  },

  async hide() {
    if (StatusBarPlugin) {
      try {
        await StatusBarPlugin.hide();
      } catch (e) { /* not available */ }
    }
  },

  async show() {
    if (StatusBarPlugin) {
      try {
        await StatusBarPlugin.show();
      } catch (e) { /* not available */ }
    }
  }
};

// ============================================================
// KEYBOARD SERVICE
// ============================================================

const KeyboardPlugin = getCapPlugin('Keyboard');

export const KeyboardService = {
  async hide() {
    if (KeyboardPlugin) {
      try {
        await KeyboardPlugin.hide();
      } catch (e) { /* not available */ }
    }
  },

  onShow(callback) {
    if (KeyboardPlugin) {
      try {
        KeyboardPlugin.addListener('keyboardWillShow', callback);
      } catch (e) { /* not available */ }
    }
  },

  onHide(callback) {
    if (KeyboardPlugin) {
      try {
        KeyboardPlugin.addListener('keyboardWillHide', callback);
      } catch (e) { /* not available */ }
    }
  }
};

// ============================================================
// PUSH NOTIFICATIONS SERVICE
// ============================================================

const PushNotificationsPlugin = getCapPlugin('PushNotifications');

export const PushService = {
  async requestPermission() {
    if (!PushNotificationsPlugin) return false;
    try {
      const result = await PushNotificationsPlugin.requestPermissions();
      if (result.receive === 'granted') {
        await PushNotificationsPlugin.register();
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Push permission request failed:', e);
      return false;
    }
  },

  async checkPermission() {
    if (!PushNotificationsPlugin) return 'unsupported';
    try {
      const result = await PushNotificationsPlugin.checkPermissions();
      return result.receive; // 'granted', 'denied', 'prompt'
    } catch (e) {
      return 'unsupported';
    }
  },

  onRegistration(callback) {
    if (!PushNotificationsPlugin) return null;
    try {
      return PushNotificationsPlugin.addListener('registration', callback);
    } catch (e) {
      console.warn('Failed to add registration listener:', e);
      return null;
    }
  },

  onRegistrationError(callback) {
    if (!PushNotificationsPlugin) return null;
    try {
      return PushNotificationsPlugin.addListener('registrationError', callback);
    } catch (e) {
      console.warn('Failed to add registration error listener:', e);
      return null;
    }
  },

  onPushReceived(callback) {
    if (!PushNotificationsPlugin) return null;
    try {
      return PushNotificationsPlugin.addListener('pushNotificationReceived', callback);
    } catch (e) {
      console.warn('Failed to add push received listener:', e);
      return null;
    }
  },

  onPushTapped(callback) {
    if (!PushNotificationsPlugin) return null;
    try {
      return PushNotificationsPlugin.addListener('pushNotificationActionPerformed', callback);
    } catch (e) {
      console.warn('Failed to add push tapped listener:', e);
      return null;
    }
  },

  async removeAllDelivered() {
    if (!PushNotificationsPlugin) return;
    try {
      await PushNotificationsPlugin.removeAllDeliveredNotifications();
    } catch (e) {
      console.warn('Failed to remove delivered notifications:', e);
    }
  }
};

// ============================================================
// LOCAL NOTIFICATIONS SERVICE
// ============================================================

const LocalNotificationsPlugin = getCapPlugin('LocalNotifications');

export const LocalNotificationService = {
  async requestPermission() {
    if (!LocalNotificationsPlugin) return false;
    try {
      const result = await LocalNotificationsPlugin.requestPermissions();
      return result.display === 'granted';
    } catch (e) {
      console.warn('Local notification permission failed:', e);
      return false;
    }
  },

  async schedule(options) {
    if (!LocalNotificationsPlugin) return;
    try {
      await LocalNotificationsPlugin.schedule({ notifications: Array.isArray(options) ? options : [options] });
    } catch (e) {
      console.warn('Failed to schedule local notification:', e);
    }
  },

  async scheduleCheckIn(hour, minute = 0) {
    if (!LocalNotificationsPlugin) return;
    try {
      await LocalNotificationsPlugin.schedule({
        notifications: [{
          id: 1001,
          title: "Hey, how are you doing?",
          body: "Take a moment to check in with MJ.",
          schedule: {
            on: { hour, minute },
            repeats: true,
            allowWhileIdle: true
          },
          extra: { action: 'open_mood_log' }
        }]
      });
    } catch (e) {
      console.warn('Failed to schedule check-in:', e);
    }
  },

  async cancelAll() {
    if (!LocalNotificationsPlugin) return;
    try {
      const pending = await LocalNotificationsPlugin.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotificationsPlugin.cancel(pending);
      }
    } catch (e) {
      console.warn('Failed to cancel local notifications:', e);
    }
  },

  onTapped(callback) {
    if (!LocalNotificationsPlugin) return null;
    try {
      return LocalNotificationsPlugin.addListener('localNotificationActionPerformed', callback);
    } catch (e) {
      console.warn('Failed to add local notification tap listener:', e);
      return null;
    }
  },

  onReceived(callback) {
    if (!LocalNotificationsPlugin) return null;
    try {
      return LocalNotificationsPlugin.addListener('localNotificationReceived', callback);
    } catch (e) {
      console.warn('Failed to add local notification received listener:', e);
      return null;
    }
  }
};

// ============================================================
// APP SERVICE (Deep Links, URL Opens)
// ============================================================

const AppPlugin = getCapPlugin('App');

export const AppService = {
  onUrlOpen(callback) {
    if (!AppPlugin) return null;
    try {
      return AppPlugin.addListener('appUrlOpen', callback);
    } catch (e) {
      console.warn('Failed to add URL open listener:', e);
      return null;
    }
  },

  onStateChange(callback) {
    if (!AppPlugin) return null;
    try {
      return AppPlugin.addListener('appStateChange', callback);
    } catch (e) {
      console.warn('Failed to add state change listener:', e);
      return null;
    }
  },

  async getInfo() {
    if (!AppPlugin) return null;
    try {
      return await AppPlugin.getInfo();
    } catch (e) {
      return null;
    }
  }
};

// ============================================================
// SAFE AREA
// ============================================================

/**
 * Get device safe area insets (for notch, home indicator, etc.)
 */
export function getSafeAreaInsets() {
  if (typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--sat') || style.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
    right: parseInt(style.getPropertyValue('--sar') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
    left: parseInt(style.getPropertyValue('--sal') || '0', 10),
  };
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  isNative,
  platform,
  isIOS,
  isAndroid,
  isWeb,
  HapticsService,
  StatusBarService,
  KeyboardService,
  PushService,
  LocalNotificationService,
  AppService,
  getSafeAreaInsets,
};
