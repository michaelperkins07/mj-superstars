// ============================================================
// Legal Documents Routes
// Privacy Policy and Terms of Service (Public - No Auth Required)
// ============================================================

import { Router } from 'express';
const router = Router();

// Privacy Policy Content
const PRIVACY_POLICY = `
PRIVACY POLICY
Top Performer Mental Wellness Companion

Last Updated: ${new Date().toLocaleDateString()}

1. INTRODUCTION
Top Performer ("we", "us", "our", or "App") is committed to protecting your privacy. This Privacy Policy explains our data practices for the Top Performer mobile application.

App Owner: Michael Steven Perkins, Florida, USA
Contact: michaelperkins07@gmail.com

2. INFORMATION WE COLLECT

Account Information:
- Email address and password
- Display name or nickname
- Account creation and authentication data

Wellness Data:
- Mood check-ins and emotional state indicators
- Journal entries and personal reflections
- Chat conversations with our AI assistant
- Task completion and wellness goal tracking
- Wellness preferences and communication style

Usage Analytics:
- App usage patterns and feature interactions
- Session duration and frequency
- Device and app performance data
- Error logs and crash reports (via Sentry)

Device Information:
- Device type, operating system, and app version
- Device ID and push notification tokens
- Timezone and locale preferences

3. AI PROCESSING & ANTHROPIC
Your conversations with our AI assistant may be processed by Claude (Anthropic API) to provide personalized coaching and support. Anthropic is a trusted AI research company committed to safe and responsible AI.

Data Processing: Chat conversations are transmitted to Anthropic's API for real-time responses. Conversations may be logged for model improvement purposes (standard API usage).

4. DATA STORAGE & SECURITY
Database: PostgreSQL database hosted on Render
Encryption: Data encrypted at rest using industry-standard encryption
Transmission: All data transmitted via HTTPS/TLS encryption
Retention: Account data retained until deletion requested; wellness data archived for analytics

5. THIRD-PARTY SERVICES

Sentry: Error tracking and crash reporting for stability improvement
Mixpanel: Analytics platform for feature usage understanding
Apple In-App Purchase: Handles premium subscriptions securely
Authentication Providers: Apple Sign-In and Google Sign-In for secure authentication

6. YOUR PRIVACY RIGHTS

You have the right to:
- Access Your Data: Request all personal data via /api/gdpr/export
- Delete Your Data: Request complete account deletion via /api/gdpr/delete
- Data Portability: Receive data in portable format (JSON)
- Withdraw Consent: Opt-out of analytics or communications anytime
- GDPR Compliance: EU residents have additional rights under GDPR

To exercise these rights, contact michaelperkins07@gmail.com with "GDPR Request" in the subject.

7. DATA SHARING
We do not sell your personal data. We share data only with:
- Service providers (hosting, analytics, error tracking)
- Legal requirements (court orders, law enforcement)
- AI service providers (Anthropic) for chat processing

8. CHILDREN'S PRIVACY
The App is not intended for children under 13. We do not knowingly collect data from children under 13. If we become aware of such collection, we will delete the account and data immediately.

9. DATA RETENTION
- Active Accounts: Data retained while account is active
- After Deletion: Deleted from primary database within 30 days
- Backups: May exist in backups for 90 days
- Analytics: Anonymized usage data retained indefinitely

10. CHANGES TO THIS POLICY
We may update this privacy policy periodically. Material changes will be announced in-app or via email. Your continued use of the App constitutes acceptance of the updated policy.

11. CONTACT US
For privacy questions, requests, or concerns:
Email: michaelperkins07@gmail.com
Subject: "Privacy Request" or "GDPR Request"
Response time: within 30 days

© 2024 Michael Steven Perkins. All rights reserved.
`;

