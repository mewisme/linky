-- Create user_streak_days table to store daily streak records
CREATE TABLE IF NOT EXISTS user_streak_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  total_call_seconds INTEGER NOT NULL DEFAULT 0,
  is_valid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_user_streak_days_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT check_total_call_seconds CHECK (total_call_seconds >= 0),
  CONSTRAINT unique_user_streak_day UNIQUE (user_id, date)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_streak_days_user_id ON user_streak_days(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streak_days_date ON user_streak_days(date DESC);
CREATE INDEX IF NOT EXISTS idx_user_streak_days_user_date ON user_streak_days(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_streak_days_is_valid ON user_streak_days(user_id, is_valid, date DESC);

-- Add comments to table and columns
COMMENT ON TABLE user_streak_days IS 'Stores daily call duration records for streak calculation';
COMMENT ON COLUMN user_streak_days.user_id IS 'Foreign key reference to users table';
COMMENT ON COLUMN user_streak_days.date IS 'UTC date for the streak day';
COMMENT ON COLUMN user_streak_days.total_call_seconds IS 'Total call duration in seconds for this UTC day';
COMMENT ON COLUMN user_streak_days.is_valid IS 'Whether this day counts as a valid streak day (>= 300 seconds)';
COMMENT ON COLUMN user_streak_days.created_at IS 'Timestamp when the record was created';
