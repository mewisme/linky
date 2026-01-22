-- Create level_rewards table to store admin-defined rewards at level milestones
CREATE TABLE IF NOT EXISTS level_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_required INTEGER NOT NULL,
  reward_type VARCHAR(100) NOT NULL,
  reward_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_level_required CHECK (level_required > 0),
  CONSTRAINT unique_level_reward UNIQUE (level_required, reward_type)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_level_rewards_level_required ON level_rewards(level_required);
CREATE INDEX IF NOT EXISTS idx_level_rewards_reward_type ON level_rewards(reward_type);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_level_rewards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_level_rewards_updated_at
  BEFORE UPDATE ON level_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_level_rewards_updated_at();

-- Add comments to table and columns
COMMENT ON TABLE level_rewards IS 'Admin-defined rewards granted at specific level milestones';
COMMENT ON COLUMN level_rewards.level_required IS 'Level at which this reward is granted';
COMMENT ON COLUMN level_rewards.reward_type IS 'Type identifier for the reward (e.g., avatar_frame, badge, currency)';
COMMENT ON COLUMN level_rewards.reward_payload IS 'Extensible JSON payload containing reward-specific data';
COMMENT ON COLUMN level_rewards.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN level_rewards.updated_at IS 'Timestamp when the record was last updated';
