/*
  # Create app_config table

  Per-company and global application configuration.

  1. New Tables
    - `app_config`
      - `id` (uuid, primary key)
      - `owner_type` (text, 'super_admin' or 'company')
      - `company_id` (uuid, nullable FK to companies)
      - `app_name` (text, display name of the application)
      - `app_icon_url` (text, nullable, URL of the app icon)
      - `app_icon_id` (uuid, nullable, reference to company_logos)
      - `logo_url` (text, nullable)
      - `theme` (text, nullable)
      - `enabled_modules` (jsonb, default '{}')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Constraints
    - Unique on company_id (one config per company)
    - Unique partial index for super_admin global row

  3. Security
    - RLS enabled
    - Super admin: full access
    - Admin: read/write own company only
    - Vendor/Client: read own company only
*/

CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL DEFAULT 'company',
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  app_name text NOT NULL DEFAULT '',
  app_icon_url text,
  app_icon_id uuid,
  logo_url text,
  theme text,
  enabled_modules jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One config per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_config_company_id
  ON app_config (company_id) WHERE company_id IS NOT NULL;

-- One global super_admin config
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_config_super_admin_global
  ON app_config (owner_type) WHERE owner_type = 'super_admin' AND company_id IS NULL;

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "SA can read all app_config"
  ON app_config FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );

CREATE POLICY "SA can insert app_config"
  ON app_config FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );

CREATE POLICY "SA can update app_config"
  ON app_config FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  )
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );

CREATE POLICY "SA can delete app_config"
  ON app_config FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );

-- Admin: read own company config
CREATE POLICY "Admin can read own company app_config"
  ON app_config FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND company_id IS NOT NULL
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  );

-- Admin: insert own company config
CREATE POLICY "Admin can insert own company app_config"
  ON app_config FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND owner_type = 'company'
    AND company_id IS NOT NULL
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  );

-- Admin: update own company config
CREATE POLICY "Admin can update own company app_config"
  ON app_config FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND company_id IS NOT NULL
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  )
  WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND owner_type = 'company'
    AND company_id IS NOT NULL
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  );

-- Vendor: read own company config
CREATE POLICY "Vendor can read own company app_config"
  ON app_config FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'vendor'
    AND company_id IS NOT NULL
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  );

-- Client: read own company config
CREATE POLICY "Client can read own company app_config"
  ON app_config FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'app_metadata'->>'role') = 'client'
    AND company_id IS NOT NULL
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  );
