// ============================================================
// MJ's Superstars - Terms of Service
// ============================================================

import React from 'react';
import { motion } from 'framer-motion';

function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
          <p className="text-slate-400 mt-1">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-8 text-slate-200"
        >
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Agreement to Terms</h2>
            <p className="leading-relaxed">
              By accessing and using the MJ's Superstars mobile application ("App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
            </p>
            <p className="leading-relaxed mt-3">
              <strong>Service Provider:</strong> Michael Steven Perkins<br />
              <strong>Location:</strong> Florida, USA<br />
              <strong>Contact:</strong> michaelperkins07@gmail.com
            </p>
          </section>

          {/* Service Description */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Service Description</h2>
            <p className="leading-relaxed">
              MJ's Superstars is a personal mental wellness application providing:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-3">
              <li>Daily mood tracking and emotional check-ins</li>
              <li>AI-powered wellness coaching via Claude</li>
              <li>Digital journaling for self-reflection</li>
              <li>Task and goal tracking</li>
              <li>Gamification features (streaks, XP, challenges)</li>
              <li>Wellness insights and personalized recommendations</li>
            </ul>
            <p className="leading-relaxed mt-4 text-red-300 font-semibold">
              IMPORTANT: This App is NOT a substitute for professional mental health treatment. If you are experiencing a mental health crisis, please seek help from a licensed healthcare provider or call emergency services.
            </p>
          </section>

          {/* User Responsibilities */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. User Responsibilities</h2>
            <p className="leading-relaxed">
              You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-3">
              <li>Provide accurate account information</li>
              <li>Maintain account confidentiality and security</li>
              <li>Use the App only for lawful purposes</li>
              <li>Not engage in harassment, hate speech, or illegal activity</li>
              <li>Not attempt to hack, modify, or reverse-engineer the App</li>
              <li>Not scrape, harvest, or automate data collection</li>
              <li>Not impersonate other users or misrepresent identity</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Intellectual Property Rights</h2>
            
            <h3 className="text-lg font-semibold text-sky-300 mt-4 mb-2">Our IP</h3>
            <p className="leading-relaxed">
              The App, including all content, features, code, and design, is owned by Michael Steven Perkins and protected by copyright. You may not copy, modify, distribute, or create derivatives of the App without permission.
            </p>

            <h3 className="text-lg font-semibold text-sky-300 mt-6 mb-2">Your Content</h3>
            <p className="leading-relaxed">
              You retain all rights to your journal entries, mood data, and other personal content. By using the App, you grant us a license to store, process, and analyze your data to provide and improve the service.
            </p>

            <h3 className="text-lg font-semibold text-sky-300 mt-6 mb-2">Trade Secrets & Confidential Information</h3>
            <p className="leading-relaxed">
              The App may contain proprietary algorithms, AI training methods, and business strategies. These are protected as trade secrets. Unauthorized disclosure or use is strictly prohibited.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Disclaimer & Limitation of Liability</h2>
            <p className="leading-relaxed">
              <strong>AS-IS BASIS:</strong> The App is provided "as-is" without warranties of any kind, express or implied. We do not guarantee accuracy, reliability, or continuous availability.
            </p>
            <p className="leading-relaxed mt-3">
              <strong>NO HEALTH CLAIMS:</strong> We make no medical claims. The App is for wellness support only, not medical diagnosis or treatment. Always consult a healthcare provider for medical concerns.
            </p>
            <p className="leading-relaxed mt-3">
              <strong>LIMITATION OF DAMAGES:</strong> In no event shall we be liable for indirect, incidental, consequential, or punitive damages arising from your use of the App.
            </p>
            <p className="leading-relaxed mt-3">
              <strong>LIABILITY CAP:</strong> Our total liability is limited to the amount you paid for the App (if any).
            </p>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Acceptable Use Policy</h2>
            <p className="leading-relaxed">
              You may not use the App to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-3">
              <li>Post hate speech, harassment, or threats</li>
              <li>Share explicit, illegal, or abusive content</li>
              <li>Violate others' privacy or intellectual property</li>
              <li>Attempt unauthorized access to servers or data</li>
              <li>Transmit viruses, malware, or harmful code</li>
              <li>Engage in spam, phishing, or fraudulent activity</li>
              <li>Violate local, state, or federal laws</li>
            </ul>
            <p className="leading-relaxed mt-4">
              Violation may result in account suspension or termination without refund.
            </p>
          </section>

          {/* Payment & Subscriptions */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Payment & Subscriptions</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong>In-App Purchases:</strong> Subject to App Store terms</li>
              <li><strong>Recurring Billing:</strong> Subscriptions auto-renew unless cancelled</li>
              <li><strong>Cancellation:</strong> Cancel anytime via App Store settings</li>
              <li><strong>Refunds:</strong> Subject to App Store refund policy (typically within 14 days)</li>
              <li><strong>Billing:</strong> Billed through Apple ID or Google Play</li>
            </ul>
          </section>

          {/* Data Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Data & Privacy</h2>
            <p className="leading-relaxed">
              See our <strong>Privacy Policy</strong> for details on how we collect, use, and protect your data.
            </p>
            <p className="leading-relaxed mt-3">
              Key points:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-3">
              <li>Data encrypted at rest and in transit</li>
              <li>Hosted on Render with regular backups</li>
              <li>GDPR-compliant data export and deletion</li>
              <li>AI conversations processed by Anthropic API</li>
              <li>Analytics via Mixpanel and Sentry</li>
            </ul>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Account Termination</h2>
            <p className="leading-relaxed">
              We may terminate your account if:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-3">
              <li>You violate these Terms of Service</li>
              <li>You engage in illegal or harmful activity</li>
              <li>You repeatedly violate the Acceptable Use Policy</li>
            </ul>
            <p className="leading-relaxed mt-4">
              Upon termination, your account and data will be deleted per our Data Retention policy.
            </p>
          </section>

          {/* External Links */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Third-Party Links & Services</h2>
            <p className="leading-relaxed">
              The App may link to external websites or services. We are not responsible for their content, privacy practices, or accuracy. Use third-party services at your own risk.
            </p>
          </section>

          {/* Modifications */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Changes to Terms</h2>
            <p className="leading-relaxed">
              We may update these Terms of Service at any time. Material changes will be announced in-app or via email. Continued use of the App constitutes acceptance of updated terms.
            </p>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Governing Law</h2>
            <p className="leading-relaxed">
              These Terms are governed by the laws of Florida, USA. Any legal action must be brought in the courts of Florida.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">13. Contact Us</h2>
            <p className="leading-relaxed">
              For questions about these Terms:
            </p>
            <div className="mt-4 space-y-2">
              <p><strong>Email:</strong> michaelperkins07@gmail.com</p>
              <p><strong>Subject:</strong> "Terms of Service Question"</p>
              <p className="text-sm text-slate-400 mt-3">Response time: within 30 days</p>
            </div>
          </section>

          {/* Acknowledgment */}
          <section className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-3">Your Acknowledgment</h2>
            <p className="leading-relaxed text-sm">
              By using the MJ's Superstars app, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy. You also acknowledge that this app is not a substitute for professional mental health treatment.
            </p>
          </section>

          {/* Footer */}
          <div className="text-center text-slate-500 text-sm pt-8">
            <p>MJ's Superstars - Mental Wellness Companion</p>
            <p>© 2024 Michael Steven Perkins. All rights reserved.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default TermsOfService;
