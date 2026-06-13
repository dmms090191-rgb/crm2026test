/*
  # Add panel_palette column to editor_sessions

  Stores the custom panel palette (3 hex colors) for Editor Mode modals.
  
  1. Modified Tables
    - `editor_sessions`
      - `panel_palette` (jsonb, nullable) - custom color palette for editor panels
        Contains: background, surface, accent hex values
  
  2. Notes
    - NULL means use the default theme (noir/gris/blanc presets)
    - When set, overrides the panel_theme preset with custom colors
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_sessions' AND column_name = 'panel_palette'
  ) THEN
    ALTER TABLE editor_sessions ADD COLUMN panel_palette jsonb DEFAULT NULL;
  END IF;
END $$;
