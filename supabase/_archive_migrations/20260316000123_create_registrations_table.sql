/*
  # Create registrations table

  ## Purpose
  Stores all user registration requests submitted from the homepage.
  The admin can accept or refuse each registration from the Inscription dashboard view.

  ## New Tables
  - `registrations`
    - `id` (uuid, primary key)
    - `first_name` (text) - registrant's first name
    - `last_name` (text) - registrant's last name
    - `email` (text) - registrant's email address
    - `password` (text) - plain-text password as entered (for admin display only)
    - `phone` (text) - registrant's phone number
    - `status` (text) - 'pending' | 'accepted' | 'refused'
    - `registered_at` (timestamptz) - exact timestamp of registration (auto-set)

  ## Security
  - RLS enabled
  - Anon users can INSERT (submit registrations from homepage)
  - Authenticated users (admin) can SELECT, UPDATE, DELETE all rows
*/

CREATE TABLE IF NOT EXISTS registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  registered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert registrations"
  ON registrations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Auth can select registrations"
  ON registrations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Auth can update registrations"
  ON registrations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Auth can delete registrations"
  ON registrations FOR DELETE
  TO authenticated
  USING (true);
