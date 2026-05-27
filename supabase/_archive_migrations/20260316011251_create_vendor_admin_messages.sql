/*
  # Create vendor_admin_messages table

  ## Summary
  Enables real-time messaging between vendors and admins.

  ## New Tables
  - `vendor_admin_messages`
    - `id` (uuid, primary key)
    - `vendor_auth_id` (uuid) - auth.uid() of the vendor
    - `content` (text) - message content
    - `sender` (text) - 'vendor' or 'admin'
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Vendors can read/insert their own messages
  - Authenticated users (admin) can read/insert all messages
*/

CREATE TABLE IF NOT EXISTS vendor_admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_auth_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  sender text NOT NULL DEFAULT 'vendor',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can read own messages"
  ON vendor_admin_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = vendor_auth_id OR (SELECT (auth.jwt()->'app_metadata'->>'role') = 'admin'));

CREATE POLICY "Vendors can insert own messages"
  ON vendor_admin_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = vendor_auth_id OR (SELECT (auth.jwt()->'app_metadata'->>'role') = 'admin'));
