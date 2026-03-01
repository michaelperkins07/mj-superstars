// ============================================================
// MJ's Superstars - Privacy Policy
// ============================================================

import React from 'react';
import { motion } from 'framer-motion';

function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
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
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p className="leading-relaxed">
              MJ's Superstars ("we", "us", "our", or "App") is committed to protecting your privacy. This Privacy Policy explains our data practices for the MJ's Superstars mobile application.
            </p>
            <p className="leading-relaxed mt-3">
              <strong>App Owner:</strong> Michael Steven Perkins, Florida, USA<br />
              <strong>Contact:</strong> michaelperkins07@gmail.com
            </p>
          </section>

          {/* Data Collection */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            
            <h3 className="text-lg font-semibold text-sky-300 mt-4 mb-2">Account Information</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Email address and password</li>
              <li>Display name or nickname</li>
              <li>Account creation and authentication data</li>
            </ul>

            <h3 className="text-lg font-semibold text-sky-300 mt-6 mb-2">Wellness Data</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Mood check-ins and emotional state indicators</li>
              <li>Journal entries and personal reflections</li>
              <li>Chat conversations with our AI assistant</li>
              <li>Task completion and wellness goal tracking</li>
              <li>Wellness preferences and communication style</li>
            </ul>

            <h3 className="text-lg font-semibold text-sky-300 mt-6 mb-2">Usage Analytics</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>App usage patterns and feature interactions</li>
              <li>Session duration and frequency</li>
              <li>Device and app performance data</li>
              <li>Error logs and crash reports (via Sentry)</li>
            </ul>

            <h3 className="text-lg font-semibold text-sky-300 mt-6 mb-2">Device Information</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Device type, operating system, and app version</li>
              <li>Device ID and push notification tokens</li>
              <li>Timezone and locale preferences</li>
            </ul>
          </section>

          {/* AI Processing */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. AI Processing & Anthropic</h2>
            <p className="leading-relaxed">
              Your conversations with our AI assistant may be processed by Claude (Anthropic API) to provide personalized coaching and support. Anthropic is a trusted AI research company committed to safe and responsible AI.
            </p>
            <p className="leading-relaxed mt-3">
              <strong>Data Processing:</strong> Chat conversations are transmitted to Anthropic's API for real-time responses. Conversations may be logged for model improvement purposes (standard API usage). You can review Anthropic's privacy policy at anthropic.com/privacy.
            </p>
          </section>

          {/* Data Storage & Security */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Data Storage & Security</h2>
            <p className="leading-relaxed">
              <strong>Database:</strong> PostgreSQL database hosted on Render<br />
              <strong>Encryption:</strong> Data encrypted at rest using industry-standard encryption<br />
              <strong>Transmission:</strong> All data transmitted via HTTPS/TLS encryption<br />
              <strong>Retention:</strong> Account data retained until deletion requested; wellness data archived for analytics
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Third-Party Services</h2>
            
            <h3 className="text-lg font-semibold text-sky-300 mt-4 mb-2">Sentry</h3>
            <p className="leading-relaxed">
              Error tracking and crash reporting. Helps us improve app stability. May include anonymized error context.
            </p>

            <h3 className="text-lg font-semibold text-sky-300 mt-4 mb-2">Mixpanel</h3>
            <p className="leading-relaxed">
              Analytics platform for understanding feature usage and user behavior. Anonymous event tracking.
            </p>

            <h3 className="text-lg font-semibold text-sky-300 mt-4 mb-2">Apple In-App Purchase</h3>
            <p className="leading-relaxed">
              Handles Elite subscriptions securely. Apple may process subscription and payment information.
            </p>

            <h3 className="text-lg font-semibold text-sky-300 mt-4 mb-2">Authentication Providers</h3>
            <p className="leading-relaxed">
              Apple Sign-In and Google Sign-In. OAuth tokens used only for authentication.
            </p>
          </section>

          {/* User Rights & GDPR */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Your Privacy Rights</h2>
            <p className="leading-relaxed">
              You have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-3">
              <li><strong>Access Your Data:</strong> Request all personal data via /api/gdpr/export</li>
              <li><strong>Delete Your Data:</strong> Request complete account deletion via /api/gdpr/delete</li>
              <li><strong>Data Portability:</strong> Receive data in portable format (JSON)</li>
              <li><strong>Withdraw Consent:</strong> Opt-out of analytics or communications anytime</li>
              <li><strong>GDPR Compliance:</strong> EU residents have additional rights under GDPR</li>
            </ul>
            <p className="leading-relaxed mt-4">
              To exercise these rights, contact michaelperkins07@gmail.com with "GDPR Request" in the subject.
            </p>
          </section>

          {/* Data Sharing */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Data Sharing</h2>
            <p className="leading-relaxed">
              We do not sell your personal data. We share data only with:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-3">
              <li>Service providers (hosting, analytics, error tracking)</li>
              <li>Legal requirements (court orders, law enforcement)</li>
              <li>AI service providers (Anthropic) for chat processing</li>
            </ul>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Children's Privacy</h2>
            <p className="leading-relaxed">
              The App is not intended for children under 13. We do not knowingly collect data from children under 13. If we become aware of such collection, we will delete the account and data immediately.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Data Retention</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong>Active Accounts:</strong> Data retained while account is active</li>
              <li><strong>After Deletion:</strong> Deleted from primary database within 30 days</li>
              <li><strong>Backups:</strong> May exist in backups for 90 days</li>
              <li><strong>Analytics:</strong> Anonymized usage data retained indefinitely</li>
            </ul>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Changes to This Policy</h2>
            <p className="leading-relaxed">
              We may update this privacy policy periodically. Material changes will be announced in-app or via email. Your continued use of the App constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">11. Contact Us</h2>
            <p className="leading-relaxed">
              For privacy questions, requests, or concerns:
            </p>
            <div className="mt-4 space-y-2">
              <p><strong>Email:</strong> michaelperkins07@gmail.com</p>
              <p><strong>Subject:</strong> "Privacy Request" or "GDPR Request"</p>
              <p className="text-sm text-slate-400 mt-3">Response time: within 30 days</p>
            </div>
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

export default PrivacyPolicy;
