-- Create changelogs table to store changelog entries with version metadata
CREATE TABLE IF NOT EXISTS changelogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  release_date TIMESTAMPTZ NOT NULL,
  s3_key VARCHAR(500) NOT NULL,
  created_by UUID NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_changelogs_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_changelogs_version ON changelogs(version);
CREATE INDEX IF NOT EXISTS idx_changelogs_is_published ON changelogs(is_published);
CREATE INDEX IF NOT EXISTS idx_changelogs_release_date ON changelogs(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_changelogs_order ON changelogs("order" DESC NULLS LAST);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_changelogs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_changelogs_updated_at
  BEFORE UPDATE ON changelogs
  FOR EACH ROW
  EXECUTE FUNCTION update_changelogs_updated_at();

-- Add comments to table and columns
COMMENT ON TABLE changelogs IS 'Stores changelog entries with version metadata and S3 references to markdown files';
COMMENT ON COLUMN changelogs.version IS 'Version identifier (e.g., "1.0.0", "2.1.3")';
COMMENT ON COLUMN changelogs.title IS 'Display title for the changelog entry';
COMMENT ON COLUMN changelogs.release_date IS 'When the version was released';
COMMENT ON COLUMN changelogs.s3_key IS 'S3 path to the markdown file (e.g., "changelogs/1.0.0.md")';
COMMENT ON COLUMN changelogs.created_by IS 'Admin user who created this changelog entry';
COMMENT ON COLUMN changelogs.is_published IS 'Whether this changelog is published and visible to users';
COMMENT ON COLUMN changelogs."order" IS 'Custom sorting order (higher = more recent, null falls back to release_date)';
