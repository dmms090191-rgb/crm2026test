/*
  # Add app icon columns to company_home_pages

  1. Modified Tables
    - `company_home_pages`
      - `app_icon_id` (uuid, nullable) - references the company_logos entry used as app icon
      - `app_icon_url` (text, nullable) - direct URL of the app icon image

  2. Notes
    - These columns store the selected application icon
    - app_icon_id links to company_logos for traceability
    - app_icon_url stores the direct URL for quick access
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'app_icon_id'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN app_icon_id uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'app_icon_url'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN app_icon_url text;
  END IF;
END $$;
