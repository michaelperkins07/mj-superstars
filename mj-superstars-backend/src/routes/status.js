// ============================================================
// Top Performer - System Status & Monitoring Routes
// Admin-accessible status dashboard API
// ============================================================

import { Router } from 'express';
import { getStatus, getHistory, runManualCheck } from '../services/monitoring.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/status - Public simplified status
router.get('/', (req, res) => {
  try {
    const status = getStatus();
    const overall = status.current?.overall || 'unknown';
    res.json({
      status: overall,
      uptime: status.uptime.percentage,
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    });
  } catch (error) {
    logger.error('[Status] Failed to get status:', error.message);
    res.status(500).json({ status: 'error', message: 'Unable to retrieve status' });
  }
});

// GET /api/status/detailed - Full monitoring dashboard data (admin)
router.get('/detailed', (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    const status = getStatus();
    res.json(status);
  } catch (error) {
    logger.error('[Status] Failed to get detailed status:', error.message);
    res.status(500).json({ status: 'error', message: 'Unable to retrieve status' });
  }
});

// GET /api/status/history - Recent check history (admin)
router.get('/history', (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 288);
    const history = getHistory(limit);
    res.json({
      count: history.length,
      checks: history
    });
  } catch (error) {
    logger.error('[Status] Failed to get history:', error.message);
    res.status(500).json({ status: 'error', message: 'Unable to retrieve history' });
  }
});

// POST /api/status/check - Trigger manual health check (admin)
router.post('/check', async (req, res) => {
  try {
    const adminSecret = req.headers['x-admin-secret'];
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    const result = await runManualCheck();
    res.json(result);
  } catch (error) {
    logger.error('[Status] Manual check failed:', error.message);
    res.status(500).json({ status: 'error', message: 'Health check failed' });
  }
});

export default router;
