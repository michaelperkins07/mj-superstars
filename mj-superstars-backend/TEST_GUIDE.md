# MJ Superstars Backend - Test Guide

This document describes the comprehensive test suite for the MJ Superstars Node.js/Express backend.

## Test Files Created

### 1. Authentication Middleware Tests
**File:** `src/__tests__/middleware/auth.test.js`

Comprehensive tests for the authentication middleware layer, covering:

#### Token Generation & Verification
- `generateAccessToken()` - creates valid JWT access tokens
- `generateRefreshToken()` - creates valid JWT refresh tokens
- `verifyToken()` - verifies and decodes JWT tokens
- Expired token handling
- Invalid token rejection

#### Authenticate Middleware
- Valid JWT token authentication
- Missing authorization header rejection
- Invalid Bearer format rejection
- Expired token rejection
- User not found in database
- Deactivated account rejection
- `last_active_at` timestamp updates on successful auth

#### Optional Authentication Middleware
- Allows requests with valid tokens
- Allows requests without tokens (continues as guest)
- Graceful handling of invalid tokens
- Database error handling

#### Admin Middleware (requireAdmin)
- Admin user with correct email
- Non-admin user blocking
- ADMIN_SECRET header authentication
- Invalid secret rejection
- Multiple admin email support
- Case-insensitive email matching

#### Premium User Middleware (requirePremium)
- Premium user access
- Non-premium user blocking

**Test Count:** 33 tests

### 2. Authentication Routes Tests
**File:** `src/__tests__/routes/auth.routes.test.js`

End-to-end tests for all authentication API endpoints using supertest.

#### POST /api/auth/register
- Successful registration with valid credentials
- Duplicate email rejection
- Invalid email format rejection
- Password too short rejection
- Missing email rejection
- Missing password rejection
- Optional display_name parameter handling
- User account initialization (personalization, streaks)
- Token generation and return

#### POST /api/auth/login
- Successful login with valid credentials
- Wrong password rejection
- Nonexistent user rejection
- Deactivated account rejection
- Invalid email format rejection
- Missing email rejection
- Missing password rejection
- Email normalization to lowercase
- Refresh token storage

#### POST /api/auth/refresh
- New access token generation with valid refresh token
- Invalid refresh token rejection
- Access token rejection (when used as refresh token)
- Token not in database rejection

#### GET /api/auth/me
- Current user retrieval with valid token
- Missing authentication token rejection
- Invalid token rejection
- Expired token rejection
- Bearer prefix requirement

#### POST /api/auth/logout
- Successful logout with token revocation
- Authentication requirement

#### POST /api/auth/change-password
- Successful password change with correct current password
- Wrong current password rejection
- Authentication requirement

#### POST /api/auth/forgot-password
- Password reset email for existing users
- Security: success response for nonexistent emails
- Invalid email format rejection

**Test Count:** 42 tests

### 3. Subscription Routes Tests
**File:** `src/__tests__/routes/subscriptions.routes.test.js`

Comprehensive tests for subscription and in-app purchase management.

#### GET /api/subscriptions/status
- Premium subscription status retrieval
- Free tier status for users without subscriptions
- Trial period status detection
- Multiple subscription handling (returns latest)
- Graceful degradation when table doesn't exist
- Authentication requirement

#### POST /api/subscriptions/verify
- Valid App Store transaction verification
- Receipt-based verification (alternative to transactionId)
- Trial period handling
- Expired subscription handling
- Graceful degradation when subscriptions table doesn't exist
- Missing transactionId and receipt rejection
- Authentication requirement
- User premium status update on verification
- Database transaction success/failure handling

#### POST /api/subscriptions/sync
- Client-initiated subscription sync
- Premium status marking for active subscriptions
- Non-premium status for inactive subscriptions
- Authentication requirement
- Graceful handling of missing users table

#### Edge Cases
- Multiple concurrent subscription verification requests
- Auto-renew status detection
- Revocation date handling

**Test Count:** 28 tests

## Running the Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- src/__tests__/middleware/auth.test.js
npm test -- src/__tests__/routes/auth.routes.test.js
npm test -- src/__tests__/routes/subscriptions.routes.test.js
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Run Tests with Coverage Report
```bash
npm test -- --coverage
```

