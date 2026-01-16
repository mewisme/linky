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

-- Create function to automatically create user_settings and user_details when a new user is created
CREATE OR REPLACE FUNCTION create_user_settings_and_details_on_user_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new user_settings record with the new user's ID
  INSERT INTO user_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING; -- Prevent errors if user_settings already exists
  
  -- Insert a new user_details record with the new user's ID
  INSERT INTO user_details (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING; -- Prevent errors if user_details already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create user_settings and user_details after user insert
CREATE TRIGGER trigger_create_user_settings_and_details_on_user_insert
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_settings_and_details_on_user_insert();

-- Add comment
COMMENT ON FUNCTION create_user_settings_and_details_on_user_insert() IS 'Automatically creates user_settings and user_details records when a new user is inserted into the users table';

-- Rename function
ALTER FUNCTION create_user_settings_and_details_on_user_insert()
RENAME TO fn_init_user_settings;

-- Rename trigger
ALTER TRIGGER trigger_create_user_settings_and_details_on_user_insert
ON users
RENAME TO trg_users_after_insert_init_settings;

-- Update comment for renamed function
COMMENT ON FUNCTION fn_init_user_settings()
IS 'Initialize user_settings when a new user is inserted';
