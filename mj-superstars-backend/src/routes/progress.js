// ============================================================
// Progress & Gamification Routes
// ============================================================

import { Router } from 'express';
import { param } from 'express-validator';
import { query, transaction } from '../database/db.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler, APIError } from '../middleware/errorHandler.js';
import { ClaudeService } from '../services/claude.js';
import { logger } from '../utils/logger.js';
import validate from '../middleware/validate.js';

const router = Router();
router.use(authenticate);

// ============================================================
// GET /api/progress/dashboard - Main progress dashboard
// ============================================================
router.get('/dashboard',
  asyncHandler(async (req, res) => {
    // Get all streaks
    const streaks = await query(
      `SELECT streak_type, current_streak, longest_streak, total_completions, last_completed_date
       FROM user_streaks WHERE user_id = $1`,
      [req.user.id]
    );

    // Get recent achievements
    const achievements = await query(
      `SELECT * FROM achievements WHERE user_id = $1 ORDER BY earned_at DESC LIMIT 10`,
      [req.user.id]
    );

    // Get total points (from tasks)
    const points = await query(
      `SELECT COALESCE(SUM(points_awarded), 0) as total_points FROM tasks
       WHERE user_id = $1 AND status = 'completed'`,
      [req.user.id]
    );

    // Get today's progress
    const todayStats = await query(
      `SELECT
         (SELECT COUNT(*) FROM mood_entries WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE) as mood_logs,
         (SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND status = 'completed' AND DATE(completed_at) = CURRENT_DATE) as tasks_done,
         (SELECT COUNT(*) FROM messages WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE) as messages,
         (SELECT COUNT(*) FROM journal_entries WHERE user_id = $1 AND DATE(created_at) = CURRENT_DATE) as journal_entries,
         (SELECT EXISTS(SELECT 1 FROM morning_intentions WHERE user_id = $1 AND date = CURRENT_DATE)) as morning_done,
         (SELECT EXISTS(SELECT 1 FROM evening_reflections WHERE user_id = $1 AND date = CURRENT_DATE)) as evening_done`,
      [req.user.id]
    );

    // Calculate level based on points
    const totalPoints = parseInt(points.rows[0].total_points);
    const level = Math.floor(Math.sqrt(totalPoints / 100)) + 1;
    const currentLevelPoints = Math.pow(level - 1, 2) * 100;
    const nextLevelPoints = Math.pow(level, 2) * 100;
    const levelProgress = ((totalPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;

    res.json({
      streaks: streaks.rows,
      achievements: achievements.rows,
      points: {
        total: totalPoints,
        level,
        current_level_points: currentLevelPoints,
        next_level_points: nextLevelPoints,
        progress_percent: Math.min(levelProgress, 100)
      },
      today: todayStats.rows[0]
    });
  })
);

// ============================================================
// GET /api/progress/streaks - Get all streaks
// ============================================================
router.get('/streaks',
  asyncHandler(async (req, res) => {
    const result = await query(
      `SELECT * FROM user_streaks WHERE user_id = $1 ORDER BY current_streak DESC`,
      [req.user.id]
    );

    res.json({ streaks: result.rows });
  })
);

// ============================================================
// GET /api/progress/achievements - Get all achievements
// ============================================================
router.get('/achievements',
  asyncHandler(async (req, res) => {
    const { earned_only = 'false' } = req.query;

    // Get earned achievements
    const earned = await query(
      `SELECT * FROM achievements WHERE user_id = $1 ORDER BY earned_at DESC`,
      [req.user.id]
    );

    // Define all possible achievements
    const allAchievements = [
      // Task milestones
      { type: 'task_milestone', name: 'First Step', description: 'Complete your first task', icon: '🎯', tier: 'bronze' },
      { type: 'task_milestone', name: '10 Tasks Complete', description: 'Complete 10 tasks', icon: '🏆', tier: 'bronze' },
      { type: 'task_milestone', name: '25 Tasks Complete', description: 'Complete 25 tasks', icon: '🏆', tier: 'silver' },
      { type: 'task_milestone', name: '50 Tasks Complete', description: 'Complete 50 tasks', icon: '🏆', tier: 'silver' },
      { type: 'task_milestone', name: '100 Tasks Complete', description: 'Complete 100 tasks', icon: '🏆', tier: 'gold' },

      // Streak achievements
      { type: 'streak', name: '7 Day Streak', description: 'Maintain any streak for 7 days', icon: '🔥', tier: 'bronze' },
      { type: 'streak', name: '30 Day Streak', description: 'Maintain any streak for 30 days', icon: '🔥', tier: 'silver' },
      { type: 'streak', name: '100 Day Streak', description: 'Maintain any streak for 100 days', icon: '🔥', tier: 'gold' },

      // Ritual achievements
      { type: 'ritual', name: 'Morning Person', description: 'Complete 7 morning intentions', icon: '☀️', tier: 'bronze' },
      { type: 'ritual', name: 'Night Owl', description: 'Complete 7 evening reflections', icon: '🌙', tier: 'bronze' },
      { type: 'ritual', name: 'Balanced Life', description: 'Complete both rituals for 7 days', icon: '⚖️', tier: 'silver' },

      // Journal achievements
      { type: 'journal', name: 'Dear Diary', description: 'Write your first journal entry', icon: '📝', tier: 'bronze' },
      { type: 'journal', name: 'Prolific Writer', description: 'Write 10,000 words total', icon: '✍️', tier: 'silver' },
      { type: 'journal', name: 'Consistent Journaler', description: 'Journal 30 days', icon: '📖', tier: 'gold' },

      // Mood tracking
      { type: 'mood', name: 'Self-Aware', description: 'Log mood 7 days in a row', icon: '🎭', tier: 'bronze' },
      { type: 'mood', name: 'Mood Master', description: 'Log 100 mood entries', icon: '📊', tier: 'silver' }
    ];

    const earnedNames = earned.rows.map(a => a.achievement_name);
    const available = allAchievements.filter(a => !earnedNames.includes(a.name));

    res.json({
      earned: earned.rows,
      available: earned_only === 'true' ? [] : available
    });
  })
);

// ============================================================
// GET /api/progress/weekly-story - Get weekly growth story
// ============================================================
router.get('/weekly-story',
  asyncHandler(async (req, res) => {
    // Check if we should show a new story (7+ days since last)
    const lastStory = await query(
      `SELECT * FROM weekly_stories WHERE user_id = $1 ORDER BY week_end DESC LIMIT 1`,
      [req.user.id]
    );

    const shouldGenerate = !lastStory.rows[0] ||
      new Date() - new Date(lastStory.rows[0].week_end) >= 7 * 24 * 60 * 60 * 1000;

    if (!shouldGenerate) {
      return res.json({
        story: lastStory.rows[0],
        next_story_date: new Date(new Date(lastStory.rows[0].week_end).getTime() + 7 * 24 * 60 * 60 * 1000)
      });
    }

    // Gather week's data
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const conversationCount = await query(
      `SELECT COUNT(*) as count FROM conversations WHERE user_id = $1 AND created_at >= $2`,
      [req.user.id, weekStart]
    );

    const tasksCompleted = await query(
      `SELECT COUNT(*) as count FROM tasks WHERE user_id = $1 AND status = 'completed' AND completed_at >= $2`,
      [req.user.id, weekStart]
    );

    const moodData = await query(
      `SELECT AVG(mood_score) as avg, array_agg(mood_score ORDER BY created_at) as scores
       FROM mood_entries WHERE user_id = $1 AND created_at >= $2`,
      [req.user.id, weekStart]
    );

    const streaksData = await query(
      `SELECT streak_type, current_streak FROM user_streaks WHERE user_id = $1 AND current_streak > 0`,
      [req.user.id]
    );

    const achievementsData = await query(
      `SELECT achievement_name FROM achievements WHERE user_id = $1 AND earned_at >= $2`,
      [req.user.id, weekStart]
    );

    // Calculate mood trend
    const scores = moodData.rows[0]?.scores || [];
    let moodTrend = 'stable';
    if (scores.length >= 3) {
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
      const secondHalf = scores.slice(Math.floor(scores.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      if (secondAvg - firstAvg > 0.5) moodTrend = 'improving';
      else if (firstAvg - secondAvg > 0.5) moodTrend = 'declining';
    }

    const weekData = {
      conversationCount: parseInt(conversationCount.rows[0].count),
      tasksCompleted: parseInt(tasksCompleted.rows[0].count),
      avgMood: parseFloat(moodData.rows[0]?.avg || 3),
      moodTrend,
      highlights: achievementsData.rows.map(a => a.achievement_name),
      challenges: [],
      streaks: streaksData.rows.map(s => `${s.streak_type}: ${s.current_streak} days`)
    };

    // Generate narrative
    const narrative = await ClaudeService.generateWeeklyStory(req.user.id, weekData);

    // Save story
    const story = await query(
      `INSERT INTO weekly_stories
       (user_id, week_start, week_end, narrative, highlights, mood_summary, achievements_earned,
        conversations_count, tasks_completed, total_points)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, 0)
       RETURNING *`,
      [
        req.user.id,
        weekStart,
        narrative,
        JSON.stringify(weekData.highlights),
        JSON.stringify({ avg: weekData.avgMood, trend: weekData.moodTrend }),
        JSON.stringify(weekData.highlights),
        weekData.conversationCount,
        weekData.tasksCompleted
      ]
    );

    res.json({
      story: story.rows[0],
      is_new: true
    });
  })
);

// ============================================================
// GET /api/progress/weekly-story/history - Get past stories
// ============================================================
router.get('/weekly-story/history',
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const result = await query(
      `SELECT * FROM weekly_stories WHERE user_id = $1 ORDER BY week_end DESC LIMIT $2`,
      [req.user.id, parseInt(limit)]
    );

    res.json({ stories: result.rows });
  })
);

// ============================================================
// GET /api/progress/insights - Get AI-generated insights
// ============================================================
router.get('/insights',
  asyncHandler(async (req, res) => {
    // Get unviewed insights
    const insights = await query(
      `SELECT * FROM user_insights WHERE user_id = $1 ORDER BY generated_at DESC LIMIT 10`,
      [req.user.id]
    );

    res.json({ insights: insights.rows });
  })
);

// ============================================================
// PUT /api/progress/insights/:id/viewed - Mark insight as viewed
// ============================================================
router.put('/insights/:id/viewed',
  [param('id').isUUID()],
  validate,
  asyncHandler(async (req, res) => {
    await query(
      `UPDATE user_insights SET is_new = false, viewed_at = NOW() WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );

    res.json({ success: true, message: 'Insight marked as viewed' });
  })
);

export default router;
