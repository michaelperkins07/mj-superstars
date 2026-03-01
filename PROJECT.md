# PROJECT.md — MJ Superstars (Top Performer Coach)

**Last synced:** March 1, 2026
**Owner:** Michael Perkins (michaelperkins07@gmail.com)
**Phase:** LAUNCHED (App Store review pending) — Backend + Frontend + iOS all deployed

---

## 1. WHAT IS THIS

An AI-powered mental health and performance coaching app. Users talk to "MJ" — an AI coach built on Claude — that mirrors their communication style, tracks their moods, builds habits through daily rituals, and delivers personalized growth coaching. Think therapy meets personal training meets accountability buddy.

The app is named "Top Performer Coach" in the App Store. Internally it's "MJ Superstars" or "Project MJ."

---

## 2. STACK (ALL DECIDED ✅)

| Layer | Technology | Hosting |
|-------|-----------|---------|
| Backend API | Node.js 20+ / Express 4 (ESM) | Render (`srv-d6244kkoud1c7399f7fg`) |
| Database | PostgreSQL (50 tables, 16 migrations) | Render managed (`dpg-d62libffte5s73b63mh0-a`) |
| Cache / Jobs | Redis 8.1 + Bull queue | Render (`red-d65hqia4d50c73c5hpe0`) |
| Frontend | React 18 + Tailwind + Framer Motion | Render (`srv-d62m27coud1c73d1cl1g`) |
| iOS Shell | Capacitor 6 (wraps React app) | App Store (Build 27, awaiting review) |
| watchOS | SwiftUI companion (mood log, breathing, stats) | Bundled with iOS app |
| AI Engine | Claude (Anthropic SDK) | API calls from backend |
| Analytics | Mixpanel (frontend) + Sentry (both) | SaaS |
| Push | APNs (iOS) + Web Push (VAPID) | Backend service |
| Email | Nodemailer | Backend service |
| Landing Sites | 24 static HTML sites | Cloudflare Pages |
| Waitlist Backend | Supabase Edge Functions (9 functions) | Supabase (`ioxidarwheoohkaglbkw`) |

---

## 3. AUTH (DECIDED ✅)

JWT-based authentication with refresh tokens:

- `POST /api/auth/register` — email/password, bcrypt hashing, returns JWT
- `POST /api/auth/login` — validates credentials, returns JWT + refresh token
- JWT expiry: 15 minutes, refresh token: 7 days
- JWT blacklisting implemented for logout
- Guest mode exists (`/api/guest/*`) with migration path to full accounts (`/api/guest-migrate/*`)
- Social auth route exists (`social-auth.js`) — Sign in with Apple support
- Admin endpoints use `x-admin-secret` header + `requireAdmin` middleware

---

## 4. DATABASE SCHEMA

50 tables across 16 migrations (001–016). Key tables:

**Core:** users, moods, mood_entries, conversations, messages, tasks, journal_entries, daily_sessions

**Coaching:** rituals, coping_tools, coping_tool_uses, content_library, content_interactions, daily_commitments, emotional_state_trackers

**Social:** social_posts, social_comments, photos, referrals, referral_rewards

**Gamification:** achievements, user_achievements, challenges

**Notifications:** notification_preferences, campaigns, push_subscriptions, notification_history, user_devices

**Subscriptions:** subscriptions, subscription_history

**System:** feature_flags, analytics_events, health_summaries, crisis_events, personalization_extractions, webhooks, webhook_logs, gdpr_requests, data_exports, consent_records

**Indexes:** 60 foreign keys, 11 performance indexes added in migration 010

---

## 5. API ENDPOINTS (25+ validated Feb 10, 2026)

**Public:** health, privacy-policy, terms-of-service

**Auth:** register, login, guest access, guest-migrate, social-auth

**User features:** moods, progress (dashboard + streaks), gamification (summary + challenges), content (feed + daily-affirmation), notifications (history + preferences), webhooks, subscriptions (status), social (feed), coping (tools), insights, journal, rituals, commitments, conversations, photos, users/me, email-preferences, status

**Admin:** campaign management (health, stats, process, test endpoints), feature flags, GDPR

---

## 6. SERVICES LAYER

