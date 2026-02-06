// ============================================================
// MJ's Superstars - GDPR Compliance API Routes
// Data export, deletion, and consent endpoints
// ============================================================

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import gdpr, { ConsentTypes } from '../services/gdpr.js';
import jobQueue from '../services/jobQueue.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// All GDPR routes require authentication
router.use(authenticateToken);

// ============================================================
// DATA EXPORT ENDPOINTS
// ============================================================

/**
 * POST /api/gdpr/export/request
 * Request a data export (async - sent via email)
 */
router.post('/export/request', async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    // Queue the export job
    const job = await jobQueue.exports.exportUserData(userId, email);

    res.json({
      success: true,
      message: 'Your data export has been requested. You will receive an email when it\'s ready.',
      jobId: job.id,
      estimatedTime: '24 hours',
    });
  } catch (error) {
    logger.error('Error requesting data export:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request data export',
    });
  }
});

/**
 * GET /api/gdpr/export/download
 * Download data export immediately (for smaller datasets)
 */
router.get('/export/download', async (req, res) => {
  try {
    const userId = req.user.id;
    const format = req.query.format || 'json';

    const exportFile = await gdpr.generateExportFile(userId, format);

    res.setHeader('Content-Type', exportFile.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportFile.filename}"`);
    res.send(exportFile.content);
  } catch (error) {
    logger.error('Error generating data export:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate data export',
    });
  }
});

/**
 * GET /api/gdpr/export/preview
 * Preview what data will be exported
 */
router.get('/export/preview', async (req, res) => {
  try {
    const userId = req.user.id;
    const data = await gdpr.exportUserData(userId);

    // Return summary instead of full data
    res.json({
      success: true,
      preview: {
        user: data.user ? 'Profile data included' : null,
        moods: `${data.moods?.length || 0} mood entries`,
        conversations: `${data.conversations?.length || 0} conversations`,
        journalEntries: `${data.journalEntries?.length || 0} journal entries`,
        tasks: `${data.tasks?.length || 0} tasks`,
        healthData: `${data.healthData?.length || 0} health records`,
        subscriptionHistory: `${data.subscriptionHistory?.length || 0} subscription records`,
        consents: data.consents ? 'Consent history included' : null,
      },
      exportDate: data.exportDate,
    });
  } catch (error) {
    logger.error('Error previewing data export:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview data export',
    });
  }
});

// ============================================================
// DATA DELETION ENDPOINTS
// ============================================================

/**
 * POST /api/gdpr/delete/request
 * Request account deletion
 */
router.post('/delete/request', async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, reason, feedback } = req.body;

    // Verify password before deletion
    // const isValid = await verifyPassword(userId, password);
    // if (!isValid) {
    //   return res.status(401).json({
    //     success: false,
    //     error: 'Invalid password',
    //   });
    // }

    // Perform soft deletion (keeps anonymized data for compliance)
    const result = await gdpr.deleteUserData(userId, {
      hardDelete: false,
      reason: reason || 'user_request',
    });

    // Log feedback if provided
    if (feedback) {
      logger.info(`Account deletion feedback: ${feedback}`);
    }

    res.json({
      success: true,
      message: 'Your account and data have been deleted.',
      deletionId: result.deletionId,
      note: 'Some anonymized data may be retained for legal compliance.',
    });
  } catch (error) {
    logger.error('Error deleting user data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account',
    });
  }
});

/**
 * POST /api/gdpr/delete/hard
 * Request complete data erasure (Right to be Forgotten)
 * Requires additional verification
 */
router.post('/delete/hard', async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, confirmation } = req.body;

    // Require explicit confirmation
    if (confirmation !== 'DELETE_ALL_MY_DATA') {
      return res.status(400).json({
        success: false,
        error: 'Please type DELETE_ALL_MY_DATA to confirm',
      });
    }

    // Perform hard deletion
    const result = await gdpr.deleteUserData(userId, {
      hardDelete: true,
      reason: 'right_to_erasure',
    });

    res.json({
      success: true,
      message: 'All your data has been permanently deleted.',
      deletionId: result.deletionId,
    });
  } catch (error) {
    logger.error('Error performing hard delete:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete data',
    });
  }
});

// ============================================================
// CONSENT MANAGEMENT ENDPOINTS
// ============================================================

/**
 * GET /api/gdpr/consents
 * Get current consent status for all types
 */
router.get('/consents', async (req, res) => {
  try {
    const userId = req.user.id;
    const consents = await gdpr.getUserConsentStatus(userId);

    res.json({
      success: true,
      consents,
      consentTypes: Object.values(ConsentTypes),
    });
  } catch (error) {
    logger.error('Error fetching consents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch consent status',
    });
  }
});

