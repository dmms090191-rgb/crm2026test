/*
  # Create registrar_contact_info table

  Stores contact information used when purchasing domains via Vercel Registrar API.
  For now, a single default Talvex entry is seeded. Super Admin can update it via Supabase dashboard.

  1. New Tables
    - `registrar_contact_info`
      - `id` (uuid, primary key)
      - `label` (text, unique logical identifier e.g. 'talvex_default')
      - `first_name` (text, registrant first name)
      - `last_name` (text, registrant last name)
      - `company_name` (text, optional company name)
      - `email` (text, registrant email)
      - `phone` (text, E.164 format phone number)
      - `address1` (text, street address line 1)
      - `address2` (text, optional street address line 2)
      - `city` (text, city)
      - `state` (text, state/region)
      - `zip` (text, postal code)
      - `country` (text, ISO 3166-1 alpha-2 country code)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Super admin can select and update only

  3. Seed
    - One row with label 'talvex_default' and placeholder values
    - Super Admin must update these with real Talvex info before purchasing
*/

CREATE TABLE IF NOT EXISTS registrar_contact_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE DEFAULT 'talvex_default',
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  company_name text,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address1 text NOT NULL DEFAULT '',
  address2 text,
  city text NOT NULL DEFAULT '',
  state text NOT NULL DEFAULT '',
  zip text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT 'FR',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE registrar_contact_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can read registrar contact info"
  ON registrar_contact_info
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

CREATE POLICY "Super admin can update registrar contact info"
  ON registrar_contact_info
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

INSERT INTO registrar_contact_info (label, first_name, last_name, company_name, email, phone, address1, city, state, zip, country)
VALUES (
  'talvex_default',
  'Talvex',
  'SAS',
  'Talvex',
  'domains@talvex.com',
  '+33600000000',
  '1 rue Placeholder',
  'Paris',
  'IDF',
  '75001',
  'FR'
);
