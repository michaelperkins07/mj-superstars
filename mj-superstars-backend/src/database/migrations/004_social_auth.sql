-- Migration 004: Add social authentication support
-- Supports Apple, Google, X (Twitter), and Instagram sign-in

-- Social accounts linked to users
CREATE TABLE IF NOT EXISTS user_social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,          -- 'apple', 'google', 'x', 'instagram'
    provider_user_id VARCHAR(255) NOT NULL,  -- ID from the OAuth provider

    -- Profile data from provider (used for personalization)
    provider_email VARCHAR(255),
    provider_name VARCHAR(255),
    provider_avatar_url TEXT,
    provider_profile_data JSONB DEFAULT '{}',  -- Extra provider-specific data

    -- Token storage for API access (encrypted at rest)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scopes TEXT,                              -- Granted scopes, comma-separated

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each provider account can only be linked once
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON user_social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_provider ON user_social_accounts(provider, provider_user_id);

-- Add social login fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_user_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_user_id VARCHAR(255);

-- Record migration
INSERT INTO schema_migrations (version)
VALUES ('004_social_auth')
ON CONFLICT (version) DO NOTHING;
