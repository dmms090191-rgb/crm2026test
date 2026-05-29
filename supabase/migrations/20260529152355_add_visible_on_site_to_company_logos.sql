/*
  # Add visible_on_site column to company_logos

  1. Modified Tables
    - `company_logos`
      - `visible_on_site` (boolean, default false) - Controls whether this logo
        is displayed on the admin's public site template. Super Admin can toggle
        this from the logo list to send/hide logos on the admin's site.

  2. Important Notes
    - Defaults to false so existing logos are not shown on site until explicitly enabled
    - Only SA should toggle this from the admin impersonation view
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_logos' AND column_name = 'visible_on_site'
  ) THEN
    ALTER TABLE public.company_logos ADD COLUMN visible_on_site boolean NOT NULL DEFAULT false;
  END IF;
END $$;
