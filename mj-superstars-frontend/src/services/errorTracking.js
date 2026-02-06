// ============================================================
// MJ's Superstars - Frontend Error Tracking (Sentry)
// React crash reporting and performance monitoring
// Gracefully handles missing @sentry/react package
// ============================================================

import React, { useEffect, useCallback } from 'react';

// ============================================================
// SENTRY LOADER - Try to load, fallback to stubs
// ============================================================

let Sentry = null;
let BrowserTracing = null;

try {
  Sentry = require('@sentry/react');
  try {
    const tracing = require('@sentry/tracing');
    BrowserTracing = tracing.BrowserTracing;
  } catch (e) {
    // @sentry/tracing not available
  }
} catch (e) {
  // @sentry/react not installed - all functions will be stubs
  console.log('⚠️  @sentry/react not installed - error tracking disabled');
}

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
  if (!Sentry || !SENTRY_DSN) {
    console.log('⚠️  Sentry DSN not configured - error tracking disabled');
    return false;
  }

  if (initialized) {
    return true;
  }

  const integrations = [];

  if (BrowserTracing) {
    integrations.push(new BrowserTracing({
      tracingOrigins: ['localhost', 'mj-superstars.onrender.com', /^\//],
    }));
  }

  if (Sentry.Replay) {
    try {
      integrations.push(new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }));
    } catch (e) {
      // Replay not available
    }
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `mj-superstars-frontend@${RELEASE}`,
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.2 : 1.0,
    integrations,
    replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,

    beforeSend(event, hint) {
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(crumb => {
          if (crumb.data?.password) crumb.data.password = '[REDACTED]';
          if (crumb.data?.token) crumb.data.token = '[REDACTED]';
          return crumb;
        });
      }

      const error = hint.originalException;
      if (error?.message) {
        if (error.message.includes('Network request failed')) return null;
        if (error.message.includes('User cancelled')) return null;
      }
      return event;
    },

    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Non-Error promise rejection',
      'Loading chunk',
      'ChunkLoadError',
      /^cancelled$/i,
    ],

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
  if (!initialized || !Sentry || !user) return;
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
    subscription: user.subscription_status || 'free',
  });
}

export function clearUser() {
  if (!initialized || !Sentry) return;
  Sentry.setUser(null);
}

// ============================================================
// CONTEXT & TAGS
// ============================================================

export function setContext(name, data) {
  if (!initialized || !Sentry) return;
  Sentry.setContext(name, data);
}

export function setTag(key, value) {
  if (!initialized || !Sentry) return;
  Sentry.setTag(key, value);
}

export function setTags(tags) {
  if (!initialized || !Sentry) return;
  Sentry.setTags(tags);
}

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
  if (!initialized || !Sentry) return;
  Sentry.addBreadcrumb({ message, category, data, level, timestamp: Date.now() / 1000 });
}

export function trackNavigation(from, to) {
  addBreadcrumb(`Navigate: ${from} → ${to}`, 'navigation', { from, to });
}

export function trackUserAction(action, data = {}) {
  addBreadcrumb(action, 'user', data);
}

export function trackApiCall(method, endpoint, status) {
  addBreadcrumb(`${method} ${endpoint}`, 'api', { status });
}

export function trackUIInteraction(component, action, data = {}) {
  addBreadcrumb(`${component}: ${action}`, 'ui', data);
}

// ============================================================
// ERROR CAPTURE
// ============================================================

export function captureException(error, context = {}) {
  if (!initialized || !Sentry) {
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
  if (!initialized || !Sentry) {
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
  uiError(error, componentName = null) {
    return captureException(error, { tags: { category: ErrorCategory.UI }, extra: { componentName } });
  },
  networkError(error, endpoint = null, method = null) {
    return captureException(error, { tags: { category: ErrorCategory.NETWORK }, extra: { endpoint, method } });
  },
  authError(error, action = null) {
    return captureException(error, { tags: { category: ErrorCategory.AUTH }, extra: { action } });
  },
  chatError(error, messageLength = null) {
    return captureException(error, { tags: { category: ErrorCategory.CHAT }, extra: { messageLength } });
  },
  moodError(error, moodValue = null) {
    return captureException(error, { tags: { category: ErrorCategory.MOOD }, extra: { moodValue } });
  },
  subscriptionError(error, productId = null) {
    return captureException(error, { tags: { category: ErrorCategory.SUBSCRIPTION }, extra: { productId } });
  },
  storageError(error, operation = null) {
    return captureException(error, { tags: { category: ErrorCategory.STORAGE }, extra: { operation } });
  },
  nativeError(error, plugin = null) {
    return captureException(error, { tags: { category: ErrorCategory.NATIVE }, extra: { plugin } });
  },
};

// ============================================================
// REACT ERROR BOUNDARY
// ============================================================

// Stub ErrorBoundary that works without Sentry
class FallbackErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p>Something went wrong.</p>
          <button onClick={() => this.setState({ hasError: false })}>Try Again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const SentryErrorBoundary = (Sentry && Sentry.ErrorBoundary) ? Sentry.ErrorBoundary : FallbackErrorBoundary;

export function withErrorBoundary(Component, options = {}) {
  if (Sentry && Sentry.withErrorBoundary) {
    return Sentry.withErrorBoundary(Component, {
      fallback: options.fallback || <ErrorFallback />,
      showDialog: options.showDialog || false,
      onError: (error) => errors.uiError(error, options.componentName),
    });
  }
  // Fallback: return component as-is
  return Component;
}

function ErrorFallback({ error, resetError }) {
  return (
    <div style={{ padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>😔</div>
      <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#1F2937' }}>Something went wrong</h2>
      <p style={{ color: '#6B7280', marginBottom: '16px', fontSize: '14px' }}>We've been notified and are working on a fix.</p>
      {resetError && (
        <button onClick={resetError} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#7C3AED', color: 'white', cursor: 'pointer', fontSize: '14px' }}>
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
  if (!initialized || !Sentry) return null;
  return Sentry.startTransaction({ name, op });
}

export function measureRender(componentName) {
  const transaction = startTransaction(`render.${componentName}`, 'ui.render');
  return () => transaction?.finish();
}

export async function measureAsync(name, operation) {
  if (!initialized || !Sentry) return operation();
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

export function useScreenTracking(screenName) {
  useEffect(() => {
    if (!initialized) return;
    setTag('screen', screenName);
    addBreadcrumb(`View: ${screenName}`, 'navigation');
    return () => setTag('screen', null);
  }, [screenName]);
}

export function useErrorCapture() {
  return useCallback((error, category = ErrorCategory.UNKNOWN, extra = {}) => {
    return captureException(error, { tags: { category }, extra });
  }, []);
}

export function useSafeAsync() {
  const capture = useErrorCapture();
  return useCallback(async (operation, options = {}) => {
    try {
      return await operation();
    } catch (error) {
      capture(error, options.category, options.extra);
      if (options.rethrow) throw error;
      return options.fallback;
    }
  }, [capture]);
}

// ============================================================
// FEEDBACK
// ============================================================

export function showFeedbackDialog() {
  if (!initialized || !Sentry) return;
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
