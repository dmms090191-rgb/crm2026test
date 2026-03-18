/*
  # Add vendor_id column to vendor_admin_messages

  1. Changes
    - Add nullable `vendor_id` column (uuid) referencing `vendors.id`
    - Make `vendor_auth_id` nullable since some vendors don't have auth accounts yet
    - Add index on `vendor_id` for faster queries

  2. Notes
    - This allows chat between admin and vendors who don't yet have an auth account
    - Existing rows are unaffected
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendor_admin_messages' AND column_name = 'vendor_id'
  ) THEN
    ALTER TABLE vendor_admin_messages ADD COLUMN vendor_id uuid REFERENCES vendors(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE vendor_admin_messages ALTER COLUMN vendor_auth_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS vendor_admin_messages_vendor_id_idx ON vendor_admin_messages(vendor_id);