// Terms of Service Content
const TERMS_OF_SERVICE = `
TERMS OF SERVICE
Top Performer Mental Wellness Companion

Last Updated: ${new Date().toLocaleDateString()}

1. AGREEMENT TO TERMS
By accessing and using the Top Performer mobile application ("App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.

Service Provider: Michael Steven Perkins
Location: Florida, USA
Contact: michaelperkins07@gmail.com

2. SERVICE DESCRIPTION
Top Performer is a personal mental wellness application providing:
- Daily mood tracking and emotional check-ins
- AI-powered wellness coaching via Claude
- Digital journaling for self-reflection
- Task and goal tracking
- Gamification features (streaks, XP, challenges)
- Wellness insights and personalized recommendations

IMPORTANT: This App is NOT a substitute for professional mental health treatment. If you are experiencing a mental health crisis, please seek help from a licensed healthcare provider or call emergency services.

3. USER RESPONSIBILITIES
You agree to:
- Provide accurate account information
- Maintain account confidentiality and security
- Use the App only for lawful purposes
- Not engage in harassment, hate speech, or illegal activity
- Not attempt to hack, modify, or reverse-engineer the App
- Not scrape, harvest, or automate data collection
- Not impersonate other users or misrepresent identity

4. INTELLECTUAL PROPERTY RIGHTS

Our IP:
The App, including all content, features, code, and design, is owned by Michael Steven Perkins and protected by copyright. You may not copy, modify, distribute, or create derivatives of the App without permission.

Your Content:
You retain all rights to your journal entries, mood data, and other personal content. By using the App, you grant us a license to store, process, and analyze your data to provide and improve the service.

Trade Secrets & Confidential Information:
The App may contain proprietary algorithms, AI training methods, and business strategies. These are protected as trade secrets. Unauthorized disclosure or use is strictly prohibited.

5. DISCLAIMER & LIMITATION OF LIABILITY

AS-IS BASIS: The App is provided "as-is" without warranties of any kind, express or implied. We do not guarantee accuracy, reliability, or continuous availability.

NO HEALTH CLAIMS: We make no medical claims. The App is for wellness support only, not medical diagnosis or treatment. Always consult a healthcare provider for medical concerns.

LIMITATION OF DAMAGES: In no event shall we be liable for indirect, incidental, consequential, or punitive damages arising from your use of the App.

LIABILITY CAP: Our total liability is limited to the amount you paid for the App (if any).

6. ACCEPTABLE USE POLICY
You may not use the App to:
- Post hate speech, harassment, or threats
- Share explicit, illegal, or abusive content
- Violate others' privacy or intellectual property
- Attempt unauthorized access to servers or data
- Transmit viruses, malware, or harmful code
- Engage in spam, phishing, or fraudulent activity
- Violate local, state, or federal laws

Violation may result in account suspension or termination without refund.

7. PAYMENT & SUBSCRIPTIONS
- In-App Purchases: Subject to App Store terms
- Recurring Billing: Subscriptions auto-renew unless cancelled
- Cancellation: Cancel anytime via App Store settings
- Refunds: Subject to App Store refund policy (typically within 14 days)
- Billing: Billed through Apple ID or Google Play

8. DATA & PRIVACY
See our Privacy Policy for details on how we collect, use, and protect your data.

Key points:
- Data encrypted at rest and in transit
- Hosted on Render with regular backups
- GDPR-compliant data export and deletion
- AI conversations processed by Anthropic API
- Analytics via Mixpanel and Sentry

9. ACCOUNT TERMINATION
We may terminate your account if:
- You violate these Terms of Service
- You engage in illegal or harmful activity
- You repeatedly violate the Acceptable Use Policy

Upon termination, your account and data will be deleted per our Data Retention policy.

10. THIRD-PARTY LINKS & SERVICES
The App may link to external websites or services. We are not responsible for their content, privacy practices, or accuracy. Use third-party services at your own risk.

11. CHANGES TO TERMS
We may update these Terms of Service at any time. Material changes will be announced in-app or via email. Continued use of the App constitutes acceptance of updated terms.

12. GOVERNING LAW
These Terms are governed by the laws of Florida, USA. Any legal action must be brought in the courts of Florida.

13. CONTACT US
For questions about these Terms:
Email: michaelperkins07@gmail.com
Subject: "Terms of Service Question"
Response time: within 30 days

© 2024 Michael Steven Perkins. All rights reserved.
`;

/**
 * GET /api/legal/privacy-policy
 * Returns the Privacy Policy (Public - No Auth Required)
 */
router.get('/privacy-policy', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(PRIVACY_POLICY);
});

/**
 * GET /api/legal/terms-of-service
 * Returns the Terms of Service (Public - No Auth Required)
 */
router.get('/terms-of-service', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(TERMS_OF_SERVICE);
});

/**
 * GET /api/legal/privacy-policy-json
 * Returns Privacy Policy as JSON object (Public - No Auth Required)
 */
router.get('/privacy-policy-json', (req, res) => {
  res.json({
    title: 'Privacy Policy',
    content: PRIVACY_POLICY,
    lastUpdated: new Date().toISOString(),
    appName: 'Top Performer',
    owner: 'Michael Steven Perkins',
    contact: 'michaelperkins07@gmail.com'
  });
});

/**
 * GET /api/legal/terms-of-service-json
 * Returns Terms of Service as JSON object (Public - No Auth Required)
 */
router.get('/terms-of-service-json', (req, res) => {
  res.json({
    title: 'Terms of Service',
    content: TERMS_OF_SERVICE,
    lastUpdated: new Date().toISOString(),
    appName: 'Top Performer',
    owner: 'Michael Steven Perkins',
    contact: 'michaelperkins07@gmail.com'
  });
});

export default router;
