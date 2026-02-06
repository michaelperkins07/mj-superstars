# MJ's Superstars - App Store Connect Configuration

## App Information

### General
| Field | Value |
|-------|-------|
| App Name | MJ's Superstars |
| Subtitle | Your AI Mental Wellness Coach |
| Bundle ID | com.mjsuperstars.app |
| SKU | MJSUPERSTARS2025 |
| Primary Language | English (U.S.) |

### Category
| Type | Selection |
|------|-----------|
| Primary | Health & Fitness |
| Secondary | Lifestyle |

### Content Rights
- [x] This app does not contain third-party content that requires rights

### Age Rating
| Question | Answer |
|----------|--------|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Prolonged Graphic or Sadistic Violence | None |
| Profanity or Crude Humor | None |
| Mature/Suggestive Themes | None |
| Horror/Fear Themes | None |
| Medical/Treatment Information | Infrequent/Mild |
| Alcohol, Tobacco, Drug Use | None |
| Simulated Gambling | None |
| Sexual Content or Nudity | None |
| Unrestricted Web Access | No |
| Gambling and Contests | No |

**Result: 12+**

---

## Pricing and Availability

### Price Schedule
| Region | Tier |
|--------|------|
| United States | Free |
| All other regions | Free |

### Availability
- [x] All territories where App Store is available

### Pre-Orders
- [ ] Not using pre-orders for initial launch

---

## In-App Purchases

### Product 1: Premium Monthly
| Field | Value |
|-------|-------|
| Reference Name | Premium Monthly |
| Product ID | com.mjsuperstars.premium.monthly |
| Type | Auto-Renewable Subscription |
| Subscription Group | MJ Premium |
| Subscription Duration | 1 Month |
| Price | $9.99 (Tier 10) |
| Free Trial | 7 Days |

### Product 2: Premium Yearly
| Field | Value |
|-------|-------|
| Reference Name | Premium Yearly |
| Product ID | com.mjsuperstars.premium.yearly |
| Type | Auto-Renewable Subscription |
| Subscription Group | MJ Premium |
| Subscription Duration | 1 Year |
| Price | $79.99 (Tier 80) |
| Free Trial | 14 Days |

### Subscription Group: MJ Premium
| Field | Value |
|-------|-------|
| Reference Name | MJ Premium |
| Localized Name | Premium |
| Level | 1 (Top) |

### Subscription Localization
**Display Name:** MJ Premium
**Description:** Unlock unlimited AI conversations, all coping tools, 365-day insights, Apple Watch app, and HealthKit integration.

---

## App Privacy

### Data Collection
| Data Type | Collected | Linked | Tracking |
|-----------|-----------|--------|----------|
| Contact Info (Email) | Yes | Yes | No |
| User Content | Yes | Yes | No |
| Identifiers (User ID) | Yes | Yes | No |
| Usage Data | Yes | No | No |
| Diagnostics | Yes | No | No |
| Health & Fitness | Yes* | No | No |

*HealthKit data processed locally, never uploaded

### Privacy Nutrition Label Answers

**Contact Info**
- Collected: Yes
- Linked: Yes
- Tracking: No
- Purpose: App Functionality

**User Content**
- Collected: Yes
- Linked: Yes
- Tracking: No
- Purpose: App Functionality

**Identifiers**
- Collected: Yes
- Linked: Yes
- Tracking: No
- Purpose: App Functionality

**Usage Data**
- Collected: Yes
- Linked: No
- Tracking: No
- Purpose: Analytics

**Diagnostics**
- Collected: Yes
- Linked: No
- Tracking: No
- Purpose: App Functionality

**Health & Fitness**
- Collected: Yes (local only)
- Linked: No
- Tracking: No
- Purpose: App Functionality
- Note: Never uploaded to servers

---

## Export Compliance

| Question | Answer |
|----------|--------|
| Does your app use encryption? | Yes |
| Is encryption exempt? | Yes (uses standard Apple APIs/HTTPS only) |
| Export Compliance Documentation | Not required |

