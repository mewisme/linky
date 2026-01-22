-- Create level_feature_unlocks table to store level-based feature unlock rules
CREATE TABLE IF NOT EXISTS level_feature_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_required INTEGER NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  feature_payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_level_required CHECK (level_required > 0),
  CONSTRAINT unique_level_feature UNIQUE (level_required, feature_key)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_level_feature_unlocks_level_required ON level_feature_unlocks(level_required);
CREATE INDEX IF NOT EXISTS idx_level_feature_unlocks_feature_key ON level_feature_unlocks(feature_key);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_level_feature_unlocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_level_feature_unlocks_updated_at
  BEFORE UPDATE ON level_feature_unlocks
  FOR EACH ROW
  EXECUTE FUNCTION update_level_feature_unlocks_updated_at();

-- Add comments to table and columns
COMMENT ON TABLE level_feature_unlocks IS 'Admin-defined feature unlock rules based on level thresholds';
COMMENT ON COLUMN level_feature_unlocks.level_required IS 'Level at which this feature is unlocked';
COMMENT ON COLUMN level_feature_unlocks.feature_key IS 'String identifier for the feature (e.g., reaction_types, favorite_limit, avatar_frames)';
COMMENT ON COLUMN level_feature_unlocks.feature_payload IS 'Extensible JSON payload containing feature-specific configuration';
COMMENT ON COLUMN level_feature_unlocks.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN level_feature_unlocks.updated_at IS 'Timestamp when the record was last updated';
