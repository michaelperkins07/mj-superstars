-- ============================================================
-- Migration: Add Performance Indexes
-- ============================================================

-- Conversations: user lookups with ordering
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_user_created ON conversations(user_id, created_at DESC);

-- Messages: conversation lookups with ordering (used in chat history)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_role ON messages(user_id, role) WHERE role = 'user';

-- Mood entries: time-range queries for insights
CREATE INDEX IF NOT EXISTS idx_mood_user_created ON mood_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_user_timeofday ON mood_entries(user_id, time_of_day);

-- Tasks: user lookups by status and due date
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_duedate ON tasks(user_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, completed_at DESC) WHERE status = 'completed';

-- Journal entries: user lookups with ordering
CREATE INDEX IF NOT EXISTS idx_journal_user_created ON journal_entries(user_id, created_at DESC);

-- Morning intentions & evening reflections: daily lookups
CREATE INDEX IF NOT EXISTS idx_intentions_user_date ON morning_intentions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_reflections_user_date ON evening_reflections(user_id, date DESC);

-- User streaks: user lookups
CREATE INDEX IF NOT EXISTS idx_streaks_user ON user_streaks(user_id);

-- Achievements: user lookups with ordering
CREATE INDEX IF NOT EXISTS idx_achievements_user_earned ON achievements(user_id, earned_at DESC);

-- Push subscriptions: active subscription lookups
CREATE INDEX IF NOT EXISTS idx_push_subs_user_active ON push_subscriptions(user_id) WHERE is_active = true;

-- User sessions: refresh token lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON user_sessions(refresh_token_hash) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions(user_id) WHERE revoked_at IS NULL;

-- Users: email lookup and active status
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE is_active = true AND deleted_at IS NULL;

-- Notification history: user lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notification_history(user_id, notification_type);

-- User insights: user lookups
CREATE INDEX IF NOT EXISTS idx_insights_user_new ON user_insights(user_id) WHERE is_new = true;
CREATE INDEX IF NOT EXISTS idx_insights_user_generated ON user_insights(user_id, generated_at DESC);

-- Weekly stories: user lookups
CREATE INDEX IF NOT EXISTS idx_stories_user_week ON weekly_stories(user_id, week_end DESC);

-- Personalization extractions: user lookups
CREATE INDEX IF NOT EXISTS idx_extractions_user ON personalization_extractions(user_id);
