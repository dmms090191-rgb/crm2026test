/*
  # Fix admin_announcements SA policies to use JWT app_metadata

  1. Bug fix
    - All super_admin policies queried auth.users table with raw_user_meta_data
    - This does not work at the RLS level; must use auth.jwt()->'app_metadata' instead
    - This matches the pattern used by all other SA-scoped tables (admin_comments, etc.)

  2. Changes
    - Drop and recreate all 4 super_admin policies (SELECT, INSERT, UPDATE, DELETE)
    - Use (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
*/

DROP POLICY IF EXISTS "Super admins can read all announcements" ON admin_announcements;
DROP POLICY IF EXISTS "Super admins can insert announcements" ON admin_announcements;
DROP POLICY IF EXISTS "Super admins can update announcements" ON admin_announcements;
DROP POLICY IF EXISTS "Super admins can delete announcements" ON admin_announcements;

CREATE POLICY "Super admins can read all announcements"
  ON admin_announcements
  FOR SELECT
  TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super_admin'
  );

CREATE POLICY "Super admins can insert announcements"
  ON admin_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super_admin'
  );

CREATE POLICY "Super admins can update announcements"
  ON admin_announcements
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super_admin'
  )
  WITH CHECK (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super_admin'
  );

CREATE POLICY "Super admins can delete announcements"
  ON admin_announcements
  FOR DELETE
  TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super_admin'
  );
