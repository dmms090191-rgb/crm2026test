/*
  # Create companies table and default company for David Schemmama

  1. New Tables
    - `companies`
      - `id` (uuid, primary key)
      - `name` (text, not null) -- company/enterprise name
      - `created_at` (timestamptz, default now())

  2. Seed Data
    - Insert default company "David Schemmama" with fixed UUID
    - Update David's auth.users app_metadata to include company_id

  3. Security
    - Enable RLS on `companies`
    - Super admin can view all companies
    - Admin can view only their own company
    - Super admin can insert and update companies

  4. Important Notes
    - This migration does NOT modify any existing business tables
    - No changes to leads, vendors, messages, rdv_proposals, statuts, etc.
    - No changes to existing RLS policies on other tables
    - No frontend or edge function changes
    - David keeps full access to all existing data unchanged
*/

-- 1. Create the companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Super admin can view all companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

CREATE POLICY "Admin can view own company"
  ON companies FOR SELECT
  TO authenticated
  USING (
    id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
  );

CREATE POLICY "Super admin can insert companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

CREATE POLICY "Super admin can update companies"
  ON companies FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- 4. Seed default company for David Schemmama
INSERT INTO companies (id, name)
VALUES ('a0000000-0000-0000-0000-000000000001', 'David Schemmama')
ON CONFLICT (id) DO NOTHING;

-- 5. Attach David to his company via app_metadata
UPDATE auth.users
SET raw_app_meta_data =
  COALESCE(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('company_id', 'a0000000-0000-0000-0000-000000000001')
WHERE id = '72d607f1-f373-4009-9ca6-27d04010654d';
