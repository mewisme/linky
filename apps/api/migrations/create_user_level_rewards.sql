-- Create user_level_rewards table to track granted rewards per user
CREATE TABLE IF NOT EXISTS user_level_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level_reward_id UUID NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_user_level_rewards_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_level_rewards_reward FOREIGN KEY (level_reward_id) REFERENCES level_rewards(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_level_reward UNIQUE (user_id, level_reward_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_level_rewards_user_id ON user_level_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_level_rewards_level_reward_id ON user_level_rewards(level_reward_id);
CREATE INDEX IF NOT EXISTS idx_user_level_rewards_granted_at ON user_level_rewards(granted_at DESC);

-- Add comments to table and columns
COMMENT ON TABLE user_level_rewards IS 'Tracks which level rewards have been granted to each user';
COMMENT ON COLUMN user_level_rewards.user_id IS 'Foreign key reference to users table';
COMMENT ON COLUMN user_level_rewards.level_reward_id IS 'Foreign key reference to level_rewards table';
COMMENT ON COLUMN user_level_rewards.granted_at IS 'Timestamp when the reward was granted to the user';
