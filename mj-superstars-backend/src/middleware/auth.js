// ============================================================
// Authentication Middleware
// ============================================================

import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import { logger } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

// Generate access token
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      is_premium: user.is_premium
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Generate refresh token
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization required',
        code: 'MISSING_TOKEN'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Get user from database
    const result = await query(
      'SELECT id, email, display_name, is_premium, is_active FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Update last active
    query(
      'UPDATE users SET last_active_at = NOW() WHERE id = $1',
      [user.id]
    ).catch(err => logger.error('Failed to update last_active_at:', err));

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (decoded) {
      const result = await query(
        'SELECT id, email, display_name, is_premium, is_active FROM users WHERE id = $1 AND deleted_at IS NULL',
        [decoded.id]
      );

      if (result.rows.length > 0 && result.rows[0].is_active) {
        req.user = result.rows[0];
      }
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Alias for route compatibility (some routes import authenticateToken)
export const authenticateToken = authenticate;

// Admin check (email-based until admin roles are in DB)
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'michaelperkins07@gmail.com').split(',').map(e => e.trim().toLowerCase());

export const requireAdmin = (req, res, next) => {
  if (!req.user || !ADMIN_EMAILS.includes(req.user.email?.toLowerCase())) {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

// Premium user check
export const requirePremium = (req, res, next) => {
  if (!req.user.is_premium) {
    return res.status(403).json({
      error: 'Premium subscription required',
      code: 'PREMIUM_REQUIRED'
    });
  }
  next();
};

// Socket authentication
export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token ||
                  socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Invalid token'));
    }

    const result = await query(
      'SELECT id, email, display_name, is_premium FROM users WHERE id = $1 AND is_active = true AND deleted_at IS NULL',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return next(new Error('User not found'));
    }

    socket.user = result.rows[0];
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

export default {
  authenticate,
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requirePremium,
  authenticateSocket,
  generateAccessToken,
  generateRefreshToken,
  verifyToken
};
