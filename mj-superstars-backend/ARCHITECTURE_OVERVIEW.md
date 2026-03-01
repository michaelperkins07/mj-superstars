# Campaign Scheduler Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MJ Superstars Backend                        │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│   User Registration  │
│   (auth.js)          │
└──────────┬───────────┘
           │
           ├─→ Creates user in database
           │
           └─→ initializeUserCampaigns(userId)
                          │
                          ├─→ Create default notification_preferences
                          │
                          └─→ Schedule campaigns:
                              - onboardingDrip()
                              - dailyMoodCheckIn()
                              - reEngagementNudges()
                              - streakReminders()
                              - weeklyRecap()

┌──────────────────────────────────────────────────────────────────┐
│                    campaignScheduler.js                           │
│  ────────────────────────────────────────────────────────────    │
│                                                                   │
│  Campaign Templates                                              │
│  ├─ onboardingDrip (7 messages)                                  │
│  ├─ dailyMoodCheck (5 variations)                               │
│  ├─ reEngagement (4 messages)                                    │
│  ├─ streakProtection (1 message)                                │
│  └─ weeklyRecap (1 message)                                      │
│                                                                   │
│  Scheduling Functions                                            │
│  ├─ scheduleOnboardingDrip(userId)                              │
│  ├─ scheduleDailyMoodCheckIn(userId)                            │
│  ├─ scheduleReEngagementNudges(userId)                          │
│  ├─ enableStreakReminders(userId)                               │
│  └─ enableWeeklyRecap(userId)                                    │
│                                                                   │
│  Processing Functions                                            │
│  ├─ processCampaigns() [main processor]                         │
│  ├─ processReEngagementNudges()                                 │
│  ├─ processStreakReminders()                                    │
│  ├─ sendDailyMoodCheckIn(userId)                                │
│  └─ sendOnboardingDripMessage(userId, day)                      │
│                                                                   │
│  Helper Functions                                                │
│  ├─ getUserPreferences(userId)                                  │
│  ├─ getUserTimezone(userId)                                     │
│  ├─ getUserLocalTime(timezone)                                  │
│  ├─ recordCampaignScheduled()                                   │
│  └─ recordCampaignSent()                                         │
└──────────────────────────────────────────────────────────────┘
            │
            ├─→ Uses NotificationService.sendToUser()
            │   ├─→ Web push (push_subscriptions)
            │   └─→ APNs iOS (device_token)
            │
            ├─→ Uses jobQueue (Bull/Redis)
            │   ├─→ addDelayedJob() [time-based]
            │   └─→ addScheduledJob() [cron-based]
            │
            └─→ Queries/Updates Database
                ├─ users (timezone, current_streak, last_login_at)
                ├─ moods (for mood check skipping)
                ├─ notification_preferences (user settings)
                └─ campaigns (audit log)