### Run Single Test Suite
```bash
npm test -- -t "Authentication Middleware"
npm test -- -t "Authentication Routes"
npm test -- -t "Subscription Routes"
```

## Test Architecture

### Mocking Strategy

#### Database Mocking
All tests mock the `db` module to prevent actual database connections:
```javascript
jest.mock('../../database/db.js');
```

Mocked methods:
- `query()` - Returns controlled mock responses
- `transaction()` - Simulates transaction behavior

#### Service Mocking
- **Email Service:** Mocked to prevent actual email sends
- **App Store Verification:** Mocked to simulate Apple's verification API
- **Logger:** Mocked to capture log output

#### Environment Setup
Tests automatically set:
```javascript
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.ENCRYPTION_KEY = 'a'.repeat(64);
```

### Global Setup/Teardown
- `src/__tests__/globalSetup.js` - Initializes test environment
- `src/__tests__/globalTeardown.js` - Cleans up after tests

## Test Patterns & Best Practices

### 1. Using Supertest for HTTP Testing
```javascript
const response = await request(app)
  .post('/api/auth/register')
  .send({ email: 'test@example.com', password: 'SecurePass123' });

expect(response.status).toBe(201);
expect(response.body.user).toBeDefined();
```

### 2. JWT Token Testing
```javascript
// Generate token for authenticated routes
const token = authMiddleware.generateAccessToken(user);

// Use in request
.set('Authorization', `Bearer ${token}`)
```

### 3. Database Mock Setup
```javascript
// Mock successful query
db.query.mockResolvedValueOnce({
  rows: [{ id: 'user-123', email: 'test@example.com' }]
});

// Mock database error
const error = new Error('Database connection failed');
error.code = '42P01'; // PostgreSQL table not found
db.query.mockRejectedValueOnce(error);
```

### 4. Service Mock Setup
```javascript
// Mock App Store verification
appStoreVerification.verifyTransactionSafe.mockResolvedValueOnce({
  valid: true,
  transactionInfo: { productId: 'com.mjsuperstars.premium' }
});
```

## Coverage Goals

The Jest configuration has coverage thresholds:
- **Lines:** 70%
- **Functions:** 70%
- **Branches:** 70%
- **Statements:** 70%

Current test suite covers:
- **auth.test.js:** 33 tests covering middleware
- **auth.routes.test.js:** 42 tests covering API endpoints
- **subscriptions.routes.test.js:** 28 tests covering subscription management

**Total: 103 tests**

## Error Handling Tests

All tests include error scenarios:
- Invalid input validation
- Missing required fields
- Authentication failures
- Authorization failures
- Database errors
- Graceful degradation
- Edge cases

## Security Testing

Tests verify:
- JWT token expiration
- Invalid token rejection
- Authorization headers validation
- Admin authentication via secret
- Email case-insensitive handling
- Password requirements
- CORS and CSRF protections (via security.test.js)

## Future Test Coverage

Additional test files to create:
1. `src/__tests__/routes/conversations.routes.test.js` - Chat/conversation endpoints
2. `src/__tests__/routes/users.routes.test.js` - User profile endpoints
3. `src/__tests__/services/claude.test.js` - Anthropic Claude service
4. `src/__tests__/services/socket.test.js` - WebSocket handlers
5. Integration tests for full user workflows

## Debugging Tests

### Run with Verbose Output
```bash
npm test -- --verbose
```

### Run Single Test
```bash
npm test -- -t "successfully registers new user"
```

### Debug in VSCode
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-coverage"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Notes

- All tests are isolated and can run in any order
- Mock state is cleared between tests via `clearAllMocks()`
- Tests use ES modules (import/export) matching the backend
- Response assertions include both HTTP status and body validation
- Error responses include error codes for consistency

## Continuous Integration

These tests are designed to run in CI/CD pipelines:
```bash
# In CI environment
npm test -- --coverage --watchAll=false
```

Results are compatible with:
- GitHub Actions
- GitLab CI
- CircleCI
- Jenkins
- Render deployments
