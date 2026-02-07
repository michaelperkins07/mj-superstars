-- ============================================================
-- MJ's Superstars Database Schema
-- PostgreSQL 15+
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS & AUTHENTICATION
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),

    -- Profile
    display_name VARCHAR(100),
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'America/New_York',

    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_data JSONB DEFAULT '{}',

    -- Communication style (mirrors user)
    communication_style JSONB DEFAULT '{
        "formality": 0.5,
        "emoji_usage": 0.5,
        "message_length": "medium",
        "tone": "supportive"
    }',

    -- Account status
    is_active BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,
    premium_expires_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_active ON users(last_active_at);

-- User sessions/tokens
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(refresh_token_hash);

-- Push notification subscriptions
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    keys JSONB,
    device_token VARCHAR(200), -- iOS APNs device token
    device_type VARCHAR(20), -- 'ios', 'android', 'web'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

CREATE INDEX idx_push_user ON push_subscriptions(user_id);

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Conversation metadata
    title VARCHAR(255),
    summary TEXT,

    -- Session tracking
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0,

    -- Context
    initial_mood INTEGER, -- 1-5
    final_mood INTEGER,
    topics JSONB DEFAULT '[]',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_active ON conversations(user_id, is_active);
CREATE INDEX idx_conversations_date ON conversations(created_at DESC);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Message content
    role VARCHAR(20) NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,

    -- Metadata
    mood_detected INTEGER, -- 1-5 scale
    topics JSONB DEFAULT '[]',
    intent VARCHAR(50), -- 'venting', 'seeking_advice', 'check_in', etc.

    -- Voice message
    is_voice BOOLEAN DEFAULT FALSE,
    audio_url TEXT,
    audio_duration INTEGER, -- seconds

    -- Tokens used
    input_tokens INTEGER,
    output_tokens INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_date ON messages(created_at DESC);

-- ============================================================
-- MOOD TRACKING
-- ============================================================

CREATE TABLE mood_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Mood data
    mood_score INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 5),
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 5),
    anxiety_level INTEGER CHECK (anxiety_level BETWEEN 1 AND 5),

    -- Context
    note TEXT,
    activities JSONB DEFAULT '[]', -- ['work', 'exercise', 'social']
    triggers JSONB DEFAULT '[]',

    -- Source
    source VARCHAR(20) DEFAULT 'manual', -- 'manual', 'check_in', 'conversation', 'widget'
    conversation_id UUID REFERENCES conversations(id),

    -- Time context
    time_of_day VARCHAR(20), -- 'morning', 'afternoon', 'evening', 'night'
    day_of_week INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mood_user ON mood_entries(user_id);
CREATE INDEX idx_mood_date ON mood_entries(created_at DESC);
CREATE INDEX idx_mood_user_date ON mood_entries(user_id, created_at DESC);

-- ============================================================
-- TASKS & ACTIVITIES
-- ============================================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Task details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'self_care', 'work', 'health', 'social', 'personal'

    -- Difficulty & effort
    difficulty VARCHAR(20) DEFAULT 'medium', -- 'tiny', 'small', 'medium', 'large'
    estimated_minutes INTEGER,

    -- Scheduling
    due_date DATE,
    due_time TIME,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule JSONB, -- { "frequency": "daily", "days": [1,3,5] }

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'skipped'
    completed_at TIMESTAMPTZ,

    -- MJ suggested
    suggested_by_mj BOOLEAN DEFAULT FALSE,
    suggestion_context TEXT,

    -- Gamification
    points_awarded INTEGER DEFAULT 0,
    streak_contribution BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_user ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_due ON tasks(user_id, due_date);

-- Task completion history (for recurring tasks)
CREATE TABLE task_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    completed_at TIMESTAMPTZ DEFAULT NOW(),
    mood_before INTEGER,
    mood_after INTEGER,
    notes TEXT,
    points_earned INTEGER DEFAULT 0
);

CREATE INDEX idx_completions_task ON task_completions(task_id);
CREATE INDEX idx_completions_user ON task_completions(user_id, completed_at DESC);

-- ============================================================
-- DAILY RITUALS
-- ============================================================

