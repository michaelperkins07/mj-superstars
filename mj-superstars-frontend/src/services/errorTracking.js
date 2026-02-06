// ============================================================
// MJ's Superstars - Frontend Error Tracking (Sentry)
// React crash reporting and performance monitoring
// ============================================================

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

// ============================================================
// CONFIGURATION
// ============================================================

const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const RELEASE = process.env.REACT_APP_VERSION || '1.0.0';

// Error levels
export const ErrorLevel = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  DEBUG: 'debug'
};

// Error categories
export const ErrorCategory = {
  UI: 'ui',
  NETWORK: 'network',
  AUTH: 'authentication',
  SUBSCRIPTION: 'subscription',
  CHAT: 'chat',
  MOOD: 'mood',
  STORAGE: 'storage',
  NATIVE: 'native',
  UNKNOWN: 'unknown'
};

// ============================================================
// INITIALIZATION
// ============================================================

let initialized = false;

export function init() {
  if (!SENTRY_DSN) {
    console.log('⚠️  Sentry DSN not configured - error tracking disabled');
    return false;
  }

  if (initialized) {
    return true;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `mj-superstars-frontend@${RELEASE}`,

    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.2 : 1.0,

    // Integrations
    integrations: [
      new BrowserTracing({
        // Track route changes
        routingInstrumentation: Sentry.reactRouterV6Instrumentation,
        // Track specific origins
        tracingOrigins: ['localhost', /^\//],
      }),
      // Replay for session recordings (useful for debugging)
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Session replay sample rate
    replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,

    // Filter events before sending
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(crumb => {
          if (crumb.data?.password) {
            crumb.data.password = '[REDACTED]';
          }
          if (crumb.data?.token) {
            crumb.data.token = '[REDACTED]';
          }
          return crumb;
        });
      }

      // Don't send certain expected errors
      const error = hint.originalException;
      if (error?.message) {
        // Network errors that are expected
        if (error.message.includes('Network request failed')) {
          return null;
        }
        // User cancelled operations
        if (error.message.includes('User cancelled')) {
          return null;
        }
      }

      return event;
    },

    // Ignore common non-actionable errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection',
      'Loading chunk',
      'ChunkLoadError',
      /^cancelled$/i,
    ],

    // Don't track these URLs
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });

  initialized = true;
  console.log('✅ Sentry error tracking initialized');
  return true;
}

// ============================================================
// USER CONTEXT
// ============================================================

export function setUser(user) {
  if (!initialized || !user) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
    subscription: user.subscription_status || 'free',
  });
}

export function clearUser() {
  if (!initialized) return;
  Sentry.setUser(null);
}

// ============================================================
// CONTEXT & TAGS
// ============================================================

export function setContext(name, data) {
  if (!initialized) return;
  Sentry.setContext(name, data);
}

export function setTag(key, value) {
  if (!initialized) return;
  Sentry.setTag(key, value);
}

export function setTags(tags) {
  if (!initialized) return;
  Sentry.setTags(tags);
}

// Set app state context
export function setAppState(state) {
  setContext('appState', {
    currentScreen: state.currentScreen,
    isOnline: state.isOnline,
    isPremium: state.isPremium,
    streak: state.streak,
  });
}

// ============================================================
// BREADCRUMBS
// ============================================================

