/*
  # Add device_type column to demo_sessions

  1. Modified Tables
    - `demo_sessions`
      - `device_type` (text, default 'desktop') - indicates whether the client views on desktop or smartphone

  2. Notes
    - Non-destructive: adds a new column with a default value
    - Existing rows get 'desktop' as default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'demo_sessions' AND column_name = 'device_type'
  ) THEN
    ALTER TABLE demo_sessions ADD COLUMN device_type text NOT NULL DEFAULT 'desktop';
  END IF;
END $$;
