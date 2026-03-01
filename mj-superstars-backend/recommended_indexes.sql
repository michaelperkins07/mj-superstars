-- ============================================================
-- MJ Superstars - Recommended Missing Foreign Key Indexes
-- Generated from Database Integrity Audit
-- Date: 2026-02-10
-- ============================================================
-- 
-- This script creates 11 missing indexes on foreign key columns
-- that were identified during the database integrity audit.
-- 
-- Missing indexes on FK columns can cause:
-- - Slow JOIN queries
-- - Inefficient foreign key constraint checks
-- - Poor cascade delete performance
-- 
-- Status: READ-ONLY AUDIT - Review recommended changes below
-- ============================================================

-- 1. analytics_events.user_id → users.id
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id 
ON analytics_events(user_id);

-- 2. content_interactions.content_id → content_items.id
CREATE INDEX IF NOT EXISTS idx_content_interactions_content_id 
ON content_interactions(content_id);

-- 3. coping_tool_uses.tool_id → coping_tools.id
CREATE INDEX IF NOT EXISTS idx_coping_tool_uses_tool_id 
ON coping_tool_uses(tool_id);

-- 4. crisis_events.conversation_id → conversations.id
CREATE INDEX IF NOT EXISTS idx_crisis_events_conversation_id 
ON crisis_events(conversation_id);

-- 5. health_summaries.user_id → users.id
CREATE INDEX IF NOT EXISTS idx_health_summaries_user_id 
ON health_summaries(user_id);

-- 6. mood_entries.conversation_id → conversations.id
CREATE INDEX IF NOT EXISTS idx_mood_entries_conversation_id 
ON mood_entries(conversation_id);

-- 7. personalization_extractions.message_id → messages.id
CREATE INDEX IF NOT EXISTS idx_personalization_extractions_message_id 
ON personalization_extractions(message_id);

-- 8. social_comments.user_id → users.id
CREATE INDEX IF NOT EXISTS idx_social_comments_user_id 
ON social_comments(user_id);

-- 9. social_posts.photo_id → user_photos.id
CREATE INDEX IF NOT EXISTS idx_social_posts_photo_id 
ON social_posts(photo_id);

-- 10. subscription_history.user_id → users.id
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id 
ON subscription_history(user_id);

-- 11. user_devices.user_id → users.id
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id 
ON user_devices(user_id);

-- ============================================================
-- After running this migration, verify indexes were created:
-- ============================================================
-- SELECT 
--   schemaname, 
--   tablename, 
--   indexname 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, indexname;
-- ============================================================
