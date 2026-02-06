-- Migration 003: Add password reset columns to users table
-- These columns support the forgot-password / reset-password flow

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

-- Record migration
INSERT INTO schema_migrations (version)
VALUES ('003_add_password_reset_columns')
ON CONFLICT (version) DO NOTHING;
