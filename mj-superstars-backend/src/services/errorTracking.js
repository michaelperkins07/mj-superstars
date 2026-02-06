// ============================================================
// MJ's Superstars - Error Tracking Service (Sentry)
// Production crash reporting and performance monitoring
// ============================================================

// Dynamic imports - Sentry packages are optional
// App runs fine without them (all functions check `initialized` flag)
let Sentry = null;
let ProfilingIntegration = null;

// ============================================================
// CONFIGURATION
// ============================================================

const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const RELEASE = process.env.APP_VERSION || '1.0.0';

// Error levels
const ErrorLevel = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  DEBUG: 'debug'
};

// Error categories for filtering
const ErrorCategory = {
  AUTH: 'authentication',
  DATABASE: 'database',
  AI: 'ai_service',
  PAYMENT: 'payment',
  NOTIFICATION: 'notification',
  VALIDATION: 'validation',
  RATE_LIMIT: 'rate_limit',
  UNKNOWN: 'unknown'
};

// ============================================================
// INITIALIZATION
// ============================================================

let initialized = false;

async function init() {
  if (!SENTRY_DSN) {
    console.log('⚠️  Sentry DSN not configured - error tracking disabled');
    return false;
  }

  if (initialized) {
    return true;
  }

  // Dynamically import Sentry packages (only when DSN is configured)
  try {
    const sentryModule = await import('@sentry/node');
    Sentry = sentryModule;
    try {
      const profilingModule = await import('@sentry/profiling-node');
      ProfilingIntegration = profilingModule.ProfilingIntegration;
    } catch {
      console.log('⚠️  @sentry/profiling-node not available - profiling disabled');
    }
  } catch {
    console.log('⚠️  @sentry/node not installed - error tracking disabled');
    return false;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `mj-superstars-backend@${RELEASE}`,

    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.2 : 1.0,
    profilesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,

    // Integrations
    integrations: [
      // HTTP request tracking
      ...(Sentry.Integrations?.Http ? [new Sentry.Integrations.Http({ tracing: true })] : []),
      // Express middleware (auto-instrumented)
      ...(Sentry.Integrations?.Express ? [new Sentry.Integrations.Express()] : []),
      // Profiling for performance
      ...(ProfilingIntegration ? [new ProfilingIntegration()] : []),
      // PostgreSQL tracking
      ...(Sentry.Integrations?.Postgres ? [new Sentry.Integrations.Postgres()] : []),
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers['x-api-key'];
      }

      // Remove sensitive data from request body
      if (event.request?.data) {
        const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
        sensitiveFields.forEach(field => {
          if (event.request.data[field]) {
            event.request.data[field] = '[REDACTED]';
          }
        });
      }

      // Don't send expected errors (like 404s, validation errors)
      const error = hint.originalException;
      if (error?.statusCode >= 400 && error?.statusCode < 500) {
        // Only send client errors if they're unusual
        if (error.statusCode !== 401 && error.statusCode !== 404) {
          return event;
        }
        return null;
      }

      return event;
    },

    // Filter breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Don't log health check requests
      if (breadcrumb.data?.url?.includes('/health')) {
        return null;
      }
      return breadcrumb;
    },

    // Ignore common non-actionable errors
    ignoreErrors: [
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'Request aborted',
      'Network request failed',
    ],
  });

  initialized = true;
  console.log('✅ Sentry error tracking initialized');
  return true;
}

// ============================================================
// EXPRESS MIDDLEWARE
// ============================================================

// Request handler - must be first middleware
export function sentryRequestHandler() {
  if (!initialized) return (req, res, next) => next();
  return Sentry.Handlers.requestHandler({
    user: ['id', 'email'],
    ip: true,
    request: ['headers', 'method', 'url', 'query_string'],
  });
}

// Tracing handler - after request handler
export function sentryTracingHandler() {
  if (!initialized) return (req, res, next) => next();
  return Sentry.Handlers.tracingHandler();
}

// Error handler - must be after all routes
export function sentryErrorHandler() {
  if (!initialized) return (err, req, res, next) => next(err);
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Only report 500+ errors to Sentry
      return !error.statusCode || error.statusCode >= 500;
    },
  });
}

// ============================================================
// USER CONTEXT
// ============================================================

function setUser(user) {
  if (!initialized || !user) return;

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
    subscription: user.subscription_status,
  });
}

function clearUser() {
  if (!initialized) return;
  Sentry.setUser(null);
}

// ============================================================
// CUSTOM CONTEXT
// ============================================================

function setContext(name, data) {
  if (!initialized) return;
  Sentry.setContext(name, data);
}

function setTag(key, value) {
  if (!initialized) return;
  Sentry.setTag(key, value);
}

function setTags(tags) {
  if (!initialized) return;
  Sentry.setTags(tags);
}

// ============================================================
// BREADCRUMBS
// ============================================================

