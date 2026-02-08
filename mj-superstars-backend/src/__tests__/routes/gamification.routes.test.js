// ============================================================
// MJ's Superstars - Gamification Routes Tests (ESM)
// ============================================================

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';

// Mock database
const mockQuery = jest.fn();
jest.unstable_mockModule('../../database/db.js', () => ({
  query: mockQuery,
  default: { query: mockQuery }
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }
}));

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  authenticateToken: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required', code: 'MISSING_TOKEN' });
    }
    req.user = { id: 'user-123', email: 'test@example.com', display_name: 'Test User', is_premium: false, is_active: true };
    next();
  },
  generateAccessToken: (user) => 'test-token-' + (user.id || 'default'),
  generateRefreshToken: (user) => 'test-refresh-' + (user.id || 'default'),
  verifyToken: (token) => ({ id: 'user-123', email: 'test@example.com' }),
  default: {
    authenticateToken: (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authorization required', code: 'MISSING_TOKEN' });
      }
      req.user = { id: 'user-123', email: 'test@example.com', display_name: 'Test User', is_premium: false, is_active: true };
      next();
    },
    generateAccessToken: (user) => 'test-token-' + (user.id || 'default'),
    generateRefreshToken: (user) => 'test-refresh-' + (user.id || 'default'),
    verifyToken: (token) => ({ id: 'user-123', email: 'test@example.com' })
  }
}));

// Mock gamification service
const mockGameification = {
  processLogin: jest.fn(),
  processComebackBonus: jest.fn(),
  checkMilestones: jest.fn(),
  getGamificationSummary: jest.fn(),
  getActiveFlashChallenges: jest.fn(),
  joinFlashChallenge: jest.fn()
};

jest.unstable_mockModule('../../services/gamification.js', () => ({
  default: mockGameification
}));

// Dynamic imports after mocks
const { default: express } = await import('express');
const { default: request } = await import('supertest');
const gamificationRoutes = await import('../../routes/gamification.js');
const authMiddleware = await import('../../middleware/auth.js');

// Build test app
const app = express();
app.use(express.json());
app.use('/api/gamification', gamificationRoutes.default);

// Simple error handler
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ error: err.message });
});

