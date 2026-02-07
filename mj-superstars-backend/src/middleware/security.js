// ============================================================
// MJ's Superstars - Security Middleware & Utilities
// Input validation, rate limiting, and security hardening
// ============================================================

import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import xss from 'xss';

// ============================================================
// HELMET SECURITY HEADERS
// ============================================================

const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.anthropic.com", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});

// ============================================================
// RATE LIMITING
// ============================================================

// General API rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: 15 * 60
  },
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  }
});

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 60 * 60
  },
  skipSuccessfulRequests: true
});

// AI endpoint rate limit (more expensive)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'AI rate limit reached, please wait a moment.',
    retryAfter: 60
  }
});

// ============================================================
// INPUT SANITIZATION
// ============================================================

/**
 * Sanitize string input
 */
function sanitizeString(input, maxLength = 10000) {
  if (typeof input !== 'string') return '';

  // Remove XSS
  let sanitized = xss(input, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });

  // Trim and limit length
  sanitized = sanitized.trim().substring(0, maxLength);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
}

/**
 * Sanitize email
 */
function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';

  const sanitized = email.toLowerCase().trim().substring(0, 255);

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize integer
 */
function sanitizeInt(input, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const num = parseInt(input, 10);
  if (isNaN(num)) return min;
  return Math.max(min, Math.min(max, num));
}

/**
 * Sanitize UUID
 */
function sanitizeUUID(input) {
  if (typeof input !== 'string') return null;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const sanitized = input.trim().toLowerCase();

  return uuidRegex.test(sanitized) ? sanitized : null;
}

/**
 * Middleware to sanitize request body
 */
function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj, depth = 0) {
  if (depth > 10) return {}; // Prevent deep recursion

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    // Sanitize key
    const safeKey = sanitizeString(key, 100);
    if (!safeKey) continue;

    // Sanitize value based on type
    if (typeof value === 'string') {
      sanitized[safeKey] = sanitizeString(value);
    } else if (typeof value === 'number') {
      sanitized[safeKey] = isFinite(value) ? value : 0;
    } else if (typeof value === 'boolean') {
      sanitized[safeKey] = value;
    } else if (Array.isArray(value)) {
      sanitized[safeKey] = value.slice(0, 100).map(v =>
        typeof v === 'object' ? sanitizeObject(v, depth + 1) : sanitizeString(String(v))
      );
    } else if (value && typeof value === 'object') {
      sanitized[safeKey] = sanitizeObject(value, depth + 1);
    }
  }

  return sanitized;
}

// ============================================================
// ENCRYPTION UTILITIES
// ============================================================

const ENCRYPTION_KEY = (() => {
  if (process.env.ENCRYPTION_KEY) return process.env.ENCRYPTION_KEY;
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ ENCRYPTION_KEY is required in production — encrypted data will be inconsistent without it');
  }
  return crypto.randomBytes(32).toString('hex');
})();
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt sensitive data
 */
function encrypt(text) {
  if (!text) return null;

  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    data: encrypted,
    tag: authTag.toString('hex')
  };
}

/**
 * Decrypt sensitive data
 */
function decrypt(encrypted) {
  if (!encrypted || !encrypted.iv || !encrypted.data || !encrypted.tag) {
    return null;
  }

  try {
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.tag, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    return null;
  }
}

/**
 * Hash sensitive data (one-way)
 */
function hash(text, salt = '') {
  return crypto
    .createHash('sha256')
    .update(text + salt)
    .digest('hex');
}

/**
 * Generate secure random token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// ============================================================
// PASSWORD SECURITY
// ============================================================

/**
 * Validate password strength
 */
function validatePassword(password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }

  // Check for common passwords
  const commonPasswords = ['password', '12345678', 'qwerty123', 'letmein'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================
// JWT SECURITY
// ============================================================

const JWT_BLACKLIST = new Set();

/**
 * Add token to blacklist (on logout)
 */
function blacklistToken(token) {
  JWT_BLACKLIST.add(token);

  // Auto-cleanup after 24 hours
  setTimeout(() => {
    JWT_BLACKLIST.delete(token);
  }, 24 * 60 * 60 * 1000);
}

/**
 * Check if token is blacklisted
 */
function isTokenBlacklisted(token) {
  return JWT_BLACKLIST.has(token);
}

/**
 * Middleware to check token blacklist
 */
function checkTokenBlacklist(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token && isTokenBlacklisted(token)) {
    return res.status(401).json({ error: 'Token has been revoked' });
  }

  next();
}

// ============================================================
// SENSITIVE DATA PROTECTION
// ============================================================

/**
 * Mask sensitive fields in logs
 */
function maskSensitiveData(obj) {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard', 'ssn'];
  const masked = { ...obj };

  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***MASKED***';
    }
  }

  return masked;
}

/**
 * Remove sensitive fields before sending response
 */
function stripSensitiveFields(user) {
  if (!user) return null;

  const { password, password_hash, reset_token, ...safeUser } = user;
  return safeUser;
}

// ============================================================
// REQUEST VALIDATION
// ============================================================

/**
 * Validate request has required fields
 */
function validateRequired(fields) {
  return (req, res, next) => {
    const missing = [];

    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing
      });
    }

    next();
  };
}

/**
 * Validate content type
 */
function validateContentType(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    const contentType = req.headers['content-type'];

    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        error: 'Content-Type must be application/json'
      });
    }
  }

  next();
}

// ============================================================
// CORS CONFIGURATION
// ============================================================

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://mjsuperstars.app',
      'capacitor://localhost',
      'ionic://localhost'
    ];

    // Allow requests with no origin (mobile apps, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  maxAge: 86400 // 24 hours
};

// ============================================================
// LOGGING MIDDLEWARE
// ============================================================

/**
 * Security audit logging
 */
function securityLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.headers['user-agent']
    };

    // Log security events
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.warn('[SECURITY] Unauthorized access attempt:', maskSensitiveData(logData));
    } else if (res.statusCode >= 400) {
      console.info('[REQUEST] Error response:', maskSensitiveData(logData));
    }
  });

  next();
}

// ============================================================
// EXPORTS
// ============================================================

export {
  // Helmet
  helmetConfig as helmet,

  // Rate limiting
  generalLimiter,
  authLimiter,
  aiLimiter,

  // Sanitization
  sanitizeString,
  sanitizeEmail,
  sanitizeInt,
  sanitizeUUID,
  sanitizeBody,
  sanitizeObject,

  // Encryption
  encrypt,
  decrypt,
  hash,
  generateSecureToken,

  // Password
  validatePassword,

  // JWT
  blacklistToken,
  isTokenBlacklisted,
  checkTokenBlacklist,

  // Data protection
  maskSensitiveData,
  stripSensitiveFields,

  // Validation
  validateRequired,
  validateContentType,

  // CORS
  corsOptions,

  // Logging
  securityLogger
};

export default {
  helmet: helmetConfig,
  generalLimiter,
  authLimiter,
  aiLimiter,
  sanitizeString,
  sanitizeEmail,
  sanitizeInt,
  sanitizeUUID,
  sanitizeBody,
  sanitizeObject,
  encrypt,
  decrypt,
  hash,
  generateSecureToken,
  validatePassword,
  blacklistToken,
  isTokenBlacklisted,
  checkTokenBlacklist,
  maskSensitiveData,
  stripSensitiveFields,
  validateRequired,
  validateContentType,
  corsOptions,
  securityLogger
};