CREATE TABLE morning_intentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    intention_text TEXT NOT NULL,
    focus_word VARCHAR(50),
    mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 5),

    -- Reflection (end of day)
    reflection TEXT,
    intention_met BOOLEAN,
    reflected_at TIMESTAMPTZ,

    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_morning_user_date ON morning_intentions(user_id, date);

CREATE TABLE evening_reflections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Reflection steps
    went_well TEXT,
    let_go TEXT,
    grateful_for TEXT,
    tomorrow_intention TEXT,

    -- Mood
    evening_mood INTEGER CHECK (evening_mood BETWEEN 1 AND 5),
    sleep_readiness INTEGER CHECK (sleep_readiness BETWEEN 1 AND 5),

    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_evening_user_date ON evening_reflections(user_id, date);

-- ============================================================
-- JOURNAL ENTRIES
-- ============================================================

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Entry content
    title VARCHAR(255),
    content TEXT NOT NULL,

    -- Prompt-based
    prompt_id VARCHAR(50),
    prompt_text TEXT,

    -- Metadata
    mood_score INTEGER,
    tags JSONB DEFAULT '[]',
    word_count INTEGER,

    -- Privacy
    is_private BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_journal_user ON journal_entries(user_id);
CREATE INDEX idx_journal_date ON journal_entries(created_at DESC);

-- ============================================================
-- DEEP PERSONALIZATION
-- ============================================================

CREATE TABLE user_personalization (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- People in user's life
    people JSONB DEFAULT '[]', -- [{ "name": "Sarah", "relationship": "partner", "context": "..." }]

    -- Work/life context
    work_context JSONB DEFAULT '{}', -- { "job": "...", "challenges": [...], "goals": [...] }

    -- Emotional patterns
    triggers JSONB DEFAULT '[]', -- [{ "trigger": "deadlines", "response": "anxiety", "coping": "..." }]
    comforts JSONB DEFAULT '[]', -- ["music", "walks", "tea"]

    -- Preferences
    interests JSONB DEFAULT '[]',
    goals JSONB DEFAULT '[]',
    values JSONB DEFAULT '[]',

    -- Communication
    preferred_name VARCHAR(50),
    preferred_pronouns VARCHAR(20),

    -- Health context (opt-in)
    health_context JSONB DEFAULT '{}',

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_personalization_user ON user_personalization(user_id);

-- Extracted details from conversations
CREATE TABLE personalization_extractions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,

    extraction_type VARCHAR(50), -- 'person', 'trigger', 'comfort', 'interest', 'goal'
    extracted_data JSONB NOT NULL,
    confidence FLOAT,

    -- Review status
    is_verified BOOLEAN DEFAULT FALSE,
    is_rejected BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_extractions_user ON personalization_extractions(user_id);

-- ============================================================
-- PROGRESS & STREAKS
-- ============================================================

CREATE TABLE user_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    streak_type VARCHAR(50) NOT NULL, -- 'check_in', 'morning_ritual', 'evening_reflection', 'task_completion'

    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,

    last_completed_date DATE,
    streak_started_date DATE,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_streaks_user_type ON user_streaks(user_id, streak_type);

CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    achievement_description TEXT,

    -- Metadata
    tier VARCHAR(20), -- 'bronze', 'silver', 'gold', 'platinum'
    points INTEGER DEFAULT 0,
    icon VARCHAR(10),

    earned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_achievements_user ON achievements(user_id);

-- Weekly growth stories
CREATE TABLE weekly_stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    week_start DATE NOT NULL,
    week_end DATE NOT NULL,

    -- Story content
    narrative TEXT,
    highlights JSONB DEFAULT '[]',
    mood_summary JSONB DEFAULT '{}',
    achievements_earned JSONB DEFAULT '[]',

    -- Stats
    conversations_count INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,

    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_stories_user_week ON weekly_stories(user_id, week_start);

-- ============================================================
-- COPING TOOLKIT
-- ============================================================

CREATE TABLE coping_tools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Tool details
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'breathing', 'grounding', 'distraction', 'social', 'physical'

    -- Instructions
    steps JSONB DEFAULT '[]',
    duration_minutes INTEGER,

    -- Effectiveness tracking
    times_used INTEGER DEFAULT 0,
    avg_effectiveness FLOAT, -- 1-5

    -- Source
    is_custom BOOLEAN DEFAULT FALSE,
    suggested_by_mj BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_coping_user ON coping_tools(user_id);

CREATE TABLE coping_tool_uses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tool_id UUID REFERENCES coping_tools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    mood_before INTEGER,
    mood_after INTEGER,
    effectiveness INTEGER CHECK (effectiveness BETWEEN 1 AND 5),
    notes TEXT,

    used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tool_uses_user ON coping_tool_uses(user_id, used_at DESC);

-- ============================================================
-- CHECK-INS & NOTIFICATIONS
-- ============================================================

CREATE TABLE scheduled_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Schedule
    checkin_type VARCHAR(50) NOT NULL, -- 'daily', 'mood', 'task_reminder', 'custom'
    scheduled_time TIME,
    days_of_week INTEGER[], -- [1,2,3,4,5] for Mon-Fri

    -- Content
    message_template TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_sent_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checkins_user ON scheduled_checkins(user_id);

CREATE TABLE notification_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    body TEXT,
    data JSONB DEFAULT '{}',

    -- Delivery status
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,

    -- Response
    action_taken VARCHAR(50),
    response_time_seconds INTEGER
);

