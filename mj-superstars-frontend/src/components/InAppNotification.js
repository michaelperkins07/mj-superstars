// ============================================================
// MJ's Superstars - In-App Notification Banner
// Shows notifications when app is in foreground
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { setInAppNotificationHandler } from '../services/notificationHandler';

/**
 * In-App Notification Banner Component
 * Displays a toast-style notification at the top of the screen
 */
export default function InAppNotificationBanner() {
  const [notification, setNotification] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Auto-dismiss timer
  useEffect(() => {
    if (isVisible && notification) {
      const timer = setTimeout(() => {
        dismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, notification]);

  // Register handler
  useEffect(() => {
    setInAppNotificationHandler((notif) => {
      setNotification(notif);
      setIsVisible(true);
      setIsExiting(false);
    });

    return () => setInAppNotificationHandler(null);
  }, []);

  const dismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      setNotification(null);
      setIsExiting(false);
    }, 300);
  }, []);

  const handlePress = useCallback(() => {
    if (notification?.onPress) {
      notification.onPress();
    }
    dismiss();
  }, [notification, dismiss]);

  if (!isVisible || !notification) return null;

  return (
    <>
      {/* Backdrop for dismissing */}
      <div
        className="fixed inset-0 z-40"
        onClick={dismiss}
      />

      {/* Notification Banner */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 p-4 pt-safe transition-transform duration-300 ${
          isExiting ? '-translate-y-full' : 'translate-y-0'
        }`}
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}
      >
        <div
          onClick={handlePress}
          className="bg-slate-800/95 backdrop-blur-lg border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="flex items-start gap-3 p-4">
            {/* Icon */}
            <div className="w-10 h-10 bg-sky-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl">💙</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-semibold text-sm">
                {notification.title || "White Mike"}
              </h4>
              <p className="text-slate-300 text-sm line-clamp-2">
                {notification.body}
              </p>
            </div>

            {/* Dismiss button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismiss();
              }}
              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar for auto-dismiss */}
          <div className="h-1 bg-slate-700">
            <div
              className="h-full bg-sky-500 animate-shrink"
              style={{ animationDuration: '5s' }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-shrink {
          animation: shrink linear forwards;
        }
        .pt-safe {
          padding-top: env(safe-area-inset-top, 1rem);
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}

/**
 * Hook for showing in-app notifications programmatically
 */
export function useInAppNotification() {
  const [queue, setQueue] = useState([]);

  const show = useCallback((title, body, options = {}) => {
    const notification = {
      id: Date.now(),
      title,
      body,
      ...options
    };

    setQueue(prev => [...prev, notification]);

    // Auto-remove from queue after display
    setTimeout(() => {
      setQueue(prev => prev.filter(n => n.id !== notification.id));
    }, 6000);
  }, []);

  const showSuccess = useCallback((message) => {
    show('Success! 🎉', message);
  }, [show]);

  const showError = useCallback((message) => {
    show('Oops!', message);
  }, [show]);

  const showInfo = useCallback((message) => {
    show("Hey there! 💙", message);
  }, [show]);

  return {
    show,
    showSuccess,
    showError,
    showInfo,
    queue
  };
}
