# Campaign Scheduler - Setup Checklist

## Pre-Integration Verification

- [ ] Node.js version 14+ (`node --version`)
- [ ] PostgreSQL running and accessible
- [ ] npm dependencies installed (`npm list | grep -E "(express|pg|bull)"`)
- [ ] Jest configured for testing (`jest.config.js` exists)
- [ ] Environment variables configured (`.env` file exists)

## Step 1: Database Migration

- [ ] Run migration: `npm run migrate`
- [ ] Verify tables created:
  ```sql
  \dt notification_preferences  -- Should exist
  \dt campaigns                 -- Should exist
  \d users                       -- Should have timezone column
  ```
- [ ] Verify indexes created:
  ```sql
  \di idx_notification_prefs_*  -- Should show indexes
  \di idx_campaigns_*            -- Should show indexes
  ```

## Step 2: Service File Setup

- [ ] Copy `src/services/campaignScheduler.js` to project
  - [ ] Verify file exists: `ls -la src/services/campaignScheduler.js`
  - [ ] Check imports are available (query, logger, NotificationService, jobQueue)
  - [ ] No syntax errors: `node --check src/services/campaignScheduler.js`

## Step 3: Routes Setup

- [ ] Copy `src/routes/notification-preferences.js` to project
  - [ ] Verify file exists: `ls -la src/routes/notification-preferences.js`
  - [ ] Verify imports (Router, body, query, authenticate, etc.)

- [ ] Copy `src/routes/admin-campaigns.js` to project
  - [ ] Verify file exists: `ls -la src/routes/admin-campaigns.js`
  - [ ] Verify admin middleware can be implemented in your auth system

## Step 4: Server.js Integration

In `src/server.js`:

- [ ] Add imports (around line 50):
  ```javascript
  import notificationPreferencesRoutes from './routes/notification-preferences.js';
  import adminCampaignsRoutes from './routes/admin-campaigns.js';
  ```

- [ ] Add route registrations (around line 272):
  ```javascript
  app.use('/api/notification-preferences', notificationPreferencesRoutes);
  app.use('/api/admin/campaigns', adminCampaignsRoutes);
  ```

- [ ] Verify server starts: `npm run dev` or `npm start`

## Step 5: Authentication Integration

In `src/routes/auth.js` (or your registration endpoint):

- [ ] Add import at top:
  ```javascript
  import { initializeUserCampaigns } from '../services/campaignScheduler.js';
  ```

- [ ] In registration/signup endpoint, after user is created:
  ```javascript
  try {
    await initializeUserCampaigns(user.id);
    logger.info('Campaigns initialized for user:', user.id);
  } catch (error) {
    logger.warn('Failed to initialize campaigns:', error.message);
  }
  ```

- [ ] When creating user, set timezone:
  ```javascript
  timezone: req.body.timezone || 'America/New_York'
  ```

- [ ] Test registration:
  ```bash
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"pass123","name":"Test"}'
  ```

## Step 6: Scheduler Setup

Create `src/workers/campaignProcessor.js`:

```javascript
import { processCampaigns } from '../services/campaignScheduler.js';
import { logger } from '../utils/logger.js';

export async function processCampaignsJob() {
  try {
    const results = await processCampaigns();
    logger.info('Campaign processing completed:', results);
  } catch (error) {
    logger.error('Campaign processor failed:', error.message);
  }
}

export default { processCampaignsJob };
```

- [ ] File created: `ls -la src/workers/campaignProcessor.js`

In your scheduler (e.g., `src/services/scheduler.js`):

- [ ] Add import:
  ```javascript
  import { processCampaignsJob } from '../workers/campaignProcessor.js';
  ```

- [ ] Schedule hourly execution:
  ```javascript
  // Using node-schedule
  schedule.scheduleJob('0 * * * *', processCampaignsJob);

  // Or using Bull
  await addScheduledJob('scheduled', 'process_campaigns', {}, '0 * * * *');
  ```

- [ ] Verify scheduler module loads without errors

## Step 7: Testing

