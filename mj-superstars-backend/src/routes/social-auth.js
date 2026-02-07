// ============================================================
// Social Authentication Routes
// Sign in with Apple, Google, X (Twitter), Instagram
// ============================================================

import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query, transaction } from '../database/db.js';
import {
  generateAccessToken,
  generateRefreshToken,
  authenticate
} from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

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
// Helper: Find or create user from social provider
// ============================================================
const findOrCreateSocialUser = async (provider, providerData) => {
  const { provider_user_id, email, name, avatar_url, profile_data, access_token, refresh_token, token_expires_at, scopes } = providerData;

  return await transaction(async (client) => {
    // 1. Check if this social account already exists
    const existingSocial = await client.query(
      `SELECT sa.*, u.id as user_id, u.email, u.display_name, u.is_premium
       FROM user_social_accounts sa
       JOIN users u ON sa.user_id = u.id
       WHERE sa.provider = $1 AND sa.provider_user_id = $2`,
      [provider, provider_user_id]
    );

    if (existingSocial.rows.length > 0) {
      // Existing social login — update tokens and return user
      const social = existingSocial.rows[0];
      await client.query(
        `UPDATE user_social_accounts
         SET access_token = $1, refresh_token = $2, token_expires_at = $3,
             provider_name = $4, provider_avatar_url = $5, provider_profile_data = $6,
             updated_at = NOW()
         WHERE id = $7`,
        [access_token, refresh_token, token_expires_at, name, avatar_url, JSON.stringify(profile_data || {}), social.id]
      );

      return {
        user: { id: social.user_id, email: social.email, display_name: social.display_name, is_premium: social.is_premium },
        isNewUser: false
      };
    }

    // 2. Check if user exists by email (link account)
    let user;
    if (email) {
      const existingUser = await client.query(
        'SELECT id, email, display_name, is_premium FROM users WHERE email = $1',
        [email]
      );
      if (existingUser.rows.length > 0) {
        user = existingUser.rows[0];
      }
    }

    // 3. Create new user if not found
    let isNewUser = false;
    if (!user) {
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, display_name, avatar_url, auth_provider)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, display_name, is_premium`,
        [
          email || `${provider}_${provider_user_id}@social.mjsuperstars.com`,
          crypto.randomBytes(32).toString('hex'), // Random password (social-only users)
          name || 'Superstar',
          avatar_url,
          provider
        ]
      );
      user = userResult.rows[0];
      isNewUser = true;

      // Initialize personalization for new user
      await client.query(
        'INSERT INTO user_personalization (user_id, preferred_name) VALUES ($1, $2)',
        [user.id, name]
      );

      // Initialize streaks
      const streakTypes = ['check_in', 'morning_ritual', 'evening_reflection', 'task_completion'];
      for (const type of streakTypes) {
        await client.query(
          'INSERT INTO user_streaks (user_id, streak_type) VALUES ($1, $2)',
          [user.id, type]
        );
      }
    }

    // 4. Link social account to user
    await client.query(
      `INSERT INTO user_social_accounts
       (user_id, provider, provider_user_id, provider_email, provider_name,
        provider_avatar_url, provider_profile_data, access_token, refresh_token,
        token_expires_at, scopes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (provider, provider_user_id)
       DO UPDATE SET access_token = $8, refresh_token = $9, token_expires_at = $10, updated_at = NOW()`,
      [user.id, provider, provider_user_id, email, name, avatar_url,
       JSON.stringify(profile_data || {}), access_token, refresh_token, token_expires_at, scopes]
    );

    // Update user avatar if they don't have one
    if (avatar_url) {
      await client.query(
        'UPDATE users SET avatar_url = COALESCE(avatar_url, $1) WHERE id = $2',
        [avatar_url, user.id]
      );
    }

    return { user, isNewUser };
  });
};

// ============================================================
// Helper: Generate tokens and create session
// ============================================================
const createAuthSession = async (user, req) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await query(
    `INSERT INTO user_sessions (user_id, refresh_token_hash, device_info, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
    [user.id, tokenHash, req.body.device_info || {}, req.ip]
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 900
  };
};

// ============================================================
// POST /api/social-auth/apple - Sign in with Apple
// ============================================================
router.post('/apple',
  [
    body('id_token').notEmpty().withMessage('Apple ID token required'),
    body('authorization_code').optional(),
    body('user').optional() // Apple sends user info only on first login
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id_token, authorization_code, user: appleUser } = req.body;

    // Decode Apple's id_token (JWT)
    // In production, verify against Apple's public keys
    const decoded = jwt.decode(id_token);
    if (!decoded || !decoded.sub) {
      throw new APIError('Invalid Apple ID token', 401, 'INVALID_TOKEN');
    }

    const providerData = {
      provider_user_id: decoded.sub,
      email: decoded.email || appleUser?.email,
      name: appleUser?.name ? `${appleUser.name.firstName || ''} ${appleUser.name.lastName || ''}`.trim() : null,
      avatar_url: null, // Apple doesn't provide avatars
      profile_data: {
        email_verified: decoded.email_verified,
        is_private_email: decoded.is_private_email,
        real_user_status: decoded.real_user_status
      },
      access_token: authorization_code,
      refresh_token: null,
      token_expires_at: decoded.exp ? new Date(decoded.exp * 1000) : null,
      scopes: 'email,name'
    };

    const { user, isNewUser } = await findOrCreateSocialUser('apple', providerData);
    const tokens = await createAuthSession(user, req);

    logger.info(`Apple sign-in: ${isNewUser ? 'new' : 'returning'} user`, { userId: user.id });

    res.status(isNewUser ? 201 : 200).json({
      message: isNewUser ? 'Account created with Apple' : 'Signed in with Apple',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_premium: user.is_premium
      },
      tokens,
      is_new_user: isNewUser
    });
  })
);

