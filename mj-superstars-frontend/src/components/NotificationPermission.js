// ============================================================
// MJ's Superstars - Notification Permission Request Component
// Beautiful, non-intrusive permission flow
// ============================================================

import React, { useState, useEffect } from 'react';
import { usePushNotifications, useLocalNotifications, useHaptics } from '../hooks';

// Icons (inline SVG for portability)
const BellIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

/**
 * Soft-ask notification permission modal
 * Shows benefits before requesting actual permission
 */
export function NotificationPermissionModal({ isOpen, onClose, onEnabled }) {
  const { requestPermission: requestPush } = usePushNotifications();
  const { requestPermission: requestLocal, scheduleCheckIn } = useLocalNotifications();
  const haptics = useHaptics();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('intro'); // 'intro' | 'success' | 'denied'

  if (!isOpen) return null;

  const handleEnable = async () => {
    setLoading(true);
    haptics.light();

    try {
      // Request both push and local notification permissions
      const [pushGranted, localGranted] = await Promise.all([
        requestPush(),
        requestLocal()
      ]);

      if (pushGranted || localGranted) {
        // Schedule default morning check-in
        await scheduleCheckIn(9, 0);

        haptics.success();
        setStep('success');

        // Notify parent after brief delay
        setTimeout(() => {
          onEnabled?.();
        }, 2000);
      } else {
        haptics.warning();
        setStep('denied');
      }
    } catch (err) {
      console.error('Permission request failed:', err);
      haptics.error();
      setStep('denied');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    haptics.light();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleSkip}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-slide-up">
        {step === 'intro' && (
          <>
            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-sky-500 to-violet-600 p-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center mb-4">
                <BellIcon />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Stay Connected with MJ
              </h2>
              <p className="text-white/80 text-sm">
                Gentle reminders to check in and keep your streak going
              </p>
            </div>

            {/* Benefits */}
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-400">🌅</span>
                </div>
                <div>
                  <h3 className="text-white font-medium">Morning Check-ins</h3>
                  <p className="text-slate-400 text-sm">Start your day with intention</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400">🔥</span>
                </div>
                <div>
                  <h3 className="text-white font-medium">Streak Reminders</h3>
                  <p className="text-slate-400 text-sm">Don't break your momentum</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-rose-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-rose-400">💙</span>
                </div>
                <div>
                  <h3 className="text-white font-medium">Supportive Nudges</h3>
                  <p className="text-slate-400 text-sm">MJ checks in when it matters</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 space-y-3">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="w-full py-4 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <BellIcon />
                    Enable Notifications
                  </>
                )}
              </button>

              <button
                onClick={handleSkip}
                className="w-full py-3 text-slate-400 hover:text-slate-300 transition-colors text-sm"
              >
                Maybe Later
              </button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full mx-auto flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                <CheckIcon />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You're All Set! 🎉</h2>
            <p className="text-slate-400">
              White Mike will send you gentle reminders to check in.
              You can customize these anytime in Settings.
            </p>
          </div>
        )}

        {step === 'denied' && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-slate-700 rounded-full mx-auto flex items-center justify-center mb-4">
              <BellIcon />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Problem!</h2>
            <p className="text-slate-400 mb-6">
              You can enable notifications anytime in your device Settings or from the White Mike settings menu.
            </p>
            <button
              onClick={handleSkip}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
            >
              Got It
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

/**
 * Inline notification prompt (for settings or onboarding)
 */
export function NotificationPromptCard({ onEnabled, onSkipped }) {
  const { hasPermission, requestPermission } = usePushNotifications();
  const haptics = useHaptics();
  const [loading, setLoading] = useState(false);

  // Don't show if already enabled
  if (hasPermission) return null;

  const handleEnable = async () => {
    setLoading(true);
    haptics.light();

    try {
      const granted = await requestPermission();
      if (granted) {
        haptics.success();
        onEnabled?.();
      }
    } catch (err) {
      console.error('Permission request failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-sky-900/50 to-violet-900/50 border border-sky-500/30 rounded-2xl p-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <BellIcon />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold mb-1">Enable Notifications</h3>
          <p className="text-slate-400 text-sm mb-3">
            Get gentle reminders to check in and maintain your streak.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? 'Enabling...' : 'Enable'}
            </button>
            <button
              onClick={onSkipped}
              className="px-4 py-2 text-slate-400 hover:text-slate-300 text-sm transition-colors"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing notification permission prompts
 */
export function useNotificationPrompt() {
  const [showModal, setShowModal] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const { hasPermission } = usePushNotifications();

  useEffect(() => {
    // Check if we've already prompted
    const prompted = localStorage.getItem('mj_notification_prompted');
    setHasPrompted(!!prompted);
  }, []);

  const promptIfNeeded = () => {
    if (!hasPermission && !hasPrompted) {
      setShowModal(true);
    }
  };

  const markPrompted = () => {
    localStorage.setItem('mj_notification_prompted', 'true');
    setHasPrompted(true);
  };

  const handleClose = () => {
    setShowModal(false);
    markPrompted();
  };

  const handleEnabled = () => {
    setShowModal(false);
    markPrompted();
  };

  return {
    showModal,
    setShowModal,
    hasPrompted,
    hasPermission,
    promptIfNeeded,
    handleClose,
    handleEnabled,
    Modal: () => (
      <NotificationPermissionModal
        isOpen={showModal}
        onClose={handleClose}
        onEnabled={handleEnabled}
      />
    )
  };
}

export default NotificationPermissionModal;
