# Testing Quick Start Guide

## Overview

The backend now has comprehensive test coverage for:
- **Authentication Middleware** (33 tests)
- **Authentication Routes** (42 tests)  
- **Subscription Routes** (28 tests)

**Total: 103 tests** covering critical authentication and subscription functionality.

## Quick Commands

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Authentication middleware tests
npm test -- src/__tests__/middleware/auth.test.js

# Authentication routes tests
npm test -- src/__tests__/routes/auth.routes.test.js

# Subscription routes tests
npm test -- src/__tests__/routes/subscriptions.routes.test.js

# All tests including security
npm test
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Run in Watch Mode
```bash
npm test -- --watch
```

### Run Single Test by Name
```bash
npm test -- -t "successfully registers new user"
npm test -- -t "Authentication Middleware"
npm test -- -t "requireAdmin"
```

## Test File Locations

```
src/__tests__/
├── middleware/
│   ├── auth.test.js                 (33 tests - new)
│   └── security.test.js             (existing)
└── routes/
    ├── auth.routes.test.js          (42 tests - new)
    └── subscriptions.routes.test.js (28 tests - new)
```

## What Each Test Suite Covers

### auth.test.js (33 tests)
Middleware layer authentication:
- Token generation (access & refresh)
- Token verification
- JWT validation
- User authentication flow
- Optional authentication
- Admin access control
- Premium user checks

### auth.routes.test.js (42 tests)
HTTP API endpoints for authentication:
- User registration
- User login
- Token refresh
- Logout
- Change password
- Forgot password
- Get current user profile

### subscriptions.routes.test.js (28 tests)
Subscription and in-app purchase management:
- Check subscription status
- Verify App Store transactions
- Sync subscription state
- Trial period handling
- Premium status management
- Graceful degradation

## Test Results Format

Tests pass with output like:
```
PASS  src/__tests__/middleware/auth.test.js (5.234 s)
  Authentication Middleware
    generateAccessToken
      ✓ generates valid JWT access token (12 ms)
      ✓ includes premium status in token (2 ms)
    generateRefreshToken
      ✓ generates valid JWT refresh token (3 ms)
    ...
    
Test Suites: 1 passed, 1 total
Tests:       33 passed, 33 total
Snapshots:   0 total
Time:        5.234 s
```

## Common Testing Scenarios

### Running tests for a specific feature
```bash
# All auth-related tests
npm test -- auth

# Only subscription tests
npm test -- subscription
```

### Running with different output
```bash
# Verbose output
npm test -- --verbose

# Only show failures
npm test -- --bail

# Run tests in band (slower but good for debugging)
npm test -- --runInBand
```

## Debugging Tips

### View detailed error messages
```bash
npm test -- --verbose --no-coverage
```

### Run one test with logs
```bash
npm test -- -t "specifically test this" --verbose
```

### Check what mocks were called
The tests use Jest mocks - inspect `jest.fn()` calls to see:
- How many times a mock was called
- What arguments it received
- What it returned

## Before Committing

Run the full test suite:
```bash
npm test -- --coverage --watchAll=false
```

Check that:
- All tests pass (should see "Test Suites: X passed, X total")
- Coverage meets thresholds (70% minimum)
- No console errors or warnings

## Integration with CI/CD

These tests are designed for automated testing:

### GitHub Actions Example
```yaml
- name: Run tests
  run: npm test -- --coverage --watchAll=false
```

### Render Deployment
Tests run automatically on deploy if configured in `render.yaml`

## Common Issues & Solutions

### Tests timeout
- Increase timeout: `npm test -- --testTimeout=20000`
- Check for unresolved promises in mocks

### Database connection errors
- Tests use mocks, shouldn't connect to real DB
- Check that `jest.mock('../../database/db.js')` is present

### Token verification fails
- Ensure `process.env.JWT_SECRET` is set in globalSetup.js
- Verify token generation uses same secret as verification

## Next Steps

To expand test coverage:

1. **Create conversation tests** - `src/__tests__/routes/conversations.routes.test.js`
2. **Create user profile tests** - `src/__tests__/routes/users.routes.test.js`
3. **Create service tests** - Claude API, Socket.IO, etc.
4. **Add integration tests** - Full user workflows (register → login → chat)

See `TEST_GUIDE.md` for detailed documentation on test patterns and architecture.

## Need Help?

- Full test documentation: `TEST_GUIDE.md`
- Jest documentation: https://jestjs.io/docs/getting-started
- Supertest docs: https://github.com/visionmedia/supertest
- View existing tests: `src/__tests__/middleware/security.test.js`
