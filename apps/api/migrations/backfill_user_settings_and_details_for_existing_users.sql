-- Backfill user_settings and user_details for existing users who don't have these records
-- This migration should be run after create_user_settings.sql
-- to ensure all existing users have corresponding user_settings and user_details records

-- Backfill user_settings for existing users
INSERT INTO user_settings (user_id)
SELECT id
FROM users
WHERE id NOT IN (
  SELECT user_id
  FROM user_settings
  WHERE user_id IS NOT NULL
)
ON CONFLICT (user_id) DO NOTHING; -- Prevent errors if user_settings already exists

-- Add comments
COMMENT ON TABLE user_settings IS 'Stores user preferences and call settings. All users should have a corresponding record (created automatically via trigger or backfilled)';
