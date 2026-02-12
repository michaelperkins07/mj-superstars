# MJ Superstars (Top Performer) — Project Progress & Status

**Last Updated:** February 10, 2026
**App Store Status:** Build 27 — "1.0 Waiting for Review" (submitted Feb 10, 2026)
**Git HEAD:** `a25cde1` on `main` (deployed and live)

---

## Production URLs

| Service | URL |
|---------|-----|
| Backend API | https://mj-superstars.onrender.com |
| Frontend App | https://mj-superstars-app.onrender.com |
| GitHub Repo | https://github.com/michaelperkins07/mj-superstars |

---

## Completed Work

### Phase 1: API Audit ✅
- 25/25 endpoints returning expected status codes
- All core features operational: auth, moods, progress, gamification, content, notifications, webhooks, subscriptions, social, coping, insights, legal

### Phase 2: Database Integrity ✅
- 50 tables audited, 60 foreign keys, zero orphaned records
- 11 missing FK indexes added via migration 010
- Webhooks/webhook_logs tables created via migration 009

### Phase 3: Security Hardening ✅
- Replaced 27 `console.error` instances with structured `logger.error` in social.js and photos.js
- Locked down `/health` endpoint (no more memory/version exposure)
- Added `/api/health/deep` behind admin auth for internal monitoring
- Removed unused SentryErrorBoundary import from App.js

### Phase 4: Frontend Audit ✅
- Clean build, zero warnings, 273KB gzipped
- Multi-layered error boundaries (5 types including Sentry)
- 6 env vars properly configured with defaults

### Phase 5: E2E Journey Test ✅
- 28/28 tests passed (register → profile → mood → coping → AI chat → progress → gamification → content → notifications → webhooks → subscription → legal → social → token refresh → cleanup)

### Sprint 2: Push Notifications & Redis ✅
- Redis provisioned on Render (free plan, Virginia, Redis 8.1.4)
- VAPID keys generated and set for web push
- APNS_KEY_ID and APNS_TEAM_ID configured for iOS push
- Campaign scheduler running on 15-minute polling loop
- Bull job queue connected to Redis for background jobs
- All campaign admin endpoints verified working

### Sprint 3: Analytics & Observability ✅
- REACT_APP_MIXPANEL_TOKEN set on frontend (44b5d199...)
- REACT_APP_SENTRY_DSN set on frontend
- Both frontend and backend redeployed with analytics wired up

---

## Bugs Fixed This Session

| Bug | Root Cause | Fix | Commit |
|-----|-----------|-----|--------|
| Webhooks GET 500 | Tables never created in migrations | Created migration 009_webhooks.sql | 2c2262d |
| 11 missing FK indexes | FK columns without indexes | Created migration 010_add_missing_indexes.sql | 2c2262d |
| console.error in prod | 27 instances bypassing Winston | Replaced with logger.error() | 2c2262d |
| Health endpoint info leak | Memory/version exposed publicly | Locked down public, added /deep behind admin | 2c2262d |
| Admin campaigns 403 | isAdmin checked non-existent role field | Imported requireAdmin from auth.js | b2ba1e9 |
| Campaigns/user 500 (42703) | Query referenced non-existent `last_login_at` column | Changed to `last_active_at` | a25cde1 |
| COALESCE with missing column | `preferences` column doesn't exist on users table | Removed `preferences->>'timezone'` from COALESCE | a25cde1 |

---

## Remaining Sprints (Planned for Tonight)

### Sprint 1: Revenue Pipeline (IAP / StoreKit 2)
- Wire up StoreKit 2 purchase flow end-to-end
- Verify receipt validation with App Store Server API
- Test subscription creation/renewal/cancellation
- Premium gate enforcement on frontend
- **Requires:** APNS key file content, App Store Connect testing
- **Env vars needed:** IAP_KEY_CONTENT (the .p8 private key), already have IAP_KEY_ID and IAP_ISSUER_ID

### Sprint 4: Post-Launch Polish
- Enable Content-Security-Policy (CSP) headers in Helmet
- Add PWA manifest + service worker for installability
- Performance audit (Lighthouse, bundle splitting)
- Offline support improvements
- Image optimization pipeline

### Sprint 5: Growth Features
- Social sharing / referral system
- ASO (App Store Optimization) metadata
- Deep linking
- Push notification A/B testing
- User onboarding flow improvements

---

## Infrastructure & Credentials Reference

### Render Services
- Backend Service ID: `srv-d6244kkoud1c7399f7fg`
- Frontend Service ID: `srv-d62m27coud1c73d1cl1g`
- Render Owner ID: `tea-d280ake3jp1c73fqsev0`
- Redis Instance ID: `red-d65hqia4d50c73c5hpe0`
- Redis Internal URL: `redis://red-d65hqia4d50c73c5hpe0:6379`

