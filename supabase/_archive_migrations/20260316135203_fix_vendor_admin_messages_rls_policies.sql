/*
  # Fix RLS policies for vendor_admin_messages

  1. Changes
    - Add INSERT policy for admin (allows insert from anon key, matching how other tables work)
    - Add UPDATE policy for admin
    - Fix SELECT policy to also allow anon access (admin uses anon key)

  2. Notes
    - Admin uses the anon key without Supabase Auth, so policies must allow anon role
    - This matches the pattern used by leads and other tables in the project
*/

DROP POLICY IF EXISTS "Vendors can read own messages" ON vendor_admin_messages;
DROP POLICY IF EXISTS "Vendors can insert own messages" ON vendor_admin_messages;

CREATE POLICY "Anyone can select vendor_admin_messages"
  ON vendor_admin_messages FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert vendor_admin_messages"
  ON vendor_admin_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update vendor_admin_messages"
  ON vendor_admin_messages FOR UPDATE
  USING (true)
  WITH CHECK (true);
