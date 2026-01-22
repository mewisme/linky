-- Create streak_exp_bonuses table to store admin-defined EXP bonus multipliers based on streak length
CREATE TABLE IF NOT EXISTS streak_exp_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_streak INTEGER NOT NULL,
  max_streak INTEGER NOT NULL,
  bonus_multiplier DECIMAL(5, 2) NOT NULL DEFAULT 1.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_min_streak CHECK (min_streak >= 0),
  CONSTRAINT check_max_streak CHECK (max_streak >= min_streak),
  CONSTRAINT check_bonus_multiplier CHECK (bonus_multiplier >= 1.00)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_streak_exp_bonuses_min_streak ON streak_exp_bonuses(min_streak);
CREATE INDEX IF NOT EXISTS idx_streak_exp_bonuses_max_streak ON streak_exp_bonuses(max_streak);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_streak_exp_bonuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_streak_exp_bonuses_updated_at
  BEFORE UPDATE ON streak_exp_bonuses
  FOR EACH ROW
  EXECUTE FUNCTION update_streak_exp_bonuses_updated_at();

-- Add comments to table and columns
COMMENT ON TABLE streak_exp_bonuses IS 'Admin-defined EXP bonus multipliers based on streak length ranges';
COMMENT ON COLUMN streak_exp_bonuses.min_streak IS 'Minimum streak length (inclusive) for this bonus';
COMMENT ON COLUMN streak_exp_bonuses.max_streak IS 'Maximum streak length (inclusive) for this bonus';
COMMENT ON COLUMN streak_exp_bonuses.bonus_multiplier IS 'Multiplier applied to EXP when streak is within this range (e.g., 1.50 for 50% bonus)';
COMMENT ON COLUMN streak_exp_bonuses.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN streak_exp_bonuses.updated_at IS 'Timestamp when the record was last updated';
