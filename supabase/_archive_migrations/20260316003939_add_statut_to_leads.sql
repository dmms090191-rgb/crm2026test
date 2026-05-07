/*
  # Add statut column to leads table

  Adds a `statut` column to the existing `leads` table to track the CRM status of each lead.
  Default value is 'Nouveau'.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'statut'
  ) THEN
    ALTER TABLE leads ADD COLUMN statut text NOT NULL DEFAULT 'Nouveau';
  END IF;
END $$;
