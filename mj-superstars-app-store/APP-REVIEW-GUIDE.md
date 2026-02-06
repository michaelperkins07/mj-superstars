# MJ's Superstars - App Review Guide

## Quick Reference

| Item | Value |
|------|-------|
| App Name | MJ's Superstars |
| Bundle ID | com.mjsuperstars.app |
| Version | 1.0.0 |
| Build | 1 |
| Category | Health & Fitness |
| Age Rating | 12+ |

---

## Demo Account

**Email:** demo@mjsuperstars.com
**Password:** DemoUser2025!

This demo account has:
- ✓ Premium subscription active
- ✓ 14-day history of mood entries
- ✓ Sample conversations with MJ
- ✓ Buddy system connected
- ✓ Notifications enabled

---

## App Description for Reviewers

MJ's Superstars is a mental wellness companion app that uses AI to provide personalized emotional support, mood tracking, and healthy habit formation. The app is designed as a supplementary wellness tool, NOT as a replacement for professional mental health care.

### Core Purpose
Help users:
1. Track and understand their emotional patterns
2. Build healthy daily habits through gamification
3. Access calming exercises and coping tools
4. Receive supportive, personalized AI conversations

---

## Key Features to Test

### 1. AI Conversations (MJ)
**Location:** Main chat tab

**How to test:**
- Send any message to MJ
- MJ responds with personalized, supportive messages
- Try asking about mood, stress, or daily activities

**Safety features:**
- MJ recommends professional help for serious concerns
- Crisis resources accessible via SOS button (bottom right)
- MJ never provides medical diagnoses or prescriptions

### 2. Mood Tracking
**Location:** Home tab → Log Mood button

**How to test:**
- Tap any of the 5 mood emojis
- Select factors (sleep, exercise, etc.)
- Add an optional note
- View mood history in Insights tab

### 3. Coping Toolkit
**Location:** Home tab → Coping section

**How to test:**
- Try the 4-7-8 Breathing exercise
- Follow the animated guide
- Haptic feedback pulses with breathing

### 4. Apple Watch App
**Location:** Apple Watch companion app

**Features:**
- Quick mood logging
- Breathing exercises with haptics
- View streaks and stats
- Complications available

### 5. Notifications
**Location:** Settings → Notifications

**Types:**
- Morning check-in (configurable time)
- Evening reflection (configurable time)
- Streak reminders
- Buddy nudges

**Note:** All notifications require explicit permission and can be disabled.

### 6. Premium Features
**Location:** Settings → Premium

**Includes:**
- Unlimited AI conversations (Free: 10/day)
- All coping tools (Free: breathing only)
- 365-day insights (Free: 7 days)
- Apple Watch app
- HealthKit integration

### 7. Buddy System
**Location:** Home → Buddy section

**How to test:**
- Demo account is connected to a buddy
- Send encouragement nudges
- View buddy's activity (anonymized)

### 8. HealthKit Integration
**Location:** Settings → Health

**How to test:**
- Enable in Settings
- View correlations in Insights
- Sleep/mood patterns

**Privacy:** Data processed locally, never uploaded to servers.

---

## Important Disclosures

### Medical Disclaimer
The app clearly states (in onboarding and settings):
> "MJ is not a replacement for professional mental health care. If you're experiencing a crisis, please contact emergency services or a mental health professional."

### AI Transparency
Users are informed that MJ is an AI assistant powered by Claude.

### Crisis Resources
- SOS button always visible in chat
- Links to:
  - 988 Suicide & Crisis Lifeline
  - Crisis Text Line
  - International Association for Suicide Prevention

### Data Privacy
- Conversations encrypted end-to-end
- HealthKit data never leaves device
- No data sold to third parties
- User can export/delete all data

---

## API and Third-Party Services

### Anthropic Claude API
- Powers MJ's conversational AI
- Content filtered for safety
- No personal data used for training

