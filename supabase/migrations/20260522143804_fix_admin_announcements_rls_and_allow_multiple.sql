/*
  # Fix admin_announcements: RLS bug + allow multiple announcements

  1. Bug fix
    - The admin SELECT policy used raw_user_meta_data->>'company_id' which is always null
    - Fix: use auth.jwt()->'app_metadata'->>'company_id' (where company_id actually lives)

  2. Schema changes
    - Drop the unique constraint on company_id to allow multiple announcements per company/admin

  3. Security
    - Drop and recreate the broken admin SELECT policy with the correct JWT path
*/

-- Drop the unique constraint to allow multiple announcements per company
ALTER TABLE admin_announcements
  DROP CONSTRAINT IF EXISTS admin_announcements_company_id_unique;

-- Fix the broken admin SELECT policy
DROP POLICY IF EXISTS "Admins can read own company announcements" ON admin_announcements;

CREATE POLICY "Admins can read own company announcements"
  ON admin_announcements
  FOR SELECT
  TO authenticated
  USING (
    company_id::text = (auth.jwt() -> 'app_metadata' ->> 'company_id')
  );
