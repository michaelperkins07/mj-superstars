-- Migration 003: Add password reset columns and missing schema columns
-- Supports forgot-password / reset-password flow and session revocation

-- Password reset support on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

-- Session revocation support on user_sessions table
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- Record migration
INSERT INTO schema_migrations (version)
VALUES ('003_add_password_reset_columns')
ON CONFLICT (version) DO NOTHING;
