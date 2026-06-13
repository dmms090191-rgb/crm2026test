/*
  # Add background image position columns to editor_sessions

  1. Modified Tables
    - `editor_sessions`
      - `background_image_position_x` (integer, nullable) - horizontal offset in pixels from center
      - `background_image_position_y` (integer, nullable) - vertical offset in pixels from center

  2. Notes
    - Position values are pixel offsets from the default center position
    - NULL means default (center, equivalent to 0,0)
    - Positive X moves right, negative X moves left
    - Positive Y moves down, negative Y moves up
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_sessions' AND column_name = 'background_image_position_x'
  ) THEN
    ALTER TABLE editor_sessions ADD COLUMN background_image_position_x integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_sessions' AND column_name = 'background_image_position_y'
  ) THEN
    ALTER TABLE editor_sessions ADD COLUMN background_image_position_y integer;
  END IF;
END $$;