CREATE INDEX idx_notifications_user ON notification_history(user_id, sent_at DESC);

-- ============================================================
-- ACCOUNTABILITY BUDDY
-- ============================================================

CREATE TABLE buddy_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    buddy_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Connection status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'paused', 'ended'

    -- Shared goals
    shared_goals JSONB DEFAULT '[]',

    -- Privacy settings
    share_mood BOOLEAN DEFAULT TRUE,
    share_streaks BOOLEAN DEFAULT TRUE,
    share_achievements BOOLEAN DEFAULT TRUE,

    connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_buddy_user ON buddy_connections(user_id);
CREATE INDEX idx_buddy_buddy ON buddy_connections(buddy_id);

-- ============================================================
-- CONTENT FEED
-- ============================================================

CREATE TABLE content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    content_type VARCHAR(50) NOT NULL, -- 'quote', 'affirmation', 'challenge', 'tip', 'article'

    -- Content
    title VARCHAR(255),
    body TEXT NOT NULL,
    author VARCHAR(100),
    source_url TEXT,

    -- Categorization
    categories JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    mood_target INTEGER[], -- Which mood levels this is good for

    -- Display
    image_url TEXT,
    background_color VARCHAR(20),

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_content_type ON content_items(content_type);
CREATE INDEX idx_content_active ON content_items(is_active);

CREATE TABLE content_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content_items(id) ON DELETE CASCADE,

    interaction_type VARCHAR(20), -- 'viewed', 'liked', 'saved', 'shared', 'dismissed'

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, content_id, interaction_type)
);

CREATE INDEX idx_content_interactions_user ON content_interactions(user_id);

-- ============================================================
-- CRISIS SUPPORT
-- ============================================================

CREATE TABLE crisis_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id),

    -- Detection
    severity VARCHAR(20), -- 'low', 'medium', 'high', 'critical'
    trigger_phrases JSONB DEFAULT '[]',

    -- Response
    resources_shown JSONB DEFAULT '[]',
    safety_plan_activated BOOLEAN DEFAULT FALSE,

    -- Follow-up
    followed_up BOOLEAN DEFAULT FALSE,
    follow_up_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crisis_user ON crisis_events(user_id);

CREATE TABLE safety_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Warning signs
    warning_signs JSONB DEFAULT '[]',

    -- Coping strategies
    internal_coping JSONB DEFAULT '[]', -- Things I can do alone
    external_coping JSONB DEFAULT '[]', -- People/places that help

    -- Support contacts
    support_contacts JSONB DEFAULT '[]', -- [{ name, phone, relationship }]
    professional_contacts JSONB DEFAULT '[]',

    -- Crisis resources
    crisis_lines JSONB DEFAULT '[]',

    -- Environment safety
    environment_safety_steps JSONB DEFAULT '[]',

    -- Reasons for living
    reasons_for_living JSONB DEFAULT '[]',

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ANALYTICS & INSIGHTS
-- ============================================================

