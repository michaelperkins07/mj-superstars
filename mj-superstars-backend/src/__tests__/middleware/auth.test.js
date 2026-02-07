// ============================================================
// MJ's Superstars - Authentication Middleware Tests (ESM)
// ============================================================

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Set env vars BEFORE importing auth module (it reads JWT_SECRET at load time)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.ADMIN_EMAILS = 'michaelperkins07@gmail.com';

// Mock database and logger before importing auth
const mockQuery = jest.fn();
jest.unstable_mockModule('../../database/db.js', () => ({
  query: mockQuery,
  default: { query: mockQuery }
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() }
}));

// Dynamic import AFTER env vars and mocks
const authMiddleware = await import('../../middleware/auth.js');

describe('Authentication Middleware', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = { headers: {}, user: null, ip: '127.0.0.1' };
    mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    mockNext = jest.fn();
  });

  // TOKEN GENERATION
  describe('generateAccessToken', () => {
    test('generates valid JWT with user data', () => {
      const user = { id: 'user-123', email: 'test@example.com', is_premium: false };
      const token = authMiddleware.generateAccessToken(user);
      expect(token).toBeDefined();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
    });

    test('includes premium status', () => {
      const token = authMiddleware.generateAccessToken({ id: 'u1', email: 'p@e.com', is_premium: true });
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.is_premium).toBe(true);
    });
  });

  describe('generateRefreshToken', () => {
    test('generates refresh token with type claim', () => {
      const token = authMiddleware.generateRefreshToken({ id: 'user-789', email: 'r@e.com' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe('user-789');
      expect(decoded.type).toBe('refresh');
    });
  });

  describe('verifyToken', () => {
    test('verifies valid token', () => {
      const token = authMiddleware.generateAccessToken({ id: 'u1', email: 't@e.com', is_premium: false });
      expect(authMiddleware.verifyToken(token).id).toBe('u1');
    });
    test('returns null for invalid token', () => {
      expect(authMiddleware.verifyToken('garbage')).toBeNull();
    });
    test('returns null for expired token', () => {
      const expired = jwt.sign({ id: 'u1' }, process.env.JWT_SECRET, { expiresIn: '-1h' });
      expect(authMiddleware.verifyToken(expired)).toBeNull();
    });
  });

  // AUTHENTICATE MIDDLEWARE
  describe('authenticate', () => {
    test('authenticates with valid Bearer token', async () => {
      const token = authMiddleware.generateAccessToken({ id: 'u1', email: 't@e.com', is_premium: false });
      mockReq.headers.authorization = `Bearer ${token}`;
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'u1', email: 't@e.com', display_name: 'Test', is_premium: false, is_active: true }]
      }).mockResolvedValueOnce({ rows: [] });
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.email).toBe('t@e.com');
    });

    test('rejects missing auth header with 401', async () => {
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('rejects expired token with 401', async () => {
      const expired = jwt.sign({ id: 'u1', email: 't@e.com' }, process.env.JWT_SECRET, { expiresIn: '-1h' });
      mockReq.headers.authorization = `Bearer ${expired}`;
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    test('rejects when user not found in DB', async () => {
      const token = authMiddleware.generateAccessToken({ id: 'gone', email: 'g@e.com', is_premium: false });
      mockReq.headers.authorization = `Bearer ${token}`;
      mockQuery.mockResolvedValueOnce({ rows: [] });
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  // OPTIONAL AUTH
  describe('optionalAuth', () => {
    test('sets user with valid token', async () => {
      const token = authMiddleware.generateAccessToken({ id: 'u1', email: 't@e.com', is_premium: false });
      mockReq.headers.authorization = `Bearer ${token}`;
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'u1', email: 't@e.com', display_name: 'T', is_premium: false, is_active: true }]
      }).mockResolvedValueOnce({ rows: [] });
      await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
    });

    test('continues without user when no token', async () => {
      await authMiddleware.optionalAuth(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // REQUIRE ADMIN
  describe('requireAdmin', () => {
    test('allows admin by email', () => {
      mockReq.user = { id: 'a1', email: 'michaelperkins07@gmail.com', is_premium: true };
      authMiddleware.requireAdmin(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('blocks non-admin user', () => {
      mockReq.user = { id: 'u1', email: 'nobody@example.com' };
      authMiddleware.requireAdmin(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('allows access via ADMIN_SECRET header', () => {
      process.env.ADMIN_SECRET = 'test-secret';
      mockReq.headers['x-admin-secret'] = 'test-secret';
      mockReq.user = { id: 'u1', email: 'nobody@example.com' };
      authMiddleware.requireAdmin(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('rejects invalid ADMIN_SECRET', () => {
      process.env.ADMIN_SECRET = 'test-secret';
      mockReq.headers['x-admin-secret'] = 'wrong';
      mockReq.user = { id: 'u1', email: 'nobody@example.com' };
      authMiddleware.requireAdmin(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    test('case-insensitive email matching', () => {
      mockReq.user = { id: 'a1', email: 'MICHAELPERKINS07@GMAIL.COM' };
      authMiddleware.requireAdmin(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  // REQUIRE PREMIUM
  describe('requirePremium', () => {
    test('allows premium user', () => {
      mockReq.user = { id: 'u1', is_premium: true };
      authMiddleware.requirePremium(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('blocks free user', () => {
      mockReq.user = { id: 'u1', is_premium: false };
      authMiddleware.requirePremium(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  // ALIAS
  describe('authenticateToken alias', () => {
    test('is same function as authenticate', () => {
      expect(authMiddleware.authenticateToken).toBe(authMiddleware.authenticate);
    });
  });
});
