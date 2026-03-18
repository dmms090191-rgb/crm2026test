/*
  # Add status and position columns to crm_ideas

  ## Changes
  - `status` (text, default 'idea') — one of: 'idea', 'todo', 'done'
  - `position` (integer, default 0) — manual sort order (lower = higher priority)

  ## Notes
  - Existing rows get status='idea' and position=0 by default
  - position is used for drag-and-drop ordering (most important first)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_ideas' AND column_name = 'status'
  ) THEN
    ALTER TABLE crm_ideas ADD COLUMN status text NOT NULL DEFAULT 'idea';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_ideas' AND column_name = 'position'
  ) THEN
    ALTER TABLE crm_ideas ADD COLUMN position integer NOT NULL DEFAULT 0;
  END IF;
END $$;

UPDATE crm_ideas SET position = 0 WHERE position IS NULL;
