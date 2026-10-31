ALTER TABLE tasks ADD COLUMN IF NOT EXISTS report_version integer NOT NULL DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejected_by text;

CREATE TABLE IF NOT EXISTS task_report_attempts (
  id text PRIMARY KEY,
  task_id text NOT NULL REFERENCES tasks(id),
  version integer NOT NULL,
  note text NOT NULL,
  reported_at timestamptz NOT NULL,
  reported_by text NOT NULL,
  decision text NOT NULL DEFAULT 'pending',
  decision_reason text,
  decided_at timestamptz,
  decided_by text,
  UNIQUE(task_id, version)
);
CREATE INDEX IF NOT EXISTS task_report_attempts_task_idx ON task_report_attempts(task_id);

UPDATE tasks SET report_version = 1 WHERE employee_report IS NOT NULL AND report_version = 0;
INSERT INTO task_report_attempts
  (id, task_id, version, note, reported_at, reported_by, decision, decided_at, decided_by)
SELECT id || '-report-1', id, 1, employee_report,
  COALESCE(reported_at, proposed_at), COALESCE(reported_by, 'legacy demo actor'),
  CASE WHEN status = 'resolved' THEN 'approved' ELSE 'pending' END,
  CASE WHEN status = 'resolved' THEN verified_at ELSE NULL END,
  CASE WHEN status = 'resolved' THEN verified_by ELSE NULL END
FROM tasks WHERE employee_report IS NOT NULL AND report_version = 1
ON CONFLICT DO NOTHING;

ALTER TABLE replies ADD COLUMN IF NOT EXISTS draft_version integer NOT NULL DEFAULT 1;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS approved_version integer;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS rejected_by text;

CREATE TABLE IF NOT EXISTS reply_draft_versions (
  id text PRIMARY KEY,
  reply_id text NOT NULL REFERENCES replies(id),
  version integer NOT NULL,
  text text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(reply_id, version)
);
CREATE INDEX IF NOT EXISTS reply_draft_versions_reply_idx ON reply_draft_versions(reply_id);

UPDATE replies SET approved_version = draft_version
  WHERE status IN ('approved_ready', 'simulated_published') AND approved_version IS NULL;
INSERT INTO reply_draft_versions (id, reply_id, version, text, source, created_at)
SELECT id || '-draft-1', id, 1, text, 'legacy_snapshot', generated_at
FROM replies WHERE draft_version = 1
ON CONFLICT DO NOTHING;
