/*
  # Add logo_scale column to company_home_pages

  1. Changes
    - Add `logo_scale` numeric column to `company_home_pages` table
    - Default value is 1.0 (100% = normal size)
    - Allows admins to adjust the displayed logo size in the sidebar

  2. Important Notes
    - Value range: 0.3 to 2.0 (30% to 200%)
    - Default 1.0 means no scaling applied
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages'
      AND column_name = 'logo_scale'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.company_home_pages
      ADD COLUMN logo_scale numeric DEFAULT 1.0;
  END IF;
END $$;
