/*
  # Add background image border radius to editor sessions

  1. Modified Tables
    - `editor_sessions`
      - `background_image_border_radius` (integer, nullable) - Stores the border radius in pixels (0-80)
        for the background image shape. 0 = square (default), >0 = rounded corners.

  2. Notes
    - Column is nullable; null means square (0px border radius, the default)
    - Used by the "Forme de l'image" feature in the editor's Image tab
    - Works in combination with blend, zoom, and position settings
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_sessions' AND column_name = 'background_image_border_radius'
  ) THEN
    ALTER TABLE editor_sessions ADD COLUMN background_image_border_radius integer DEFAULT NULL;
  END IF;
END $$;