| Service | Purpose |
|---------|---------|
| claude.js | AI conversation engine (Anthropic SDK) |
| aiMemory.js | 12 memory types, context building, conversation summarization |
| campaignScheduler.js | Onboarding drip, mood check-ins, re-engagement, streak protection, weekly recaps |
| notifications.js | Web push + APNs delivery |
| apns.js | Apple Push Notification Service |
| appStoreVerification.js | StoreKit 2 receipt validation |
| gamification.js | Achievements, challenges, streaks |
| gdpr.js | Data export, deletion, consent |
| jobQueue.js | Bull/Redis background jobs |
| scheduler.js | Cron-based campaign processing (hourly) |
| email.js | Transactional emails (Nodemailer) |
| webhooks.js | External event delivery |
| trending.js | Content trending algorithms |
| featureFlags.js | Feature flag management |
| socket.js | Real-time messaging (Socket.IO) |
| monitoring.js | Health checks, metrics |

---

## 7. FRONTEND FEATURES (ALL BUILT)

- 8-step personalized onboarding flow
- AI chat interface with conversation mode
- Mood tracking with 5-point scale + visualizations
- Task management with gamification
- Daily rituals (morning/evening)
- Guided journaling
- Progress dashboard + streaks
- Coping toolkit + 4-7-8 breathing exercises
- Crisis support resources
- Content feed with daily affirmations
- Buddy system (invite codes, nudges, celebrations)
- Subscription paywall (StoreKit 2)
- Notification settings screen
- Accessibility: screen reader, keyboard nav, high contrast, adjustable fonts
- Framer Motion animations throughout
- Haptic feedback (25+ patterns)
- Offline support + sync
- Sentry error boundaries (5 types)
- Mixpanel analytics (40+ events)
- Apple Watch companion

---

## 8. WHAT'S DEPLOYED & LIVE

| Component | URL | Status |
|-----------|-----|--------|
| Backend API | https://mj-superstars.onrender.com | ✅ Live |
| Frontend App | https://mj-superstars-app.onrender.com | ✅ Live |
| GitHub | https://github.com/michaelperkins07/mj-superstars | ✅ Active |
| App Store | apps.apple.com/app/id6759122798 | ⏳ Waiting for Review |
| 24 Landing Sites | *.pages.dev + 16 custom domains | ✅ All live |
| Supabase Functions | 9 edge functions (email, SMS, push, etc.) | ✅ All working |

---

## 9. LANDING SITE INFRASTRUCTURE

24 persona-specific landing pages (waitlist → download on launch):
topperformer, belikebrady, belikegoggins, belikejocko, belikelebron, belikemessi, belikeshohei, beliketyson, belikeperk, belikekim, belikeselena, beliketaylor, belikebeyonce, belikebarack, belikemichelle, belikeoprah, belikepatrick, belikeronaldo, belikesabrina, belikeserena, belikesteph, beliketravis, beliketrevor, belikevirgil

All 24 verified: SEO complete, Meta Pixel (1468379540284208), Google Ads Tag (AW-813046676), Apple Smart App Banner, JSON-LD, robots.txt, sitemap.xml.

Custom domains: topperformer.ai, www.topperformer.ai, belikebey.com, www.belikebey.com, + 12 others (belikebrady.com through belikebarack.com).

**Launch automation:** `launch_day.sh` updates all CTAs from "Join Waitlist" → "Download Now", deploys all 24, triggers email-drip + sms-blast.

---

## 10. CURRENT BLOCKERS

| Blocker | Owner | Status |
|---------|-------|--------|
| App Store approval | Apple | ⏳ Waiting for Review (Build 27, submitted Feb 10) |
| Facebook 2FA | Mike | 🔒 Deferred — blocking Meta Ads |
| Google UAC campaign | — | 🔒 Blocked until app live |
| Apple Search Ads | — | 🔒 Blocked until app live |
| IAP end-to-end test | Mike | ⏳ Backend verified — env vars set, code plumbed, bundle IDs fixed. Needs real device sandbox test |

---

## 11. REMAINING WORK

### Sprint 1: Revenue Pipeline (IAP / StoreKit 2) — ⏳ CODE COMPLETE, NEEDS SANDBOX TEST
- StoreKit 2 service exists in frontend + `appStoreVerification.js` on backend ✅
- Paywall UI built, product IDs configured (monthly: 6758970581, yearly: 6758970309) ✅
- `IAP_KEY_CONTENT`, `IAP_KEY_ID`, `IAP_ISSUER_ID` all set on Render ✅
- Bundle ID fallback chain fixed across backend (was falling back to wrong `com.topperformer.app`) ✅
- Test subscription record exists in DB (test@topperformer.ai, expires 2030) ✅
- **REMAINING:** Real device sandbox purchase test on physical iPhone

