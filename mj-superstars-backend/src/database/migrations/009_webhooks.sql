-- ============================================================
-- Migration 009: Webhooks & Webhook Logs
-- ============================================================

-- ============================================================
-- WEBHOOKS TABLE
-- Stores user-defined webhook configurations
-- ============================================================

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Webhook configuration
    url TEXT NOT NULL,
    events JSONB NOT NULL DEFAULT '[]'::jsonb,
    description TEXT,
    secret VARCHAR(255) NOT NULL,

    -- Status
    active BOOLEAN DEFAULT true,

    -- Tracking
    failure_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(user_id, active);

-- ============================================================
-- WEBHOOK LOGS TABLE
-- Tracks delivery history for each webhook
-- ============================================================

CREATE TABLE IF NOT EXISTS webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,

    -- Delivery details
    url TEXT NOT NULL,
    event VARCHAR(100) NOT NULL,
    status_code INTEGER,
    success BOOLEAN NOT NULL DEFAULT false,
    error TEXT,

    -- Timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- ============================================================
-- TRIGGER: Auto-update webhooks.updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_webhooks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS webhooks_updated_at ON webhooks;
CREATE TRIGGER webhooks_updated_at
BEFORE UPDATE ON webhooks
FOR EACH ROW
EXECUTE FUNCTION update_webhooks_timestamp();

-- ============================================================
-- Migration Complete
-- ============================================================
