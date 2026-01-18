CREATE TABLE IF NOT EXISTS user_favorite_limits (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_favorite_limits_user_id ON user_favorite_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorite_limits_date ON user_favorite_limits(date);

CREATE OR REPLACE FUNCTION update_user_favorite_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_favorite_limits_updated_at_trigger
BEFORE UPDATE ON user_favorite_limits
FOR EACH ROW
EXECUTE FUNCTION update_user_favorite_limits_updated_at();

COMMENT ON TABLE user_favorite_limits IS 'Tracks daily favorite usage limits per user';
COMMENT ON COLUMN user_favorite_limits.user_id IS 'The user whose limit is being tracked';
COMMENT ON COLUMN user_favorite_limits.date IS 'The date for which the limit applies';
COMMENT ON COLUMN user_favorite_limits.used_count IS 'Number of favorites added on this date';
COMMENT ON COLUMN user_favorite_limits.daily_limit IS 'Maximum favorites allowed per day';
