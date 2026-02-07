# MJ's Superstars - App Store Review Checklist

## Required Before Submission

### Legal & Privacy
- [ ] **Privacy Policy URL** — Must be publicly accessible. Create at `mjsuperstars.app/privacy` or use a hosted page
- [ ] **Terms of Service** — Recommended for apps with accounts
- [ ] **App Privacy details** — Complete the data collection questionnaire in App Store Connect
  - Data collected: email, name, mood scores, journal entries, chat messages
  - Data linked to identity: email, name
  - Data used for tracking: none
  - Data used for analytics: usage patterns (anonymized)

### App Store Connect Metadata
- [ ] **App Name**: MJ's Superstars
- [ ] **Subtitle** (30 chars): Your Mental Wellness Coach
- [ ] **Category**: Health & Fitness (primary), Lifestyle (secondary)
- [ ] **Age Rating**: 12+ (references mental health topics)
- [ ] **Description** (4000 chars max) — See draft below
- [ ] **Keywords** (100 chars): mental health,wellness,mood tracker,journal,coaching,self-care,anxiety,mindfulness,AI coach,therapy
- [ ] **Support URL**: https://mjsuperstars.app/support (or email link)
- [ ] **Marketing URL**: https://mjsuperstars.app (optional)

### Screenshots (Required)
Must provide for each device size you support:
- [ ] **6.7" Display** (iPhone 15 Pro Max) — 1290 x 2796 px — at least 3 screenshots
- [ ] **6.5" Display** (iPhone 11 Pro Max) — 1242 x 2688 px
- [ ] **5.5" Display** (iPhone 8 Plus) — 1242 x 2208 px (if supporting older devices)

Suggested screenshot flow:
1. Chat screen with MJ's greeting
2. Mood logging with slider
3. Progress dashboard with streaks
4. Journal entry
5. Coping tools / breathing exercise

### App Icon
- [ ] 1024x1024 icon uploaded to App Store Connect (no transparency, no rounded corners)

### Build Requirements
- [ ] Latest build uploaded via Xcode/TestFlight
- [ ] Build has push notification entitlement enabled
- [ ] `Push Notifications` capability added in Xcode Signing & Capabilities
- [ ] Bundle ID matches: `com.mjsuperstars.app`
- [ ] Team ID: `FAAWCBHB9C`

### Review Notes for Apple
Include in "Notes for Review" field:
```
MJ's Superstars is a mental wellness coaching app powered by Claude AI.
The app provides mood tracking, journaling, and AI-powered conversations
to support emotional wellbeing.

Demo Account:
Email: demo@mjsuperstars.com
Password: MJDemo2026!

Note: The AI chat feature requires an active internet connection.
The app includes push notifications for daily check-in reminders.
```

> **Important**: Create the demo account before submission!

---

## Draft App Store Description

**MJ's Superstars** — Your personal mental wellness companion.

Meet MJ, an AI-powered coach who's here to support your emotional wellbeing journey. Whether you're tracking your mood, journaling your thoughts, or need someone to talk to, MJ is always ready to listen.

**What makes MJ special:**
- Conversations that actually understand you
- Gentle daily check-ins that build lasting habits
- Beautiful mood tracking that reveals your patterns
- A safe space to journal without judgment
- Breathing exercises and coping tools when you need them
- Streak tracking to keep you motivated

**Your mental health matters.** MJ helps you build awareness of your emotions, develop healthy coping strategies, and celebrate your progress — one day at a time.

MJ's Superstars is not a replacement for professional mental health care. If you're in crisis, please contact the 988 Suicide & Crisis Lifeline (call or text 988).

---

## Common Rejection Reasons to Avoid

1. **Health claims** — Don't claim the app "treats" or "cures" mental health conditions. Use language like "supports wellbeing" instead.
2. **Missing privacy policy** — Must be accessible from within the app AND on the App Store listing.
3. **Login wall** — App must provide value without requiring login (guest mode handles this).
4. **Push notification justification** — Must explain why notifications are needed during review.
5. **Background modes** — Don't declare background modes you don't use.
6. **Crash on launch** — Test on a clean install, not just upgrades.

---

## Pre-Submission Testing Checklist

- [ ] Fresh install on physical device works
- [ ] Login/register flow works
- [ ] Guest mode works without account
- [ ] Apple Sign In works
- [ ] Chat with MJ sends and receives messages
- [ ] Mood logging works
- [ ] Push notification permission prompt appears
- [ ] App handles offline gracefully
- [ ] App handles slow connection gracefully
- [ ] Deep links work (mjsuperstars://open_mood_log)
- [ ] App doesn't crash when backgrounded and resumed
- [ ] Keyboard doesn't obscure input fields
- [ ] Status bar is visible and correctly styled
