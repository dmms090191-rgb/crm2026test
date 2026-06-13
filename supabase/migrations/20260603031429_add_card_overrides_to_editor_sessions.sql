/*
  # Add card_overrides to editor_sessions

  1. Changes
    - Adds nullable jsonb column `card_overrides` on `editor_sessions` to persist per-target card background customizations (allCards, enterprises, healthProject).

  2. Notes
    - Column is optional. Existing rows are unaffected.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_sessions' AND column_name = 'card_overrides'
  ) THEN
    ALTER TABLE editor_sessions ADD COLUMN card_overrides jsonb;
  END IF;
END $$;
