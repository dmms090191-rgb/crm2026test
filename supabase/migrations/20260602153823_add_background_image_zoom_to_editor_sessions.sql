/*
  # Add background image zoom to editor sessions

  1. Modified Tables
    - `editor_sessions`
      - `background_image_zoom` (smallint, nullable) — stores zoom percentage (50-200) for background image

  2. Notes
    - NULL means default (100%), only non-default values are stored
    - Constraint ensures valid range between 50 and 200
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_sessions' AND column_name = 'background_image_zoom'
  ) THEN
    ALTER TABLE editor_sessions ADD COLUMN background_image_zoom smallint;
    ALTER TABLE editor_sessions ADD CONSTRAINT editor_sessions_bg_zoom_range
      CHECK (background_image_zoom IS NULL OR (background_image_zoom >= 50 AND background_image_zoom <= 200));
  END IF;
END $$;
