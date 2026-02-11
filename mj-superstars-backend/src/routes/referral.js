// ============================================================
// MJ's Superstars - Referral System Routes
// Handles referral code generation, validation, tracking, and rewards
// ============================================================
import { Router } from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import pool from '../database/db.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

const router = Router();

// Points awarded for referrals
const REFERRER_BONUS_POINTS = 100;
const REFERRED_BONUS_POINTS = 50;

// Generate a short unique referral code
function generateCode(prefix = 'MJ') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0/O, 1/I)
  let code = prefix;
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(crypto.randomInt(chars.length));
  }
  return code;
}

// ============================================================
// GET /my-code - Get or create user's referral code
// ============================================================
router.get('/my-code', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check for existing code
    let result = await pool.query(
      'SELECT code, uses_count, is_active, created_at FROM referral_codes WHERE user_id = $1 AND is_active = TRUE LIMIT 1',
      [userId]
    );

    if (result.rows.length > 0) {
      return res.json({
        code: result.rows[0].code,
        uses: result.rows[0].uses_count,
        shareUrl: `https://mj-superstars-app.onrender.com/invite/${result.rows[0].code}`,
        created_at: result.rows[0].created_at
      });
    }

    // Generate a new code (retry up to 5 times for uniqueness)
    let code;
    for (let attempt = 0; attempt < 5; attempt++) {
      code = generateCode();
      try {
        await pool.query(
          'INSERT INTO referral_codes (user_id, code) VALUES ($1, $2)',
          [userId, code]
        );
        // Also store on user record for quick lookup
        await pool.query(
          'UPDATE users SET referral_code = $1 WHERE id = $2',
          [code, userId]
        );
        break;
      } catch (err) {
        if (err.code === '23505' && attempt < 4) continue; // Unique violation, retry
        throw err;
      }
    }

    res.json({
      code,
      uses: 0,
      shareUrl: `https://mj-superstars-app.onrender.com/invite/${code}`,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Error getting referral code:', err);
    res.status(500).json({ error: 'Failed to get referral code' });
  }
});

// ============================================================
// GET /stats - Get user's referral statistics
// ============================================================
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const [codeResult, trackingResult, shareResult] = await Promise.all([
      pool.query(
        'SELECT code, uses_count FROM referral_codes WHERE user_id = $1 AND is_active = TRUE LIMIT 1',
        [userId]
      ),
      pool.query(
        `SELECT status, COUNT(*) as count
         FROM referral_tracking WHERE referrer_id = $1
         GROUP BY status`,
        [userId]
      ),
      pool.query(
        `SELECT share_type, platform, COUNT(*) as count
         FROM share_events WHERE user_id = $1
         GROUP BY share_type, platform
         ORDER BY count DESC
         LIMIT 20`,
        [userId]
      )
    ]);

    const referralsByStatus = {};
    trackingResult.rows.forEach(r => { referralsByStatus[r.status] = parseInt(r.count); });

    const totalReferrals = Object.values(referralsByStatus).reduce((a, b) => a + b, 0);
    const activeReferrals = referralsByStatus.active || 0;

    res.json({
      code: codeResult.rows[0]?.code || null,
      totalReferrals,
      referralsByStatus,
      activeReferrals,
      totalPointsEarned: totalReferrals * REFERRER_BONUS_POINTS,
      shareEvents: shareResult.rows
    });
  } catch (err) {
    logger.error('Error getting referral stats:', err);
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

// ============================================================
// POST /validate - Validate a referral code (public, pre-registration)
// ============================================================
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const result = await pool.query(
      `SELECT rc.code, rc.is_active, rc.uses_count, rc.max_uses, rc.expires_at,
              u.name as referrer_name
       FROM referral_codes rc
       JOIN users u ON rc.user_id = u.id
       WHERE rc.code = $1`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.json({ valid: false, reason: 'Code not found' });
    }

    const ref = result.rows[0];

    if (!ref.is_active) {
      return res.json({ valid: false, reason: 'Code is no longer active' });
    }

    if (ref.expires_at && new Date(ref.expires_at) < new Date()) {
      return res.json({ valid: false, reason: 'Code has expired' });
    }

    if (ref.max_uses && ref.uses_count >= ref.max_uses) {
      return res.json({ valid: false, reason: 'Code has reached max uses' });
    }

    res.json({
      valid: true,
      referrerName: ref.referrer_name?.split(' ')[0] || 'A friend', // First name only
      bonusPoints: REFERRED_BONUS_POINTS
    });
  } catch (err) {
    logger.error('Error validating referral code:', err);
    res.status(500).json({ error: 'Failed to validate code' });
  }
});

