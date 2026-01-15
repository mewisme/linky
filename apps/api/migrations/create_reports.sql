-- Create reports table to store user reports
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_reported FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT check_different_users CHECK (reporter_user_id != reported_user_id),
  CONSTRAINT check_status CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed'))
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reports_reporter_user_id ON reports(reporter_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON reports(reviewed_by);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- Add comments to table and columns
COMMENT ON TABLE reports IS 'Stores user reports against other users';
COMMENT ON COLUMN reports.reporter_user_id IS 'User ID of the person making the report';
COMMENT ON COLUMN reports.reported_user_id IS 'User ID of the person being reported';
COMMENT ON COLUMN reports.reason IS 'Reason for the report provided by the reporter';
COMMENT ON COLUMN reports.status IS 'Status of the report: pending, reviewed, resolved, dismissed';
COMMENT ON COLUMN reports.admin_notes IS 'Admin notes about the report review';
COMMENT ON COLUMN reports.reviewed_by IS 'Admin user ID who reviewed the report';
COMMENT ON COLUMN reports.reviewed_at IS 'Timestamp when the report was reviewed';
