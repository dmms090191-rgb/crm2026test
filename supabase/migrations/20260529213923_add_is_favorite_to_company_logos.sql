/*
  # Add is_favorite column to company_logos

  1. Modified Tables
    - `company_logos`
      - Added `is_favorite` (boolean, default false) - allows users to mark logos as favorites

  2. Important Notes
    - Favorites are per-logo, scoped by company_id via existing RLS policies
    - Admin A cannot see or modify Admin B's logos/favorites (enforced by existing RLS)
    - Super Admin favorites are isolated to their own company
    - No data loss - additive change only
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_logos' AND column_name = 'is_favorite'
  ) THEN
    ALTER TABLE company_logos ADD COLUMN is_favorite boolean DEFAULT false;
  END IF;
END $$;