export function addBreadcrumb(message, category = 'custom', data = {}, level = 'info') {
  if (!initialized) return;

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

// Navigation breadcrumb
export function trackNavigation(from, to) {
  addBreadcrumb(`Navigate: ${from} → ${to}`, 'navigation', { from, to });
}

// User action breadcrumb
export function trackUserAction(action, data = {}) {
  addBreadcrumb(action, 'user', data);
}

// API call breadcrumb
export function trackApiCall(method, endpoint, status) {
  addBreadcrumb(`${method} ${endpoint}`, 'api', { status });
}

// UI interaction breadcrumb
export function trackUIInteraction(component, action, data = {}) {
  addBreadcrumb(`${component}: ${action}`, 'ui', data);
}

// ============================================================
// ERROR CAPTURE
// ============================================================

export function captureException(error, context = {}) {
  if (!initialized) {
    console.error('Uncaptured error:', error);
    return null;
  }

  return Sentry.captureException(error, {
    tags: context.tags || {},
    extra: context.extra || {},
    level: context.level || ErrorLevel.ERROR,
  });
}

export function captureMessage(message, level = ErrorLevel.INFO, context = {}) {
  if (!initialized) {
    console.log(`[${level}] ${message}`);
    return null;
  }

  return Sentry.captureMessage(message, {
    level,
    tags: context.tags || {},
    extra: context.extra || {},
  });
}

// Categorized error helpers
export const errors = {
  // UI/React errors
  uiError(error, componentName = null) {
    return captureException(error, {
      tags: { category: ErrorCategory.UI },
      extra: { componentName },
    });
  },

  // Network/API errors
  networkError(error, endpoint = null, method = null) {
    return captureException(error, {
      tags: { category: ErrorCategory.NETWORK },
      extra: { endpoint, method },
    });
  },

  // Authentication errors
  authError(error, action = null) {
    return captureException(error, {
      tags: { category: ErrorCategory.AUTH },
      extra: { action },
    });
  },

  // Chat/AI errors
  chatError(error, messageLength = null) {
    return captureException(error, {
      tags: { category: ErrorCategory.CHAT },
      extra: { messageLength },
    });
  },

  // Mood tracking errors
  moodError(error, moodValue = null) {
    return captureException(error, {
      tags: { category: ErrorCategory.MOOD },
      extra: { moodValue },
    });
  },

  // Subscription errors
  subscriptionError(error, productId = null) {
    return captureException(error, {
      tags: { category: ErrorCategory.SUBSCRIPTION },
      extra: { productId },
    });
  },

  // Storage errors
  storageError(error, operation = null) {
    return captureException(error, {
      tags: { category: ErrorCategory.STORAGE },
      extra: { operation },
    });
  },

  // Native/Capacitor errors
  nativeError(error, plugin = null) {
    return captureException(error, {
      tags: { category: ErrorCategory.NATIVE },
      extra: { plugin },
    });
  },
};

// ============================================================
// REACT ERROR BOUNDARY
// ============================================================

export const SentryErrorBoundary = Sentry.ErrorBoundary;

// HOC for wrapping components
export function withErrorBoundary(Component, options = {}) {
  return Sentry.withErrorBoundary(Component, {
    fallback: options.fallback || <ErrorFallback />,
    showDialog: options.showDialog || false,
    onError: (error, componentStack) => {
      errors.uiError(error, options.componentName);
    },
  });
}

// Default error fallback component
function ErrorFallback({ error, resetError }) {
  return (
    <div style={{
      padding: '20px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>😔</div>
      <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#1F2937' }}>
        Something went wrong
      </h2>
      <p style={{ color: '#6B7280', marginBottom: '16px', fontSize: '14px' }}>
        We've been notified and are working on a fix.
      </p>
      {resetError && (
        <button
          onClick={resetError}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: '#7C3AED',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// ============================================================
// PERFORMANCE MONITORING
// ============================================================

export function startTransaction(name, op = 'custom') {
  if (!initialized) return null;
  return Sentry.startTransaction({ name, op });
}

// Measure component render time
export function measureRender(componentName) {
  const transaction = startTransaction(`render.${componentName}`, 'ui.render');
  return () => transaction?.finish();
}

// Measure async operation
export async function measureAsync(name, operation) {
  if (!initialized) {
    return operation();
  }

  const transaction = startTransaction(name, 'custom');

  try {
    const result = await operation();
    transaction?.setStatus('ok');
    return result;
  } catch (error) {
    transaction?.setStatus('internal_error');
    captureException(error);
    throw error;
  } finally {
    transaction?.finish();
  }
}

// ============================================================
// REACT HOOKS
// ============================================================

import { useEffect, useCallback } from 'react';

// Hook to track screen views
export function useScreenTracking(screenName) {
  useEffect(() => {
    if (!initialized) return;

    setTag('screen', screenName);
    addBreadcrumb(`View: ${screenName}`, 'navigation');

    return () => {
      setTag('screen', null);
    };
  }, [screenName]);
}

// Hook to capture errors in async operations
export function useErrorCapture() {
  const capture = useCallback((error, category = ErrorCategory.UNKNOWN, extra = {}) => {
    return captureException(error, {
      tags: { category },
      extra,
    });
  }, []);

  return capture;
}

// Hook for safe async operations with error tracking
export function useSafeAsync() {
  const capture = useErrorCapture();

  return useCallback(async (operation, options = {}) => {
    try {
      return await operation();
    } catch (error) {
      capture(error, options.category, options.extra);

      if (options.rethrow) {
        throw error;
      }

      return options.fallback;
    }
  }, [capture]);
}

// ============================================================
// FEEDBACK
// ============================================================

export function showFeedbackDialog() {
  if (!initialized) return;
  Sentry.showReportDialog();
}

// ============================================================
// EXPORTS
// ============================================================

export default {
  init,
  setUser,
  clearUser,
  setContext,
  setTag,
  setTags,
  setAppState,
  addBreadcrumb,
  trackNavigation,
  trackUserAction,
  trackApiCall,
  trackUIInteraction,
  captureException,
  captureMessage,
  errors,
  SentryErrorBoundary,
  withErrorBoundary,
  startTransaction,
  measureRender,
  measureAsync,
  useScreenTracking,
  useErrorCapture,
  useSafeAsync,
  showFeedbackDialog,
  ErrorLevel,
  ErrorCategory,
};
