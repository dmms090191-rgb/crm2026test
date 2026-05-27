/*
  # Create admin_comments table

  1. New Tables
    - `admin_comments`
      - `id` (uuid, primary key, auto-generated)
      - `admin_id` (uuid, NOT NULL) - references the auth.users.id of the admin being commented on
      - `content` (text, NOT NULL) - the comment body
      - `created_at` (timestamptz, defaults to now())

  2. Security
    - Enable RLS on `admin_comments` table
    - SELECT policy: only authenticated users with super_admin role
    - INSERT policy: only authenticated users with super_admin role
    - DELETE policy: only authenticated users with super_admin role

  3. Notes
    - Similar structure to vendor_comments but scoped to admin users
    - admin_id is not a foreign key to a table since admins live in auth.users
    - Only super_admin can read/write these comments
*/

CREATE TABLE IF NOT EXISTS admin_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view admin comments"
  ON admin_comments
  FOR SELECT
  TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super_admin'
  );

CREATE POLICY "Super admins can insert admin comments"
  ON admin_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super_admin'
  );

CREATE POLICY "Super admins can delete admin comments"
  ON admin_comments
  FOR DELETE
  TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) = 'super_admin'
  );
