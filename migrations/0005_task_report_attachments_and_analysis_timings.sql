ALTER TABLE analysis_runs
  ADD COLUMN IF NOT EXISTS stage_timings jsonb;

CREATE TABLE IF NOT EXISTS task_report_attachments (
  id text PRIMARY KEY,
  report_attempt_id text NOT NULL REFERENCES task_report_attempts(id),
  name text NOT NULL,
  media_type text NOT NULL,
  data_base64 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS task_report_attachments_attempt_idx
  ON task_report_attachments(report_attempt_id);