// ============================================================
// POST /api/social-auth/google - Sign in with Google
// ============================================================
router.post('/google',
  [
    body('id_token').notEmpty().withMessage('Google ID token required'),
    body('access_token').optional()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { id_token, access_token: googleAccessToken } = req.body;

    // Decode Google's id_token
    // In production, verify with Google's public keys
    const decoded = jwt.decode(id_token);
    if (!decoded || !decoded.sub) {
      throw new APIError('Invalid Google ID token', 401, 'INVALID_TOKEN');
    }

    const providerData = {
      provider_user_id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      avatar_url: decoded.picture,
      profile_data: {
        email_verified: decoded.email_verified,
        locale: decoded.locale,
        hd: decoded.hd // Hosted domain (Google Workspace)
      },
      access_token: googleAccessToken,
      refresh_token: null,
      token_expires_at: decoded.exp ? new Date(decoded.exp * 1000) : null,
      scopes: 'email,profile'
    };

    const { user, isNewUser } = await findOrCreateSocialUser('google', providerData);
    const tokens = await createAuthSession(user, req);

    logger.info(`Google sign-in: ${isNewUser ? 'new' : 'returning'} user`, { userId: user.id });

    res.status(isNewUser ? 201 : 200).json({
      message: isNewUser ? 'Account created with Google' : 'Signed in with Google',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_premium: user.is_premium
      },
      tokens,
      is_new_user: isNewUser
    });
  })
);

