/*
  # Add vendor_id to leads table

  1. Changes
    - Adds `vendor_id` column (uuid, nullable) to the `leads` table
    - References the `vendors` table
    - NULL means the lead belongs to the admin (unassigned)
    - Non-null means the lead is assigned to that vendor
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL;
  END IF;
END $$;
