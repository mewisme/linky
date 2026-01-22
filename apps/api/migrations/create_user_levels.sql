-- Create user_levels table to store user experience points
CREATE TABLE IF NOT EXISTS user_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_exp_seconds BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_user_levels_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT check_total_exp_seconds CHECK (total_exp_seconds >= 0)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_levels_user_id ON user_levels(user_id);
CREATE INDEX IF NOT EXISTS idx_user_levels_total_exp_seconds ON user_levels(total_exp_seconds DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_levels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_levels_updated_at
  BEFORE UPDATE ON user_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_user_levels_updated_at();

-- Add comments to table and columns
COMMENT ON TABLE user_levels IS 'Stores user experience points accumulated from call duration';
COMMENT ON COLUMN user_levels.user_id IS 'Foreign key reference to users table (one-to-one relationship)';
COMMENT ON COLUMN user_levels.total_exp_seconds IS 'Total experience points in seconds accumulated from completed calls';
COMMENT ON COLUMN user_levels.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN user_levels.updated_at IS 'Timestamp when the record was last updated';
