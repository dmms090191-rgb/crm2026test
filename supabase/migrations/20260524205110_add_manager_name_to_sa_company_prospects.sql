/*
  # Add manager name columns to sa_company_prospects

  1. Modified Tables
    - `sa_company_prospects`
      - `manager_first_name` (text, nullable, default '') - First name of the company manager/owner
      - `manager_last_name` (text, nullable, default '') - Last name of the company manager/owner

  2. Notes
    - Both columns are nullable with empty string default for backwards compatibility
    - Existing rows will get empty strings, displayed as "-" in the UI
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sa_company_prospects' AND column_name = 'manager_first_name'
  ) THEN
    ALTER TABLE sa_company_prospects ADD COLUMN manager_first_name text DEFAULT '' NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sa_company_prospects' AND column_name = 'manager_last_name'
  ) THEN
    ALTER TABLE sa_company_prospects ADD COLUMN manager_last_name text DEFAULT '' NOT NULL;
  END IF;
END $$;
