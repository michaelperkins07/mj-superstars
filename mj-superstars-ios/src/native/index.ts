// ============================================================
// MJ's Superstars - Native Capacitor Plugins Interface
// Clean wrapper for iOS native features
// ============================================================

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardStyle } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { Share } from '@capacitor/share';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

// ============================================================
// Platform Detection
// ============================================================

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isWeb = Capacitor.getPlatform() === 'web';

// ============================================================
// Haptics Service
// ============================================================

export const HapticsService = {
  /**
   * Light impact - for subtle feedback (button taps)
   */
  light: async () => {
    if (!isNative) return;
    await Haptics.impact({ style: ImpactStyle.Light });
  },

  /**
   * Medium impact - for confirmations
   */
  medium: async () => {
    if (!isNative) return;
    await Haptics.impact({ style: ImpactStyle.Medium });
  },

  /**
   * Heavy impact - for major actions
   */
  heavy: async () => {
    if (!isNative) return;
    await Haptics.impact({ style: ImpactStyle.Heavy });
  },

  /**
   * Success notification - task completed, positive feedback
   */
  success: async () => {
    if (!isNative) return;
    await Haptics.notification({ type: NotificationType.Success });
  },

  /**
   * Warning notification - caution needed
   */
  warning: async () => {
    if (!isNative) return;
    await Haptics.notification({ type: NotificationType.Warning });
  },

  /**
   * Error notification - something went wrong
   */
  error: async () => {
    if (!isNative) return;
    await Haptics.notification({ type: NotificationType.Error });
  },

  /**
   * Selection changed - for pickers, toggles
   */
  selection: async () => {
    if (!isNative) return;
    await Haptics.selectionChanged();
  },

  /**
   * Start vibration pattern
   */
  vibrate: async (duration: number = 300) => {
    if (!isNative) return;
    await Haptics.vibrate({ duration });
  }
};

// ============================================================
// Status Bar Service
// ============================================================

export const StatusBarService = {
  /**
   * Set dark style (light text for dark backgrounds)
   */
  setDark: async () => {
    if (!isNative) return;
    await StatusBar.setStyle({ style: Style.Dark });
  },

  /**
   * Set light style (dark text for light backgrounds)
   */
  setLight: async () => {
    if (!isNative) return;
    await StatusBar.setStyle({ style: Style.Light });
  },

  /**
   * Hide the status bar
   */
  hide: async () => {
    if (!isNative) return;
    await StatusBar.hide();
  },

  /**
   * Show the status bar
   */
  show: async () => {
    if (!isNative) return;
    await StatusBar.show();
  },

  /**
   * Set background color (Android only)
   */
  setBackgroundColor: async (color: string) => {
    if (!isAndroid) return;
    await StatusBar.setBackgroundColor({ color });
  }
};

// ============================================================
// Keyboard Service
// ============================================================

export const KeyboardService = {
  /**
   * Set keyboard style
   */
  setStyle: async (style: 'dark' | 'light') => {
    if (!isNative) return;
    await Keyboard.setStyle({
      style: style === 'dark' ? KeyboardStyle.Dark : KeyboardStyle.Light
    });
  },

  /**
   * Hide the keyboard
   */
  hide: async () => {
    if (!isNative) return;
    await Keyboard.hide();
  },

  /**
   * Show the keyboard
   */
  show: async () => {
    if (!isNative) return;
    await Keyboard.show();
  },

  /**
   * Add keyboard show listener
   */
  onShow: (callback: (info: { keyboardHeight: number }) => void) => {
    if (!isNative) return { remove: () => {} };
    return Keyboard.addListener('keyboardWillShow', callback);
  },

  /**
   * Add keyboard hide listener
   */
  onHide: (callback: () => void) => {
    if (!isNative) return { remove: () => {} };
    return Keyboard.addListener('keyboardWillHide', callback);
  }
};

// ============================================================
// Splash Screen Service
// ============================================================

export const SplashService = {
  /**
   * Hide the splash screen
   */
  hide: async (fadeOutDuration: number = 300) => {
    if (!isNative) return;
    await SplashScreen.hide({ fadeOutDuration });
  },

  /**
   * Show the splash screen
   */
  show: async () => {
    if (!isNative) return;
    await SplashScreen.show({
      autoHide: false
    });
  }
};

// ============================================================
// App Service
// ============================================================

export const AppService = {
  /**
   * Get app info
   */
  getInfo: async () => {
    return await App.getInfo();
  },

  /**
   * Get app state
   */
  getState: async () => {
    return await App.getState();
  },

  /**
   * Listen for app state changes
   */
  onStateChange: (callback: (state: { isActive: boolean }) => void) => {
    return App.addListener('appStateChange', callback);
  },

  /**
   * Listen for back button (Android)
   */
  onBackButton: (callback: () => void) => {
    return App.addListener('backButton', callback);
  },

  /**
   * Listen for app URL open
   */
  onUrlOpen: (callback: (data: { url: string }) => void) => {
    return App.addListener('appUrlOpen', callback);
  },

  /**
   * Exit the app (Android only)
   */
  exit: async () => {
    if (!isAndroid) return;
    await App.exitApp();
  }
};

// ============================================================
// Share Service
// ============================================================

export const ShareService = {
  /**
   * Share content
   */
  share: async (options: {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }) => {
    return await Share.share(options);
  },

  /**
   * Check if sharing is available
   */
  canShare: async () => {
    const result = await Share.canShare();
    return result.value;
  }
};

