/*
  # Add site_scope column and make company_id nullable

  1. Schema Changes
    - Add `site_scope` column (text, NOT NULL, default 'company')
      - Values: 'platform' (official Talvex site) or 'company' (per-company site)
    - Make `company_id` nullable to allow platform-level sites without a company
    - Drop existing UNIQUE constraint on company_id
    - Add partial UNIQUE on company_id WHERE company_id IS NOT NULL
    - Add UNIQUE constraint ensuring only one platform site exists
    - Add CHECK constraint: company sites must have company_id, platform sites may not

  2. Security Changes
    - Add INSERT policy for admin role: admins can create their own company's site
    - Add UPDATE policy for admin role: admins can update their own company's site

  3. Notes
    - Existing rows remain unchanged (all have company_id set, default scope = 'company')
    - Platform site (site_scope = 'platform') is for the official Talvex website
    - Company sites (site_scope = 'company') are per-company public pages
    - Domain remains optional for both scopes
*/

-- Add site_scope column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'site_scope'
  ) THEN
    ALTER TABLE company_home_pages
      ADD COLUMN site_scope text NOT NULL DEFAULT 'company';
  END IF;
END $$;

-- Add CHECK constraint on site_scope values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_home_pages_site_scope_check'
  ) THEN
    ALTER TABLE company_home_pages
      ADD CONSTRAINT company_home_pages_site_scope_check
      CHECK (site_scope IN ('platform', 'company'));
  END IF;
END $$;

-- Make company_id nullable
ALTER TABLE company_home_pages ALTER COLUMN company_id DROP NOT NULL;

-- Drop existing unique constraint on company_id
ALTER TABLE company_home_pages DROP CONSTRAINT IF EXISTS company_home_pages_company_id_key;

-- Add partial unique: only one row per company_id when company_id is not null
CREATE UNIQUE INDEX IF NOT EXISTS company_home_pages_company_id_unique
  ON company_home_pages (company_id) WHERE company_id IS NOT NULL;

-- Add unique constraint: only one platform site allowed
CREATE UNIQUE INDEX IF NOT EXISTS company_home_pages_platform_unique
  ON company_home_pages (site_scope) WHERE site_scope = 'platform';

-- Add CHECK: company scope requires company_id, platform scope allows null
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_home_pages_scope_company_check'
  ) THEN
    ALTER TABLE company_home_pages
      ADD CONSTRAINT company_home_pages_scope_company_check
      CHECK (
        (site_scope = 'company' AND company_id IS NOT NULL)
        OR (site_scope = 'platform')
      );
  END IF;
END $$;

-- RLS: Allow admins to INSERT their own company's site
CREATE POLICY "Admin can insert own company site"
  ON company_home_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id IS NOT NULL
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND site_scope = 'company'
  );

-- RLS: Allow admins to UPDATE their own company's site
CREATE POLICY "Admin can update own company site"
  ON company_home_pages
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id IS NOT NULL
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND site_scope = 'company'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id IS NOT NULL
    AND company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    AND site_scope = 'company'
  );
