-- ============================================================
-- Migration 010: Add Missing Foreign Key Indexes
-- Performance optimization — indexes on FK columns lacking them
-- ============================================================

-- analytics_events.user_id
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);

-- content_interactions.content_id
CREATE INDEX IF NOT EXISTS idx_content_interactions_content_id ON content_interactions(content_id);

-- coping_tool_uses.tool_id
CREATE INDEX IF NOT EXISTS idx_coping_tool_uses_tool_id ON coping_tool_uses(tool_id);

-- crisis_events.conversation_id
CREATE INDEX IF NOT EXISTS idx_crisis_events_conversation_id ON crisis_events(conversation_id);

-- health_summaries.user_id
CREATE INDEX IF NOT EXISTS idx_health_summaries_user_id ON health_summaries(user_id);

-- mood_entries.conversation_id
CREATE INDEX IF NOT EXISTS idx_mood_entries_conversation_id ON mood_entries(conversation_id);

-- personalization_extractions.message_id
CREATE INDEX IF NOT EXISTS idx_personalization_extractions_message_id ON personalization_extractions(message_id);

-- social_comments.user_id
CREATE INDEX IF NOT EXISTS idx_social_comments_user_id ON social_comments(user_id);

-- social_posts.photo_id
CREATE INDEX IF NOT EXISTS idx_social_posts_photo_id ON social_posts(photo_id);

-- subscription_history.user_id
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON subscription_history(user_id);

-- user_devices.user_id
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);

-- ============================================================
-- Migration Complete — 11 indexes added
-- ============================================================
