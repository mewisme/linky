-- Create interest_tags table to define available interest tags
CREATE TABLE IF NOT EXISTS interest_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_interest_tags_name ON interest_tags(name);
CREATE INDEX IF NOT EXISTS idx_interest_tags_category ON interest_tags(category);
CREATE INDEX IF NOT EXISTS idx_interest_tags_is_active ON interest_tags(is_active);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_interest_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_interest_tags_updated_at
  BEFORE UPDATE ON interest_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_interest_tags_updated_at();

-- Add comments to table and columns
COMMENT ON TABLE interest_tags IS 'Defines available interest tags that users can select';
COMMENT ON COLUMN interest_tags.name IS 'Unique name of the interest tag';
COMMENT ON COLUMN interest_tags.description IS 'Description of what this interest tag represents';
COMMENT ON COLUMN interest_tags.icon IS 'Icon identifier or emoji for the tag';
COMMENT ON COLUMN interest_tags.category IS 'Category grouping for the tag (e.g., sports, music, technology)';
COMMENT ON COLUMN interest_tags.is_active IS 'Whether this tag is currently active and available for selection';