---

## App Review Information

### Contact
| Field | Value |
|-------|-------|
| First Name | [Developer First Name] |
| Last Name | [Developer Last Name] |
| Phone | [Developer Phone] |
| Email | review@mjsuperstars.com |

### Demo Account
| Field | Value |
|-------|-------|
| Username | demo@mjsuperstars.com |
| Password | DemoUser2025! |

### Notes
```
Thank you for reviewing MJ's Superstars!

Key points:
1. MJ is an AI companion, not a replacement for professional mental health care
2. Crisis resources always accessible via SOS button
3. HealthKit data processed locally, never uploaded
4. Demo account has premium features enabled

Test scenarios:
- Complete onboarding flow
- Chat with MJ
- Log a mood
- Try breathing exercise
- Check Apple Watch app

Contact: review@mjsuperstars.com
```

---

## Version Information

### Version 1.0.0
| Field | Value |
|-------|-------|
| Version | 1.0.0 |
| Build | 1 |
| Copyright | © 2025 MJ's Superstars |

### What's New
```
🎉 Welcome to MJ's Superstars!

Meet MJ, your new AI mental wellness companion:
• Personalized AI conversations
• Beautiful mood tracking
• Morning & evening rituals
• Guided journaling
• Coping toolkit with breathing exercises
• Gamified task management
• Apple Watch companion
• HealthKit integration
• Accountability buddy system
```

---

## URLs

| Type | URL |
|------|-----|
| Support URL | https://mjsuperstars.com/support |
| Marketing URL | https://mjsuperstars.com |
| Privacy Policy URL | https://mjsuperstars.com/privacy |

---

## App Store Assets Checklist

### Screenshots
- [ ] iPhone 6.7" (1290 x 2796) - 8 screenshots
- [ ] iPhone 6.5" (1242 x 2688) - 8 screenshots
- [ ] iPhone 5.5" (1242 x 2208) - 8 screenshots
- [ ] iPad Pro 12.9" (2048 x 2732) - 8 screenshots

### App Preview Videos
- [ ] iPhone 6.7" - 30 second preview
- [ ] iPhone 6.5" - 30 second preview
- [ ] iPad Pro 12.9" - 30 second preview

### App Icon
- [ ] 1024 x 1024 PNG (no alpha)

### Apple Watch Screenshots
- [ ] 45mm (396 x 484) - 3 screenshots
- [ ] 44mm (368 x 448) - 3 screenshots

---

## Release Options

### Phased Release
- [x] Release updates over 7-day period
- Allows monitoring and rollback if issues found

### Automatic Release
- [ ] Manually release this version
- Gives control over launch timing

---

## TestFlight Information

### Test Information
**Beta App Description:**
```
MJ's Superstars beta - Help us test the app before launch!
Please test all features and report any bugs.
```

**What to Test:**
```
• Onboarding flow
• AI conversations
• Mood tracking
• Breathing exercises
• Apple Watch sync
• Push notifications
• Subscription purchase (sandbox)
```

**Feedback Email:** beta@mjsuperstars.com

### Internal Testing
- [ ] Add internal testers
- [ ] Enable automatic distribution

### External Testing
- [ ] Create beta group: "Early Access"
- [ ] Max testers: 10,000
- [ ] Submit for Beta App Review

---

## Launch Checklist

### Before Submission
- [ ] All screenshots uploaded
- [ ] App preview videos uploaded
- [ ] Privacy policy live
- [ ] Support page live
- [ ] Demo account working
- [ ] All IAPs configured
- [ ] Export compliance answered
- [ ] Age rating set
- [ ] App Review notes complete

### After Approval
- [ ] Set release date
- [ ] Prepare marketing materials
- [ ] Alert press/influencers
- [ ] Monitor first reviews
- [ ] Respond to support tickets

### Post-Launch
- [ ] Monitor crash reports
- [ ] Check analytics
- [ ] Gather user feedback
- [ ] Plan version 1.1 fixes
