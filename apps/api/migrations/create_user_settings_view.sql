-- Create view for user_settings with user information
CREATE OR REPLACE VIEW user_settings_v AS
SELECT 
  us.id,
  us.user_id,
  u.clerk_user_id,
  us.default_mute_mic,
  us.default_disable_camera,
  us.notification_sound_enabled,
  us.notification_preferences,
  us.created_at,
  us.updated_at
FROM user_settings us
LEFT JOIN users u ON us.user_id = u.id;

-- Add comment
COMMENT ON VIEW user_settings_v IS 'User settings with user information';