### Test Database Setup
- [ ] Run migrations: `npm run migrate`
- [ ] Verify tables exist in psql

### Test User Registration
- [ ] Create a test account via API
  ```bash
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"Test123!","name":"Test User"}'
  ```

- [ ] Verify user created:
  ```bash
  psql -c "SELECT id, email FROM users WHERE email='test@test.com';"
  ```

- [ ] Verify preferences created:
  ```bash
  psql -c "SELECT * FROM notification_preferences WHERE user_id='UUID';"
  ```

- [ ] Verify campaigns scheduled:
  ```bash
  psql -c "SELECT COUNT(*) FROM campaigns WHERE user_id='UUID';"
  ```

### Test Endpoints

- [ ] Get preferences:
  ```bash
  curl -X GET http://localhost:3000/api/notification-preferences \
    -H "Authorization: Bearer $TOKEN"
  ```
  Expected: 200 OK with preferences object

- [ ] Update preferences:
  ```bash
  curl -X PUT http://localhost:3000/api/notification-preferences \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"mood_reminder_time":"08:00"}'
  ```
  Expected: 200 OK with updated preferences

- [ ] Get history:
  ```bash
  curl -X GET http://localhost:3000/api/notification-preferences/history \
    -H "Authorization: Bearer $TOKEN"
  ```
  Expected: 200 OK with campaigns array

- [ ] Get stats:
  ```bash
  curl -X GET http://localhost:3000/api/notification-preferences/stats \
    -H "Authorization: Bearer $TOKEN"
  ```
  Expected: 200 OK with statistics object

### Test Admin Endpoints

- [ ] Check health:
  ```bash
  curl -X GET http://localhost:3000/api/admin/campaigns/health \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```
  Expected: 200 OK with health status

- [ ] Test mood check notification:
  ```bash
  curl -X POST http://localhost:3000/api/admin/campaigns/test/mood-check/$USER_ID \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```
  Expected: 200 OK, notification sent

- [ ] Manual campaign processing:
  ```bash
  curl -X POST http://localhost:3000/api/admin/campaigns/process \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```
  Expected: 200 OK with results

## Step 8: Timezone Validation

- [ ] Users can have timezone set:
  ```sql
  UPDATE users SET timezone='America/Los_Angeles' WHERE id='UUID';
  SELECT timezone FROM users WHERE id='UUID';
  ```

- [ ] Valid timezone list checked:
  ```javascript
  // Should work: America/New_York, Europe/London, Asia/Tokyo, etc.
  // Invalid timezones default to America/New_York
  ```

## Step 9: Logging Verification

- [ ] Check logs for campaign initialization:
  ```bash
  tail -f logs/server.log | grep "Campaigns initialized"
  ```

- [ ] Check for processing logs:
  ```bash
  tail -f logs/server.log | grep "Campaign processing"
  ```

- [ ] No errors in logs:
  ```bash
  tail -f logs/server.log | grep ERROR
  ```

## Step 10: Production Readiness

- [ ] Environment variables set:
  - [ ] `NODE_ENV=production`
  - [ ] `DATABASE_URL=...`
  - [ ] `REDIS_URL=...` (optional but recommended)
  - [ ] `LOG_LEVEL=info`

- [ ] Database backups configured
- [ ] Monitoring/alerts configured for:
  - [ ] High error rate in campaign processing
  - [ ] Scheduler not running
  - [ ] Database connection issues

- [ ] Rate limiting configured:
  - [ ] `/api/notification-preferences` - Standard limits
  - [ ] `/api/admin/campaigns` - Admin-only access

- [ ] CORS configured to allow frontend origin
- [ ] Error tracking (Sentry) configured

## Step 11: Documentation

- [ ] Read `CAMPAIGN_SCHEDULER_INTEGRATION.md` ✓
- [ ] Read `IMPLEMENTATION_SUMMARY.md` ✓
- [ ] Read `ARCHITECTURE_OVERVIEW.md` ✓
- [ ] Share docs with team
- [ ] Document in your project README

## Step 12: Monitoring Setup

