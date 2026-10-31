-- Older local builds created duplicate handoff version/status columns. The
-- application now uses approved_task_version and simulated_status exclusively.
-- Preserve any version/status data before removing the unused legacy columns.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'handoffs'
      AND column_name = 'task_version'
  ) THEN
    UPDATE handoffs
    SET approved_task_version = task_version
    WHERE task_version IS NOT NULL
      AND task_version <> approved_task_version;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'handoffs'
      AND column_name = 'record_status'
  ) THEN
    UPDATE handoffs
    SET simulated_status = 'superseded'
    WHERE record_status = 'superseded'
      AND simulated_status = 'recorded_locally_not_sent';
  END IF;
END $$;

-- 0007 used IF NOT EXISTS for this index. If an older build had already made
-- the index against task_version, Postgres kept that wrong definition.
DROP INDEX IF EXISTS handoffs_task_version_unique;
ALTER TABLE handoffs DROP COLUMN IF EXISTS task_version;
ALTER TABLE handoffs DROP COLUMN IF EXISTS record_status;
CREATE UNIQUE INDEX handoffs_task_version_unique
  ON handoffs (approved_task_id, approved_task_version);
