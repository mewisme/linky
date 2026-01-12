-- Create call_history table to store call records with timestamps and country flags
CREATE TABLE IF NOT EXISTS call_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL,
  callee_id UUID NOT NULL,
  caller_country VARCHAR(2),
  callee_country VARCHAR(2),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_different_users CHECK (caller_id != callee_id),
  CONSTRAINT check_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CONSTRAINT fk_call_history_caller FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_call_history_callee FOREIGN KEY (callee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_call_history_caller_id ON call_history(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_history_callee_id ON call_history(callee_id);
CREATE INDEX IF NOT EXISTS idx_call_history_started_at ON call_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_caller_callee ON call_history(caller_id, callee_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_call_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_call_history_updated_at
  BEFORE UPDATE ON call_history
  FOR EACH ROW
  EXECUTE FUNCTION update_call_history_updated_at();

-- Add comment to table
COMMENT ON TABLE call_history IS 'Stores call history records with timestamps and country information';
COMMENT ON COLUMN call_history.caller_id IS 'User ID of the caller';
COMMENT ON COLUMN call_history.callee_id IS 'User ID of the callee';
COMMENT ON COLUMN call_history.caller_country IS 'Country code (ISO 3166-1 alpha-2) of the caller';
COMMENT ON COLUMN call_history.callee_country IS 'Country code (ISO 3166-1 alpha-2) of the callee';
COMMENT ON COLUMN call_history.duration_seconds IS 'Call duration in seconds, calculated from started_at and ended_at';
