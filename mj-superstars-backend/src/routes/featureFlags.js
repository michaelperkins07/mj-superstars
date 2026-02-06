// ============================================================
// MJ's Superstars - Feature Flags API Routes
// Endpoints for retrieving and managing feature flags
// ============================================================

import express from 'express';
import { authenticateToken, optionalAuth, requireAdmin } from '../middleware/auth.js';
import featureFlags from '../services/featureFlags.js';

const router = express.Router();

// ============================================================
// PUBLIC ROUTES
// ============================================================

/**
 * GET /api/flags
 * Get all feature flags for the current user
 * Works for both authenticated and anonymous users
 */
router.get('/', optionalAuth, (req, res) => {
  try {
    const user = req.user ? {
      id: req.user.id,
      isPremium: req.user.subscription_status === 'premium' ||
                 req.user.subscription_status === 'trial',
    } : null;

    const context = {
      environment: process.env.NODE_ENV || 'development',
      platform: req.headers['x-platform'] || 'web',
      appVersion: req.headers['x-app-version'],
    };

    const flags = featureFlags.getAllFlags(user, context);

    res.json({
      success: true,
      flags,
      meta: {
        userId: user?.id || null,
        isPremium: user?.isPremium || false,
        environment: context.environment,
      },
    });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feature flags',
    });
  }
});

/**
 * GET /api/flags/:key
 * Get a specific feature flag value
 */
router.get('/:key', optionalAuth, (req, res) => {
  try {
    const { key } = req.params;
    const flag = featureFlags.getFlag(key);

    if (!flag) {
      return res.status(404).json({
        success: false,
        error: `Feature flag not found: ${key}`,
      });
    }

    const user = req.user ? {
      id: req.user.id,
      isPremium: req.user.subscription_status === 'premium' ||
                 req.user.subscription_status === 'trial',
    } : null;

    const context = {
      environment: process.env.NODE_ENV || 'development',
    };

    const value = flag.type === 'boolean'
      ? featureFlags.isEnabled(key, user, context)
      : featureFlags.getFlagValue(key, user);

    res.json({
      success: true,
      key,
      value,
      type: flag.type,
    });
  } catch (error) {
    console.error('Error fetching feature flag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feature flag',
    });
  }
});

// ============================================================
// A/B TESTING ROUTES
// ============================================================

/**
 * GET /api/flags/experiment/:key
 * Get user's variant for an A/B experiment
 */
router.get('/experiment/:key', optionalAuth, (req, res) => {
  try {
    const { key } = req.params;
    const variants = req.query.variants?.split(',') || ['control', 'variant'];
    const percentage = parseInt(req.query.percentage) || 100;

    const userId = req.user?.id || req.headers['x-anonymous-id'];

    if (!userId) {
      return res.json({
        success: true,
        key,
        inExperiment: false,
        variant: variants[0],
        reason: 'no_user_id',
      });
    }

    const inExperiment = featureFlags.isInExperiment(key, userId, percentage);
    const variant = inExperiment
      ? featureFlags.getVariant(key, variants, userId)
      : variants[0];

    res.json({
      success: true,
      key,
      inExperiment,
      variant,
      variantIndex: variants.indexOf(variant),
    });
  } catch (error) {
    console.error('Error fetching experiment variant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch experiment variant',
    });
  }
});

// ============================================================
// ADMIN ROUTES (Protected)
// ============================================================

/**
 * GET /api/flags/admin/all
 * Get all flag metadata for admin panel
 */
router.get('/admin/all', authenticateToken, requireAdmin, (req, res) => {
  try {
    const metadata = featureFlags.getFlagMetadata();

    res.json({
      success: true,
      flags: metadata,
      count: metadata.length,
    });
  } catch (error) {
    console.error('Error fetching flag metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch flag metadata',
    });
  }
});

/**
 * POST /api/flags/admin/override
 * Set a global flag override
 */
router.post('/admin/override', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        error: 'Flag key is required',
      });
    }

    featureFlags.setOverride(key, value);

    res.json({
      success: true,
      message: `Override set for ${key}`,
      key,
      value,
    });
  } catch (error) {
    console.error('Error setting flag override:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to set flag override',
    });
  }
});

/**
 * DELETE /api/flags/admin/override/:key
 * Remove a global flag override
 */
router.delete('/admin/override/:key', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { key } = req.params;
    const removed = featureFlags.removeOverride(key);

    res.json({
      success: true,
      message: removed ? `Override removed for ${key}` : `No override found for ${key}`,
      key,
      removed,
    });
  } catch (error) {
    console.error('Error removing flag override:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove flag override',
    });
  }
});

/**
 * POST /api/flags/admin/user-override
 * Set a user-specific flag override
 */
router.post('/admin/user-override', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { userId, key, value } = req.body;

    if (!userId || !key) {
      return res.status(400).json({
        success: false,
        error: 'User ID and flag key are required',
      });
    }

    featureFlags.setUserOverride(userId, key, value);

    res.json({
      success: true,
      message: `User override set for ${key}`,
      userId,
      key,
      value,
    });
  } catch (error) {
    console.error('Error setting user flag override:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to set user flag override',
    });
  }
});

/**
 * DELETE /api/flags/admin/user-override/:userId/:key
 * Remove a user-specific flag override
 */
router.delete('/admin/user-override/:userId/:key', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { userId, key } = req.params;
    const removed = featureFlags.removeUserOverride(userId, key);

    res.json({
      success: true,
      message: removed ? `User override removed` : `No override found`,
      userId,
      key,
      removed,
    });
  } catch (error) {
    console.error('Error removing user flag override:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove user flag override',
    });
  }
});

/**
 * POST /api/flags/admin/kill-switch
 * Activate a kill switch
 */
router.post('/admin/kill-switch', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { feature, enable } = req.body;

    const killSwitchMap = {
      ai: 'kill_ai_chat',
      chat: 'kill_ai_chat',
      subscriptions: 'kill_subscriptions',
      payments: 'kill_subscriptions',
      notifications: 'kill_notifications',
    };

    const killSwitchKey = killSwitchMap[feature?.toLowerCase()];

    if (!killSwitchKey) {
      return res.status(400).json({
        success: false,
        error: 'Invalid feature. Valid options: ai, chat, subscriptions, payments, notifications',
      });
    }

    featureFlags.setOverride(killSwitchKey, enable !== false);

    res.json({
      success: true,
      message: `Kill switch ${enable !== false ? 'activated' : 'deactivated'} for ${feature}`,
      killSwitch: killSwitchKey,
      enabled: enable !== false,
    });
  } catch (error) {
    console.error('Error toggling kill switch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle kill switch',
    });
  }
});

export default router;
