-- Migration 014: Add coach name preference to user_personalization
-- Allows users to choose between "Mike" and "Perkins" as their coach name

ALTER TABLE user_personalization ADD COLUMN IF NOT EXISTS coach_name_preference VARCHAR(10) DEFAULT 'mike';
