-- Migration 015: Add conversation_mode column
-- Supports 3 modes: empathy, confused (prep), perk (default - full Mike energy)

ALTER TABLE user_personalization
ADD COLUMN IF NOT EXISTS conversation_mode VARCHAR(20) DEFAULT 'perk';
