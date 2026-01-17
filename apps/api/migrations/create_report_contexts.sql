CREATE TABLE IF NOT EXISTS report_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL UNIQUE,
  call_id UUID,
  room_id TEXT,
  call_started_at TIMESTAMPTZ,
  call_ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  reporter_role TEXT,
  reported_role TEXT,
  ended_by UUID,
  reported_at_offset_seconds INTEGER,
  chat_snapshot JSONB,
  behavior_flags JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_report_contexts_report FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_report_contexts_call FOREIGN KEY (call_id) REFERENCES call_history(id) ON DELETE SET NULL,
  CONSTRAINT fk_report_contexts_ended_by FOREIGN KEY (ended_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_report_contexts_report_id ON report_contexts(report_id);
CREATE INDEX IF NOT EXISTS idx_report_contexts_call_id ON report_contexts(call_id);
CREATE INDEX IF NOT EXISTS idx_report_contexts_created_at ON report_contexts(created_at DESC);

COMMENT ON TABLE report_contexts IS 'Stores immutable context snapshots for user reports';
COMMENT ON COLUMN report_contexts.report_id IS 'Foreign key to reports table';
COMMENT ON COLUMN report_contexts.call_id IS 'Foreign key to call_history table if report is tied to a call';
COMMENT ON COLUMN report_contexts.room_id IS 'Room ID from RoomService if report was created during active call';
COMMENT ON COLUMN report_contexts.call_started_at IS 'Timestamp when the call started';
COMMENT ON COLUMN report_contexts.call_ended_at IS 'Timestamp when the call ended';
COMMENT ON COLUMN report_contexts.duration_seconds IS 'Call duration in seconds';
COMMENT ON COLUMN report_contexts.reporter_role IS 'Role of reporter: caller or callee';
COMMENT ON COLUMN report_contexts.reported_role IS 'Role of reported user: caller or callee';
COMMENT ON COLUMN report_contexts.ended_by IS 'User ID who ended or skipped the call';
COMMENT ON COLUMN report_contexts.reported_at_offset_seconds IS 'Seconds into call when report was created';
COMMENT ON COLUMN report_contexts.chat_snapshot IS 'JSONB snapshot of chat messages during call';
COMMENT ON COLUMN report_contexts.behavior_flags IS 'JSONB object containing call metadata and reporter-provided flags';
