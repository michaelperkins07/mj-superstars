// ============================================================
// MJ's Superstars - Notification Settings Screen
// Customize notification preferences and schedules
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { useLocalNotifications, usePushNotifications, useHaptics } from '../hooks';
import { storage, STORAGE_KEYS } from '../services/storage';

// Default notification settings
const DEFAULT_SETTINGS = {
  enabled: true,
  morningCheckIn: {
    enabled: true,
    time: '09:00'
  },
  eveningReflection: {
    enabled: true,
    time: '21:00'
  },
  streakReminder: {
    enabled: true,
    time: '20:00'
  },
  gentleNudges: {
    enabled: true,
    frequency: 'sometimes' // 'never' | 'sometimes' | 'often'
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  },
  sounds: true,
  vibration: true
};

// Icons
const BellIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const SunIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const MoonIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const FireIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

// Toggle Switch Component
function Toggle({ enabled, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        enabled ? 'bg-sky-500' : 'bg-slate-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// Time Picker Component
function TimePicker({ value, onChange, disabled }) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm
        focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    />
  );
}

// Setting Row Component
function SettingRow({ icon: Icon, title, description, children, disabled }) {
  return (
    <div className={`flex items-center justify-between py-4 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {Icon && (
          <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
            <Icon />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-white font-medium">{title}</h3>
          {description && (
            <p className="text-slate-400 text-sm truncate">{description}</p>
          )}
        </div>
      </div>
      <div className="flex-shrink-0 ml-4">
        {children}
      </div>
    </div>
  );
}

// Frequency Selector
function FrequencySelector({ value, onChange, disabled }) {
  const options = [
    { value: 'never', label: 'Never' },
    { value: 'sometimes', label: 'Sometimes' },
    { value: 'often', label: 'Often' }
  ];

  return (
    <div className="flex bg-slate-700 rounded-lg p-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => !disabled && onChange(option.value)}
          disabled={disabled}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            value === option.value
              ? 'bg-sky-500 text-white'
              : 'text-slate-400 hover:text-white'
          } ${disabled ? 'cursor-not-allowed' : ''}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// Main Settings Component
export default function NotificationSettings({ onBack }) {
  const { hasPermission, requestPermission } = usePushNotifications();
  const { scheduleCheckIn, cancelAll, pendingCount } = useLocalNotifications();
  const haptics = useHaptics();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    const saved = storage.get(STORAGE_KEYS.PUSH_SETTINGS);
    if (saved) {
      setSettings({ ...DEFAULT_SETTINGS, ...saved });
    }
  }, []);

  // Save settings
  const saveSettings = useCallback(async (newSettings) => {
    setSaving(true);
    setSettings(newSettings);
    storage.set(STORAGE_KEYS.PUSH_SETTINGS, newSettings);

    // Reschedule notifications based on new settings
    try {
      // Cancel all existing scheduled notifications
      await cancelAll();

      // Schedule morning check-in
      if (newSettings.morningCheckIn.enabled && newSettings.enabled) {
        const [hour, minute] = newSettings.morningCheckIn.time.split(':').map(Number);
        await scheduleCheckIn(hour, minute);
      }

      // Schedule evening reflection
      if (newSettings.eveningReflection.enabled && newSettings.enabled) {
        const [hour, minute] = newSettings.eveningReflection.time.split(':').map(Number);
        // Use LocalNotificationService directly for custom message
        const { LocalNotificationService } = await import('../native/hooks');
        await LocalNotificationService?.schedule?.({
          id: 1002,
          title: "Time to Wind Down 🌙",
          body: "How was your day? Take a moment to reflect.",
          schedule: {
            at: getNextScheduledTime(hour, minute),
            repeats: true,
            every: 'day'
          }
        });
      }

      // Schedule streak reminder
      if (newSettings.streakReminder.enabled && newSettings.enabled) {
        const [hour, minute] = newSettings.streakReminder.time.split(':').map(Number);
        const { LocalNotificationService } = await import('../native/hooks');
        await LocalNotificationService?.schedule?.({
          id: 1003,
          title: "Don't Break Your Streak! 🔥",
          body: "You're doing great. One quick check-in keeps it going.",
          schedule: {
            at: getNextScheduledTime(hour, minute),
            repeats: true,
            every: 'day'
          }
        });
      }

      haptics.success();
    } catch (err) {
      console.error('Failed to update notifications:', err);
      haptics.error();
    } finally {
      setSaving(false);
    }
  }, [cancelAll, scheduleCheckIn, haptics]);

  // Update a specific setting
  const updateSetting = (path, value) => {
    haptics.selection();
    const newSettings = { ...settings };
    const keys = path.split('.');
    let current = newSettings;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;

    saveSettings(newSettings);
  };

  // Request permission if not granted
  const handleRequestPermission = async () => {
    haptics.light();
    const granted = await requestPermission();
    if (granted) {
      haptics.success();
      updateSetting('enabled', true);
    } else {
      haptics.warning();
    }
  };

  // Helper to get next scheduled time
  function getNextScheduledTime(hour, minute) {
    const now = new Date();
    const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
    if (scheduled <= now) {
      scheduled.setDate(scheduled.getDate() + 1);
    }
    return scheduled;
  }

  const notificationsDisabled = !hasPermission || !settings.enabled;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-4 py-4 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">Notifications</h1>
            <p className="text-slate-400 text-sm">
              {pendingCount} scheduled • {hasPermission ? 'Enabled' : 'Disabled'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Permission Warning */}
        {!hasPermission && (
          <div className="bg-amber-900/30 border border-amber-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <BellIcon />
              </div>
              <div className="flex-1">
                <h3 className="text-amber-200 font-medium mb-1">
                  Notifications Disabled
                </h3>
                <p className="text-amber-200/70 text-sm mb-3">
                  Enable notifications to receive check-in reminders from MJ.
                </p>
                <button
                  onClick={handleRequestPermission}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium text-sm rounded-lg transition-colors"
                >
                  Enable Notifications
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Master Toggle */}
        <div className="bg-slate-800/50 rounded-2xl p-4">
          <SettingRow
            icon={BellIcon}
            title="All Notifications"
            description="Turn all notifications on or off"
            disabled={!hasPermission}
          >
            <Toggle
              enabled={settings.enabled}
              onChange={(v) => updateSetting('enabled', v)}
              disabled={!hasPermission}
            />
          </SettingRow>
        </div>

        {/* Scheduled Notifications */}
        <div>
          <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-3 px-1">
            Scheduled Check-ins
          </h2>
          <div className="bg-slate-800/50 rounded-2xl divide-y divide-slate-700/50">
            {/* Morning Check-in */}
            <div className="p-4">
              <SettingRow
                icon={SunIcon}
                title="Morning Check-in"
                description="Start your day with intention"
                disabled={notificationsDisabled}
              >
                <Toggle
                  enabled={settings.morningCheckIn.enabled}
                  onChange={(v) => updateSetting('morningCheckIn.enabled', v)}
                  disabled={notificationsDisabled}
                />
              </SettingRow>
              {settings.morningCheckIn.enabled && (
                <div className="mt-3 pl-13 flex items-center gap-2">
                  <ClockIcon />
                  <TimePicker
                    value={settings.morningCheckIn.time}
                    onChange={(v) => updateSetting('morningCheckIn.time', v)}
                    disabled={notificationsDisabled}
                  />
                </div>
              )}
            </div>

            {/* Evening Reflection */}
            <div className="p-4">
              <SettingRow
                icon={MoonIcon}
                title="Evening Reflection"
                description="Wind down and reflect on your day"
                disabled={notificationsDisabled}
              >
                <Toggle
                  enabled={settings.eveningReflection.enabled}
                  onChange={(v) => updateSetting('eveningReflection.enabled', v)}
                  disabled={notificationsDisabled}
                />
              </SettingRow>
              {settings.eveningReflection.enabled && (
                <div className="mt-3 pl-13 flex items-center gap-2">
                  <ClockIcon />
                  <TimePicker
                    value={settings.eveningReflection.time}
                    onChange={(v) => updateSetting('eveningReflection.time', v)}
                    disabled={notificationsDisabled}
                  />
                </div>
              )}
            </div>

            {/* Streak Reminder */}
            <div className="p-4">
              <SettingRow
                icon={FireIcon}
                title="Streak Reminder"
                description="Don't break your streak"
                disabled={notificationsDisabled}
              >
                <Toggle
                  enabled={settings.streakReminder.enabled}
                  onChange={(v) => updateSetting('streakReminder.enabled', v)}
                  disabled={notificationsDisabled}
                />
              </SettingRow>
              {settings.streakReminder.enabled && (
                <div className="mt-3 pl-13 flex items-center gap-2">
                  <ClockIcon />
                  <TimePicker
                    value={settings.streakReminder.time}
                    onChange={(v) => updateSetting('streakReminder.time', v)}
                    disabled={notificationsDisabled}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gentle Nudges */}
        <div>
          <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-3 px-1">
            Gentle Nudges
          </h2>
          <div className="bg-slate-800/50 rounded-2xl p-4">
            <SettingRow
              icon={HeartIcon}
              title="Supportive Messages"
              description="MJ sends encouraging check-ins"
              disabled={notificationsDisabled}
            >
              <FrequencySelector
                value={settings.gentleNudges.frequency}
                onChange={(v) => updateSetting('gentleNudges.frequency', v)}
                disabled={notificationsDisabled}
              />
            </SettingRow>
          </div>
        </div>

        {/* Sound & Vibration */}
        <div>
          <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-3 px-1">
            Sound & Vibration
          </h2>
          <div className="bg-slate-800/50 rounded-2xl divide-y divide-slate-700/50">
            <div className="p-4">
              <SettingRow
                title="Notification Sounds"
                description="Play a gentle chime"
                disabled={notificationsDisabled}
              >
                <Toggle
                  enabled={settings.sounds}
                  onChange={(v) => updateSetting('sounds', v)}
                  disabled={notificationsDisabled}
                />
              </SettingRow>
            </div>
            <div className="p-4">
              <SettingRow
                title="Vibration"
                description="Haptic feedback for notifications"
                disabled={notificationsDisabled}
              >
                <Toggle
                  enabled={settings.vibration}
                  onChange={(v) => updateSetting('vibration', v)}
                  disabled={notificationsDisabled}
                />
              </SettingRow>
            </div>
          </div>
        </div>

        {/* Quiet Hours */}
        <div>
          <h2 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-3 px-1">
            Quiet Hours
          </h2>
          <div className="bg-slate-800/50 rounded-2xl p-4">
            <SettingRow
              icon={MoonIcon}
              title="Do Not Disturb"
              description="Pause notifications during sleep"
              disabled={notificationsDisabled}
            >
              <Toggle
                enabled={settings.quietHours.enabled}
                onChange={(v) => updateSetting('quietHours.enabled', v)}
                disabled={notificationsDisabled}
              />
            </SettingRow>
            {settings.quietHours.enabled && (
              <div className="mt-4 flex items-center gap-4 pl-13">
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Start</label>
                  <TimePicker
                    value={settings.quietHours.start}
                    onChange={(v) => updateSetting('quietHours.start', v)}
                    disabled={notificationsDisabled}
                  />
                </div>
                <div className="text-slate-500">to</div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">End</label>
                  <TimePicker
                    value={settings.quietHours.end}
                    onChange={(v) => updateSetting('quietHours.end', v)}
                    disabled={notificationsDisabled}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <p className="text-slate-500 text-sm text-center px-4 pb-8">
          MJ sends thoughtful notifications to support your wellness journey.
          We'll never spam you. 💙
        </p>
      </div>
    </div>
  );
}
