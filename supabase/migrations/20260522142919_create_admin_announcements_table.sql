/*
  # Create admin_announcements table

  1. New Tables
    - `admin_announcements`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies, unique per company)
      - `title` (text, announcement title)
      - `message` (text, announcement body)
      - `is_active` (boolean, whether visible to admin, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `admin_announcements`
    - Super admins (role = 'super_admin') can read and write all announcements
    - Admins can read announcements for their own company
*/

CREATE TABLE IF NOT EXISTS admin_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_announcements_company_id_unique UNIQUE (company_id)
);

ALTER TABLE admin_announcements ENABLE ROW LEVEL SECURITY;

-- Super admins can read all announcements
CREATE POLICY "Super admins can read all announcements"
  ON admin_announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Super admins can insert announcements
CREATE POLICY "Super admins can insert announcements"
  ON admin_announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Super admins can update announcements
CREATE POLICY "Super admins can update announcements"
  ON admin_announcements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Super admins can delete announcements
CREATE POLICY "Super admins can delete announcements"
  ON admin_announcements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'super_admin'
    )
  );

-- Admins can read announcements for their own company
CREATE POLICY "Admins can read own company announcements"
  ON admin_announcements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
      AND (auth.users.raw_user_meta_data->>'company_id')::uuid = admin_announcements.company_id
    )
  );
