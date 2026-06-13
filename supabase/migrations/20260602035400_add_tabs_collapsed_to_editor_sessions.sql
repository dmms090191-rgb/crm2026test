/*
  # Add tabs_collapsed column to editor_sessions

  1. Modified Tables
    - `editor_sessions`
      - `tabs_collapsed` (boolean) - whether the Onglets panel is in collapsed state

  2. Notes
    - Defaults to false (panel expanded)
    - Used to persist the Onglets panel collapse state across sessions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_sessions' AND column_name = 'tabs_collapsed'
  ) THEN
    ALTER TABLE editor_sessions ADD COLUMN tabs_collapsed boolean DEFAULT false;
  END IF;
END $$;
