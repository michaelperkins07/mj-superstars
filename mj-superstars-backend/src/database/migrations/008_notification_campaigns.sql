-- ============================================================
-- Migration 008: Push Notification Campaign Scheduler
-- ============================================================

-- ============================================================
-- NOTIFICATION PREFERENCES TABLE
-- Stores user opt-in/opt-out preferences for campaign types
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- Campaign Type Toggles
    mood_reminder_enabled BOOLEAN DEFAULT true,
    mood_reminder_time TIME DEFAULT '09:00',

    onboarding_drip_enabled BOOLEAN DEFAULT true,
    re_engagement_enabled BOOLEAN DEFAULT true,
    streak_reminders_enabled BOOLEAN DEFAULT true,
    weekly_recap_enabled BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_mood_enabled ON notification_preferences(mood_reminder_enabled)
WHERE mood_reminder_enabled = true;

-- ============================================================
-- CAMPAIGNS TABLE
-- Tracks all campaign messages sent to users
-- ============================================================

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Campaign Type (onboarding_drip, daily_mood_check, re_engagement, streak_protection, weekly_recap)
    campaign_type VARCHAR(50) NOT NULL,

    -- Status (scheduled, pending, sent, failed)
    status VARCHAR(20) DEFAULT 'pending',

    -- Additional metadata for tracking (day number, nudge type, etc.)
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_type ON campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_sent_at ON campaigns(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_type_sent ON campaigns(user_id, campaign_type, sent_at DESC);

-- ============================================================
-- TIMEZONE COLUMN ADDITION
-- Ensure users table has timezone column
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'timezone'
    ) THEN
        ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/New_York';
        CREATE INDEX idx_users_timezone ON users(timezone);
    END IF;
END $$;

-- ============================================================
-- HELPER FUNCTION: Update notification preferences timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_notification_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_notification_preferences_timestamp();

-- ============================================================
-- HELPER FUNCTION: Update campaigns timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_campaigns_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at
BEFORE UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION update_campaigns_timestamp();

-- ============================================================
-- Migration Complete
-- ============================================================