### Apple Developer
- App Apple ID: `6758818206`
- Team ID: `FAAWCBHB9C`
- Bundle ID: `com.mjsuperstars.app`
- ASC API Key ID: `TS9A6TPWWR`
- IAP Issuer ID: `7e6f7a23-b6f4-45ba-a169-32cb4d378fc2`
- APNS Key ID: `8VP298G9LC`
- Subscription Group ID: `21926615`
- Monthly Sub ID: `6758970581` (com.mjsuperstars.premium.monthly)
- Yearly Sub ID: `6758970309` (com.mjsuperstars.premium.yearly)

### Backend Env Vars (24 total on Render)
REDIS_URL, MIXPANEL_TOKEN, APNS_KEY_CONTENT, FRONTEND_URL, SENTRY_DSN, ADMIN_SECRET, DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY, NODE_ENV, LOG_LEVEL, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS, APP_VERSION, CLIENT_URL, FROM_EMAIL, IAP_KEY_ID, IAP_ISSUER_ID, APNS_BUNDLE_ID, APPLE_CLIENT_ID, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, APNS_KEY_ID, APNS_TEAM_ID

### Frontend Env Vars (2 on Render)
REACT_APP_MIXPANEL_TOKEN, REACT_APP_SENTRY_DSN

---

## API Endpoint Map (Validated Feb 10, 2026)

All endpoints tested and returning 200:

**Public:**
- `GET /health`
- `GET /api/legal/privacy-policy`
- `GET /api/legal/terms-of-service`

**Auth (POST):**
- `POST /api/auth/register`
- `POST /api/auth/login`

**User (Bearer token):**
- `GET /api/users/me`
- `GET /api/moods`
- `GET /api/progress/dashboard`
- `GET /api/progress/streaks`
- `GET /api/gamification/summary`
- `GET /api/gamification/challenges`
- `GET /api/content/feed`
- `GET /api/content/daily-affirmation`
- `GET /api/notifications/history`
- `GET /api/webhooks`
- `GET /api/subscriptions/status`
- `GET /api/social/feed`
- `GET /api/coping/tools`
- `GET /api/insights`
- `GET /api/notification-preferences`
- `GET /api/email-preferences`
- `GET /api/status`

**Admin (Bearer + x-admin-secret):**
- `GET /api/admin/campaigns/health`
- `GET /api/admin/campaigns/stats`
- `GET /api/admin/campaigns/user/:userId`
- `GET /api/admin/campaigns/debug/upcoming`
- `GET /api/admin/campaigns/debug/user-prefs/:userId`
- `POST /api/admin/campaigns/process`
- `POST /api/admin/campaigns/process/re-engagement`
- `POST /api/admin/campaigns/process/streak-reminders`
- `POST /api/admin/campaigns/test/mood-check/:userId`
- `POST /api/admin/campaigns/test/onboarding/:userId/:day`
- `POST /api/admin/campaigns/test/weekly-recap/:userId`
- `POST /api/admin/campaigns/initialize/:userId`

---

## Database Schema (50 tables)

Key tables: users, moods, conversations, messages, mood_entries, tasks, rituals, journal_entries, coping_tools, coping_tool_uses, content_library, content_interactions, social_posts, social_comments, photos, achievements, user_achievements, campaigns, notification_preferences, webhooks, webhook_logs, subscriptions, subscription_history, analytics_events, health_summaries, crisis_events, personalization_extractions, feature_flags, user_devices

---

## Git Commits This Session

```
a25cde1 Fix admin campaigns user endpoint 42703 error
b2ba1e9 Fix admin-campaigns auth to use shared requireAdmin middleware
b63b75e Remove unused SentryErrorBoundary import in App.js
2c2262d Fix webhooks 500 bug, add missing DB indexes, security hardening
```

---

## Quick Start for New Chat Session

If starting a new Cowork chat, provide this context:

1. **Project:** MJ Superstars mental health AI coaching app ("Top Performer" in App Store)
2. **Tech stack:** React frontend + Express/Node.js backend + PostgreSQL on Render
3. **GitHub:** https://github.com/michaelperkins07/mj-superstars
4. **Render API Token:** `rnd_bS4W4SiRzJNxIWUt845qTOHyKU1h`
5. **Admin Secret:** `CH2E-ZWtqgR5HJyQJJOoNsCUudor1W9YkYh5egjOdG9d4KuRjSi37oM6U7cEPGHf`
6. **DB External:** `postgresql://mj_superstars_user:gdObVYdtL5wsoRwYhgcqyUuPCYyHZZlw@dpg-d62libffte5s73b63mh0-a.virginia-postgres.render.com:5432/mj_superstars`
7. **Status:** Sprints 2 & 3 complete. Next: Sprint 1 (Revenue/IAP), Sprint 4 (Polish), Sprint 5 (Growth)
8. **Standing instruction:** Push when complete, don't ask permission. Double-check, test, and validate.
9. **Reference this file:** `MJ-SUPERSTARS-PROGRESS.md` in the project root for full details