### Apple Services
- StoreKit 2 for subscriptions
- HealthKit for health data (local only)
- Push Notifications via APNs
- Watch Connectivity

### Analytics
- Mixpanel for usage analytics
- Anonymized data only
- Can be disabled by user

---

## Subscription Information

### Products
| ID | Price | Trial |
|----|-------|-------|
| com.mjsuperstars.premium.monthly | $9.99/month | 7 days |
| com.mjsuperstars.premium.yearly | $79.99/year | 14 days |

### Free Trial Flow
1. User taps "Start Free Trial"
2. iOS subscription sheet appears
3. Apple handles trial period
4. Charged after trial ends unless cancelled

### Subscription Management
Users can manage via:
- In-app Settings → Manage Subscription
- iOS Settings → Subscriptions
- app.apple.com/account/subscriptions

### Restore Purchases
Available in Settings → Premium → Restore Purchases

---

## Permissions Requested

| Permission | Purpose | When Requested |
|------------|---------|----------------|
| Notifications | Check-in reminders | After onboarding |
| HealthKit | Health insights | Settings → Health |
| Camera | Profile photo | Profile edit |
| Haptics | Feedback | Always enabled |

All permissions are optional and the app functions without them.

---

## Content Moderation

### User-Generated Content
- Mood notes: Private, not shared
- Journal entries: Private, not shared
- Chat messages: Sent to AI, not shared

### AI Content
- Claude AI has built-in safety filters
- MJ refuses harmful requests
- Crisis detection triggers resources

### Buddy System
- Anonymous activity sharing
- No personal conversations shared
- Can block/remove buddy

---

## Potential Review Concerns

### 1. Health Claims
**Concern:** App may make medical claims
**Response:** We explicitly state the app is not medical advice. All health-related content encourages professional consultation.

### 2. AI Conversation Quality
**Concern:** AI may provide harmful advice
**Response:** Claude AI has robust safety measures. MJ is programmed to recommend professional help and never diagnoses.

### 3. Subscription Clarity
**Concern:** Unclear pricing or trials
**Response:** All pricing clearly displayed. Apple's standard subscription flow used. Terms of service easily accessible.

### 4. Children's Safety
**Concern:** App may collect data from minors
**Response:** 12+ age rating. Terms require users to be 13+. No features targeting children.

### 5. HealthKit Usage
**Concern:** Health data privacy
**Response:** HealthKit data processed locally only. Never uploaded to our servers. Clearly disclosed to users.

---

## Contact Information

**App Review Questions:**
review@mjsuperstars.com

**Technical Issues:**
support@mjsuperstars.com

**Response Time:**
Within 24 hours during business days

---

## Test Scenarios

### Scenario 1: New User Onboarding
1. Delete app and reinstall
2. Complete 8-step onboarding
3. Send first message to MJ
4. Log first mood

### Scenario 2: Premium Purchase
1. Login with demo account
2. Go to Settings → Premium
3. Note: Demo has premium enabled
4. Test "Restore Purchases" button

### Scenario 3: Crisis Resources
1. Open chat
2. Tap SOS button (bottom right)
3. View crisis resources
4. Test "Call 988" button

### Scenario 4: Mood Tracking
1. Tap "Log Mood" on home
2. Select mood (1-5)
3. Choose factors
4. Add note
5. Submit and view in Insights

### Scenario 5: Apple Watch
1. Open Watch app
2. Log mood via emoji tap
3. Start breathing exercise
4. Check complication on face

---

## Checklist Before Submission

- [x] App functions as described
- [x] Demo account credentials work
- [x] All IAPs configured in App Store Connect
- [x] Privacy policy URL active
- [x] Support URL active
- [x] Age rating accurate
- [x] Screenshots match current UI
- [x] App preview video approved
- [x] Export compliance answered
- [x] Content rights declared

---

## Known Issues (None)

No known issues at time of submission.

---

Thank you for reviewing MJ's Superstars! We're committed to helping users improve their mental wellness in a safe, supportive way.
