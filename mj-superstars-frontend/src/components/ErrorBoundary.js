// ============================================================
// MJ's Superstars - Error Boundary & Crash Monitoring
// Graceful error handling and crash reporting
// ============================================================

import React, { Component, createContext, useContext, useEffect, useState, useCallback } from 'react';
import { trackError } from '../services/analytics';

// ============================================================
// ERROR REPORTING SERVICE
// ============================================================

const ERROR_ENDPOINT = process.env.REACT_APP_ERROR_ENDPOINT || '/api/errors';

class ErrorReporter {
  static instance = null;
  queue = [];
  isOnline = navigator.onLine;

  constructor() {
    if (ErrorReporter.instance) {
      return ErrorReporter.instance;
    }
    ErrorReporter.instance = this;

    // Listen for online/offline
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Global error handler
    window.onerror = (message, source, lineno, colno, error) => {
      this.report({
        type: 'uncaught',
        message,
        source,
        lineno,
        colno,
        stack: error?.stack
      });
    };

    // Unhandled promise rejections
    window.onunhandledrejection = (event) => {
      this.report({
        type: 'unhandled_rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack
      });
    };
  }

  /**
   * Report an error
   */
  report(errorData) {
    const enrichedError = {
      ...errorData,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      appVersion: process.env.REACT_APP_VERSION || '1.0.0',
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      deviceInfo: this.getDeviceInfo()
    };

    console.error('[ErrorReporter]', enrichedError);

    // Track in analytics
    trackError({
      type: errorData.type,
      message: errorData.message,
      screen: window.location.pathname,
      component: errorData.component
    });

    // Queue for sending
    this.queue.push(enrichedError);
    this.flushQueue();
  }

  /**
   * Send queued errors
   */
  async flushQueue() {
    if (!this.isOnline || this.queue.length === 0) return;

    const errors = [...this.queue];
    this.queue = [];

    try {
      const token = localStorage.getItem('mj_auth_token');

      await fetch(ERROR_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ errors })
      });
    } catch (e) {
      // Re-queue on failure
      this.queue.unshift(...errors);
    }
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('mj_session_id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('mj_session_id', sessionId);
    }
    return sessionId;
  }

  getUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('mj_user') || '{}');
      return user.id || null;
    } catch {
      return null;
    }
  }

  getDeviceInfo() {
    return {
      platform: navigator.platform,
      language: navigator.language,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
      isNative: !!window.Capacitor?.isNativePlatform?.()
    };
  }
}

// Initialize reporter
const errorReporter = new ErrorReporter();

/**
 * Report an error manually
 */
export function reportError(error, context = {}) {
  errorReporter.report({
    type: 'manual',
    message: error.message || String(error),
    stack: error.stack,
    ...context
  });
}

// ============================================================
// ERROR CONTEXT
// ============================================================

const ErrorContext = createContext({
  error: null,
  clearError: () => {},
  setError: () => {}
});

export function useError() {
  return useContext(ErrorContext);
}

// ============================================================
// ERROR BOUNDARY COMPONENT
// ============================================================

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });

    // Report the error
    errorReporter.report({
      type: 'react_boundary',
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      component: this.props.name || 'Unknown'
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onRetry?.();
  };

  handleReport = () => {
    // Open feedback form or support
    window.open('mailto:support@mjsuperstars.app?subject=Bug Report', '_blank');
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          retry: this.handleRetry
        });
      }

      // Default error UI
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          onReport={this.handleReport}
          minimal={this.props.minimal}
        />
      );
    }

    return this.props.children;
  }
}

// ============================================================
// ERROR FALLBACK UI
// ============================================================

function ErrorFallback({ error, onRetry, onReport, minimal = false }) {
  if (minimal) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
        <p className="text-red-300 mb-3">Something went wrong</p>
        <button
          onClick={onRetry}
          className="text-red-400 text-sm underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Oops! Something went wrong
        </h1>

        <p className="text-slate-400 mb-6">
          We're sorry about that. The error has been reported and we're looking into it.
        </p>

        {/* Error Details (collapsed) */}
        {error && (
          <details className="text-left mb-6 bg-slate-800/50 rounded-xl p-4">
            <summary className="text-slate-400 text-sm cursor-pointer">
              Technical details
            </summary>
            <pre className="mt-2 text-xs text-red-300 overflow-x-auto">
              {error.message}
            </pre>
          </details>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full bg-sky-500 hover:bg-sky-400 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Try Again
          </button>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            Reload App
          </button>

          <button
            onClick={onReport}
            className="text-slate-400 hover:text-slate-300 text-sm"
          >
            Report this issue
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ASYNC ERROR BOUNDARY (for async operations)
// ============================================================

export function AsyncBoundary({ children, fallback, onError }) {
  const [error, setError] = useState(null);

  const handleError = useCallback((err) => {
    setError(err);
    onError?.(err);
    reportError(err, { type: 'async' });
  }, [onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  if (error) {
    if (fallback) {
      return fallback({ error, retry: clearError });
    }

    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-300 font-medium">Error</span>
        </div>
        <p className="text-slate-400 text-sm mb-3">{error.message}</p>
        <button
          onClick={clearError}
          className="text-sky-400 text-sm font-medium"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <ErrorContext.Provider value={{ error, setError: handleError, clearError }}>
      {children}
    </ErrorContext.Provider>
  );
}

// ============================================================
// ERROR TOAST NOTIFICATION
// ============================================================

export function ErrorToast({ error, onDismiss, autoDismiss = 5000 }) {
  useEffect(() => {
    if (autoDismiss && error) {
      const timer = setTimeout(onDismiss, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [error, autoDismiss, onDismiss]);

  if (!error) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-red-500/90 backdrop-blur-lg rounded-xl p-4 shadow-lg flex items-start gap-3">
        <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="flex-1">
          <p className="text-white font-medium">Something went wrong</p>
          <p className="text-red-100 text-sm">{error.message || 'Please try again'}</p>
        </div>
        <button onClick={onDismiss} className="text-white/70 hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ============================================================
// HOOKS
// ============================================================

/**
 * Hook for handling async errors
 */
export function useAsyncError() {
  const [error, setError] = useState(null);

  const handleError = useCallback((err) => {
    setError(err);
    reportError(err, { type: 'async_hook' });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const wrapAsync = useCallback((asyncFn) => {
    return async (...args) => {
      try {
        clearError();
        return await asyncFn(...args);
      } catch (err) {
        handleError(err);
        throw err;
      }
    };
  }, [handleError, clearError]);

  return { error, handleError, clearError, wrapAsync };
}

/**
 * Hook for safe async operations
 */
export function useSafeAsync() {
  const [state, setState] = useState({
    loading: false,
    error: null,
    data: null
  });

  const execute = useCallback(async (asyncFn) => {
    setState({ loading: true, error: null, data: null });

    try {
      const result = await asyncFn();
      setState({ loading: false, error: null, data: result });
      return result;
    } catch (err) {
      setState({ loading: false, error: err, data: null });
      reportError(err, { type: 'safe_async' });
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: null });
  }, []);

  return { ...state, execute, reset };
}

// ============================================================
// NETWORK ERROR HANDLING
// ============================================================

export function NetworkErrorBoundary({ children }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOffline) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">You're offline</h2>
          <p className="text-slate-400 mb-4">Check your internet connection</p>
          <p className="text-slate-500 text-sm">
            Some features may be limited while offline
          </p>
        </div>
      </div>
    );
  }

  return children;
}

export default ErrorBoundary;
