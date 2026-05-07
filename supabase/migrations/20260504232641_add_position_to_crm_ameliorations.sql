/*
  # Add position column to crm_ameliorations

  1. Modified Tables
    - `crm_ameliorations`
      - Added `position` (integer, NOT NULL, default 0) - ordering within each category

  2. Backfill
    - Assigns position 0, 1, 2... to each amelioration within its category,
      preserving the current chronological order (by created_at)

  3. Notes
    - This enables manual reordering of ameliorations within categories
    - Existing items keep their current relative order
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_ameliorations' AND column_name = 'position'
  ) THEN
    ALTER TABLE crm_ameliorations ADD COLUMN position integer NOT NULL DEFAULT 0;
  END IF;
END $$;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY created_at ASC) - 1 AS pos
  FROM crm_ameliorations
)
UPDATE crm_ameliorations
SET position = ranked.pos
FROM ranked
WHERE crm_ameliorations.id = ranked.id;