// ============================================================
// Preferences (Storage) Service
// ============================================================

export const PreferencesService = {
  /**
   * Set a value
   */
  set: async (key: string, value: string) => {
    await Preferences.set({ key, value });
  },

  /**
   * Get a value
   */
  get: async (key: string): Promise<string | null> => {
    const result = await Preferences.get({ key });
    return result.value;
  },

  /**
   * Remove a value
   */
  remove: async (key: string) => {
    await Preferences.remove({ key });
  },

  /**
   * Clear all preferences
   */
  clear: async () => {
    await Preferences.clear();
  },

  /**
   * Get all keys
   */
  keys: async (): Promise<string[]> => {
    const result = await Preferences.keys();
    return result.keys;
  }
};

// ============================================================
// Push Notifications Service
// ============================================================

export const PushService = {
  /**
   * Request permission for push notifications
   */
  requestPermission: async () => {
    const result = await PushNotifications.requestPermissions();
    if (result.receive === 'granted') {
      await PushNotifications.register();
    }
    return result.receive === 'granted';
  },

  /**
   * Check current permission status
   */
  checkPermission: async () => {
    const result = await PushNotifications.checkPermissions();
    return result.receive;
  },

  /**
   * Listen for registration success
   */
  onRegistration: (callback: (token: { value: string }) => void) => {
    return PushNotifications.addListener('registration', callback);
  },

  /**
   * Listen for registration errors
   */
  onRegistrationError: (callback: (error: any) => void) => {
    return PushNotifications.addListener('registrationError', callback);
  },

  /**
   * Listen for push notifications received
   */
  onPushReceived: (callback: (notification: any) => void) => {
    return PushNotifications.addListener('pushNotificationReceived', callback);
  },

  /**
   * Listen for push notification tapped
   */
  onPushTapped: (callback: (notification: any) => void) => {
    return PushNotifications.addListener('pushNotificationActionPerformed', callback);
  },

  /**
   * Get delivered notifications
   */
  getDelivered: async () => {
    return await PushNotifications.getDeliveredNotifications();
  },

  /**
   * Remove all delivered notifications
   */
  removeAllDelivered: async () => {
    await PushNotifications.removeAllDeliveredNotifications();
  }
};

// ============================================================
// Local Notifications Service
// ============================================================

export const LocalNotificationService = {
  /**
   * Request permission
   */
  requestPermission: async () => {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  },

  /**
   * Schedule a notification
   */
  schedule: async (options: {
    id: number;
    title: string;
    body: string;
    schedule?: {
      at?: Date;
      repeats?: boolean;
      every?: 'year' | 'month' | 'two-weeks' | 'week' | 'day' | 'hour' | 'minute' | 'second';
    };
    extra?: any;
  }) => {
    await LocalNotifications.schedule({
      notifications: [{
        id: options.id,
        title: options.title,
        body: options.body,
        schedule: options.schedule,
        extra: options.extra,
        sound: 'gentle_chime.wav',
        attachments: undefined,
        actionTypeId: '',
        channelId: 'mj-reminders'
      }]
    });
  },

  /**
   * Schedule check-in reminder
   */
  scheduleCheckIn: async (hour: number, minute: number = 0) => {
    const now = new Date();
    const scheduledTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hour,
      minute,
      0
    );

    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    await LocalNotificationService.schedule({
      id: 1001,
      title: "Hey, it's MJ 💙",
      body: "How are you feeling? Take a moment to check in.",
      schedule: {
        at: scheduledTime,
        repeats: true,
        every: 'day'
      }
    });
  },

  /**
   * Cancel a notification
   */
  cancel: async (ids: number[]) => {
    await LocalNotifications.cancel({
      notifications: ids.map(id => ({ id }))
    });
  },

  /**
   * Cancel all notifications
   */
  cancelAll: async () => {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map(n => ({ id: n.id }))
      });
    }
  },

  /**
   * Get pending notifications
   */
  getPending: async () => {
    return await LocalNotifications.getPending();
  },

  /**
   * Listen for notification received
   */
  onReceived: (callback: (notification: any) => void) => {
    return LocalNotifications.addListener('localNotificationReceived', callback);
  },

  /**
   * Listen for notification tapped
   */
  onTapped: (callback: (notification: any) => void) => {
    return LocalNotifications.addListener('localNotificationActionPerformed', callback);
  }
};

// ============================================================
// Initialize Native Services
// ============================================================

export const initializeNative = async () => {
  if (!isNative) {
    console.log('Running in web mode - native features disabled');
    return;
  }

  console.log(`Running on ${Capacitor.getPlatform()}`);

  // Set status bar style
  await StatusBarService.setDark();

  // Set keyboard style
  await KeyboardService.setStyle('dark');

  // Hide splash screen after a short delay
  setTimeout(() => {
    SplashService.hide(500);
  }, 1000);

  // Listen for app state changes
  AppService.onStateChange(async (state) => {
    if (state.isActive) {
      console.log('App became active');
      // Refresh data, reconnect sockets, etc.
    } else {
      console.log('App went to background');
    }
  });

  console.log('Native services initialized');
};

// Export everything
export default {
  isNative,
  isIOS,
  isAndroid,
  isWeb,
  Haptics: HapticsService,
  StatusBar: StatusBarService,
  Keyboard: KeyboardService,
  Splash: SplashService,
  App: AppService,
  Share: ShareService,
  Preferences: PreferencesService,
  Push: PushService,
  LocalNotifications: LocalNotificationService,
  initialize: initializeNative
};