### Sprint 4: Post-Launch Polish
- Enable CSP headers in Helmet
- PWA manifest + service worker improvements
- Lighthouse performance audit
- Image optimization pipeline

### Sprint 5: Growth Features
- Social sharing / referral system (backend routes exist, frontend TBD)
- Deep linking
- Push notification A/B testing
- User onboarding flow improvements

---

## 12. DECISIONS ALREADY MADE

These were flagged as "open" in MJ-SUPERSTARS-ROADMAP.md but are actually resolved:

| Decision | Answer |
|----------|--------|
| Native strategy | Capacitor (React wrapped in iOS shell) ✅ |
| Hosting | Render ✅ |
| Database hosting | Render managed PostgreSQL ✅ |
| Analytics | Mixpanel ✅ |
| Premium model | Freemium + subscription (monthly $19.99 / yearly $199.99, 30-day trial) ✅ |
| Auth approach | JWT + refresh tokens + guest mode + Sign in with Apple ✅ |

---

## 13. OPEN QUESTIONS — ALL RESOLVED ✅

All previously open questions have been investigated and resolved.

### Q1: What is the v1 user's end-to-end journey right now? ✅ DECIDED
User downloads → onboarding (8 steps) → first AI conversation → mood check-in → daily ritual → streak builds → paywall at limit.

**DECISION:** Model B — Usage-capped free tier. 4 AI coach responses per day on free. Gate logic at the API layer (count AI responses per user per day, return upgrade prompt at limit).

| Feature | Free | Premium |
|---------|------|---------|
| AI coaching responses | 4/day | Unlimited |
| Journaling | ✅ Unlimited | ✅ |
| Mood tracking | ✅ Unlimited | ✅ |
| Commitments/rituals | 3 active | Unlimited |
| Insights & analytics | Basic (weekly) | Full (daily + trends) |
| Social features | View only | Full participation |
| Gamification | Basic XP | Full leaderboards + streaks |
| Photos/progress pics | 1/week | Unlimited |
| Push coaching campaigns | Morning only | Full schedule |

### Q2: StoreKit 2 / IAP status ✅ VERIFIED
**All IAP env vars confirmed on Render:** `IAP_ISSUER_ID`, `IAP_KEY_ID`, `IAP_KEY_CONTENT` all set. `APNS_BUNDLE_ID` also set as fallback.

**Code status:**
- `appStoreVerification.js`: Full Apple App Store Server API v2 integration using `@apple/app-store-server-library`. Supports transaction verification, signed data verification, Server Notifications v2, subscription status checks. Graceful degradation if library unavailable.
- `subscriptions.js` routes: 3 endpoints — `GET /status`, `POST /verify`, `POST /sync`. All handle missing table gracefully.
- Frontend `subscription.js`: StoreKit 2 bridge via Capacitor, product loading, entitlement checking, purchase flow, restore flow.
- Bundle ID fallback chain fixed (was falling back to `com.topperformer.app`, now correctly falls back to `com.mjsuperstars.app`).
- DB: `subscriptions` table exists with 1 test record. User subscription columns all present.

**Remaining:** Real device sandbox purchase test on physical iPhone. No code changes needed — just a test run.

### Q3: Coaching framework status ✅ FULLY IMPLEMENTED
All coaching features are live in `claude.js` (85KB). Nothing conceptual — everything is in production code:

**5 Conversation Modes:** EMPATHY 💙, PREP 🧩, PROBLEM SOLVE 🛠️, ELITE COMMUNICATOR 🎤, PERK 🔥 (default)

**Emotional Overlay System (dynamic coaching notes injected per message):**
- **Confidence** (1-5): Low → rebuild self-belief, High → channel it
- **Energy** (1-5): Drained → suggest reset, On Fire → ride the wave
- **Morals** (1-5): Struggling → stop judging, Aligned → reinforce integrity

**Crisis Protocol (3 layers):**
1. Keyword detection (suicide, self-harm, etc.) → immediate mood=1, intent=crisis
2. AI semantic analysis via `detectCrisis()` → severity levels (none → critical)
3. System prompt directive → 988 Lifeline + Crisis Text Line resources

**Five Core Pillars:** Health First, Preparation, Accountability Mirror, Communication as Combat, Growth Through Empathy