/**
 * POST /api/gdpr/consents/:type
 * Update consent for a specific type
 */
router.post('/consents/:type', async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.params;
    const { granted } = req.body;

    // Validate consent type
    if (!Object.values(ConsentTypes).includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid consent type: ${type}`,
        validTypes: Object.values(ConsentTypes),
      });
    }

    const metadata = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const result = await gdpr.recordConsent(userId, type, granted, metadata);

    res.json({
      success: true,
      message: `Consent ${granted ? 'granted' : 'revoked'} for ${type}`,
      consent: result,
    });
  } catch (error) {
    logger.error('Error updating consent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update consent',
    });
  }
});

/**
 * POST /api/gdpr/consents/bulk
 * Update multiple consents at once
 */
router.post('/consents/bulk', async (req, res) => {
  try {
    const userId = req.user.id;
    const { consents } = req.body;

    if (!consents || typeof consents !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid consents object',
      });
    }

    const metadata = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const results = [];
    for (const [type, granted] of Object.entries(consents)) {
      if (Object.values(ConsentTypes).includes(type)) {
        const result = await gdpr.recordConsent(userId, type, granted, metadata);
        results.push(result);
      }
    }

    res.json({
      success: true,
      message: 'Consents updated',
      updated: results.length,
    });
  } catch (error) {
    logger.error('Error updating bulk consents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update consents',
    });
  }
});

/**
 * POST /api/gdpr/consents/withdraw-marketing
 * Quickly withdraw all marketing consents
 */
router.post('/consents/withdraw-marketing', async (req, res) => {
  try {
    const userId = req.user.id;

    const metadata = {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    const result = await gdpr.withdrawMarketingConsents(userId, metadata);

    res.json({
      success: true,
      message: 'Marketing consents withdrawn',
      withdrawn: result.withdrawn,
    });
  } catch (error) {
    logger.error('Error withdrawing marketing consents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to withdraw marketing consents',
    });
  }
});

// ============================================================
// INFORMATION ENDPOINTS
// ============================================================

/**
 * GET /api/gdpr/info
 * Get information about GDPR rights and data handling
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    rights: {
      access: {
        description: 'Right to access your personal data',
        endpoint: 'GET /api/gdpr/export/preview',
      },
      portability: {
        description: 'Right to receive your data in a portable format',
        endpoint: 'GET /api/gdpr/export/download',
      },
      erasure: {
        description: 'Right to have your data deleted',
        endpoint: 'POST /api/gdpr/delete/request',
      },
      rectification: {
        description: 'Right to correct inaccurate data',
        endpoint: 'Update your profile via the app',
      },
      restriction: {
        description: 'Right to restrict processing',
        endpoint: 'Manage consents via /api/gdpr/consents',
      },
      objection: {
        description: 'Right to object to processing',
        endpoint: 'POST /api/gdpr/consents/withdraw-marketing',
      },
    },
    dataRetention: {
      activeAccounts: 'Data retained while account is active',
      deletedAccounts: '30 days anonymized retention for legal compliance',
      consentLogs: '7 years for regulatory compliance',
    },
    contact: {
      email: 'privacy@mjsuperstars.com',
      dpo: 'dpo@mjsuperstars.com',
    },
  });
});

/**
 * GET /api/gdpr/data-categories
 * List all categories of data we collect
 */
router.get('/data-categories', (req, res) => {
  res.json({
    success: true,
    categories: [
      {
        name: 'Account Information',
        description: 'Email, name, and account settings',
        purpose: 'To provide and personalize the service',
        retention: 'While account is active',
      },
      {
        name: 'Mood Data',
        description: 'Mood scores, energy levels, and factors',
        purpose: 'To track mental wellness and provide insights',
        retention: 'While account is active',
      },
      {
        name: 'Conversation History',
        description: 'Messages exchanged with MJ',
        purpose: 'To provide personalized AI coaching',
        retention: 'While account is active',
      },
      {
        name: 'Journal Entries',
        description: 'Personal journal entries and reflections',
        purpose: 'To support mental wellness tracking',
        retention: 'While account is active',
      },
      {
        name: 'Health Data',
        description: 'Steps, sleep, heart rate (if connected)',
        purpose: 'To correlate physical and mental wellness',
        retention: 'While account is active',
      },
      {
        name: 'Usage Analytics',
        description: 'App usage patterns and feature interactions',
        purpose: 'To improve the product',
        retention: '2 years',
      },
      {
        name: 'Device Information',
        description: 'Device type, OS, and push tokens',
        purpose: 'To send notifications and ensure compatibility',
        retention: 'While device is registered',
      },
    ],
  });
});

export default router;
