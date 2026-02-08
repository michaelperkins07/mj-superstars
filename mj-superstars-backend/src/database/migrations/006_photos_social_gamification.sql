-- Migration: 006_photos_social_gamification.sql
-- Description: Add photos, social features, and gamification tables
-- Created: 2025

BEGIN;

-- Create user_photos table
CREATE TABLE IF NOT EXISTS user_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_type VARCHAR(30) NOT NULL CHECK (photo_type IN ('progress', 'vision_board', 'journal', 'mood', 'profile', 'share_card')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  tags TEXT[] DEFAULT '{}',
  related_id UUID,
  related_type VARCHAR(30) CHECK (related_type IN ('journal', 'mood', 'task', 'achievement')),
  is_private BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_photos_user_id ON user_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_photos_photo_type ON user_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_user_photos_related_id ON user_photos(related_id);
CREATE INDEX IF NOT EXISTS idx_user_photos_created_at ON user_photos(created_at);

-- Create vision_boards table
CREATE TABLE IF NOT EXISTS vision_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'My Vision Board',
  description TEXT,
  layout VARCHAR(30) DEFAULT 'grid' CHECK (layout IN ('grid', 'freeform', 'collage')),
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vision_boards_user_id ON vision_boards(user_id);

-- Create vision_board_items table
CREATE TABLE IF NOT EXISTS vision_board_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES vision_boards(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES user_photos(id) ON DELETE SET NULL,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 200,
  height INTEGER DEFAULT 200,
  caption TEXT,
  goal_text TEXT,
  is_achieved BOOLEAN DEFAULT FALSE,
  achieved_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vision_board_items_board_id ON vision_board_items(board_id);
CREATE INDEX IF NOT EXISTS idx_vision_board_items_photo_id ON vision_board_items(photo_id);

-- Create social_posts table
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_type VARCHAR(30) NOT NULL CHECK (post_type IN ('achievement', 'streak_milestone', 'level_up', 'vision_achieved', 'mood_win', 'custom')),
  content TEXT,
  share_card_data JSONB DEFAULT '{}',
  photo_id UUID REFERENCES user_photos(id) ON DELETE SET NULL,
  achievement_id UUID,
  visibility VARCHAR(20) DEFAULT 'buddies' CHECK (visibility IN ('buddies', 'public', 'private')),
  external_shares JSONB DEFAULT '{}',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_posts_user_id ON social_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_post_type ON social_posts(post_type);
CREATE INDEX IF NOT EXISTS idx_social_posts_visibility ON social_posts(visibility);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_posts(created_at);

-- Create social_likes table
CREATE TABLE IF NOT EXISTS social_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(20) DEFAULT 'like' CHECK (reaction_type IN ('like', 'fire', 'clap', 'heart', 'fist_bump')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_likes_post_id ON social_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_social_likes_user_id ON social_likes(user_id);

-- Create social_comments table
CREATE TABLE IF NOT EXISTS social_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_comments_post_id ON social_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_social_comments_created_at ON social_comments(created_at);

-- Create user_follows table
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON user_follows(following_id);

-- Create email_preferences table
CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  weekly_digest BOOLEAN DEFAULT TRUE,
  coaching_nudges BOOLEAN DEFAULT TRUE,
  buddy_sharing BOOLEAN DEFAULT FALSE,
  buddy_email VARCHAR(255),
  digest_day VARCHAR(10) DEFAULT 'monday' CHECK (digest_day IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  digest_time TIME DEFAULT '09:00',
  nudge_frequency VARCHAR(20) DEFAULT 'daily' CHECK (nudge_frequency IN ('daily', 'weekdays', 'custom')),
  last_digest_sent_at TIMESTAMPTZ,
  last_nudge_sent_at TIMESTAMPTZ,
  unsubscribe_token VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);

-- Create email_log table
CREATE TABLE IF NOT EXISTS email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email_type VARCHAR(50) NOT NULL CHECK (email_type IN ('weekly_digest', 'coaching_nudge', 'buddy_report', 'streak_alert', 'achievement_alert')),
  recipient VARCHAR(255) NOT NULL,
  subject TEXT,
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_log_user_id ON email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_email_type ON email_log(email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_created_at ON email_log(created_at);

-- Create flash_challenges table
CREATE TABLE IF NOT EXISTS flash_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  challenge_type VARCHAR(30) CHECK (challenge_type IN ('speed', 'combo', 'streak_boost', 'mood_lift', 'journal_sprint')),
  reward_multiplier DECIMAL(3,1) DEFAULT 2.0,
  bonus_points INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  target_action VARCHAR(50),
  target_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flash_challenges_is_active ON flash_challenges(is_active);
CREATE INDEX IF NOT EXISTS idx_flash_challenges_created_at ON flash_challenges(created_at);

-- Create user_flash_challenges table
CREATE TABLE IF NOT EXISTS user_flash_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES flash_challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_flash_challenges_user_id ON user_flash_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_flash_challenges_challenge_id ON user_flash_challenges(challenge_id);

-- Create xp_multipliers table
CREATE TABLE IF NOT EXISTS xp_multipliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  multiplier_type VARCHAR(30) NOT NULL CHECK (multiplier_type IN ('streak', 'comeback', 'flash_challenge', 'combo', 'daily_login')),
  multiplier_value DECIMAL(3,1) DEFAULT 1.0,
  source VARCHAR(50),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_xp_multipliers_user_id ON xp_multipliers(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_multipliers_is_active ON xp_multipliers(is_active);

-- Create daily_login_bonuses table
CREATE TABLE IF NOT EXISTS daily_login_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_date DATE NOT NULL,
  consecutive_days INTEGER DEFAULT 1,
  bonus_points INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, login_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_login_bonuses_user_id ON daily_login_bonuses(user_id);

-- Create milestone_celebrations table
CREATE TABLE IF NOT EXISTS milestone_celebrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_type VARCHAR(50) NOT NULL CHECK (milestone_type IN ('points', 'streak', 'level', 'tasks', 'journal', 'mood_improvement')),
  milestone_value INTEGER NOT NULL,
  celebration_shown BOOLEAN DEFAULT FALSE,
  reward_type VARCHAR(30) CHECK (reward_type IN ('bonus_xp', 'theme_unlock', 'badge', 'affirmation', 'none')),
  reward_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_milestone_celebrations_user_id ON milestone_celebrations(user_id);
CREATE INDEX IF NOT EXISTS idx_milestone_celebrations_created_at ON milestone_celebrations(created_at);

-- Add columns to existing tables with defensive blocks

DO $$
BEGIN
  ALTER TABLE journal_entries ADD COLUMN photo_ids UUID[] DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE mood_entries ADD COLUMN photo_id UUID;
EXCEPTION WHEN duplicate_column THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE tasks ADD COLUMN photo_id UUID;
EXCEPTION WHEN duplicate_column THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE users ADD COLUMN xp_multiplier DECIMAL(3,1) DEFAULT 1.0;
EXCEPTION WHEN duplicate_column THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE users ADD COLUMN daily_login_streak INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE users ADD COLUMN last_login_bonus_date DATE;
EXCEPTION WHEN duplicate_column THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE users ADD COLUMN profile_visibility VARCHAR(20) DEFAULT 'buddies';
EXCEPTION WHEN duplicate_column THEN
  NULL;
END $$;

-- Create or replace update_updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_user_photos_updated_at ON user_photos;
CREATE TRIGGER update_user_photos_updated_at
  BEFORE UPDATE ON user_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vision_boards_updated_at ON vision_boards;
CREATE TRIGGER update_vision_boards_updated_at
  BEFORE UPDATE ON vision_boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_preferences_updated_at ON email_preferences;
CREATE TRIGGER update_email_preferences_updated_at
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Record migration
INSERT INTO schema_migrations (version) VALUES ('006_photos_social_gamification')
ON CONFLICT DO NOTHING;

COMMIT;
