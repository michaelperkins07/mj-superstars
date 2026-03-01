// ============================================================
// Example: Integration with auth.js for user registration
// Add this to src/routes/auth.js after user is created
// ============================================================

// IMPORT (add to top of auth.js)
import { initializeUserCampaigns } from '../services/campaignScheduler.js';

// USAGE IN REGISTRATION ENDPOINT (example - adapt to your existing code)

/**
 * POST /api/auth/register
 * User registration with campaign initialization
 */
router.post('/register',
  [
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
    body('name').trim().notEmpty()
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new APIError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, name, timezone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, created_at`,
      [email, hashedPassword, name, 'America/New_York'] // Set timezone
    );

    const user = result.rows[0];

    // ============================================================
    // IMPORTANT: Initialize campaigns for new user
    // This creates notification preferences and schedules campaigns
    // ============================================================
    try {
      await initializeUserCampaigns(user.id);
      logger.info('Campaigns initialized for new user:', user.id);
    } catch (error) {
      // Log but don't fail registration if campaigns fail
      logger.warn('Failed to initialize campaigns:', error.message);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        created_at: user.created_at
      },
      token
    });
  })
);

// ============================================================
// ALTERNATIVE: For social signup (Google, Apple, etc.)
// ============================================================

/**
 * POST /api/auth/social-register
 * Social signup with campaign initialization
 */
router.post('/social-register',
  asyncHandler(async (req, res) => {
    const { email, name, provider, providerId } = req.body;

    // Create or update user
    const result = await query(
      `INSERT INTO users (email, name, timezone, ${provider}_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE
       SET name = COALESCE($2, name),
           ${provider}_id = $4
       RETURNING id, email, name, created_at`,
      [email, name, 'America/New_York', providerId]
    );

    const user = result.rows[0];

    // Initialize campaigns
    try {
      await initializeUserCampaigns(user.id);
    } catch (error) {
      logger.warn('Failed to initialize campaigns for social user:', error.message);
    }

    // Generate token...
  })
);

// ============================================================
// MANUAL CAMPAIGN INITIALIZATION
// For existing users or testing
// ============================================================

/**
 * POST /api/auth/campaigns/initialize
 * Manually initialize campaigns for current user (for testing)
 */
router.post('/campaigns/initialize',
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      await initializeUserCampaigns(req.user.id);

      res.json({
        success: true,
        message: 'Campaigns initialized successfully',
        userId: req.user.id
      });
    } catch (error) {
      logger.error('Failed to initialize campaigns:', error.message);
      throw new APIError('Failed to initialize campaigns', 500, 'INIT_FAILED');
    }
  })
);

export default router;

// ============================================================
// NOTES FOR INTEGRATION
// ============================================================

/*
1. ADD TIMEZONE TO USER REGISTRATION
   The campaign scheduler requires users to have a timezone.
   Add this when creating users:

   timezone: req.body.timezone || 'America/New_York'

2. DATABASE MIGRATION
   Make sure you've run the migration:
   npm run migrate

   This creates:
   - notification_preferences table
   - campaigns table
   - timezone column in users table (if missing)

3. TESTING
   After integrating, test with:

   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123",
       "name": "Test User"
     }'

   Then check if campaigns were created:
   SELECT COUNT(*) FROM campaigns WHERE user_id = 'user-id';

4. ERROR HANDLING
   initializeUserCampaigns() is wrapped in try/catch.
   Failures won't block registration - just logged as warning.
   This is intentional to ensure sign-up always succeeds.

5. TIMEZONE
   Set user.timezone to their actual timezone.
   Valid examples:
   - 'America/New_York'
   - 'Europe/London'
   - 'Asia/Tokyo'
   - 'Australia/Sydney'
   - 'America/Los_Angeles'

6. CAMPAIGN PROCESSING
   Don't forget to set up the hourly cron job:
   See CAMPAIGN_SCHEDULER_INTEGRATION.md step 4

7. REDIS/JOB QUEUE
   If using Bull, make sure Redis is running.
   Without Redis, jobs still work but without persistence.
*/
