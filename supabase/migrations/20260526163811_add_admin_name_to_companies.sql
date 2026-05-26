/*
  # Add admin name columns to companies

  1. Modified Tables
    - `companies`
      - `admin_first_name` (text, default '') - First name of the company admin
      - `admin_last_name` (text, default '') - Last name of the company admin

  2. Purpose
    - Allow clients to see their admin/advisor name without querying auth.users
    - Used as fallback when no vendor is assigned to a lead
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'admin_first_name'
  ) THEN
    ALTER TABLE companies ADD COLUMN admin_first_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'admin_last_name'
  ) THEN
    ALTER TABLE companies ADD COLUMN admin_last_name text DEFAULT '';
  END IF;
END $$;
