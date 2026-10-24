ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS is_historical_import boolean NOT NULL DEFAULT false;

-- Existing deterministic seed records were inserted with a recent created_at.
-- Mark only records whose ID and source identity both match the checked-in fixtures.
UPDATE reviews
SET is_historical_import = true
WHERE (id ~ '^hotel-[0-9]{3}$' AND source_review_id ~ '^hotel-source-[0-9]{3}$')
   OR (id ~ '^review-[0-9]{3}$' AND source_review_id ~ '^synthetic-source-[0-9]{3}$')
   OR (id ~ '^salon-[0-9]{3}$' AND source_review_id ~ '^salon-source-[0-9]{3}$')
   OR (
     is_synthetic
     AND (
       (branch_id = 'hotel-central' AND source_review_id ~ '^hotel-new-[0-9]{3}$')
       OR (branch_id = 'sunway' AND source_review_id ~ '^restaurant-new-[0-9]{3}$')
       OR (branch_id = 'salon-main' AND source_review_id ~ '^salon-new-[0-9]{3}$')
     )
   );
