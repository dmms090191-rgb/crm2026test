/*
  # Add actif column to leads table

  Adds a boolean `actif` column to control whether a lead/client can connect to their interface.
  Default is true (active).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'actif'
  ) THEN
    ALTER TABLE leads ADD COLUMN actif boolean NOT NULL DEFAULT true;
  END IF;
END $$;
