-- Create user_streaks table to store user streak summary
CREATE TABLE IF NOT EXISTS user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_valid_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_user_streaks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT check_current_streak CHECK (current_streak >= 0),
  CONSTRAINT check_longest_streak CHECK (longest_streak >= 0)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_current_streak ON user_streaks(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_user_streaks_longest_streak ON user_streaks(longest_streak DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_streaks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_streaks_updated_at
  BEFORE UPDATE ON user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION update_user_streaks_updated_at();

-- Add comments to table and columns
COMMENT ON TABLE user_streaks IS 'Stores user streak summary with current and longest streak';
COMMENT ON COLUMN user_streaks.user_id IS 'Foreign key reference to users table (one-to-one relationship)';
COMMENT ON COLUMN user_streaks.current_streak IS 'Current consecutive valid streak days';
COMMENT ON COLUMN user_streaks.longest_streak IS 'Longest streak achieved by the user';
COMMENT ON COLUMN user_streaks.last_valid_date IS 'Last UTC date that was a valid streak day';
COMMENT ON COLUMN user_streaks.updated_at IS 'Timestamp when the record was last updated';
