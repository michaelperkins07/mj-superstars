import pool from '../database/db.js';
import { logger } from '../utils/logger.js';

class GamificationEngine {
  /**
   * Calculate XP with all active multipliers stacked
   * Multipliers stack multiplicatively but cap at 5.0x total
   */
  async calculateXPWithMultiplier(userId, basePoints, action) {
    try {
      // Get all active, non-expired multipliers for this user
      const result = await pool.query(
        `SELECT multiplier_type, multiplier_value
         FROM xp_multipliers
         WHERE user_id = $1 AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC`,
        [userId]
      );

      const multipliers = result.rows;
      
      // Calculate stacked multiplier (multiplicative)
      let totalMultiplier = 1.0;
      const activeMultipliers = [];
      
      for (const mult of multipliers) {
        totalMultiplier *= mult.multiplier_value;
        activeMultipliers.push({
          type: mult.multiplier_type,
          value: mult.multiplier_value
        });
      }
      
      // Cap at 5.0x
      totalMultiplier = Math.min(totalMultiplier, 5.0);
      
      // Calculate total points
      const totalPoints = Math.floor(basePoints * totalMultiplier);
      
      // Award points to user
      await pool.query(
        `UPDATE users SET total_points = total_points + $1 WHERE id = $2`,
        [totalPoints, userId]
      );
      
      logger.info(`XP calculated for user ${userId}: base=${basePoints}, multiplier=${totalMultiplier.toFixed(1)}x, total=${totalPoints}`);
      
      return {
        basePoints,
        multiplier: parseFloat(totalMultiplier.toFixed(1)),
        totalPoints,
        activeMultipliers
      };
    } catch (error) {
      logger.error(`Error calculating XP with multiplier: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process daily login bonus with escalating rewards
   */
  async processLogin(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Check if user already logged in today
      const existingLogin = await pool.query(
        `SELECT consecutive_days FROM daily_login_bonuses
         WHERE user_id = $1 AND login_date = $2`,
        [userId, today]
      );
      
      if (existingLogin.rows.length > 0) {
        return {
          consecutiveDays: existingLogin.rows[0].consecutive_days,
          bonusPoints: 0,
          multiplierGranted: null,
          alreadyLoggedToday: true
        };
      }
      
      // Get last login date
      const lastLogin = await pool.query(
        `SELECT login_date, consecutive_days FROM daily_login_bonuses
         WHERE user_id = $1
         ORDER BY login_date DESC
         LIMIT 1`,
        [userId]
      );
      
      let consecutiveDays = 1;
      
      if (lastLogin.rows.length > 0) {
        const lastDate = new Date(lastLogin.rows[0].login_date);
        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
        
        // If login was yesterday, increment streak; otherwise reset
        if (daysDiff === 1) {
          consecutiveDays = lastLogin.rows[0].consecutive_days + 1;
        } else {
          consecutiveDays = 1;
        }
      }
      
      // Escalating bonus points by day
      const bonusMap = {
        1: 5, 2: 10, 3: 15, 4: 20, 5: 30, 6: 40, 7: 75
      };
      
      const dayInPattern = ((consecutiveDays - 1) % 7) + 1;
      const bonusPoints = bonusMap[dayInPattern];
      
      // Create login record
      await pool.query(
        `INSERT INTO daily_login_bonuses (user_id, login_date, consecutive_days, bonus_points)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, login_date) DO NOTHING`,
        [userId, today, consecutiveDays, bonusPoints]
      );
      
      // Award bonus points
      await pool.query(
        `UPDATE users SET total_points = total_points + $1, daily_login_streak = $2, last_login_bonus_date = $3
         WHERE id = $4`,
        [bonusPoints, consecutiveDays, today, userId]
      );
      
      // Grant multiplier based on streak milestones
      let multiplierGranted = null;
      
      if (consecutiveDays === 7 || (consecutiveDays > 7 && consecutiveDays % 7 === 0)) {
        // 7+ day streak: 1.5x for 24h
        await pool.query(
          `INSERT INTO xp_multipliers (user_id, multiplier_type, multiplier_value, source, expires_at)
           VALUES ($1, 'streak', 1.5, 'daily_login_7day', NOW() + INTERVAL '24 hours')`,
          [userId]
        );
        multiplierGranted = { type: 'streak', value: 1.5, duration: '24h' };
      } else if (consecutiveDays === 14 || (consecutiveDays > 14 && consecutiveDays % 14 === 0)) {
        // 14+ day streak: 2.0x multiplier
        await pool.query(
          `INSERT INTO xp_multipliers (user_id, multiplier_type, multiplier_value, source, expires_at)
           VALUES ($1, 'streak', 2.0, 'daily_login_14day', NOW() + INTERVAL '24 hours')`,
          [userId]
        );
        multiplierGranted = { type: 'streak', value: 2.0, duration: '24h' };
      } else if (consecutiveDays === 30 || (consecutiveDays > 30 && consecutiveDays % 30 === 0)) {
        // 30+ day streak: 3.0x multiplier
        await pool.query(
          `INSERT INTO xp_multipliers (user_id, multiplier_type, multiplier_value, source, expires_at)
           VALUES ($1, 'streak', 3.0, 'daily_login_30day', NOW() + INTERVAL '24 hours')`,
          [userId]
        );
        multiplierGranted = { type: 'streak', value: 3.0, duration: '24h' };
      }
      
      logger.info(`Login bonus processed for user ${userId}: day ${consecutiveDays}, bonus ${bonusPoints}pt`);
      
      return {
        consecutiveDays,
        bonusPoints,
        multiplierGranted,
        alreadyLoggedToday: false
      };
    } catch (error) {
      logger.error(`Error processing login: ${error.message}`);
      throw error;
    }
  }

  /**
   * Comeback bonus for users returning after missing days
   */
  async processComebackBonus(userId) {
    try {
      // Get last activity date
      const lastActivity = await pool.query(
        `SELECT last_login_bonus_date FROM users WHERE id = $1`,
        [userId]
      );
      
      if (!lastActivity.rows.length || !lastActivity.rows[0].last_login_bonus_date) {
        return null; // No comeback bonus for new users
      }
      
      const lastDate = new Date(lastActivity.rows[0].last_login_bonus_date);
      const today = new Date();
      const daysMissed = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
      
      if (daysMissed < 2) {
        return null; // Not enough days missed
      }
      
      let bonusMultiplier = 1.0;
      let bonusDuration = '1h';
      let message = '';
      
      if (daysMissed <= 7) {
        bonusMultiplier = 2.0;
        bonusDuration = '1h';
        message = 'Welcome back!';
      } else if (daysMissed <= 30) {
        bonusMultiplier = 3.0;
        bonusDuration = '2h';
        message = 'We missed you!';
      } else {
        bonusMultiplier = 5.0;
        bonusDuration = '4h';
        message = 'Legendary return!';
      }
      
      // Create comeback multiplier
      const durationMinutes = {
        '1h': 60,
        '2h': 120,
        '4h': 240
      };
      
      await pool.query(
        `INSERT INTO xp_multipliers (user_id, multiplier_type, multiplier_value, source, expires_at)
         VALUES ($1, 'comeback', $2, 'comeback_bonus', NOW() + INTERVAL '${durationMinutes[bonusDuration]} minutes')`,
        [userId, bonusMultiplier]
      );
      
      logger.info(`Comeback bonus applied to user ${userId}: ${daysMissed} days missed, ${bonusMultiplier}x multiplier`);
      
      return {
        daysMissed,
        bonusMultiplier,
        bonusDuration,
        message
      };
    } catch (error) {
      logger.error(`Error processing comeback bonus: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check for milestone achievements and create celebration records
   */
  async checkMilestones(userId) {
    try {
      const user = await pool.query(
        `SELECT total_points AS points, daily_login_streak FROM users WHERE id = $1`,
        [userId]
      );
      
      if (!user.rows.length) {
        return [];
      }
      
      const userData = user.rows[0];
      const currentPoints = userData.points;
      const currentStreak = userData.daily_login_streak || 0;
      
      const newMilestones = [];
      
      // Points milestones
      const pointsMilestones = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
      for (const milestone of pointsMilestones) {
        if (currentPoints >= milestone) {
          const existing = await pool.query(
            `SELECT id FROM milestone_celebrations
             WHERE user_id = $1 AND milestone_type = 'points' AND milestone_value = $2`,
            [userId, milestone]
          );
          
          if (!existing.rows.length) {
            const reward = this._selectReward();
            const result = await pool.query(
              `INSERT INTO milestone_celebrations 
               (user_id, milestone_type, milestone_value, reward_type, reward_data)
               VALUES ($1, 'points', $2, $3, $4)
               RETURNING id, reward_type, reward_data`,
              [userId, milestone, reward.type, JSON.stringify(reward.data)]
            );
            newMilestones.push({
              type: 'points',
              value: milestone,
              reward: result.rows[0].reward_type,
              data: result.rows[0].reward_data
            });
          }
        }
      }
      
      // Streak milestones
      const streakMilestones = [3, 7, 14, 21, 30, 60, 90, 180, 365];
      for (const milestone of streakMilestones) {
        if (currentStreak >= milestone) {
          const existing = await pool.query(
            `SELECT id FROM milestone_celebrations
             WHERE user_id = $1 AND milestone_type = 'streak' AND milestone_value = $2`,
            [userId, milestone]
          );
          
          if (!existing.rows.length) {
            const reward = this._selectReward();
            const result = await pool.query(
              `INSERT INTO milestone_celebrations 
               (user_id, milestone_type, milestone_value, reward_type, reward_data)
               VALUES ($1, 'streak', $2, $3, $4)
               RETURNING id, reward_type, reward_data`,
              [userId, milestone, reward.type, JSON.stringify(reward.data)]
            );
            newMilestones.push({
              type: 'streak',
              value: milestone,
              reward: result.rows[0].reward_type,
              data: result.rows[0].reward_data
            });
          }
        }
      }
      
      logger.info(`Checked milestones for user ${userId}: found ${newMilestones.length} new`);
      
      return newMilestones;
    } catch (error) {
      logger.error(`Error checking milestones: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get currently active flash challenges for a user
   */
  async getActiveFlashChallenges(userId) {
    try {
      const result = await pool.query(
        `SELECT 
          c.id, c.title, c.description, c.challenge_type, c.reward_multiplier,
          c.bonus_points, c.starts_at, c.ends_at, c.target_action, c.target_count,
          COALESCE(ufc.progress, 0) as progress,
          COALESCE(ufc.completed, FALSE) as completed,
          COALESCE(ufc.completed_at, NULL) as completed_at,
          COALESCE(ufc.points_earned, 0) as points_earned,
          EXTRACT(EPOCH FROM (c.ends_at - NOW())) as time_remaining_seconds
         FROM flash_challenges c
         LEFT JOIN user_flash_challenges ufc ON c.id = ufc.challenge_id AND ufc.user_id = $1
         WHERE c.is_active = TRUE AND c.ends_at > NOW()
         ORDER BY c.ends_at ASC`,
        [userId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.challenge_type,
        multiplier: row.reward_multiplier,
        bonusPoints: row.bonus_points,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        targetAction: row.target_action,
        targetCount: row.target_count,
        progress: row.progress,
        completed: row.completed,
        completedAt: row.completed_at,
        pointsEarned: row.points_earned,
        timeRemaining: Math.max(0, Math.floor(row.time_remaining_seconds))
      }));
    } catch (error) {
      logger.error(`Error fetching active challenges: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update challenge progress when user performs an action
   */
  async updateChallengeProgress(userId, action, count = 1) {
    try {
      const challenges = await pool.query(
        `SELECT id, target_count, reward_multiplier, bonus_points
         FROM flash_challenges
         WHERE is_active = TRUE AND ends_at > NOW()
         AND target_action = $1`,
        [action]
      );
      
      const updatedChallenges = [];
      const completedChallenges = [];
      
      for (const challenge of challenges.rows) {
        // Get or create user challenge progress
        const existing = await pool.query(
          `SELECT id, progress, completed FROM user_flash_challenges
           WHERE user_id = $1 AND challenge_id = $2`,
          [userId, challenge.id]
        );
        
        if (!existing.rows.length) {
          // Skip if user hasn't joined this challenge
          continue;
        }
        
        const userChallenge = existing.rows[0];
        if (userChallenge.completed) {
          continue; // Already completed
        }
        
        const newProgress = userChallenge.progress + count;
        const isCompleted = newProgress >= challenge.target_count;
        const pointsEarned = isCompleted ? Math.floor(challenge.bonus_points * challenge.reward_multiplier) : 0;
        
        await pool.query(
          `UPDATE user_flash_challenges
           SET progress = $1, completed = $2, completed_at = $3, points_earned = $4
           WHERE user_id = $5 AND challenge_id = $6`,
          [newProgress, isCompleted, isCompleted ? new Date() : null, pointsEarned, userId, challenge.id]
        );
        
        if (isCompleted) {
          // Award points
          await pool.query(
            `UPDATE users SET total_points = total_points + $1 WHERE id = $2`,
            [pointsEarned, userId]
          );
          
          // Grant combo multiplier for completing challenges
          await pool.query(
            `INSERT INTO xp_multipliers (user_id, multiplier_type, multiplier_value, source, expires_at)
             VALUES ($1, 'combo', 1.2, 'flash_challenge_complete', NOW() + INTERVAL '2 hours')`,
            [userId]
          );
          
          completedChallenges.push({
            challengeId: challenge.id,
            pointsEarned
          });
        }
        
        updatedChallenges.push({
          challengeId: challenge.id,
          progress: newProgress,
          completed: isCompleted
        });
      }
      
      logger.info(`Challenge progress updated for user ${userId}: ${updatedChallenges.length} updated, ${completedChallenges.length} completed`);
      
      return {
        challengesUpdated: updatedChallenges,
        challengesCompleted: completedChallenges
      };
    } catch (error) {
      logger.error(`Error updating challenge progress: ${error.message}`);
      throw error;
    }
  }

  /**
   * Auto-generate a time-limited flash challenge
   */
  async generateFlashChallenge() {
    try {
      const templates = [
        {
          title: 'Speed Journaler',
          description: 'Write 3 journal entries in 2 hours',
          type: 'speed',
          targetAction: 'journal_entry',
          targetCount: 3,
          multiplier: 2.0,
          bonusPoints: 150,
          duration: 2
        },
        {
          title: 'Mood Master',
          description: 'Log your mood 3 times today',
          type: 'mood_lift',
          targetAction: 'mood_log',
          targetCount: 3,
          multiplier: 1.5,
          bonusPoints: 50,
          duration: 24
        },
        {
          title: 'Task Crusher',
          description: 'Complete 5 tasks in 4 hours',
          type: 'combo',
          targetAction: 'task_complete',
          targetCount: 5,
          multiplier: 3.0,
          bonusPoints: 200,
          duration: 4
        },
        {
          title: 'Streak Shield',
          description: 'Don\'t break your streak today',
          type: 'streak_boost',
          targetAction: 'streak_maintained',
          targetCount: 1,
          multiplier: 2.5,
          bonusPoints: 25,
          duration: 24
        },
        {
          title: 'Gratitude Sprint',
          description: 'Write gratitude entries 3 times',
          type: 'mood_lift',
          targetAction: 'gratitude_entry',
          targetCount: 3,
          multiplier: 2.0,
          bonusPoints: 100,
          duration: 6
        },
        {
          title: 'Reflection Racer',
          description: 'Complete 4 reflections in 3 hours',
          type: 'speed',
          targetAction: 'reflection',
          targetCount: 4,
          multiplier: 2.2,
          bonusPoints: 120,
          duration: 3
        }
      ];
      
      // Randomly select a template
      const template = templates[Math.floor(Math.random() * templates.length)];
      
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + template.duration * 60 * 60 * 1000);
      
      const result = await pool.query(
        `INSERT INTO flash_challenges 
         (title, description, challenge_type, reward_multiplier, bonus_points, starts_at, ends_at, target_action, target_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, title, description, challenge_type, reward_multiplier, bonus_points, starts_at, ends_at, target_action, target_count`,
        [
          template.title,
          template.description,
          template.type,
          template.multiplier,
          template.bonusPoints,
          startsAt,
          endsAt,
          template.targetAction,
          template.targetCount
        ]
      );
      
      const challenge = result.rows[0];
      logger.info(`New flash challenge generated: ${challenge.title} (${template.duration}h duration)`);
      
      return {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        type: challenge.challenge_type,
        multiplier: challenge.reward_multiplier,
        bonusPoints: challenge.bonus_points,
        startsAt: challenge.starts_at,
        endsAt: challenge.ends_at,
        targetAction: challenge.target_action,
        targetCount: challenge.target_count,
        duration: template.duration
      };
    } catch (error) {
      logger.error(`Error generating flash challenge: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get complete gamification summary for dashboard
   */
  async getGamificationSummary(userId) {
    try {
      // Get user data
      const user = await pool.query(
        `SELECT total_points AS points, xp_multiplier, daily_login_streak FROM users WHERE id = $1`,
        [userId]
      );
      
      if (!user.rows.length) {
        throw new Error('User not found');
      }
      
      const userData = user.rows[0];
      
      // Get active multipliers
      const multipliers = await pool.query(
        `SELECT multiplier_type, multiplier_value, source, expires_at
         FROM xp_multipliers
         WHERE user_id = $1 AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY multiplier_value DESC`,
        [userId]
      );
      
      // Calculate stacked multiplier
      let stackedMultiplier = 1.0;
      for (const row of multipliers.rows) {
        stackedMultiplier *= row.multiplier_value;
      }
      stackedMultiplier = Math.min(stackedMultiplier, 5.0);
      
      // Get active flash challenges
      const challenges = await this.getActiveFlashChallenges(userId);
      
      // Get unclaimed milestones
      const unclaimed = await pool.query(
        `SELECT id, milestone_type, milestone_value, reward_type, reward_data
         FROM milestone_celebrations
         WHERE user_id = $1 AND celebration_shown = FALSE
         ORDER BY created_at DESC
         LIMIT 5`,
        [userId]
      );
      
      // Calculate streak flame level (visual indicator)
      const streak = userData.daily_login_streak || 0;
      let flameLevel = 'cold';
      if (streak >= 30) flameLevel = 'legendary';
      else if (streak >= 14) flameLevel = 'hot';
      else if (streak >= 7) flameLevel = 'warm';
      else if (streak >= 3) flameLevel = 'sparked';
      
      // Get next milestone previews
      const nextMilestones = this._getNextMilestones(userData.points, streak);
      
      return {
        currentPoints: userData.points,
        currentMultiplier: parseFloat(stackedMultiplier.toFixed(1)),
        activeMultipliers: multipliers.rows.map(row => ({
          type: row.multiplier_type,
          value: row.multiplier_value,
          source: row.source,
          expiresAt: row.expires_at
        })),
        dailyLoginStreak: streak,
        streakFlameLevel: flameLevel,
        activeFlashChallenges: challenges,
        unclaimedMilestones: unclaimed.rows.map(row => ({
          id: row.id,
          type: row.milestone_type,
          value: row.milestone_value,
          rewardType: row.reward_type,
          rewardData: row.reward_data
        })),
        nextMilestones
      };
    } catch (error) {
      logger.error(`Error getting gamification summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Join a flash challenge
   */
  async joinFlashChallenge(userId, challengeId) {
    try {
      // Check if challenge exists and is active
      const challenge = await pool.query(
        `SELECT id, title FROM flash_challenges WHERE id = $1 AND is_active = TRUE AND ends_at > NOW()`,
        [challengeId]
      );
      
      if (!challenge.rows.length) {
        throw new Error('Challenge not found or expired');
      }
      
      // Check if already joined
      const existing = await pool.query(
        `SELECT id FROM user_flash_challenges WHERE user_id = $1 AND challenge_id = $2`,
        [userId, challengeId]
      );
      
      if (existing.rows.length) {
        return { alreadyJoined: true };
      }
      
      // Join challenge
      await pool.query(
        `INSERT INTO user_flash_challenges (user_id, challenge_id, progress)
         VALUES ($1, $2, 0)`,
        [userId, challengeId]
      );
      
      logger.info(`User ${userId} joined challenge ${challenge.rows[0].title}`);
      
      return { joined: true, challengeId };
    } catch (error) {
      logger.error(`Error joining challenge: ${error.message}`);
      throw error;
    }
  }

  /**
   * Internal method to select reward type with weighted probability
   */
  _selectReward() {
    const rand = Math.random() * 100;
    
    if (rand < 40) {
      // 40% bonus XP
      const bonusXp = 50 + Math.floor(Math.random() * 450);
      return { type: 'bonus_xp', data: { amount: bonusXp } };
    } else if (rand < 65) {
      // 25% badge
      return { type: 'badge', data: { badgeType: 'achievement' } };
    } else if (rand < 85) {
      // 20% affirmation
      const affirmations = [
        'You\'re on fire! Keep up the momentum.',
        'This is impressive progress. Be proud of yourself.',
        'You\'re building something amazing.',
        'Your consistency is inspiring.',
        'You\'ve got the power within you.'
      ];
      const affirmation = affirmations[Math.floor(Math.random() * affirmations.length)];
      return { type: 'affirmation', data: { message: affirmation } };
    } else if (rand < 95) {
      // 10% theme unlock
      return { type: 'theme_unlock', data: { theme: 'premium_theme' } };
    } else {
      // 5% mystery (none)
      return { type: 'none', data: { mystery: true } };
    }
  }

  /**
   * Internal method to get next milestone previews
   */
  _getNextMilestones(currentPoints, currentStreak) {
    const pointsMilestones = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
    const streakMilestones = [3, 7, 14, 21, 30, 60, 90, 180, 365];
    
    const nextPointsMilestone = pointsMilestones.find(m => m > currentPoints);
    const nextStreakMilestone = streakMilestones.find(m => m > currentStreak);
    
    return {
      nextPointsMilestone: nextPointsMilestone ? {
        value: nextPointsMilestone,
        pointsUntil: nextPointsMilestone - currentPoints
      } : null,
      nextStreakMilestone: nextStreakMilestone ? {
        value: nextStreakMilestone,
        daysUntil: nextStreakMilestone - currentStreak
      } : null
    };
  }
}

export default new GamificationEngine();