function addBreadcrumb(message, category = 'custom', data = {}, level = 'info') {
  if (!initialized) return;

  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

// Specific breadcrumb helpers
const breadcrumbs = {
  userAction(action, data = {}) {
    addBreadcrumb(action, 'user', data, 'info');
  },

  apiCall(method, endpoint, data = {}) {
    addBreadcrumb(`${method} ${endpoint}`, 'api', data, 'info');
  },

  dbQuery(operation, table, data = {}) {
    addBreadcrumb(`${operation} ${table}`, 'database', data, 'debug');
  },

  aiRequest(model, data = {}) {
    addBreadcrumb(`AI request: ${model}`, 'ai', data, 'info');
  },

  subscription(action, data = {}) {
    addBreadcrumb(`Subscription: ${action}`, 'payment', data, 'info');
  },

  notification(type, data = {}) {
    addBreadcrumb(`Notification: ${type}`, 'notification', data, 'info');
  },
};

// ============================================================
// ERROR CAPTURE
// ============================================================

function captureException(error, context = {}) {
  if (!initialized) {
    console.error('Uncaptured error:', error);
    return null;
  }

  return Sentry.captureException(error, {
    tags: context.tags || {},
    extra: context.extra || {},
    level: context.level || ErrorLevel.ERROR,
    contexts: context.contexts || {},
  });
}

function captureMessage(message, level = ErrorLevel.INFO, context = {}) {
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

// Categorized error capture
function captureError(error, category = ErrorCategory.UNKNOWN, extra = {}) {
  return captureException(error, {
    tags: { category },
    extra,
  });
}

// ============================================================
// PERFORMANCE MONITORING
// ============================================================

function startTransaction(name, op = 'custom') {
  if (!initialized) return null;

  return Sentry.startTransaction({
    name,
    op,
  });
}

function startSpan(transaction, description, op = 'custom') {
  if (!transaction) return null;

  return transaction.startChild({
    description,
    op,
  });
}

// Measure async operation
async function measureAsync(name, operation, tags = {}) {
  if (!initialized) {
    return operation();
  }

  const transaction = startTransaction(name, 'measure');

  try {
    const result = await operation();
    transaction?.setStatus('ok');
    return result;
  } catch (error) {
    transaction?.setStatus('internal_error');
    captureException(error, { tags });
    throw error;
  } finally {
    transaction?.finish();
  }
}

// ============================================================
// SPECIFIC ERROR HANDLERS
// ============================================================

const errors = {
  // Authentication errors
  authError(error, userId = null) {
    return captureError(error, ErrorCategory.AUTH, { userId });
  },

  // Database errors
  dbError(error, query = null, params = null) {
    return captureError(error, ErrorCategory.DATABASE, {
      query: query?.substring(0, 200),
      paramCount: params?.length,
    });
  },

  // AI/Claude errors
  aiError(error, prompt = null, model = null) {
    return captureError(error, ErrorCategory.AI, {
      promptLength: prompt?.length,
      model,
    });
  },

  // Payment/subscription errors
  paymentError(error, productId = null, transactionId = null) {
    return captureError(error, ErrorCategory.PAYMENT, {
      productId,
      transactionId,
    });
  },

  // Notification errors
  notificationError(error, type = null, userId = null) {
    return captureError(error, ErrorCategory.NOTIFICATION, {
      type,
      userId,
    });
  },

  // Validation errors (usually don't need to track)
  validationError(error, field = null) {
    // Only track if it's a systemic issue
    if (error.isSystemic) {
      return captureError(error, ErrorCategory.VALIDATION, { field });
    }
    return null;
  },

  // Rate limit exceeded
  rateLimitError(userId, endpoint) {
    return captureMessage('Rate limit exceeded', ErrorLevel.WARNING, {
      tags: { category: ErrorCategory.RATE_LIMIT },
      extra: { userId, endpoint },
    });
  },
};

// ============================================================
// ALERTING HELPERS
// ============================================================

function alertCritical(message, data = {}) {
  return captureMessage(message, ErrorLevel.FATAL, {
    tags: { alert: 'critical' },
    extra: data,
  });
}

function alertWarning(message, data = {}) {
  return captureMessage(message, ErrorLevel.WARNING, {
    tags: { alert: 'warning' },
    extra: data,
  });
}

// ============================================================
// HEALTH CHECK
// ============================================================

function isHealthy() {
  return initialized;
}

function getStatus() {
  return {
    initialized,
    dsn: SENTRY_DSN ? 'configured' : 'not configured',
    environment: ENVIRONMENT,
    release: RELEASE,
  };
}

// ============================================================
// FLUSH (for graceful shutdown)
// ============================================================

async function flush(timeout = 2000) {
  if (!initialized) return;
  await Sentry.flush(timeout);
}

async function close(timeout = 2000) {
  if (!initialized) return;
  await Sentry.close(timeout);
}

// ============================================================
// EXPORTS
// ============================================================

// Named exports
export {
  init,
  isHealthy,
  getStatus,
  flush,
  close,
  setUser,
  clearUser,
  setContext,
  setTag,
  setTags,
  addBreadcrumb,
  breadcrumbs,
  captureException,
  captureMessage,
  captureError,
  errors,
  alertCritical,
  alertWarning,
  startTransaction,
  startSpan,
  measureAsync,
  ErrorLevel,
  ErrorCategory,
};

// Default export with all functions
export default {
  init,
  isHealthy,
  getStatus,
  flush,
  close,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  setUser,
  clearUser,
  setContext,
  setTag,
  setTags,
  addBreadcrumb,
  breadcrumbs,
  captureException,
  captureMessage,
  captureError,
  errors,
  alertCritical,
  alertWarning,
  startTransaction,
  startSpan,
  measureAsync,
  ErrorLevel,
  ErrorCategory,
};
