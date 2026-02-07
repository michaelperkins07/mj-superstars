// ============================================================
// MJ's Superstars - Auth Routes Tests (ESM)
// ============================================================

import { jest, describe, test, expect, beforeEach } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.ADMIN_EMAILS = 'michaelperkins07@gmail.com';

// Mock database
const mockQuery = jest.fn();
const mockTransaction = jest.fn();
jest.unstable_mockModule('../../database/db.js', () => ({
  query: mockQuery,
  transaction: mockTransaction,
  default: { query: mockQuery, transaction: mockTransaction }
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }
}));

jest.unstable_mockModule('../../services/email.js', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

// Dynamic imports after mocks
const { default: express } = await import('express');
const { default: request } = await import('supertest');
const authRoutes = await import('../../routes/auth.js');
import bcrypt from 'bcryptjs';

// Build test app with real error handler
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes.default);
// Simple error handler for tests
app.use((err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ error: err.message, code: err.code || 'SERVER_ERROR' });
});

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // REGISTER
  describe('POST /api/auth/register', () => {
    test('creates new user with valid data', async () => {
      // Check existing user
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // transaction callback — mock the client passed to the callback
      mockTransaction.mockImplementationOnce(async (cb) => {
        const mockClient = {
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [{ id: 'new-id', email: 'new@example.com', display_name: 'New', is_premium: false, created_at: new Date() }] })
            .mockResolvedValue({ rows: [] })
        };
        return cb(mockClient);
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: 'StrongPass123!', display_name: 'New' });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.tokens).toBeDefined();
      expect(res.body.tokens.access_token).toBeDefined();
    });

    test('rejects duplicate email with 409', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'existing@example.com', password: 'StrongPass123!' });
      expect(res.status).toBe(409);
    });

    test('rejects invalid email with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'StrongPass123!' });
      expect(res.status).toBe(400);
    });

    test('rejects short password with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'valid@example.com', password: '123' });
      expect(res.status).toBe(400);
    });
  });

  // LOGIN
  describe('POST /api/auth/login', () => {
    test('authenticates with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword1!', 10);
      // User lookup
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'user-1', email: 'user@example.com', password_hash: hashedPassword, display_name: 'User', is_premium: false, is_active: true }]
      });
      // Store refresh token (INSERT INTO user_sessions)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Update last_active
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'CorrectPassword1!' });

      expect(res.status).toBe(200);
      expect(res.body.tokens).toBeDefined();
      expect(res.body.tokens.access_token).toBeDefined();
      expect(res.body.user).toBeDefined();
    });

    test('rejects wrong password with 401', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword1!', 10);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'user-1', email: 'user@example.com', password_hash: hashedPassword, display_name: 'User', is_premium: false, is_active: true }]
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'WrongPassword1!' });

      expect(res.status).toBe(401);
    });

    test('rejects nonexistent user with 401', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'Password123!' });
      expect(res.status).toBe(401);
    });

    test('rejects deactivated account with 403', async () => {
      const hashedPassword = await bcrypt.hash('Password1!', 10);
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'user-1', email: 'deactivated@example.com', password_hash: hashedPassword, display_name: 'D', is_premium: false, is_active: false }]
      });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'deactivated@example.com', password: 'Password1!' });
      expect(res.status).toBe(403);
    });

    test('rejects missing fields with 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
