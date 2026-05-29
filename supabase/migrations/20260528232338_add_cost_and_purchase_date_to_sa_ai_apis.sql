/*
  # Add cost and purchase_date columns to sa_ai_apis

  1. Modified Tables
    - `sa_ai_apis`
      - `cost` (text, nullable) - Initial cost paid for the API (e.g. "20 $")
      - `purchase_date` (text, nullable) - Date of last payment/purchase (e.g. "28/05/2026")

  2. Important Notes
    - Both columns are text to allow flexible display formats
    - Existing rows are unaffected (columns default to NULL)
    - No destructive changes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sa_ai_apis' AND column_name = 'cost'
  ) THEN
    ALTER TABLE sa_ai_apis ADD COLUMN cost text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sa_ai_apis' AND column_name = 'purchase_date'
  ) THEN
    ALTER TABLE sa_ai_apis ADD COLUMN purchase_date text;
  END IF;
END $$;
