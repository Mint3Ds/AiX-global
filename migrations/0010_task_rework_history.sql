ALTER TABLE tasks ADD COLUMN IF NOT EXISTS original_title text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS original_description text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rework_instructions text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium';

UPDATE tasks AS task
SET priority = theme.priority
FROM themes AS theme
WHERE task.theme_id = theme.id
  AND task.priority = 'medium';

-- Existing tasks predate immutable briefs; preserve their current approved text.
UPDATE tasks
SET original_title = COALESCE(original_title, title),
    original_description = COALESCE(original_description, description)
WHERE status NOT IN ('proposed', 'deferred');

ALTER TABLE task_report_attempts
  ADD COLUMN IF NOT EXISTS decision_instructions text;
