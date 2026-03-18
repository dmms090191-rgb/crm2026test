/*
  # Add auth_user_id to vendors table

  ## Summary
  Links vendors to Supabase auth users so they can log in via email/password.

  ## Changes
  - `vendors` table: adds `auth_user_id` (uuid, nullable) referencing auth.users(id)

  ## Notes
  - Nullable so existing vendors without auth accounts are not affected
  - Used by the app to determine if logged-in user is a vendor
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vendors' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE vendors ADD COLUMN auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;
