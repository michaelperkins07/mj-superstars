-- ============================================================
-- MJ's Superstars - Initial Database Schema
-- Migration 001: Core Tables
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS TABLE
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    avatar_url TEXT,

    -- Preferences (JSONB for flexibility)
    preferences JSONB DEFAULT '{
        "communication_style": "supportive",
        "notification_time_morning": "08:00",
        "notification_time_evening": "20:00",
        "timezone": "America/New_York",
        "haptics_enabled": true,
        "sound_enabled": true
    }'::jsonb,

    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_data JSONB DEFAULT '{}'::jsonb,

    -- Subscription
    subscription_status VARCHAR(50) DEFAULT 'free',
    subscription_product_id VARCHAR(100),
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    subscription_trial_used BOOLEAN DEFAULT FALSE,

    -- Streaks & Gamification
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    last_activity_date DATE,

    -- Security
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ============================================================
-- MOODS TABLE
-- ============================================================

CREATE TABLE moods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    value INTEGER NOT NULL CHECK (value >= 1 AND value <= 5),
    note TEXT,
    factors TEXT[] DEFAULT '{}',

    -- Context
    time_of_day VARCHAR(20), -- morning, afternoon, evening, night
    day_of_week INTEGER,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_moods_user_id ON moods(user_id);
CREATE INDEX idx_moods_created_at ON moods(created_at);
CREATE INDEX idx_moods_user_date ON moods(user_id, created_at DESC);
CREATE INDEX idx_moods_value ON moods(value);

-- ============================================================
-- CONVERSATIONS TABLE
-- ============================================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title VARCHAR(255),
    summary TEXT,

    -- Metadata
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP WITH TIME ZONE,

    -- AI Context
    context_summary TEXT,
    extracted_topics TEXT[] DEFAULT '{}',
    sentiment_average DECIMAL(3, 2),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- ============================================================
-- MESSAGES TABLE
-- ============================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,

    -- AI Metadata
    tokens_used INTEGER,
    model_version VARCHAR(50),
    response_time_ms INTEGER,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ============================================================
-- TASKS TABLE
-- ============================================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'self-care',

    -- Completion
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Gamification
    points INTEGER DEFAULT 10,
    difficulty VARCHAR(20) DEFAULT 'medium',

    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50), -- daily, weekly, custom
    recurrence_days INTEGER[] DEFAULT '{}',

    -- Scheduling
    due_date DATE,
    due_time TIME,
    reminder_enabled BOOLEAN DEFAULT FALSE,
    reminder_time TIME,

    -- AI Generated
    ai_suggested BOOLEAN DEFAULT FALSE,
    ai_reason TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_completed ON tasks(completed);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- ============================================================
-- JOURNAL ENTRIES TABLE
-- ============================================================

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    prompt TEXT,
    content TEXT NOT NULL,

    -- Analysis
    mood_detected INTEGER,
    themes TEXT[] DEFAULT '{}',
    word_count INTEGER,

    -- Privacy
    is_private BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_journal_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_created_at ON journal_entries(created_at);

-- ============================================================
-- AI MEMORIES TABLE
-- ============================================================

CREATE TABLE ai_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    memory_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,

    -- Source
    source_type VARCHAR(50), -- conversation, mood, journal, manual
    source_id UUID,

    -- Relevance
    importance_score DECIMAL(3, 2) DEFAULT 0.5,
    last_referenced_at TIMESTAMP WITH TIME ZONE,
    reference_count INTEGER DEFAULT 0,

    -- Validity
    is_current BOOLEAN DEFAULT TRUE,
    superseded_by UUID REFERENCES ai_memories(id),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_memories_user_id ON ai_memories(user_id);
CREATE INDEX idx_memories_type ON ai_memories(memory_type);
CREATE INDEX idx_memories_importance ON ai_memories(importance_score DESC);
CREATE INDEX idx_memories_current ON ai_memories(is_current) WHERE is_current = TRUE;

-- ============================================================
-- BUDDIES TABLE
-- ============================================================

CREATE TABLE buddies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buddy_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    status VARCHAR(20) DEFAULT 'pending',
    sharing_level VARCHAR(20) DEFAULT 'basic',

    -- Connection
    invite_code VARCHAR(20),
    connected_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, buddy_user_id)
);

CREATE INDEX idx_buddies_user_id ON buddies(user_id);
CREATE INDEX idx_buddies_buddy_user_id ON buddies(buddy_user_id);
CREATE INDEX idx_buddies_invite_code ON buddies(invite_code);

-- ============================================================
-- BUDDY ACTIVITIES TABLE
-- ============================================================

CREATE TABLE buddy_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buddy_id UUID NOT NULL REFERENCES buddies(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    activity_type VARCHAR(50) NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Read status
    read_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_buddy_activities_buddy_id ON buddy_activities(buddy_id);
CREATE INDEX idx_buddy_activities_created_at ON buddy_activities(created_at DESC);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,

    -- Delivery
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,

    -- Deep linking
    action_url TEXT,
    action_data JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- ============================================================
-- USER DEVICES TABLE (for push notifications)
-- ============================================================

CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    device_token TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL, -- ios, android, web
    device_name VARCHAR(100),
    device_model VARCHAR(100),
    os_version VARCHAR(50),
    app_version VARCHAR(20),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, device_token)
);

CREATE INDEX idx_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_devices_token ON user_devices(device_token);

