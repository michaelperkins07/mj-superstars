-- Migration: 012_referral_system.sql
-- Description: Add referral codes, tracking, and rewards tables
-- Created: 2026

BEGIN;

-- Create referral_codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  uses_count INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);

-- Create referral_tracking table
CREATE TABLE IF NOT EXISTS referral_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'signed_up' CHECK (status IN ('signed_up', 'onboarded', 'active', 'expired')),
  referrer_rewarded BOOLEAN DEFAULT FALSE,
  referred_rewarded BOOLEAN DEFAULT FALSE,
  referrer_points_awarded INTEGER DEFAULT 0,
  referred_points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  converted_at TIMESTAMPTZ,
  UNIQUE(referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_tracking_referrer_id ON referral_tracking(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referred_id ON referral_tracking(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_code ON referral_tracking(referral_code);

-- Create share_events table (analytics)
CREATE TABLE IF NOT EXISTS share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_type VARCHAR(30) NOT NULL CHECK (share_type IN ('referral_link', 'achievement', 'mood_win', 'streak', 'post', 'app_invite')),
  platform VARCHAR(30) CHECK (platform IN ('native', 'whatsapp', 'twitter', 'facebook', 'instagram', 'sms', 'email', 'copy_link', 'other')),
  content_id UUID, -- optional reference to shared content
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_share_events_user_id ON share_events(user_id);
CREATE INDEX IF NOT EXISTS idx_share_events_share_type ON share_events(share_type);
CREATE INDEX IF NOT EXISTS idx_share_events_created_at ON share_events(created_at);

-- Add referral_code column to users table
DO $$
BEGIN
  ALTER TABLE users ADD COLUMN referred_by VARCHAR(20);
EXCEPTION WHEN duplicate_column THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE users ADD COLUMN referral_code VARCHAR(20);
EXCEPTION WHEN duplicate_column THEN
  NULL;
END $$;

-- Record migration
INSERT INTO schema_migrations (version) VALUES ('012_referral_system')
ON CONFLICT DO NOTHING;

COMMIT;
