-- ============================================================
-- Migration 011: Create subscriptions table for IAP management
-- Required by /api/subscriptions/verify and /api/subscriptions/status
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id VARCHAR(255) UNIQUE NOT NULL,
  product_id VARCHAR(255) NOT NULL,
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  expiration_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  is_trial BOOLEAN DEFAULT false,
  trial_end_date TIMESTAMPTZ,
  auto_renews BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups (status endpoint queries by user_id + is_active)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active
  ON subscriptions(user_id, is_active);

-- Index for transaction lookups (verify endpoint uses ON CONFLICT transaction_id)
CREATE INDEX IF NOT EXISTS idx_subscriptions_transaction_id
  ON subscriptions(transaction_id);

-- Index for expiration-based queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_expiration
  ON subscriptions(expiration_date)
  WHERE is_active = true;

-- Add subscription_status and subscription_product_id to users if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_status VARCHAR(50) DEFAULT 'free';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_product_id'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_product_id VARCHAR(255);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE users ADD COLUMN subscription_expires_at TIMESTAMPTZ;
  END IF;
END $$;
