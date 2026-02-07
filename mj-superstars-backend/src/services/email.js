// ============================================================
// Email Service - Resend integration for transactional emails
// ============================================================

import { logger } from '../utils/logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'MJ\'s Superstars <onboarding@resend.dev>';
const APP_URL = process.env.FRONTEND_URL || 'https://mj-superstars-app.onrender.com';

/**
 * Send email via Resend API (no SDK needed — just fetch)
 */
async function sendEmail({ to, subject, html, text }) {
  if (!RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not set — skipping email send', { to, subject });
    return { success: false, reason: 'no_api_key' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
        text
      })
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Resend API error:', { status: response.status, error: data });
      return { success: false, reason: 'api_error', error: data };
    }

    logger.info('Email sent successfully:', { to, subject, id: data.id });
    return { success: true, id: data.id };
  } catch (error) {
    logger.error('Email send failed:', { to, subject, error: error.message });
    return { success: false, reason: 'network_error', error: error.message };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #0f172a; color: #e2e8f0; }
    .container { max-width: 480px; margin: 0 auto; padding: 40px 24px; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo-text { font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #7C3AED, #06B6D4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .card { background: #1e293b; border-radius: 16px; padding: 32px 24px; border: 1px solid #334155; }
    h1 { font-size: 22px; margin: 0 0 16px 0; color: #f1f5f9; }
    p { font-size: 15px; line-height: 1.6; color: #94a3b8; margin: 0 0 16px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #7C3AED, #06B6D4); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 8px 0 24px 0; }
    .url-fallback { font-size: 12px; color: #64748b; word-break: break-all; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #475569; }
    .expire { background: #7C3AED20; border: 1px solid #7C3AED40; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #a78bfa; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <span class="logo-text">White Mike ⭐</span>
    </div>
    <div class="card">
      <h1>Reset Your Password</h1>
      <p>Someone requested a password reset for your account. If this was you, click the button below to set a new password.</p>
      <div class="expire">⏱ This link expires in 1 hour</div>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>
      <p>If you didn't request this, you can safely ignore this email. Your password won't change.</p>
      <p class="url-fallback">Or copy this link: ${resetUrl}</p>
    </div>
    <div class="footer">
      <p>White Mike — Your AI coaching companion</p>
      <p>You're receiving this because a password reset was requested for ${email}</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Reset your White Mike password\n\nSomeone requested a password reset for your account. Visit this link to set a new password:\n\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`;

  return sendEmail({
    to: email,
    subject: "Reset your White Mike password",
    html,
    text
  });
}

/**
 * Send welcome email after registration
 */
export async function sendWelcomeEmail(email, displayName) {
  const name = displayName || 'Superstar';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #0f172a; color: #e2e8f0; }
    .container { max-width: 480px; margin: 0 auto; padding: 40px 24px; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo-text { font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #7C3AED, #06B6D4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .card { background: #1e293b; border-radius: 16px; padding: 32px 24px; border: 1px solid #334155; }
    h1 { font-size: 22px; margin: 0 0 16px 0; color: #f1f5f9; }
    p { font-size: 15px; line-height: 1.6; color: #94a3b8; margin: 0 0 16px 0; }
    .highlight { color: #7C3AED; font-weight: 600; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #475569; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <span class="logo-text">White Mike ⭐</span>
    </div>
    <div class="card">
      <h1>Welcome to the team, ${name}! 🎉</h1>
      <p>Yo! I'm <span class="highlight">MJ</span>, your personal AI coach. I'm here to help you level up every single day.</p>
      <p>Here's the deal — <span class="highlight">everything is reps</span>. Every conversation we have, every mood you track, every task you crush, every journal entry you write... it all adds up.</p>
      <p>Start by telling me what's on your mind. No judgment, no filter. I'm here to listen, challenge you, and hype you up when you need it.</p>
      <p>Let's get it! 💪</p>
    </div>
    <div class="footer">
      <p>White Mike — Your AI coaching companion</p>
    </div>
  </div>
</body>
</html>`;

  const text = `Welcome to White Mike, ${name}!\n\nI'm White Mike, your personal AI coach. Everything is reps — every conversation, every mood you track, every task you crush adds up.\n\nStart by telling me what's on your mind. Let's get it!`;

  return sendEmail({
    to: email,
    subject: `Welcome to White Mike, ${name}! 🎉`,
    html,
    text
  });
}

export const EmailService = {
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendEmail
};