// ============================================================
// POST /api/social-auth/x - Sign in with X (Twitter)
// ============================================================
router.post('/x',
  [
    body('oauth_token').notEmpty(),
    body('oauth_token_secret').notEmpty(),
    body('user_id').notEmpty(),
    body('screen_name').optional(),
    body('name').optional(),
    body('profile_image_url').optional()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { oauth_token, oauth_token_secret, user_id: xUserId, screen_name, name, profile_image_url } = req.body;

    const providerData = {
      provider_user_id: xUserId,
      email: null, // X doesn't always provide email
      name: name || screen_name,
      avatar_url: profile_image_url ? profile_image_url.replace('_normal', '_400x400') : null,
      profile_data: {
        screen_name,
        profile_url: `https://x.com/${screen_name}`
      },
      access_token: oauth_token,
      refresh_token: oauth_token_secret,
      token_expires_at: null,
      scopes: 'read'
    };

    const { user, isNewUser } = await findOrCreateSocialUser('x', providerData);
    const tokens = await createAuthSession(user, req);

    logger.info(`X sign-in: ${isNewUser ? 'new' : 'returning'} user`, { userId: user.id });

    res.status(isNewUser ? 201 : 200).json({
      message: isNewUser ? 'Account created with X' : 'Signed in with X',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_premium: user.is_premium
      },
      tokens,
      is_new_user: isNewUser
    });
  })
);

// ============================================================
// POST /api/social-auth/instagram - Sign in with Instagram
// ============================================================
router.post('/instagram',
  [
    body('access_token').notEmpty(),
    body('user_id').notEmpty(),
    body('username').optional(),
    body('name').optional(),
    body('profile_picture_url').optional()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { access_token: igToken, user_id: igUserId, username, name, profile_picture_url } = req.body;

    const providerData = {
      provider_user_id: igUserId,
      email: null, // Instagram doesn't provide email
      name: name || username,
      avatar_url: profile_picture_url,
      profile_data: {
        username,
        profile_url: `https://instagram.com/${username}`
      },
      access_token: igToken,
      refresh_token: null,
      token_expires_at: null,
      scopes: 'basic'
    };

    const { user, isNewUser } = await findOrCreateSocialUser('instagram', providerData);
    const tokens = await createAuthSession(user, req);

    logger.info(`Instagram sign-in: ${isNewUser ? 'new' : 'returning'} user`, { userId: user.id });

    res.status(isNewUser ? 201 : 200).json({
      message: isNewUser ? 'Account created with Instagram' : 'Signed in with Instagram',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_premium: user.is_premium
      },
      tokens,
      is_new_user: isNewUser
    });
  })
);

// ============================================================
// GET /api/social-auth/accounts - List linked social accounts
// ============================================================
router.get('/accounts',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT provider, provider_email, provider_name, provider_avatar_url,
              created_at, updated_at
       FROM user_social_accounts
       WHERE user_id = $1
       ORDER BY created_at`,
      [req.user.id]
    );

    res.json({
      linked_accounts: result.rows.map(row => ({
        provider: row.provider,
        email: row.provider_email,
        name: row.provider_name,
        avatar: row.provider_avatar_url,
        linked_at: row.created_at
      }))
    });
  })
);

// ============================================================
// DELETE /api/social-auth/accounts/:provider - Unlink social account
// ============================================================
router.delete('/accounts/:provider',
  authenticate,
  asyncHandler(async (req, res) => {
    const { provider } = req.params;

    // Make sure user has another way to login (email/password or another social)
    const userResult = await query(
      'SELECT password_hash, auth_provider FROM users WHERE id = $1',
      [req.user.id]
    );

    const socialCount = await query(
      'SELECT COUNT(*) FROM user_social_accounts WHERE user_id = $1',
      [req.user.id]
    );

    const hasPassword = userResult.rows[0].auth_provider === 'email';
    const otherSocials = parseInt(socialCount.rows[0].count) > 1;

    if (!hasPassword && !otherSocials) {
      throw new APIError(
        'Cannot unlink your only sign-in method. Set a password first or link another account.',
        400,
        'CANNOT_UNLINK_ONLY_AUTH'
      );
    }

    await query(
      'DELETE FROM user_social_accounts WHERE user_id = $1 AND provider = $2',
      [req.user.id, provider]
    );

    res.json({ success: true, message: `${provider} account unlinked successfully` });
  })
);

export default router;
