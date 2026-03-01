// ============================================================
// Top Performer - Social Routes Tests (ESM)
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

// Dynamic imports after mocks
const { default: express } = await import('express');
const { default: request } = await import('supertest');
const socialRoutes = await import('../../routes/social.js');
const authMiddleware = await import('../../middleware/auth.js');

// Build test app
const app = express();
app.use(express.json());
app.use('/api/social', socialRoutes.default);

// Simple error handler
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ error: err.message });
});

describe('Social Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/social/posts', () => {
    test('creates social post with valid data', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'post-1',
          user_id: 'user-123',
          post_type: 'achievement',
          content: 'I achieved something!',
          visibility: 'buddies',
          likes_count: 0,
          comments_count: 0,
          created_at: new Date()
        }]
      });

      mockQuery.mockResolvedValueOnce({ rows: [] }); // Award points

      const res = await request(app)
        .post('/api/social/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          post_type: 'achievement',
          content: 'I achieved something!',
          visibility: 'buddies'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('post-1');
      expect(res.body.post_type).toBe('achievement');
    });

    test('rejects invalid post_type', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      const res = await request(app)
        .post('/api/social/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          post_type: 'invalid_type',
          content: 'Test'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/post_type/i);
    });

    test('rejects invalid visibility', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      const res = await request(app)
        .post('/api/social/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          post_type: 'achievement',
          content: 'Test',
          visibility: 'invalid'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/visibility/i);
    });

    test('defaults to buddies visibility if not provided', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'post-2',
          visibility: 'buddies'
        }]
      });

      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/social/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          post_type: 'achievement',
          content: 'Test'
        });

      expect(res.status).toBe(201);
      expect(res.body.visibility).toBe('buddies');
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .post('/api/social/posts')
        .send({ post_type: 'achievement', content: 'Test' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/social/feed', () => {
    test('retrieves user feed with pagination', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'post-1',
            user_id: 'user-456',
            content: 'Achievement post',
            display_name: 'Friend',
            user_liked: false
          }
        ]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ total: '10' }]
      });

      const res = await request(app)
        .get('/api/social/feed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.posts).toHaveLength(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(20);
    });

    test('respects page and limit parameters', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '50' }] });

      const res = await request(app)
        .get('/api/social/feed?page=2&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.pages).toBe(5);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .get('/api/social/feed');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/social/posts/:id/like', () => {
    test('likes a post', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'like-1' }]
      });

      const res = await request(app)
        .post('/api/social/posts/post-1/like')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(201);
    });

    test('prevents duplicate likes', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'like-1' }]
      });

      const res = await request(app)
        .post('/api/social/posts/post-1/like')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .post('/api/social/posts/post-1/like');

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/social/posts/:id/like', () => {
    test('unlikes a post', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'like-1' }]
      });

      const res = await request(app)
        .delete('/api/social/posts/post-1/like')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .delete('/api/social/posts/post-1/like');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/social/posts/:id/comments', () => {
    test('adds comment to post', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'post-1' }] });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'comment-1',
          post_id: 'post-1',
          user_id: 'user-123',
          content: 'Great job!',
          created_at: new Date()
        }]
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ display_name: 'Test User' }] });

      const res = await request(app)
        .post('/api/social/posts/post-1/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Great job!' });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe('Great job!');
    });

    test('requires content field', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      const res = await request(app)
        .post('/api/social/posts/post-1/comments')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .post('/api/social/posts/post-1/comments')
        .send({ content: 'Comment' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/social/follow/:id', () => {
    test('follows a user', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'follow-1',
          follower_id: 'user-123',
          following_id: 'user-456',
          status: 'active'
        }]
      });

      const res = await request(app)
        .post('/api/social/follow/user-456')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    test('prevents self-following', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      const res = await request(app)
        .post('/api/social/follow/user-123')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .post('/api/social/follow/user-456');

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/social/follow/:id', () => {
    test('unfollows a user', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'follow-1' }]
      });

      const res = await request(app)
        .delete('/api/social/follow/user-456')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .delete('/api/social/follow/user-456');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/social/discover', () => {
    test('retrieves discover feed with suggested users', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'user-456',
            display_name: 'Alice',
            followers_count: 50,
            is_following: false
          }
        ]
      });

      const res = await request(app)
        .get('/api/social/discover')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.suggestions).toBeDefined();
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .get('/api/social/discover');

      expect(res.status).toBe(401);
    });
  });

  describe('Visibility filtering', () => {
    test('respects public visibility', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'post-1',
          visibility: 'public',
          content: 'Public post'
        }]
      });

      mockQuery.mockResolvedValueOnce({ rows: [{ total: '1' }] });

      const res = await request(app)
        .get('/api/social/feed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.posts[0].visibility).toBe('public');
    });

    test('respects private visibility for own posts', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'post-1',
          user_id: 'user-123',
          visibility: 'private'
        }]
      });

      mockQuery.mockResolvedValueOnce({ rows: [{ total: '1' }] });

      const res = await request(app)
        .get('/api/social/feed')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});
