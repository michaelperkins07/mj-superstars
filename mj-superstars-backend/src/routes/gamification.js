import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../database/db.js';
import { logger } from '../utils/logger.js';
import gamification from '../services/gamification.js';

const router = Router();

/**
 * POST /login-bonus
 * Process daily login bonus and comeback bonus if applicable
 */
router.post('/login-bonus', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Process login
    const loginResult = await gamification.processLogin(userId);
    
    // Check for comeback bonus
    const comebackBonus = await gamification.processComebackBonus(userId);
    
    // Check for milestone achievements
    const newMilestones = await gamification.checkMilestones(userId);
    
    res.json({
      success: true,
      login: loginResult,
      comeback: comebackBonus,
      newMilestones
    });
  } catch (error) {
    logger.error(`Login bonus error: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process login bonus',
      error: error.message 
    });
  }
});

/**
 * GET /summary
 * Get full gamification dashboard data
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const summary = await gamification.getGamificationSummary(userId);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    logger.error(`Gamification summary error: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch gamification summary',
      error: error.message 
    });
  }
});

/**
 * GET /challenges
 * Get active flash challenges with user progress
 */
router.get('/challenges', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const challenges = await gamification.getActiveFlashChallenges(userId);
    
    res.json({
      success: true,
      data: challenges
    });
  } catch (error) {
    logger.error(`Get challenges error: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch challenges',
      error: error.message 
    });
  }
});

/**
 * POST /challenges/:id/join
 * Join a flash challenge
 */
router.post('/challenges/:id/join', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: challengeId } = req.params;
    
    const result = await gamification.joinFlashChallenge(userId, challengeId);
    
    if (result.alreadyJoined) {
      return res.json({
        success: true,
        message: 'Already joined this challenge',
        alreadyJoined: true
      });
    }
    
    res.json({
      success: true,
      message: 'Successfully joined challenge',
      challengeId: result.challengeId
    });
  } catch (error) {
    logger.error(`Join challenge error: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to join challenge',
      error: error.message 
    });
  }
});

/**
 * GET /milestones
 * Get user's milestone history
 */
router.get('/milestones', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT id, milestone_type, milestone_value, celebration_shown, 
              reward_type, reward_data, created_at
       FROM milestone_celebrations
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        type: row.milestone_type,
        value: row.milestone_value,
        shown: row.celebration_shown,
        rewardType: row.reward_type,
        rewardData: row.reward_data,
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    logger.error(`Get milestones error: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch milestones',
      error: error.message 
    });
  }
});

/**
 * POST /milestones/:id/claim
 * Mark milestone celebration as shown/claimed
 */
router.post('/milestones/:id/claim', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: milestoneId } = req.params;
    
    // Verify ownership and update
    const result = await pool.query(
      `UPDATE milestone_celebrations 
       SET celebration_shown = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id, milestone_type, milestone_value, reward_type, reward_data`,
      [milestoneId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Milestone not found'
      });
    }
    
    const milestone = result.rows[0];
    
    logger.info(`Milestone claimed by user ${userId}: ${milestone.milestone_type} ${milestone.milestone_value}`);
    
    res.json({
      success: true,
      message: 'Milestone claimed',
      milestone: {
        id: milestone.id,
        type: milestone.milestone_type,
        value: milestone.milestone_value,
        rewardType: milestone.reward_type,
        rewardData: milestone.reward_data
      }
    });
  } catch (error) {
    logger.error(`Claim milestone error: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to claim milestone',
      error: error.message 
    });
  }
});

/**
 * GET /multipliers
 * Get user's active XP multipliers
 */
router.get('/multipliers', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT multiplier_type, multiplier_value, source, expires_at
       FROM xp_multipliers
       WHERE user_id = $1 AND is_active = TRUE
       AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY multiplier_value DESC`,
      [userId]
    );
    
    res.json({
      success: true,
      data: result.rows.map(row => ({
        type: row.multiplier_type,
        value: row.multiplier_value,
        source: row.source,
        expiresAt: row.expires_at
      }))
    });
  } catch (error) {
    logger.error(`Get multipliers error: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch multipliers',
      error: error.message 
    });
  }
});

/**
 * POST /generate-challenge
 * Admin/system endpoint to generate a new flash challenge
 * In production, add admin middleware here
 */
router.post('/generate-challenge', authenticateToken, async (req, res) => {
  try {
    // Optional: Add admin check
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ success: false, message: 'Admin only' });
    // }
    
    const challenge = await gamification.generateFlashChallenge();
    
    logger.info(`New flash challenge generated: ${challenge.title}`);
    
    res.json({
      success: true,
      message: 'Flash challenge generated successfully',
      challenge
    });
  } catch (error) {
    logger.error(`Generate challenge error: ${error.message}`);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate challenge',
      error: error.message 
    });
  }
});

export default router;
