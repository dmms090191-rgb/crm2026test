/*
  # Add last_checked_at to sa_ai_apis

  1. Modified Tables
    - `sa_ai_apis`
      - Add `last_checked_at` (timestamptz, nullable) — stores when the credit was last verified against the provider

  2. Important Notes
    - No data loss — only adds a new nullable column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sa_ai_apis' AND column_name = 'last_checked_at'
  ) THEN
    ALTER TABLE sa_ai_apis ADD COLUMN last_checked_at timestamptz;
  END IF;
END $$;
