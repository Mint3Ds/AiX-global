ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS triaged_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS triage_duration_seconds integer;

