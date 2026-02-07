// ============================================================
// MJ's Superstars - Notification Hooks
// Push notifications, local notifications, and haptics
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  isNative,
  isIOS,
  PushService,
  LocalNotificationService
} from '../services/native';
import { useHapticsHook } from '../services/haptics';
import { NotificationAPI } from '../services/api';

// ============================================================
// usePushNotifications - Handles push registration + token sync
// ============================================================

export function usePushNotifications() {
  const [hasPermission, setHasPermission] = useState(false);
  const [deviceToken, setDeviceToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const tokenSentRef = useRef(false);

  // Check initial permission state
  useEffect(() => {
    const checkPermission = async () => {
      if (!isNative) {
        // Web: check Notification API
        if ('Notification' in window) {
          setHasPermission(Notification.permission === 'granted');
        }
        return;
      }

      try {
        const status = await PushService.checkPermission();
        setHasPermission(status === 'granted');
      } catch (err) {
        console.warn('Failed to check push permission:', err);
      }
    };

    checkPermission();
  }, []);

  // Listen for push registration (device token) on native
  useEffect(() => {
    if (!isNative) return;

    // Listen for successful registration → sends device token to backend
    const registrationListener = PushService.onRegistration(async (token) => {
      console.log('Push registration token received:', token.value?.substring(0, 20) + '...');
      setDeviceToken(token.value);

      // Send device token to backend for APNs
      if (!tokenSentRef.current && token.value) {
        try {
          await NotificationAPI.subscribe({
            device_token: token.value,
            device_type: isIOS ? 'ios' : 'android'
          });
          tokenSentRef.current = true;
          console.log('Device token registered with backend');
        } catch (err) {
          console.error('Failed to register device token with backend:', err);
          // Store for retry
          localStorage.setItem('mj_pending_device_token', token.value);
        }
      }
    });

    // Listen for registration errors
    const errorListener = PushService.onRegistrationError((err) => {
      console.error('Push registration error:', err);
      setError(err);
    });

    return () => {
      registrationListener?.remove?.();
      errorListener?.remove?.();
    };
  }, []);

  // Retry sending pending device token when API becomes available
  useEffect(() => {
    const retryPendingToken = async () => {
      const pendingToken = localStorage.getItem('mj_pending_device_token');
      if (pendingToken && !tokenSentRef.current) {
        try {
          await NotificationAPI.subscribe({
            device_token: pendingToken,
            device_type: isIOS ? 'ios' : 'android'
          });
          tokenSentRef.current = true;
          localStorage.removeItem('mj_pending_device_token');
          console.log('Pending device token sent to backend');
        } catch (err) {
          // Will retry next mount
          console.warn('Retry token send failed:', err);
        }
      }
    };

    retryPendingToken();
  }, []);

  // Request permission
  const requestPermission = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isNative) {
        // Web: use Notification API
        if ('Notification' in window) {
          const result = await Notification.requestPermission();
          const granted = result === 'granted';
          setHasPermission(granted);
          setLoading(false);
          return granted;
        }
        setLoading(false);
        return false;
      }

      // Native: request permission + register for push
      const granted = await PushService.requestPermission();
      setHasPermission(granted);
      setLoading(false);
      return granted;
    } catch (err) {
      console.error('Push permission request failed:', err);
      setError(err);
      setLoading(false);
      return false;
    }
  }, []);

  return {
    hasPermission,
    deviceToken,
    loading,
    error,
    requestPermission
  };
}

// ============================================================
// useLocalNotifications - Local notification scheduling
// ============================================================

export function useLocalNotifications() {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (!isNative) return;

    const checkPermission = async () => {
      try {
        // Local notifications typically share permission with push on iOS
        setHasPermission(true);
      } catch (err) {
        console.warn('Local notification permission check failed:', err);
      }
    };

    checkPermission();
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isNative) return false;

    try {
      const granted = await LocalNotificationService.requestPermission();
      setHasPermission(granted);
      return granted;
    } catch (err) {
      console.error('Local notification permission failed:', err);
      return false;
    }
  }, []);

  const scheduleCheckIn = useCallback(async (hour, minute = 0) => {
    if (!isNative) return;

    try {
      await LocalNotificationService.scheduleCheckIn(hour, minute);
      console.log(`Check-in scheduled for ${hour}:${String(minute).padStart(2, '0')}`);
    } catch (err) {
      console.error('Failed to schedule check-in:', err);
    }
  }, []);

  const cancelAll = useCallback(async () => {
    if (!isNative) return;

    try {
      await LocalNotificationService.cancelAll();
    } catch (err) {
      console.error('Failed to cancel notifications:', err);
    }
  }, []);

  const schedule = useCallback(async (options) => {
    if (!isNative) return;

    try {
      await LocalNotificationService.schedule(options);
    } catch (err) {
      console.error('Failed to schedule notification:', err);
    }
  }, []);

  return {
    hasPermission,
    requestPermission,
    scheduleCheckIn,
    cancelAll,
    schedule
  };
}

// ============================================================
// useHaptics - Re-export haptics hook
// ============================================================

export function useHaptics() {
  return useHapticsHook();
}
