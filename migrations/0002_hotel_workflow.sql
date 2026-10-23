CREATE TABLE IF NOT EXISTS employees (
  id text PRIMARY KEY,
  business_id text NOT NULL REFERENCES businesses(id),
  branch_id text NOT NULL REFERENCES branches(id),
  name text NOT NULL,
  job_title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS employees_business_idx ON employees(business_id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignee_id text REFERENCES employees(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_at timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS employee_report text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reported_at timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reported_by text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verified_by text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_of_task_id text;
DROP INDEX IF EXISTS tasks_theme_unique;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_theme_id_unique;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_theme_id_key;
CREATE INDEX IF NOT EXISTS tasks_theme_idx ON tasks(theme_id);
ALTER TABLE replies ADD COLUMN IF NOT EXISTS partial_warning text;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS partial_approved boolean NOT NULL DEFAULT false;
ALTER TABLE replies ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE activity_events ADD COLUMN IF NOT EXISTS business_id text REFERENCES businesses(id);
CREATE INDEX IF NOT EXISTS activity_events_business_idx ON activity_events(business_id);
UPDATE activity_events e SET business_id=r.business_id FROM reviews r
  WHERE e.business_id IS NULL AND e.entity_type='review' AND e.entity_id=r.id;
UPDATE activity_events e SET business_id=t.business_id FROM themes t
  WHERE e.business_id IS NULL AND e.entity_type='theme' AND e.entity_id=t.id;
UPDATE activity_events e SET business_id=t.business_id FROM tasks k JOIN themes t ON t.id=k.theme_id
  WHERE e.business_id IS NULL AND e.entity_type='task' AND e.entity_id=k.id;
UPDATE activity_events e SET business_id=r.business_id FROM replies p JOIN reviews r ON r.id=p.review_id
  WHERE e.business_id IS NULL AND e.entity_type='reply' AND e.entity_id=p.id;
UPDATE activity_events e SET business_id=r.business_id FROM observations o JOIN reviews r ON r.id=o.review_id
  WHERE e.business_id IS NULL AND e.entity_type='observation' AND e.entity_id=o.id;
