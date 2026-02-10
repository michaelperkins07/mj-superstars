-- ============================================================
-- Migration 003: APNS device token + timezone fixes
-- ============================================================

-- Add device_token column to push_subscriptions for iOS APNs
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'push_subscriptions' AND column_name = 'device_token'
    ) THEN
        ALTER TABLE push_subscriptions ADD COLUMN device_token VARCHAR(200);
    END IF;
END $$;

-- Make keys nullable (iOS subscriptions don't have VAPID keys)
ALTER TABLE push_subscriptions ALTER COLUMN keys DROP NOT NULL;

-- Add index on device_token for quick lookups
CREATE INDEX IF NOT EXISTS idx_push_device_token ON push_subscriptions(device_token) WHERE device_token IS NOT NULL;

-- ============================================================
-- Done
-- ============================================================