describe('Gamification Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/gamification/login-bonus', () => {
    test('processes daily login bonus', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockGameification.processLogin.mockResolvedValueOnce({
        points_earned: 10,
        streak_days: 5,
        streak_bonus_applied: false
      });

      mockGameification.processComebackBonus.mockResolvedValueOnce(null);

      mockGameification.checkMilestones.mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/api/gamification/login-bonus')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.login).toBeDefined();
      expect(res.body.login.points_earned).toBe(10);
    });

    test('includes comeback bonus if applicable', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockGameification.processLogin.mockResolvedValueOnce({
        points_earned: 10
      });

      mockGameification.processComebackBonus.mockResolvedValueOnce({
        points_earned: 50,
        days_away: 7
      });

      mockGameification.checkMilestones.mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/api/gamification/login-bonus')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.comeback).toBeDefined();
      expect(res.body.comeback.points_earned).toBe(50);
    });

    test('checks for new milestone achievements', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockGameification.processLogin.mockResolvedValueOnce({
        points_earned: 10
      });

      mockGameification.processComebackBonus.mockResolvedValueOnce(null);

      mockGameification.checkMilestones.mockResolvedValueOnce([
        {
          type: 'streak',
          value: 7,
          reward_type: 'badge'
        }
      ]);

      const res = await request(app)
        .post('/api/gamification/login-bonus')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.newMilestones).toHaveLength(1);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .post('/api/gamification/login-bonus');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/gamification/summary', () => {
    test('retrieves gamification dashboard data', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockGameification.getGamificationSummary.mockResolvedValueOnce({
        total_points: 1250,
        current_level: 5,
        level_progress: 45,
        current_streak: 7,
        longest_streak: 21,
        badges_earned: 8,
        multipliers_active: 2
      });

      const res = await request(app)
        .get('/api/gamification/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total_points).toBe(1250);
      expect(res.body.data.current_level).toBe(5);
      expect(res.body.data.current_streak).toBe(7);
    });

    test('includes all dashboard metrics', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      const summaryData = {
        total_points: 1000,
        current_level: 3,
        level_progress: 50,
        current_streak: 5,
        longest_streak: 15,
        badges_earned: 5,
        challenges_completed: 2,
        milestones_reached: 1,
        multipliers_active: 1
      };

      mockGameification.getGamificationSummary.mockResolvedValueOnce(summaryData);

      const res = await request(app)
        .get('/api/gamification/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(summaryData);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .get('/api/gamification/summary');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/gamification/challenges', () => {
    test('retrieves active flash challenges', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockGameification.getActiveFlashChallenges.mockResolvedValueOnce([
        {
          id: 'challenge-1',
          title: 'Daily Journal',
          description: 'Write in your journal',
          points_reward: 25,
          user_joined: false,
          user_completed: false,
          ends_at: new Date()
        },
        {
          id: 'challenge-2',
          title: '5-Day Streak',
          description: 'Complete activities 5 days in a row',
          points_reward: 50,
          user_joined: true,
          user_completed: false
        }
      ]);

      const res = await request(app)
        .get('/api/gamification/challenges')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].title).toBe('Daily Journal');
    });

    test('includes user progress on challenges', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockGameification.getActiveFlashChallenges.mockResolvedValueOnce([
        {
          id: 'challenge-1',
          user_joined: true,
          user_completed: false,
          progress: 60
        }
      ]);

      const res = await request(app)
        .get('/api/gamification/challenges')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].user_joined).toBe(true);
      expect(res.body.data[0].progress).toBe(60);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .get('/api/gamification/challenges');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/gamification/challenges/:id/join', () => {
    test('joins a flash challenge', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockGameification.joinFlashChallenge.mockResolvedValueOnce({
        challengeId: 'challenge-1',
        alreadyJoined: false
      });

      const res = await request(app)
        .post('/api/gamification/challenges/challenge-1/join')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.challengeId).toBe('challenge-1');
    });

    test('returns 200 if already joined', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockGameification.joinFlashChallenge.mockResolvedValueOnce({
        alreadyJoined: true,
        challengeId: 'challenge-1'
      });

      const res = await request(app)
        .post('/api/gamification/challenges/challenge-1/join')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.alreadyJoined).toBe(true);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .post('/api/gamification/challenges/challenge-1/join');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/gamification/milestones', () => {
    test('retrieves user milestones', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'milestone-1',
            milestone_type: 'streak',
            milestone_value: 7,
            celebration_shown: true,
            reward_type: 'badge',
            created_at: new Date()
          },
          {
            id: 'milestone-2',
            milestone_type: 'level',
            milestone_value: 5,
            celebration_shown: true,
            reward_type: 'points',
            reward_data: { points: 100 },
            created_at: new Date()
          }
        ]
      });

      const res = await request(app)
        .get('/api/gamification/milestones')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    test('returns empty array when no milestones', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/gamification/milestones')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .get('/api/gamification/milestones');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/gamification/milestones/:id/claim', () => {
    test('claims milestone reward', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'milestone-1', reward_type: 'badge' }]
      });

      mockQuery.mockResolvedValueOnce({ rows: [] }); // Update claim status

      const res = await request(app)
        .post('/api/gamification/milestones/milestone-1/claim')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    test('returns 404 for nonexistent milestone', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/gamification/milestones/invalid/claim')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .post('/api/gamification/milestones/milestone-1/claim');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/gamification/multipliers', () => {
    test('retrieves active multipliers', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'multiplier-1',
            type: 'streak_bonus',
            value: 1.5,
            expires_at: new Date()
          },
          {
            id: 'multiplier-2',
            type: 'weekend_bonus',
            value: 1.25,
            expires_at: new Date()
          }
        ]
      });

      const res = await request(app)
        .get('/api/gamification/multipliers')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.multipliers).toHaveLength(2);
      expect(res.body.multipliers[0].value).toBe(1.5);
    });

    test('only returns active multipliers', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'multiplier-1',
            type: 'streak_bonus',
            value: 1.5,
            expires_at: new Date(Date.now() + 86400000) // Tomorrow
          }
        ]
      });

      const res = await request(app)
        .get('/api/gamification/multipliers')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.multipliers).toHaveLength(1);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .get('/api/gamification/multipliers');

      expect(res.status).toBe(401);
    });
  });
});