**Three Daily Commitments:** Physical (30 min movement), Mental (learn something), Social (real conversation)

**User Context Assembly:** Recent moods, today's tasks, morning intention, streaks, personalization preferences — all fed to Claude per message.

### Q4: Subscription pricing ✅ CONFIRMED
**Prices (hardcoded in frontend, configured in App Store Connect):**
- **Elite Monthly:** $19.99/month (30-day free trial)
- **Elite Yearly:** $199.99/year (30-day free trial, "2 months free" savings)
- Subscription Group ID: 21926615
- Monthly Sub ID: 6758970581 (`com.topperformer.premium.monthly`)
- Yearly Sub ID: 6758970309 (`com.topperformer.premium.yearly`)

**Feature gating (updated per Q1 decision):**
- Free: 4 AI responses/day, unlimited journaling + mood tracking, basic breathing tool, 7-day insights
- Premium: Unlimited AI, all coping tools (breathing + grounding + visualization + progressive relaxation + affirmations), 365-day insights, Watch app, HealthKit, data export, custom reminders

---

## 14. BACKLOG.md (v2+ / Not Now)

These came up but are deferred. Captured here so they don't get lost:

- Therapist collaboration features
- Group therapy circles
- CBT/DBT structured programs
- Voice-first interface (voice conversation mode exists but could go deeper)
- Wearable mood detection (beyond current HealthKit)
- AI-generated growth plans
- Integration with telehealth
- Enterprise / workplace wellness
- React Native rewrite (currently Capacitor — works, revisit if scale demands it)
- Admin analytics dashboard (Mixpanel handles this for now)
- Android app (Capacitor could support this — not prioritized for launch)

---

## 15. CREDENTIALS REFERENCE

### Render
- Backend: `srv-d6244kkoud1c7399f7fg`
- Frontend: `srv-d62m27coud1c73d1cl1g`
- Redis: `red-d65hqia4d50c73c5hpe0`
- Owner: `tea-d280ake3jp1c73fqsev0`
- API Token: `rnd_bS4W4SiRzJNxIWUt845qTOHyKU1h`
- Admin Secret: `CH2E-ZWtqgR5HJyQJJOoNsCUudor1W9YkYh5egjOdG9d4KuRjSi37oM6U7cEPGHf`
- DB External: `postgresql://mj_superstars_user:gdObVYdtL5wsoRwYhgcqyUuPCYyHZZlw@dpg-d62libffte5s73b63mh0-a.virginia-postgres.render.com:5432/mj_superstars`

### Apple Developer
- App Apple ID: `6758818206`
- Top Performer App Store ID: `6759122798`
- Team ID: `FAAWCBHB9C`
- Bundle ID: `com.mjsuperstars.app`
- ASC API Key ID: (stored in Render env vars)
- IAP Issuer ID: (stored in Render env vars)
- APNS Key ID: (stored in Render env vars)
- Subscription Group: `21926615`
- Monthly Sub ID: `6758970581`
- Yearly Sub ID: `6758970309`

### Cloudflare
- Account ID: (stored securely — see session notes)
- API Token: (stored securely — see session notes)
- topperformer.ai Zone: `07aa3869b49fa4bf4dacfe0a01970c02`
- belikebey.com Zone: `b04cd5a3c7dfae2547b720309aeb68f3`

### Supabase (Waitlist/Landing)
- Project: `ioxidarwheoohkaglbkw`
- URL: `https://ioxidarwheoohkaglbkw.supabase.co`
- Anon Key: (stored securely — public but redacted from repo)

### Marketing
- Meta Pixel: `1468379540284208`
- Google Ads Tag: `AW-813046676`
- Meta Ad Account: `368299121106796`

### Comms
- Resend: (stored in Render env vars)
- Twilio SID: (stored in Render env vars)
- Twilio FROM: `+18443878503`

---

## 16. GIT

**Repo:** https://github.com/michaelperkins07/mj-superstars
**Branch:** `main`
**Last known commit:** `a25cde1` — "Fix admin campaigns user endpoint 42703 error"

---

## SYNC POINT #1 — March 1, 2026

**State:** App built, deployed, and submitted. 24 landing sites audited and clean. Waiting on Apple review. Three ad campaigns blocked (Meta 2FA, Google/Apple need live app). Revenue pipeline (IAP) exists but needs end-to-end verification. Four open questions above need Mike's input to close out.
