ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kuala_Lumpur';
UPDATE branches b
SET timezone = biz.timezone
FROM businesses biz
WHERE b.business_id = biz.id AND (b.timezone IS NULL OR b.timezone = 'Asia/Kuala_Lumpur');

ALTER TABLE employees ADD COLUMN IF NOT EXISTS orbyte_staff_id text;
UPDATE employees
SET orbyte_staff_id = 'ORB-' || upper(id)
WHERE orbyte_staff_id IS NULL OR btrim(orbyte_staff_id) = '';
ALTER TABLE employees ALTER COLUMN orbyte_staff_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS employees_orbyte_staff_business_unique
  ON employees (business_id, orbyte_staff_id);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_version integer NOT NULL DEFAULT 1;

ALTER TABLE handoffs ADD COLUMN IF NOT EXISTS approved_task_version integer NOT NULL DEFAULT 1;
ALTER TABLE handoffs DROP CONSTRAINT IF EXISTS handoffs_approved_task_id_key;
DROP INDEX IF EXISTS handoffs_approved_task_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS handoffs_task_version_unique
  ON handoffs (approved_task_id, approved_task_version);
CREATE INDEX IF NOT EXISTS handoffs_task_idx ON handoffs (approved_task_id);

-- Convert existing local demo handoffs to the identifier-only contract. No review
-- text, excerpts, or guest identities are copied into the handoff payload.
UPDATE handoffs h
SET payload = jsonb_build_object(
  'businessId', th.business_id,
  'propertyId', t.branch_id,
  'orbyteStaffId', COALESCE(emp.orbyte_staff_id, ''),
  'taskId', t.id,
  'taskVersion', t.task_version,
  'dueDate', COALESCE(t.due_at::text, ''),
  'timezone', b.timezone,
  'approvedTask', jsonb_build_object('title', t.title, 'instructions', t.description),
  'linkedEvidence', jsonb_build_object(
    'reviewIds', COALESCE(evidence.review_ids, '[]'::jsonb),
    'observationIds', COALESCE(evidence.observation_ids, '[]'::jsonb)
  ),
  'approvedAt', COALESCE(t.approved_at, h.created_at)::text,
  'status', 'recorded_locally_not_sent'
),
simulated_status = 'recorded_locally_not_sent',
approved_task_version = t.task_version
FROM tasks t
JOIN themes th ON th.id = t.theme_id
JOIN branches b ON b.id = t.branch_id
LEFT JOIN employees emp ON emp.id = t.assignee_id AND emp.business_id = th.business_id
LEFT JOIN LATERAL (
  SELECT
    jsonb_agg(DISTINCT o.review_id) AS review_ids,
    jsonb_agg(DISTINCT o.id) AS observation_ids
  FROM theme_memberships m
  JOIN observations o ON o.id = m.observation_id
  JOIN reviews r ON r.id = o.review_id
  WHERE m.theme_id = t.theme_id AND r.business_id = th.business_id
) evidence ON true
WHERE h.approved_task_id = t.id
  AND NOT (h.payload ?& ARRAY['propertyId', 'orbyteStaffId', 'linkedEvidence']);

UPDATE activity_events e
SET metadata = COALESCE(e.metadata, '{}'::jsonb) || jsonb_build_object('handoffId', h.id)
FROM handoffs h
WHERE e.entity_type = 'task'
  AND e.entity_id = h.approved_task_id
  AND e.type = 'handoff_simulated'
  AND NOT (COALESCE(e.metadata, '{}'::jsonb) ? 'handoffId');