// ============================================================
// POST /redeem - Redeem a referral code (called after registration)
// ============================================================
router.post('/redeem', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const upperCode = code.toUpperCase();

    // Check if user already used a referral code
    const existingRef = await pool.query(
      'SELECT id FROM referral_tracking WHERE referred_id = $1',
      [userId]
    );
    if (existingRef.rows.length > 0) {
      return res.status(400).json({ error: 'You have already used a referral code' });
    }

    // Get the referral code and referrer
    const codeResult = await pool.query(
      `SELECT rc.*, rc.user_id as referrer_id
       FROM referral_codes rc
       WHERE rc.code = $1 AND rc.is_active = TRUE`,
      [upperCode]
    );

    if (codeResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or inactive referral code' });
    }

    const refCode = codeResult.rows[0];

    // Can't refer yourself
    if (refCode.referrer_id === userId) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    // Check limits
    if (refCode.max_uses && refCode.uses_count >= refCode.max_uses) {
      return res.status(400).json({ error: 'This referral code has reached its limit' });
    }

    if (refCode.expires_at && new Date(refCode.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This referral code has expired' });
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create referral tracking record
      await client.query(
        `INSERT INTO referral_tracking (referrer_id, referred_id, referral_code, status, referred_rewarded, referred_points_awarded)
         VALUES ($1, $2, $3, 'signed_up', TRUE, $4)`,
        [refCode.referrer_id, userId, upperCode, REFERRED_BONUS_POINTS]
      );

      // Increment uses count
      await client.query(
        'UPDATE referral_codes SET uses_count = uses_count + 1 WHERE id = $1',
        [refCode.id]
      );

      // Mark user as referred
      await client.query(
        'UPDATE users SET referred_by = $1 WHERE id = $2',
        [upperCode, userId]
      );

      // Award bonus points to referred user
      await client.query(
        'UPDATE users SET total_points = COALESCE(total_points, 0) + $1 WHERE id = $2',
        [REFERRED_BONUS_POINTS, userId]
      );

      // Award bonus points to referrer
      await client.query(
        `UPDATE referral_tracking SET referrer_rewarded = TRUE, referrer_points_awarded = $1, status = 'onboarded'
         WHERE referrer_id = $2 AND referred_id = $3`,
        [REFERRER_BONUS_POINTS, refCode.referrer_id, userId]
      );
      await client.query(
        'UPDATE users SET total_points = COALESCE(total_points, 0) + $1 WHERE id = $2',
        [REFERRER_BONUS_POINTS, refCode.referrer_id]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        bonusPoints: REFERRED_BONUS_POINTS,
        message: `Welcome! You earned ${REFERRED_BONUS_POINTS} bonus points from your friend's referral.`
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('Error redeeming referral code:', err);
    res.status(500).json({ error: 'Failed to redeem referral code' });
  }
});

// ============================================================
// POST /share-event - Track a share event (analytics)
// ============================================================
router.post('/share-event', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { share_type, platform, content_id, metadata } = req.body;

    const validTypes = ['referral_link', 'achievement', 'mood_win', 'streak', 'post', 'app_invite'];
    if (!validTypes.includes(share_type)) {
      return res.status(400).json({ error: 'Invalid share_type' });
    }

    await pool.query(
      `INSERT INTO share_events (user_id, share_type, platform, content_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, share_type, platform || 'other', content_id || null, JSON.stringify(metadata || {})]
    );

    res.json({ success: true });
  } catch (err) {
    logger.error('Error tracking share event:', err);
    res.status(500).json({ error: 'Failed to track share event' });
  }
});

// ============================================================
// GET /leaderboard - Top referrers (optional gamification)
// ============================================================
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.name, rc.uses_count as referrals,
              (rc.uses_count * $1) as total_points
       FROM referral_codes rc
       JOIN users u ON rc.user_id = u.id
       WHERE rc.uses_count > 0 AND rc.is_active = TRUE
       ORDER BY rc.uses_count DESC
       LIMIT 10`,
      [REFERRER_BONUS_POINTS]
    );

    res.json({
      leaderboard: result.rows.map((r, i) => ({
        rank: i + 1,
        name: r.name?.split(' ')[0] || 'Anonymous', // First name only
        referrals: parseInt(r.referrals),
        totalPoints: parseInt(r.total_points)
      }))
    });
  } catch (err) {
    logger.error('Error getting referral leaderboard:', err);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

export default router;
