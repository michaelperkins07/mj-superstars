// ============================================================
// MJ's Superstars - Subscription Routes Tests (ESM)
// ============================================================

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.JWT_EXPIRES_IN = '15m';
process.env.ADMIN_EMAILS = 'michaelperkins07@gmail.com';

const mockQuery = jest.fn();
jest.unstable_mockModule('../../database/db.js', () => ({
  query: mockQuery,
  default: { query: mockQuery }
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }
}));

const mockVerifyTransactionSafe = jest.fn();
jest.unstable_mockModule('../../services/appStoreVerification.js', () => ({
  verifyTransactionSafe: mockVerifyTransactionSafe,
  initializeAppStoreVerification: jest.fn(),
  default: { verifyTransactionSafe: mockVerifyTransactionSafe }
}));

const { default: express } = await import('express');
const { default: request } = await import('supertest');
const subscriptionRoutes = await import('../../routes/subscriptions.js');
const { generateAccessToken } = await import('../../middleware/auth.js');

const app = express();
app.use(express.json());
app.use('/api/subscriptions', subscriptionRoutes.default);
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
});

describe('Subscription Routes', () => {
  let authToken;

  beforeEach(() => {
    jest.clearAllMocks();
    authToken = generateAccessToken({ id: 'user-1', email: 'test@e.com', is_premium: false });
  });

  // Helper: mock authenticate middleware DB calls
  const mockAuthSuccess = () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-1', email: 'test@e.com', display_name: 'Test', is_premium: false, is_active: true }]
    });
    mockQuery.mockResolvedValueOnce({ rows: [] }); // last_active_at update
  };

  describe('GET /api/subscriptions/status', () => {
    test('returns active subscription', async () => {
      mockAuthSuccess();
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 's1', user_id: 'user-1', product_id: 'premium.monthly', purchase_date: new Date(), expiration_date: new Date(Date.now() + 86400000), is_active: true, is_trial: false, trial_end_date: null, auto_renews: true }]
      });

      const res = await request(app)
        .get('/api/subscriptions/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isPremium).toBe(true);
      expect(res.body.subscription).toBeDefined();
    });

    test('returns free tier when no subscription', async () => {
      mockAuthSuccess();
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/subscriptions/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isPremium).toBe(false);
      expect(res.body.subscription).toBeNull();
    });

    test('handles missing subscriptions table gracefully', async () => {
      mockAuthSuccess();
      mockQuery.mockRejectedValueOnce({ code: '42P01', message: 'relation "subscriptions" does not exist' });

      const res = await request(app)
        .get('/api/subscriptions/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isPremium).toBe(false);
    });

    test('rejects unauthenticated request', async () => {
      const res = await request(app).get('/api/subscriptions/status');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/subscriptions/verify', () => {
    test('rejects missing transaction data', async () => {
      mockAuthSuccess();
      const res = await request(app)
        .post('/api/subscriptions/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    test('rejects unauthenticated verify request', async () => {
      const res = await request(app)
        .post('/api/subscriptions/verify')
        .send({ transactionId: 'txn-123' });
      expect(res.status).toBe(401);
    });
  });
});
