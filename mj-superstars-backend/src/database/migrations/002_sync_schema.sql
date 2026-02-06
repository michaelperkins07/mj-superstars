-- ============================================================
-- Migration 002: Schema Sync - Bridge Gap Between Migration 001 and Backend Routes
-- ============================================================
-- This migration adds missing columns to existing tables and creates new tables
-- that the backend routes (auth, users, moods, etc.) depend on.
-- Uses defensive DDL for safe idempotent execution.
-- ============================================================

-- ============================================================
-- STEP 1: ALTER users TABLE - Add Missing Columns
-- ============================================================

-- Add display_name column (mirrors the 'name' column for backward compatibility)
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN display_name VARCHAR(100);
EXCEPTION WHEN duplicate_column THEN
    NULL;
END $$;

-- Add timezone as direct column (extract from preferences if needed)
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/New_York';
EXCEPTION WHEN duplicate_column THEN
    NULL;
END $$;

-- Add is_active status column
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN duplicate_column THEN
    NULL;
END $$;

-- Add is_premium boolean (extract from subscription_status if needed)
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
EXCEPTION WHEN duplicate_column THEN
    NULL;
END $$;

-- Add premium_expires_at timestamp
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN premium_expires_at TIMESTAMP WITH TIME ZONE;
EXCEPTION WHEN duplicate_column THEN
    NULL;
END $$;

-- Add communication_style JSONB column
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN communication_style JSONB DEFAULT '{"style": "supportive"}'::jsonb;
EXCEPTION WHEN duplicate_column THEN
    NULL;
END $$;

-- Add last_active_at timestamp (different from last_login_at)
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP WITH TIME ZONE;
EXCEPTION WHEN duplicate_column THEN
    NULL;
END $$;

-- ============================================================
-- STEP 2: Backfill user columns from existing data
-- ============================================================

-- Populate display_name from name if name exists and display_name is null
UPDATE users
SET display_name = COALESCE(display_name, name, email)
WHERE display_name IS NULL;

-- Populate timezone from preferences.timezone if available
UPDATE users
SET timezone = COALESCE(
    timezone,
    preferences->>'timezone',
    'America/New_York'
)
WHERE timezone IS NULL;

-- Set is_premium based on subscription_status
UPDATE users
SET is_premium = (subscription_status = 'premium' OR subscription_status = 'trial')
WHERE is_premium = FALSE;

-- Set premium_expires_at from subscription_expires_at if premium
UPDATE users
SET premium_expires_at = subscription_expires_at
WHERE is_premium = TRUE AND premium_expires_at IS NULL;

-- Set is_active to TRUE for all existing users (or keep their current status)
UPDATE users SET is_active = TRUE WHERE is_active = FALSE;

-- Set last_active_at from last_login_at if available
UPDATE users
SET last_active_at = COALESCE(last_active_at, last_login_at, updated_at)
WHERE last_active_at IS NULL;

-- ============================================================
-- STEP 3: CREATE user_sessions TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_info JSONB DEFAULT '{}'::jsonb,
    ip_address INET,

    -- Session lifecycle
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at) WHERE revoked_at IS NULL;

-- ============================================================
-- STEP 4: CREATE user_personalization TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_personalization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Personal context
    people JSONB DEFAULT '{}'::jsonb,
    work_context JSONB DEFAULT '{}'::jsonb,
    health_context JSONB DEFAULT '{}'::jsonb,

    -- Wellness context
    triggers JSONB DEFAULT '{}'::jsonb,
    comforts JSONB DEFAULT '{}'::jsonb,

    -- Goals and values
    interests JSONB DEFAULT '{}'::jsonb,
    goals JSONB DEFAULT '{}'::jsonb,
    values JSONB DEFAULT '{}'::jsonb,

    -- Personalization preferences
    preferred_name VARCHAR(100),
    preferred_pronouns VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_personalization_user_id ON user_personalization(user_id);

-- ============================================================
-- STEP 5: CREATE user_streaks TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    streak_type VARCHAR(50) NOT NULL,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,

    last_completed_date DATE,
    streak_started_date DATE DEFAULT CURRENT_DATE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, streak_type)
);

CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_type ON user_streaks(streak_type);

-- ============================================================
-- STEP 6: CREATE mood_entries TABLE
-- ============================================================
-- This is a more detailed mood table than the existing 'moods' table.
-- Routes reference mood_entries, so we create this alongside the existing moods table.

CREATE TABLE IF NOT EXISTS mood_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Mood scoring
    mood_score INTEGER NOT NULL CHECK (mood_score >= 1 AND mood_score <= 5),
    energy_level INTEGER CHECK (energy_level >= 0 AND energy_level <= 100),
    anxiety_level INTEGER CHECK (anxiety_level >= 0 AND anxiety_level <= 100),

    -- Notes and context
    note TEXT,
    activities JSONB DEFAULT '{}'::jsonb,
    triggers JSONB DEFAULT '{}'::jsonb,

    -- Source and conversation
    source VARCHAR(50), -- app, conversation, manual, etc.
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

    -- Time context
    time_of_day VARCHAR(20), -- morning, afternoon, evening, night
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_created_at ON mood_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_date ON mood_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_entries_mood_score ON mood_entries(mood_score);

-- ============================================================
-- STEP 7: CREATE push_subscriptions TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    endpoint TEXT NOT NULL,
    auth_key VARCHAR(255) NOT NULL,
    p256dh_key VARCHAR(255) NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active) WHERE is_active = TRUE;

-- ============================================================
-- STEP 8: Update Triggers - Add updated_at triggers to new tables
-- ============================================================

-- Trigger for user_personalization
DO $$ BEGIN
    CREATE TRIGGER update_user_personalization_updated_at
        BEFORE UPDATE ON user_personalization
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- Trigger for user_streaks
DO $$ BEGIN
    CREATE TRIGGER update_user_streaks_updated_at
        BEFORE UPDATE ON user_streaks
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- Trigger for mood_entries
DO $$ BEGIN
    CREATE TRIGGER update_mood_entries_updated_at
        BEFORE UPDATE ON mood_entries
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- Trigger for push_subscriptions
DO $$ BEGIN
    CREATE TRIGGER update_push_subscriptions_updated_at
        BEFORE UPDATE ON push_subscriptions
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- ============================================================
-- STEP 9: Add NOT NULL constraints where appropriate
-- ============================================================

-- Make display_name NOT NULL with default fallback
DO $$ BEGIN
    ALTER TABLE users
    ALTER COLUMN display_name SET NOT NULL,
    ALTER COLUMN display_name SET DEFAULT '';
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- Make timezone NOT NULL
DO $$ BEGIN
    ALTER TABLE users
    ALTER COLUMN timezone SET NOT NULL;
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- ============================================================
-- STEP 10: Record migration version
-- ============================================================

INSERT INTO schema_migrations (version)
VALUES ('002_sync_schema')
ON CONFLICT (version) DO NOTHING;

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- This migration has:
-- 1. Added missing columns to users table (display_name, timezone, is_active, is_premium, etc.)
-- 2. Created user_sessions table for token management
-- 3. Created user_personalization table for user context
-- 4. Created user_streaks table for tracking streaks by type
-- 5. Created mood_entries table for detailed mood logging
-- 6. Created push_subscriptions table for push notification management
-- 7. Added appropriate indexes for query performance
-- 8. Added triggers for updated_at timestamps
-- 9. Backfilled existing data where possible
--
-- The migration is idempotent and safe to run multiple times.