┌──────────────────────────────────────────────────────────────────┐
│                          Cron Scheduler                           │
│  (scheduler.js or Bull)                                          │
│  ────────────────────────────────────────────────────────────   │
│  Runs hourly: processCampaigns()                                 │
│  └─→ Checks all campaign conditions                              │
│      ├─ Re-engagement inactivity (3, 7, 14, 30 days)            │
│      ├─ Streak protection (3+ streaks, 7 PM local time)         │
│      ├─ Daily mood check (at user's preferred time)             │
│      └─ Returns { reEngagement, streakReminders, dailyMoods }   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│              REST API Endpoints                                   │
│  ────────────────────────────────────────────────────────────   │
│                                                                   │
│  User Endpoints (notification-preferences.js)                   │
│  ├─ GET /api/notification-preferences                           │
│  ├─ PUT /api/notification-preferences                           │
│  ├─ POST /api/notification-preferences/disable-all              │
│  ├─ POST /api/notification-preferences/enable-all               │
│  ├─ GET /api/notification-preferences/history                   │
│  └─ GET /api/notification-preferences/stats                     │
│                                                                   │
│  Admin Endpoints (admin-campaigns.js)                            │
│  ├─ POST /api/admin/campaigns/test/mood-check/:userId           │
│  ├─ POST /api/admin/campaigns/test/onboarding/:userId/:day      │
│  ├─ POST /api/admin/campaigns/process                           │
│  ├─ POST /api/admin/campaigns/initialize/:userId                │
│  ├─ GET /api/admin/campaigns/user/:userId                       │
│  ├─ GET /api/admin/campaigns/stats                              │
│  ├─ GET /api/admin/campaigns/health                             │
│  └─ GET /api/admin/campaigns/debug/upcoming                     │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                          │
│  ────────────────────────────────────────────────────────────   │
│                                                                   │
│  Users Table (modified)                                          │
│  ├─ id, email, name, ...                                         │
│  └─ timezone ← NEW                                               │
│                                                                   │
│  Notification Preferences Table ← NEW                            │
│  ├─ user_id (FK, UNIQUE)                                         │
│  ├─ mood_reminder_enabled                                        │
│  ├─ mood_reminder_time                                           │
│  ├─ onboarding_drip_enabled                                      │
│  ├─ re_engagement_enabled                                        │
│  ├─ streak_reminders_enabled                                     │
│  ├─ weekly_recap_enabled                                         │
│  └─ timestamps                                                    │
│                                                                   │
│  Campaigns Table ← NEW (Audit Log)                               │
│  ├─ id, user_id (FK)                                             │
│  ├─ campaign_type                                                │
│  ├─ status (scheduled/pending/sent/failed)                       │
│  ├─ metadata (JSON)                                              │
│  ├─ scheduled_at, sent_at                                        │
│  └─ timestamps                                                    │
│                                                                   │
│  Push Subscriptions Table (existing)                             │
│  ├─ device_token (iOS)                                           │
│  ├─ endpoint (web)                                               │
│  └─ keys (web)                                                    │
│                                                                   │
│  Moods Table (existing)                                          │
│  └─ Used for daily mood check skipping                           │
└──────────────────────────────────────────────────────────────────┘

                                ↑
                                │
                    ┌───────────┴──────────────┐
                    │                          │
        ┌───────────▼────────────┐  ┌────────▼──────────────┐
        │   APNs Service         │  │   Web Push Service    │
        │   (iOS notifications)  │  │   (Browser push)      │
        └────────────────────────┘  └───────────────────────┘
```

## Data Flow Diagrams

### 1. User Registration Flow
```
User Signs Up
     │
     └─→ POST /api/auth/register
          │
          ├─→ Validate email/password
          │
          ├─→ Create user in database
          │
          ├─→ initializeUserCampaigns(userId)
          │    │
          │    ├─→ INSERT notification_preferences (defaults)
          │    │
          │    └─→ Schedule campaigns using Bull/Redis
          │         ├─ Day 0: 2 hours from now
          │         ├─ Day 1-30: 9 AM in user timezone
          │         └─ Daily/Weekly: Recurring via cron
          │
          └─→ Return JWT token
```

### 2. Campaign Sending Flow
```
Cron Job: processCampaigns() [Hourly]
     │
     ├─→ Check re-engagement nudges
     │    │
     │    ├─→ Query inactive users (3, 7, 14, 30 days)
     │    │
     │    ├─→ Check preferences enabled
     │    │
     │    ├─→ Avoid sending duplicates
     │    │
     │    └─→ Call NotificationService.sendToUser()
     │
     ├─→ Check streak protection
     │    │
     │    ├─→ Query users with 3+ streak & no mood today
     │    │
     │    ├─→ Check if current time >= 7 PM in user timezone
     │    │
     │    └─→ Send notification
     │
     └─→ Check daily mood checks
          │
          ├─→ For each user with mood_reminder_enabled
          │
          ├─→ Get user's local time in their timezone
          │
          ├─→ If matches mood_reminder_time
          │    ├─→ Check not already logged mood today
          │    │
          │    └─→ Send notification
          │
          └─→ Record all sends in campaigns table
```

### 3. Notification Delivery Flow
```
Campaign Service
     │
     └─→ NotificationService.sendToUser(userId, payload)
          │
          ├─→ Query push_subscriptions for user
          │
          ├─→ For each subscription:
          │    │
          │    ├─ [iOS] sendToUserIOS() via APNs
          │    │    └─→ Device token validation
          │    │
          │    └─ [Web] sendNotification() via web-push
          │         └─→ Endpoint + VAPID keys
          │
          ├─→ Record in notification_history
          │
          ├─→ Record in campaigns table (status: sent)
          │
          └─→ Return { sent: count, failed: count }
```

### 4. User Preference Update Flow
```
User Changes Preferences
     │
     └─→ PUT /api/notification-preferences
          │
          ├─→ Authenticate request
          │
          ├─→ Validate fields
          │    ├─ mood_reminder_time format
          │    └─ Boolean values
          │
          ├─→ UPDATE notification_preferences
          │
          ├─→ Reschedule campaigns as needed
          │
          └─→ Return updated preferences
```

## Timezone Flow

```
User in Tokyo, scheduled for 9 AM daily check-in:

1. User's timezone stored: "Asia/Tokyo"

2. processCampaigns() called in UTC time zone
   │
   └─→ For each user in mood check:
        │
        ├─→ getUserLocalTime("Asia/Tokyo")
        │    │
        │    └─→ Intl.DateTimeFormat with timezone
        │         Returns: "09:45" (current local time)
        │
        ├─→ Compare "09:45" === user's mood_reminder_time "09:00"?
        │    └─→ No match, skip
        │
        └─→ Try next user

3. After 15 minutes, processCampaigns() runs again:
   │
   └─→ getUserLocalTime("Asia/Tokyo") now returns "10:00"
        │
        ├─→ Still doesn't match "09:00"
        │
        └─→ Continue to next hourly check

4. Next day at 9 AM Tokyo time:
   │
   └─→ getUserLocalTime("Asia/Tokyo") returns "09:XX"
        │
        └─→ Matches "09:00" → Send notification
```

## Performance Considerations

### Query Optimization
```
notification_preferences
  ├─ Index: user_id (lookup user prefs)
  └─ Index: mood_reminder_enabled (filter enabled users)

campaigns
  ├─ Index: user_id (audit for specific user)
  ├─ Index: campaign_type (stats grouping)
  ├─ Index: status (find pending/failed)
  ├─ Index: sent_at DESC (recent activity)
  └─ Composite: (user_id, campaign_type, sent_at DESC)

Typical query times:
  - Get preferences: < 5ms
  - Find eligible users: < 50ms for 10K users
  - Record campaign: < 10ms
```

### Processing Load
```
For 100K users:
  - Get all preferences: 100ms
  - Process re-engagement: 500ms (queries 10K inactive)
  - Process streak reminders: 300ms (queries 20K with streaks)
  - Process daily checks: 200ms (checks timezone match)
  ─────────────────────────────
  Total per run: ~1 second

Hourly: ~1 second of database load
Daily database changes: ~5-10K records
```

## Failure Handling

```
Database Error
     │
     └─→ Logged as warning
          │
          ├─→ Continue processing other users
          │
          ├─→ Retry on next hourly run
          │
          └─→ Alert in monitoring if pattern emerges

Missing Preferences
     │
     └─→ Return defaults
          │
          └─→ Auto-create on next GET request

Invalid Timezone
     │
     └─→ Fallback to 'America/New_York'
          │
          └─→ Log for manual review

User Not Found
     │
     └─→ Skip campaign
          │
          └─→ Log warning

Preferences Disabled
     │
     └─→ Silently skip campaign
          │
          └─→ No notification, no error
```

## Integration Checklist

```
□ Database Migration
  └─ npm run migrate

□ Service Integration
  └─ Import campaignScheduler in services

□ Routes Integration
  └─ Add to server.js:
     - /api/notification-preferences
     - /api/admin/campaigns

□ Auth Integration
  └─ Add to registration:
     - initializeUserCampaigns()

□ Scheduler Integration
  └─ Set up hourly cron job:
     - processCampaigns()

□ Testing
  └─ Test endpoints
  └─ Check database
  └─ Monitor logs

□ Monitoring
  └─ Set up health checks
  └─ Track campaign metrics
  └─ Monitor processing time
```

## Security Architecture

```
Authentication/Authorization
     │
     ├─ User endpoints → Require auth
     │  └─ Can only access own preferences
     │
     └─ Admin endpoints → Require admin role
        └─ Protected by isAdmin middleware

Data Protection
     │
     ├─ Timezone → Validated against IANA list
     │
     ├─ Preferences → User-specific, encrypted at rest
     │
     ├─ Campaigns → Immutable audit log
     │
     └─ Sensitive data → Not logged in notification payload

API Security
     │
     ├─ Rate limiting applied
     │
     ├─ CORS enabled
     │
     ├─ SQL injection prevented (parameterized queries)
     │
     └─ XSS protected (sanitizeBody middleware)
```

This architecture provides scalability, reliability, and clean separation of concerns.
