-- Create user_settings table to store user preferences and call settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  default_mute_mic BOOLEAN NOT NULL DEFAULT false,
  default_disable_camera BOOLEAN NOT NULL DEFAULT false,
  notification_sound_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_preferences JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_settings_updated_at();

-- Add comments to table and columns
COMMENT ON TABLE user_settings IS 'Stores user preferences and call settings';
COMMENT ON COLUMN user_settings.user_id IS 'Foreign key reference to users table (one-to-one relationship)';
COMMENT ON COLUMN user_settings.default_mute_mic IS 'Default microphone mute state for calls';
COMMENT ON COLUMN user_settings.default_disable_camera IS 'Default camera disabled state for calls';
COMMENT ON COLUMN user_settings.notification_sound_enabled IS 'Whether notification sounds are enabled';
COMMENT ON COLUMN user_settings.notification_preferences IS 'JSON object for extensible notification preferences';
