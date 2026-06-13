/*
  # Add panel_theme column to editor_sessions

  1. Modified Tables
    - `editor_sessions`
      - `panel_theme` (text, default 'gris') - stores the editor panel theme preference (noir/gris/blanc)

  2. Notes
    - This column persists the panel appearance theme so it survives logout/login and device changes
    - Previously this value was only stored in localStorage, meaning it was lost when switching devices or clearing browser data
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_sessions' AND column_name = 'panel_theme'
  ) THEN
    ALTER TABLE editor_sessions ADD COLUMN panel_theme text DEFAULT 'gris';
  END IF;
END $$;