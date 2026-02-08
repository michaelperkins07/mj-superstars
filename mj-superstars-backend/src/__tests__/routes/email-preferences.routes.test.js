// ============================================================
// MJ's Superstars - Email Preferences Routes Tests (ESM)
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

// Mock email service
const mockEmailService = {
  generateUnsubscribeToken: jest.fn().mockReturnValue('unsubscribe-token-123'),
  sendTestEmail: jest.fn().mockResolvedValue(true)
};

jest.unstable_mockModule('../../services/email.js', () => ({
  default: mockEmailService
}));

// Dynamic imports after mocks
const { default: express } = await import('express');
const { default: request } = await import('supertest');
const emailPreferencesRoutes = await import('../../routes/email-preferences.js');
const authMiddleware = await import('../../middleware/auth.js');

// Build test app
const app = express();
app.use(express.json());
app.use('/api/email-preferences', emailPreferencesRoutes.default);

// Simple error handler
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ error: err.message });
});

describe('Email Preferences Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/email-preferences', () => {
    test('retrieves existing email preferences', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pref-1',
          user_id: 'user-123',
          weekly_digest: true,
          coaching_nudges: true,
          buddy_sharing: false,
          digest_day: 'monday',
          digest_time: '09:00',
          nudge_frequency: 'daily',
          last_digest_sent_at: null,
          last_nudge_sent_at: null,
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const res = await request(app)
        .get('/api/email-preferences')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.weekly_digest).toBe(true);
      expect(res.body.data.nudge_frequency).toBe('daily');
    });

    test('auto-creates default preferences if not found', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-456',
        email: 'newuser@example.com',
        is_premium: false
      });

      // First query returns empty
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Insert default preferences
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Fetch newly created preferences
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'pref-new',
          user_id: 'user-456',
          weekly_digest: true,
          coaching_nudges: true,
          buddy_sharing: false,
          digest_day: 'monday',
          digest_time: '09:00',
          nudge_frequency: 'daily',
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const res = await request(app)
        .get('/api/email-preferences')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nudge_frequency).toBe('daily');
    });

    test('returns correct default values for new preferences', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-789',
        email: 'another@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          weekly_digest: true,
          coaching_nudges: true,
          buddy_sharing: false,
          digest_day: 'monday',
          nudge_frequency: 'daily'
        }]
      });

      const res = await request(app)
        .get('/api/email-preferences')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.weekly_digest).toBe(true);
      expect(res.body.data.coaching_nudges).toBe(true);
      expect(res.body.data.buddy_sharing).toBe(false);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .get('/api/email-preferences');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/email-preferences', () => {
    test('updates email preferences', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          weekly_digest: false,
          coaching_nudges: true,
          nudge_frequency: 'weekdays'
        }]
      });

      const res = await request(app)
        .put('/api/email-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          weekly_digest: false,
          coaching_nudges: true,
          nudge_frequency: 'weekdays'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('rejects invalid digest_day', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      const res = await request(app)
        .put('/api/email-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          digest_day: 'invalid_day'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/digest_day/i);
    });

    test('rejects invalid nudge_frequency', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      const res = await request(app)
        .put('/api/email-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nudge_frequency: 'invalid_frequency'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/nudge_frequency/i);
    });

    test('validates valid nudge_frequency values', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ nudge_frequency: 'weekdays' }]
      });

      const res = await request(app)
        .put('/api/email-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          nudge_frequency: 'weekdays'
        });

      expect(res.status).toBe(200);
    });

    test('accepts all valid nudge_frequency values', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      for (const frequency of ['daily', 'weekdays', 'custom']) {
        jest.clearAllMocks();
        mockQuery.mockResolvedValueOnce({
          rows: [{ nudge_frequency: frequency }]
        });

        const res = await request(app)
          .put('/api/email-preferences')
          .set('Authorization', `Bearer ${token}`)
          .send({ nudge_frequency: frequency });

        expect(res.status).toBe(200);
      }
    });

    test('requires buddy_email when buddy_sharing enabled', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      const res = await request(app)
        .put('/api/email-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          buddy_sharing: true
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/buddy_email/i);
    });

    test('allows buddy_email when buddy_sharing enabled', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ buddy_sharing: true, buddy_email: 'buddy@example.com' }]
      });

      const res = await request(app)
        .put('/api/email-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          buddy_sharing: true,
          buddy_email: 'buddy@example.com'
        });

      expect(res.status).toBe(200);
    });

    test('updates multiple preferences at once', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{
          weekly_digest: false,
          coaching_nudges: false,
          digest_day: 'friday',
          nudge_frequency: 'custom'
        }]
      });

      const res = await request(app)
        .put('/api/email-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({
          weekly_digest: false,
          coaching_nudges: false,
          digest_day: 'friday',
          nudge_frequency: 'custom'
        });

      expect(res.status).toBe(200);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .put('/api/email-preferences')
        .send({ weekly_digest: false });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/email-preferences/send-test', () => {
    test('sends test email', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockEmailService.sendTestEmail.mockResolvedValueOnce(true);

      const res = await request(app)
        .post('/api/email-preferences/send-test')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('handles email service errors', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockEmailService.sendTestEmail.mockRejectedValueOnce(
        new Error('Email service unavailable')
      );

      const res = await request(app)
        .post('/api/email-preferences/send-test')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
    });

    test('requires auth token', async () => {
      const res = await request(app)
        .post('/api/email-preferences/send-test');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/email-preferences/unsubscribe/:token', () => {
    test('unsubscribes user without auth', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          user_id: 'user-123',
          email: 'test@example.com'
        }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ success: true }]
      });

      const res = await request(app)
        .get('/api/email-preferences/unsubscribe/unsubscribe-token-123');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('returns 404 for invalid unsubscribe token', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const res = await request(app)
        .get('/api/email-preferences/unsubscribe/invalid-token');

      expect(res.status).toBe(404);
    });

    test('handles batch unsubscribe for all email types', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          user_id: 'user-123',
          email: 'test@example.com'
        }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ success: true }]
      });

      const res = await request(app)
        .get('/api/email-preferences/unsubscribe/valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('does not require auth token', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ user_id: 'user-123' }]
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ success: true }]
      });

      const res = await request(app)
        .get('/api/email-preferences/unsubscribe/token-123');

      expect(res.status).toBe(200);
    });
  });

  describe('Validation Tests', () => {
    test('validates all days of the week', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

      for (const day of days) {
        jest.clearAllMocks();
        mockQuery.mockResolvedValueOnce({
          rows: [{ digest_day: day }]
        });

        const res = await request(app)
          .put('/api/email-preferences')
          .set('Authorization', `Bearer ${token}`)
          .send({ digest_day: day });

        expect(res.status).toBe(200);
      }
    });

    test('prevents sending test email without authentication', async () => {
      const res = await request(app)
        .post('/api/email-preferences/send-test');

      expect(res.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    test('handles database errors gracefully on GET', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const res = await request(app)
        .get('/api/email-preferences')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/email preferences/i);
    });

    test('handles database errors gracefully on PUT', async () => {
      const token = authMiddleware.generateAccessToken({
        id: 'user-123',
        email: 'test@example.com',
        is_premium: false
      });

      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const res = await request(app)
        .put('/api/email-preferences')
        .set('Authorization', `Bearer ${token}`)
        .send({ weekly_digest: false });

      expect(res.status).toBe(500);
    });
  });
});
