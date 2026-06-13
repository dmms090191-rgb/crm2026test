/*
  # Add typography overrides to editor sessions

  1. Modified Tables
    - `editor_sessions`
      - `typography_overrides` (jsonb, nullable) - Stores font-family overrides for categories and items
        Contains: { categoryFont?: string, itemFont?: string }

  2. Important Notes
    - This column stores validated (committed) typography choices
    - Preview typography is never persisted; only committed values are saved
    - When null or empty, default system fonts are used
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_sessions' AND column_name = 'typography_overrides'
  ) THEN
    ALTER TABLE editor_sessions ADD COLUMN typography_overrides jsonb;
  END IF;
END $$;