-- ============================================================
-- ANALYTICS EVENTS TABLE
-- ============================================================

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    event_name VARCHAR(100) NOT NULL,
    properties JSONB DEFAULT '{}'::jsonb,

    -- Context
    session_id VARCHAR(100),
    device_type VARCHAR(50),
    app_version VARCHAR(20),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at);

-- Partition by month for better performance (optional for large scale)
-- CREATE TABLE analytics_events_2025_02 PARTITION OF analytics_events
--     FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- ============================================================
-- SUBSCRIPTIONS HISTORY TABLE
-- ============================================================

CREATE TABLE subscription_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    product_id VARCHAR(100) NOT NULL,
    transaction_id VARCHAR(255),
    original_transaction_id VARCHAR(255),

    event_type VARCHAR(50) NOT NULL, -- purchase, renewal, cancellation, expiration

    -- Pricing
    price_amount DECIMAL(10, 2),
    price_currency VARCHAR(3),

    -- Period
    starts_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Trial
    is_trial BOOLEAN DEFAULT FALSE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscription_history_user_id ON subscription_history(user_id);
CREATE INDEX idx_subscription_history_transaction ON subscription_history(transaction_id);

-- ============================================================
-- HEALTH DATA TABLE (for HealthKit sync summaries)
-- ============================================================

CREATE TABLE health_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    date DATE NOT NULL,

    -- Activity
    steps INTEGER,
    active_calories INTEGER,
    exercise_minutes INTEGER,

    -- Heart
    resting_heart_rate INTEGER,
    heart_rate_variability DECIMAL(5, 2),

    -- Sleep
    sleep_hours DECIMAL(4, 2),
    sleep_quality VARCHAR(20),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, date)
);

CREATE INDEX idx_health_user_date ON health_summaries(user_id, date DESC);

-- ============================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_moods_updated_at BEFORE UPDATE ON moods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journal_updated_at BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at BEFORE UPDATE ON ai_memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buddies_updated_at BEFORE UPDATE ON buddies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON user_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_updated_at BEFORE UPDATE ON health_summaries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- TRIGGER: Update conversation message count
-- ============================================================

CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET message_count = message_count + 1,
        last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_message_count AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_message_count();

-- ============================================================
-- TRIGGER: Update user streak on mood log
-- ============================================================

CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
    last_date DATE;
    today DATE := CURRENT_DATE;
BEGIN
    SELECT last_activity_date INTO last_date FROM users WHERE id = NEW.user_id;

    IF last_date IS NULL OR last_date < today - INTERVAL '1 day' THEN
        -- Reset streak if more than 1 day gap
        UPDATE users SET
            current_streak = 1,
            last_activity_date = today
        WHERE id = NEW.user_id;
    ELSIF last_date = today - INTERVAL '1 day' THEN
        -- Increment streak
        UPDATE users SET
            current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            last_activity_date = today
        WHERE id = NEW.user_id;
    ELSIF last_date < today THEN
        -- Same day, update date only
        UPDATE users SET last_activity_date = today WHERE id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_streak_on_mood AFTER INSERT ON moods
    FOR EACH ROW EXECUTE FUNCTION update_user_streak();

-- ============================================================
-- VIEWS
-- ============================================================

-- User mood summary view
CREATE VIEW user_mood_summary AS
SELECT
    user_id,
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) as mood_count,
    AVG(value) as avg_mood,
    MIN(value) as min_mood,
    MAX(value) as max_mood,
    MODE() WITHIN GROUP (ORDER BY value) as most_common_mood
FROM moods
GROUP BY user_id, DATE_TRUNC('week', created_at);

-- Active users view
CREATE VIEW active_users AS
SELECT
    u.id,
    u.email,
    u.name,
    u.subscription_status,
    u.current_streak,
    u.total_points,
    COUNT(DISTINCT m.id) as mood_count_30d,
    COUNT(DISTINCT msg.id) as message_count_30d
FROM users u
LEFT JOIN moods m ON u.id = m.user_id AND m.created_at > NOW() - INTERVAL '30 days'
LEFT JOIN messages msg ON u.id = msg.user_id AND msg.created_at > NOW() - INTERVAL '30 days'
WHERE u.deleted_at IS NULL
GROUP BY u.id;

-- ============================================================
-- SEED DEFAULT DATA
-- ============================================================

-- Insert default journal prompts (can be used by the app)
CREATE TABLE journal_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    prompt TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO journal_prompts (category, prompt) VALUES
('gratitude', 'What are three things you''re grateful for today?'),
('gratitude', 'Who made a positive impact on your life recently?'),
('reflection', 'What was the highlight of your day?'),
('reflection', 'What challenged you today, and how did you handle it?'),
('growth', 'What''s one thing you learned about yourself this week?'),
('growth', 'What would you do differently if you could redo today?'),
('goals', 'What small step can you take tomorrow toward a big goal?'),
('goals', 'What does success look like for you this month?'),
('emotions', 'How are you really feeling right now? Take a moment to check in.'),
('emotions', 'What emotion have you been avoiding lately?'),
('relationships', 'Who do you need to reach out to?'),
('relationships', 'How can you show appreciation to someone important to you?'),
('selfcare', 'What does your body need right now?'),
('selfcare', 'How can you be kinder to yourself today?');

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Record migration
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('001_initial_schema');
