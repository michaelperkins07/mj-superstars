// ============================================================
// MJ's Superstars - Photos Routes Tests (ESM)
// ============================================================

import { jest, describe, test, expect, beforeEach, afterAll } from '@jest/globals';

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

// Dynamic imports after mocks
const { default: express } = await import('express');
const { default: request } = await import('supertest');
const photosRoutes = await import('../../routes/photos.js');
const authMiddleware = await import('../../middleware/auth.js');

// Build test app
const app = express();
app.use(express.json());
app.use('/api/photos', photosRoutes.default);

// Simple error handler for tests
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
});

describe('Photos Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/photos/upload', () => {
    test('uploads photo with valid data', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'photo-1',
          user_id: 'user-123',
          photo_type: 'progress',
          url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          thumbnail_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          caption: 'My progress',
          tags: ['weight-loss'],
          is_private: true,
          created_at: new Date()
        }]
      });

      mockQuery.mockResolvedValueOnce({ rows: [] }); // Award points

      const res = await request(app)
        .post('/api/photos/upload')
        .set('Authorization', `Bearer ${token}`)
        .send({
          base64Data: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          photo_type: 'progress',
          caption: 'My progress',
          tags: ['weight-loss'],
          is_private: true
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('photo-1');
      expect(res.body.photo_type).toBe('progress');
    });

    test('rejects upload without base64Data', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      const res = await request(app)
        .post('/api/photos/upload')
        .set('Authorization', `Bearer ${token}`)
        .send({
          photo_type: 'progress',
          caption: 'Missing base64'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/base64Data/i);
    });

    test('rejects invalid photo_type', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      const res = await request(app)
        .post('/api/photos/upload')
        .set('Authorization', `Bearer ${token}`)
        .send({
          base64Data: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          photo_type: 'invalid_type'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/photo_type/i);
    });

    test('rejects missing auth token', async () => {
      const res = await request(app)
        .post('/api/photos/upload')
        .send({
          base64Data: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          photo_type: 'progress'
        });

      expect(res.status).toBe(401);
    });

    test('accepts related_id and related_type for linked photos', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'photo-2',
          user_id: 'user-123',
          photo_type: 'mood',
          related_id: 'mood-456',
          related_type: 'mood',
          created_at: new Date()
        }]
      });

      mockQuery.mockResolvedValueOnce({ rows: [] }); // Award points

      const res = await request(app)
        .post('/api/photos/upload')
        .set('Authorization', `Bearer ${token}`)
        .send({
          base64Data: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          photo_type: 'mood',
          related_id: 'mood-456',
          related_type: 'mood'
        });

      expect(res.status).toBe(201);
      expect(res.body.related_id).toBe('mood-456');
    });

    test('rejects invalid related_type', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      const res = await request(app)
        .post('/api/photos/upload')
        .set('Authorization', `Bearer ${token}`)
        .send({
          base64Data: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
          photo_type: 'progress',
          related_id: 'some-id',
          related_type: 'invalid_type'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/related_type/i);
    });
  });

  describe('GET /api/photos', () => {
    test('lists user photos with pagination', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'photo-1', photo_type: 'progress', caption: 'First photo' },
          { id: 'photo-2', photo_type: 'mood', caption: 'Second photo' }
        ]
      });

      mockQuery.mockResolvedValueOnce({ rows: [{ total: '2' }] }); // Count query

      const res = await request(app)
        .get('/api/photos')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.photos).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBe(2);
    });

    test('respects pagination limit', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const res = await request(app)
        .get('/api/photos?page=2&limit=10')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.limit).toBe(10);
    });

    test('filters by photo_type', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'photo-1', photo_type: 'progress' }]
      });

      mockQuery.mockResolvedValueOnce({ rows: [{ total: '1' }] });

      const res = await request(app)
        .get('/api/photos?type=progress')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.photos).toHaveLength(1);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .get('/api/photos');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/photos/timeline', () => {
    test('returns progress photo timeline', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: 'photo-1', created_at: '2024-01-15', url: 'url1' },
          { id: 'photo-2', created_at: '2024-02-15', url: 'url2' }
        ]
      });

      const res = await request(app)
        .get('/api/photos/timeline')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.timeline).toHaveLength(2);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .get('/api/photos/timeline');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/photos/vision-board', () => {
    test('retrieves vision board (auto-creates if not exists)', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'vision-1',
          user_id: 'user-123',
          title: 'My Vision',
          items_count: 3,
          created_at: new Date()
        }]
      });

      const res = await request(app)
        .get('/api/photos/vision-board')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('vision-1');
      expect(res.body.title).toBe('My Vision');
    });

    test('auto-creates vision board if not found', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      // First query returns empty, second returns created vision board
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'vision-new',
          user_id: 'user-123',
          title: 'Vision Board'
        }]
      });

      const res = await request(app)
        .get('/api/photos/vision-board')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('vision-new');
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .get('/api/photos/vision-board');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/photos/vision-board/items', () => {
    test('adds item to vision board', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'item-1',
          vision_board_id: 'vision-1',
          photo_url: 'url',
          title: 'Get fit',
          created_at: new Date()
        }]
      });

      const res = await request(app)
        .post('/api/photos/vision-board/items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          photo_url: 'url',
          title: 'Get fit'
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('item-1');
      expect(res.body.title).toBe('Get fit');
    });

    test('requires photo_url', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      const res = await request(app)
        .post('/api/photos/vision-board/items')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Missing URL' });

      expect(res.status).toBe(400);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .post('/api/photos/vision-board/items')
        .send({ photo_url: 'url', title: 'Item' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/photos/vision-board/items/:id', () => {
    test('deletes vision board item', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      // Check ownership
      mockQuery.mockResolvedValueOnce({
        rows: [{ user_id: 'user-123' }]
      });

      // Delete query
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/photos/vision-board/items/item-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    test('returns 404 for nonexistent item', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .delete('/api/photos/vision-board/items/invalid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    test('returns 403 for unauthorized deletion', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      // Check ownership - different user
      mockQuery.mockResolvedValueOnce({
        rows: [{ user_id: 'other-user' }]
      });

      const res = await request(app)
        .delete('/api/photos/vision-board/items/item-1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .delete('/api/photos/vision-board/items/item-1');

      expect(res.status).toBe(401);
    });
  });
});
