/*
  # Add can_customize_columns to vendors

  1. Modified Tables
    - `vendors`
      - `can_customize_columns` (boolean, default true) — controls whether a vendor
        can personalise column layout in their Leads panel. true = unlocked, false = locked.

  2. Notes
    - Default is true so existing vendors are not locked automatically.
    - Only admins toggle this value; vendors cannot change it themselves.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'can_customize_columns'
  ) THEN
    ALTER TABLE vendors ADD COLUMN can_customize_columns boolean NOT NULL DEFAULT true;
  END IF;
END $$;
