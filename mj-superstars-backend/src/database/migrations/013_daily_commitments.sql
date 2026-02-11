-- ============================================================
-- DAILY COMMITMENTS (3-Pillar System)
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Date tracking
    commitment_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Physical pillar
    physical_completed BOOLEAN DEFAULT FALSE,
    physical_activity TEXT,
    physical_duration INTEGER,
    physical_completed_at TIMESTAMPTZ,

    -- Mental pillar
    mental_completed BOOLEAN DEFAULT FALSE,
    mental_activity TEXT,
    mental_completed_at TIMESTAMPTZ,

    -- Social pillar
    social_completed BOOLEAN DEFAULT FALSE,
    social_activity TEXT,
    social_completed_at TIMESTAMPTZ,

    -- Overall
    all_three_completed BOOLEAN DEFAULT FALSE,
    clear_mind_score INTEGER DEFAULT 0,
    daily_reflection TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commitments_user_date ON daily_commitments(user_id, commitment_date);
CREATE INDEX IF NOT EXISTS idx_commitments_date ON daily_commitments(commitment_date DESC);
CREATE INDEX IF NOT EXISTS idx_commitments_user ON daily_commitments(user_id);
