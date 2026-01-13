-- Backfill user_details for existing users who don't have a user_details record
-- This migration should be run after create_user_details_on_user_insert_trigger.sql
-- to ensure all existing users have a corresponding user_details record

INSERT INTO user_details (user_id)
SELECT id
FROM users
WHERE id NOT IN (
  SELECT user_id
  FROM user_details
  WHERE user_id IS NOT NULL
)
ON CONFLICT (user_id) DO NOTHING; -- Prevent errors if user_details already exists

-- Add comment
COMMENT ON TABLE user_details IS 'Stores detailed user information for personalized filters and matching. All users should have a corresponding record (created automatically via trigger or backfilled)';
