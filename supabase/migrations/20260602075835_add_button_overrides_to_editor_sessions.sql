/*
  # Add button_overrides column to editor_sessions

  1. Modified Tables
    - `editor_sessions`
      - Added `button_overrides` (jsonb, nullable) - Stores per-button color overrides as a JSON object mapping button IDs to hex color strings

  2. Notes
    - This column stores the editor's button color customizations (e.g., {"btn_voir_audit": "#ff5500"})
    - Nullable so existing rows are unaffected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_sessions' AND column_name = 'button_overrides'
  ) THEN
    ALTER TABLE editor_sessions ADD COLUMN button_overrides jsonb;
  END IF;
END $$;
