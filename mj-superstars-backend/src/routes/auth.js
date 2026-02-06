// ============================================================
// Authentication Routes
// ============================================================

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { query, transaction } from '../database/db.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authenticate
} from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }
  next();
};

// ============================================================
// POST /api/auth/register - Create new account
// ============================================================
router.post('/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('display_name').optional().trim().isLength({ max: 100 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password, display_name } = req.body;

    // Check if user exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new APIError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const result = await transaction(async (client) => {
      // Insert user
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, display_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name, is_premium, created_at`,
        [email, password_hash, display_name || null]
      );

      const user = userResult.rows[0];

      // Create initial personalization record
      await client.query(
        'INSERT INTO user_personalization (user_id) VALUES ($1)',
        [user.id]
      );

      // Initialize streaks
      const streakTypes = ['check_in', 'morning_ritual', 'evening_reflection', 'task_completion'];
      for (const type of streakTypes) {
        await client.query(
          'INSERT INTO user_streaks (user_id, streak_type) VALUES ($1, $2)',
          [user.id, type]
        );
      }

      return user;
    });

    // Generate tokens
    const accessToken = generateAccessToken(result);
    const refreshToken = generateRefreshToken(result);

    // Store refresh token
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, device_info, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [result.id, tokenHash, req.body.device_info || {}, req.ip]
    );

    logger.info('New user registered:', { userId: result.id, email });

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: result.id,
        email: result.email,
        display_name: result.display_name,
        is_premium: result.is_premium
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900 // 15 minutes
      }
    });
  })
);

// ============================================================
// POST /api/auth/login - Login
// ============================================================
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Get user
    const result = await query(
      `SELECT id, email, password_hash, display_name, is_premium, is_active
       FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new APIError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new APIError('Account deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new APIError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await query(
      `INSERT INTO user_sessions (user_id, refresh_token_hash, device_info, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [user.id, tokenHash, req.body.device_info || {}, req.ip]
    );

    // Update last active
    await query('UPDATE users SET last_active_at = NOW() WHERE id = $1', [user.id]);

    logger.info('User logged in:', { userId: user.id });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_premium: user.is_premium
      },
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900
      }
    });
  })
);

// ============================================================
// POST /api/auth/refresh - Refresh access token
// ============================================================
router.post('/refresh',
  [body('refresh_token').notEmpty()],
  validate,
  asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;

    // Verify refresh token
    const decoded = verifyToken(refresh_token);
    if (!decoded || decoded.type !== 'refresh') {
      throw new APIError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    // Check if token exists in database
    const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
    const sessionResult = await query(
      `SELECT s.id, s.user_id, u.email, u.display_name, u.is_premium, u.is_active
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.refresh_token_hash = $1
       AND s.expires_at > NOW()
       AND s.revoked_at IS NULL
       AND u.deleted_at IS NULL`,
      [tokenHash]
    );

    if (sessionResult.rows.length === 0) {
      throw new APIError('Session expired or revoked', 401, 'SESSION_INVALID');
    }

    const session = sessionResult.rows[0];

    if (!session.is_active) {
      throw new APIError('Account deactivated', 403, 'ACCOUNT_DEACTIVATED');
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      id: session.user_id,
      email: session.email,
      is_premium: session.is_premium
    });

    res.json({
      access_token: accessToken,
      expires_in: 900
    });
  })
);

// ============================================================
// POST /api/auth/logout - Logout (revoke refresh token)
// ============================================================
router.post('/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const { refresh_token } = req.body;

    if (refresh_token) {
      const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
      await query(
        'UPDATE user_sessions SET revoked_at = NOW() WHERE refresh_token_hash = $1',
        [tokenHash]
      );
    }

    res.json({ message: 'Logged out successfully' });
  })
);

// ============================================================
// POST /api/auth/logout-all - Logout all devices
// ============================================================
router.post('/logout-all',
  authenticate,
  asyncHandler(async (req, res) => {
    await query(
      'UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
      [req.user.id]
    );

    res.json({ message: 'Logged out from all devices' });
  })
);

// ============================================================
// POST /api/auth/change-password
// ============================================================
router.post('/change-password',
  authenticate,
  [
    body('current_password').notEmpty(),
    body('new_password').isLength({ min: 8 })
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body;

    // Get current password hash
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const isValid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!isValid) {
      throw new APIError('Current password is incorrect', 401, 'INVALID_PASSWORD');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(new_password, salt);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, req.user.id]
    );

    // Revoke all sessions except current
    await query(
      `UPDATE user_sessions SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [req.user.id]
    );

    logger.info('Password changed:', { userId: req.user.id });

    res.json({ message: 'Password changed successfully. Please login again.' });
  })
);

export default router;
