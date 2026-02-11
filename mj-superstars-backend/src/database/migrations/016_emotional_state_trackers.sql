-- ============================================================
-- Migration 016: Emotional State Trackers
-- Adds confidence_level and morals_score to mood_entries
-- energy_level already exists in the table
-- ============================================================

-- Add confidence_level (1-5 scale: 1=shaky, 5=rock solid)
ALTER TABLE mood_entries
ADD COLUMN IF NOT EXISTS confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5);

-- Add morals_score (1-5 scale: 1=struggling with judgments/comparisons, 5=fully grounded in values)
ALTER TABLE mood_entries
ADD COLUMN IF NOT EXISTS morals_score INTEGER CHECK (morals_score >= 1 AND morals_score <= 5);

-- Add a reflection text field for morals/values check-in context
ALTER TABLE mood_entries
ADD COLUMN IF NOT EXISTS reflection TEXT;

-- Index for efficient tracker trend queries
CREATE INDEX IF NOT EXISTS idx_mood_entries_trackers
ON mood_entries (user_id, created_at DESC)
WHERE confidence_level IS NOT NULL OR morals_score IS NOT NULL;

-- Record migration
INSERT INTO schema_migrations (version) VALUES ('016_emotional_state_trackers')
ON CONFLICT (version) DO NOTHING;