CREATE TABLE user_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    insight_type VARCHAR(50), -- 'mood_pattern', 'trigger_identified', 'progress_milestone'

    title VARCHAR(255),
    description TEXT,
    data JSONB DEFAULT '{}',

    -- Display
    is_new BOOLEAN DEFAULT TRUE,
    viewed_at TIMESTAMPTZ,

    generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insights_user ON user_insights(user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update message count on conversation
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET message_count = message_count + 1,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_count AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_message_count();

-- Update streak on completion
CREATE OR REPLACE FUNCTION update_streak()
RETURNS TRIGGER AS $$
DECLARE
    v_last_date DATE;
    v_current_streak INTEGER;
BEGIN
    -- Get current streak data
    SELECT last_completed_date, current_streak
    INTO v_last_date, v_current_streak
    FROM user_streaks
    WHERE user_id = NEW.user_id AND streak_type = TG_ARGV[0];

    IF v_last_date IS NULL THEN
        -- First completion
        INSERT INTO user_streaks (user_id, streak_type, current_streak, longest_streak, total_completions, last_completed_date, streak_started_date)
        VALUES (NEW.user_id, TG_ARGV[0], 1, 1, 1, CURRENT_DATE, CURRENT_DATE);
    ELSIF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Consecutive day
        UPDATE user_streaks
        SET current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            total_completions = total_completions + 1,
            last_completed_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE user_id = NEW.user_id AND streak_type = TG_ARGV[0];
    ELSIF v_last_date < CURRENT_DATE - INTERVAL '1 day' THEN
        -- Streak broken
        UPDATE user_streaks
        SET current_streak = 1,
            total_completions = total_completions + 1,
            last_completed_date = CURRENT_DATE,
            streak_started_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE user_id = NEW.user_id AND streak_type = TG_ARGV[0];
    END IF;
    -- If same day, just update total

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- INITIAL DATA
-- ============================================================

-- Default coping tools
INSERT INTO coping_tools (id, user_id, name, description, category, steps, duration_minutes, is_custom) VALUES
    (uuid_generate_v4(), NULL, '4-7-8 Breathing', 'Calming breath technique', 'breathing',
     '["Breathe in for 4 seconds", "Hold for 7 seconds", "Exhale for 8 seconds", "Repeat 4 times"]',
     3, FALSE),
    (uuid_generate_v4(), NULL, 'Box Breathing', 'Square breathing for focus', 'breathing',
     '["Breathe in for 4 seconds", "Hold for 4 seconds", "Exhale for 4 seconds", "Hold for 4 seconds"]',
     4, FALSE),
    (uuid_generate_v4(), NULL, '5-4-3-2-1 Grounding', 'Sensory grounding technique', 'grounding',
     '["Notice 5 things you can see", "Notice 4 things you can touch", "Notice 3 things you can hear", "Notice 2 things you can smell", "Notice 1 thing you can taste"]',
     5, FALSE),
    (uuid_generate_v4(), NULL, 'Body Scan', 'Progressive relaxation', 'grounding',
     '["Start at your toes", "Notice sensations without judgment", "Move slowly up through your body", "End at the top of your head"]',
     10, FALSE);

-- Default content items
INSERT INTO content_items (content_type, body, author, categories, mood_target) VALUES
    ('affirmation', 'I am doing the best I can with what I have right now.', NULL, '["self-compassion"]', '{1,2,3}'),
    ('affirmation', 'My feelings are valid, even when they''re difficult.', NULL, '["validation"]', '{1,2,3}'),
    ('affirmation', 'I am worthy of rest and care.', NULL, '["self-care"]', '{1,2,3,4}'),
    ('affirmation', 'Progress, not perfection, is my goal.', NULL, '["growth"]', '{2,3,4}'),
    ('affirmation', 'I choose to focus on what I can control.', NULL, '["mindfulness"]', '{2,3,4}'),
    ('quote', 'The only way out is through.', 'Robert Frost', '["perseverance"]', '{1,2,3}'),
    ('quote', 'You don''t have to control your thoughts. You just have to stop letting them control you.', 'Dan Millman', '["mindfulness"]', '{2,3,4}'),
    ('challenge', 'Send a message to someone you appreciate today.', NULL, '["connection"]', '{3,4,5}'),
    ('challenge', 'Take a 5-minute walk outside.', NULL, '["movement"]', '{2,3,4}'),
    ('challenge', 'Write down three things that went well today.', NULL, '["gratitude"]', '{2,3,4,5}');