- [ ] Dashboard to monitor:
  - [ ] Total campaigns sent (daily)
  - [ ] Campaign success rate
  - [ ] Processing time per run
  - [ ] User adoption rates

- [ ] Alerts for:
  - [ ] processCampaigns() failing
  - [ ] More than 5% campaign failures
  - [ ] Processing taking > 5 seconds
  - [ ] Database connectivity issues

## Rollback Plan

If issues arise:

- [ ] Database rollback:
  ```bash
  # Delete migration tables
  psql -c "DROP TABLE IF EXISTS campaigns, notification_preferences;"

  # Remove timezone column if needed
  psql -c "ALTER TABLE users DROP COLUMN IF EXISTS timezone;"
  ```

- [ ] Code rollback:
  ```bash
  git revert <commit-hash>
  npm install
  npm run migrate
  npm restart
  ```

- [ ] Check logs for errors:
  ```bash
  grep "Campaign\|notification_preferences\|campaigns" logs/server.log
  ```

## Post-Integration Verification

After deployment:

- [ ] Monitor error logs for 24 hours
- [ ] Check campaign sending in database:
  ```sql
  SELECT COUNT(*), status FROM campaigns GROUP BY status;
  SELECT COUNT(*) FROM campaigns WHERE DATE(sent_at) = CURRENT_DATE;
  ```

- [ ] Verify user preferences auto-created:
  ```sql
  SELECT COUNT(*) FROM notification_preferences;
  ```

- [ ] Random spot-check user preferences:
  ```sql
  SELECT * FROM notification_preferences LIMIT 5;
  ```

- [ ] Check scheduler is running hourly:
  ```bash
  tail logs/server.log | grep "Campaign processing"
  ```

## Troubleshooting During Setup

### "Table does not exist" error
- [ ] Run migration: `npm run migrate`
- [ ] Verify `008_notification_campaigns.sql` was executed
- [ ] Check PostgreSQL logs for migration errors

### "Cannot find module" error
- [ ] Verify file paths are correct
- [ ] Run `npm install` again
- [ ] Check imports match actual file structure

### Campaigns not initializing on signup
- [ ] Check auth.js was modified
- [ ] Verify try/catch wraps initializeUserCampaigns()
- [ ] Check logs for "Failed to initialize campaigns"
- [ ] Verify user_id is passed correctly

### processCampaigns not running
- [ ] Verify scheduler is imported in server.js
- [ ] Check scheduler module for syntax errors
- [ ] Verify cron expression is correct: `0 * * * *` (hourly)
- [ ] Check Redis running if using Bull: `redis-cli ping`

### Wrong timezone calculations
- [ ] Verify user timezone is set: `SELECT timezone FROM users LIMIT 1;`
- [ ] Verify timezone is valid IANA format
- [ ] Check server time is correct
- [ ] Verify mood_reminder_time format is "HH:MM"

### Database locks
- [ ] Check for long-running queries: `SELECT * FROM pg_stat_activity;`
- [ ] Kill stuck connections if needed
- [ ] Check for transactions left open
- [ ] Verify indexes are built: `\d campaigns`

## Support Resources

If stuck:

1. Check logs: `tail -f logs/server.log`
2. Read integration guide: `CAMPAIGN_SCHEDULER_INTEGRATION.md`
3. Check database: `psql -c "\d campaigns"`
4. Test endpoint manually with curl
5. Check source code comments in `campaignScheduler.js`

## Success Indicators

When everything is working:

- ✓ New users get notification preferences created
- ✓ API endpoints return 200 OK
- ✓ Campaign history shows sent campaigns
- ✓ Logs show "Campaign processing completed" hourly
- ✓ Database shows growing campaigns table
- ✓ Users can update their preferences
- ✓ Admin can send test notifications
- ✓ No errors in application logs

## Sign-Off

- [ ] All steps completed
- [ ] All tests passing
- [ ] Team notified of new features
- [ ] Documentation shared
- [ ] Monitoring configured
- [ ] Ready for production deployment

Date: ____________
Team Member: ____________
