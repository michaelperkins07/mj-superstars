// ============================================================
// MJ's Superstars - React Hooks for Native Features
// Easy-to-use hooks for Capacitor plugins
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import {
  isNative,
  HapticsService,
  KeyboardService,
  AppService,
  PushService,
  LocalNotificationService,
  PreferencesService
} from './index';

// ============================================================
// useHaptics - Haptic feedback hook
// ============================================================

export function useHaptics() {
  const feedback = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection' = 'light') => {
    switch (type) {
      case 'light': HapticsService.light(); break;
      case 'medium': HapticsService.medium(); break;
      case 'heavy': HapticsService.heavy(); break;
      case 'success': HapticsService.success(); break;
      case 'warning': HapticsService.warning(); break;
      case 'error': HapticsService.error(); break;
      case 'selection': HapticsService.selection(); break;
    }
  }, []);

  return {
    light: () => feedback('light'),
    medium: () => feedback('medium'),
    heavy: () => feedback('heavy'),
    success: () => feedback('success'),
    warning: () => feedback('warning'),
    error: () => feedback('error'),
    selection: () => feedback('selection'),
    feedback
  };
}

// ============================================================
// useKeyboard - Keyboard state and control
// ============================================================

export function useKeyboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (!isNative) return;

    const showListener = KeyboardService.onShow((info) => {
      setIsVisible(true);
      setKeyboardHeight(info.keyboardHeight);
    });

    const hideListener = KeyboardService.onHide(() => {
      setIsVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const hide = useCallback(() => {
    KeyboardService.hide();
  }, []);

  const show = useCallback(() => {
    KeyboardService.show();
  }, []);

  return {
    isVisible,
    keyboardHeight,
    hide,
    show
  };
}

// ============================================================
// useAppState - App lifecycle state
// ============================================================

export function useAppState() {
  const [isActive, setIsActive] = useState(true);
  const [lastActiveTime, setLastActiveTime] = useState<Date | null>(null);

  useEffect(() => {
    if (!isNative) return;

    const listener = AppService.onStateChange((state) => {
      setIsActive(state.isActive);
      if (state.isActive) {
        setLastActiveTime(new Date());
      }
    });

    return () => {
      listener.remove();
    };
  }, []);

  return {
    isActive,
    lastActiveTime,
    isNative
  };
}

// ============================================================
// usePushNotifications - Push notification management
// ============================================================

export function usePushNotifications() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<any>(null);

  useEffect(() => {
    if (!isNative) return;

    // Check initial permission
    PushService.checkPermission().then(status => {
      setHasPermission(status === 'granted');
    });

    // Listen for registration
    const regListener = PushService.onRegistration((t) => {
      setToken(t.value);
      console.log('Push token:', t.value);
    });

    // Listen for notifications received
    const receiveListener = PushService.onPushReceived((notification) => {
      setLastNotification(notification);
      console.log('Push received:', notification);
    });

    // Listen for notification taps
    const tapListener = PushService.onPushTapped((notification) => {
      console.log('Push tapped:', notification);
      // Handle navigation based on notification data
    });

    return () => {
      regListener.remove();
      receiveListener.remove();
      tapListener.remove();
    };
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await PushService.requestPermission();
    setHasPermission(granted);
    return granted;
  }, []);

  return {
    hasPermission,
    token,
    lastNotification,
    requestPermission
  };
}

// ============================================================
// useLocalNotifications - Local notification scheduling
// ============================================================

export function useLocalNotifications() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isNative) return;

    // Check and update pending count
    const updatePending = async () => {
      const pending = await LocalNotificationService.getPending();
      setPendingCount(pending.notifications.length);
    };

    updatePending();

    // Listen for notification taps
    const tapListener = LocalNotificationService.onTapped((notification) => {
      console.log('Local notification tapped:', notification);
      // Handle navigation
    });

    return () => {
      tapListener.remove();
    };
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await LocalNotificationService.requestPermission();
    setHasPermission(granted);
    return granted;
  }, []);

  const scheduleCheckIn = useCallback(async (hour: number, minute: number = 0) => {
    await LocalNotificationService.scheduleCheckIn(hour, minute);
    const pending = await LocalNotificationService.getPending();
    setPendingCount(pending.notifications.length);
  }, []);

  const schedule = useCallback(async (options: {
    id: number;
    title: string;
    body: string;
    schedule?: any;
  }) => {
    await LocalNotificationService.schedule(options);
    const pending = await LocalNotificationService.getPending();
    setPendingCount(pending.notifications.length);
  }, []);

  const cancel = useCallback(async (ids: number[]) => {
    await LocalNotificationService.cancel(ids);
    const pending = await LocalNotificationService.getPending();
    setPendingCount(pending.notifications.length);
  }, []);

  const cancelAll = useCallback(async () => {
    await LocalNotificationService.cancelAll();
    setPendingCount(0);
  }, []);

  return {
    hasPermission,
    pendingCount,
    requestPermission,
    scheduleCheckIn,
    schedule,
    cancel,
    cancelAll
  };
}

// ============================================================
// useNativeStorage - Persistent storage (survives app updates)
// ============================================================

export function useNativeStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await PreferencesService.get(key);
        if (stored) {
          setValue(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading from native storage:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [key]);

  const set = useCallback(async (newValue: T) => {
    setValue(newValue);
    await PreferencesService.set(key, JSON.stringify(newValue));
  }, [key]);

  const remove = useCallback(async () => {
    setValue(defaultValue);
    await PreferencesService.remove(key);
  }, [key, defaultValue]);

  return {
    value,
    set,
    remove,
    loading
  };
}

// ============================================================
// useShare - Native sharing
// ============================================================

export function useShare() {
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    const check = async () => {
      // Share is available on web too via Web Share API
      const result = await import('./index').then(m => m.ShareService.canShare());
      setCanShare(result);
    };
    check();
  }, []);

  const share = useCallback(async (options: {
    title?: string;
    text?: string;
    url?: string;
  }) => {
    const { ShareService } = await import('./index');
    return await ShareService.share(options);
  }, []);

  const shareProgress = useCallback(async (streakDays: number) => {
    await share({
      title: "MJ's Superstars",
      text: `🌟 I've been working on my mental wellness for ${streakDays} days with MJ's Superstars!`,
      url: 'https://mjsuperstars.app'
    });
  }, [share]);

  const shareAchievement = useCallback(async (achievement: string) => {
    await share({
      title: "Achievement Unlocked! 🏆",
      text: `I just earned "${achievement}" on MJ's Superstars! Building better mental health habits one day at a time.`,
      url: 'https://mjsuperstars.app'
    });
  }, [share]);

  return {
    canShare,
    share,
    shareProgress,
    shareAchievement
  };
}

// Export all hooks
export default {
  useHaptics,
  useKeyboard,
  useAppState,
  usePushNotifications,
  useLocalNotifications,
  useNativeStorage,
  useShare
};
