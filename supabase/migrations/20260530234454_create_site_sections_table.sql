/*
  # Create site_sections table and add is_published to company_home_pages

  1. New Tables
    - `site_sections`
      - `id` (uuid, primary key)
      - `home_page_id` (uuid, FK to company_home_pages, ON DELETE CASCADE)
      - `section_key` (text, e.g. "hero", "navbar", "services")
      - `position` (integer, display order)
      - `is_visible` (boolean, default true)
      - `draft_content` (jsonb, editable content in draft mode)
      - `published_content` (jsonb, content visible on public site, null until published)
      - `draft_styles` (jsonb, editable styles in draft mode)
      - `published_styles` (jsonb, styles visible on public site, null until published)
      - `animation_preset` (text, default 'none' - prepared for V3)
      - `animation_config` (jsonb, default '{}' - prepared for V3)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `published_at` (timestamptz, nullable)

  2. Modified Tables
    - `company_home_pages`
      - Added `is_published` (boolean, default false) - controls whether public site shows published content

  3. Constraints
    - UNIQUE(home_page_id, section_key) to prevent duplicate sections per page
    - FK home_page_id references company_home_pages(id) ON DELETE CASCADE

  4. Indexes
    - Index on home_page_id for fast lookups
    - Index on (home_page_id, position) for ordered queries

  5. Security
    - RLS enabled on site_sections
    - SELECT: authenticated users can read sections for pages they own (via company_id match or super_admin role)
    - SELECT: anon users can read published sections of active published sites
    - INSERT/UPDATE/DELETE: super_admin OR admin whose company_id matches the page's company_id
*/

-- Add is_published column to company_home_pages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN is_published boolean DEFAULT false;
  END IF;
END $$;

-- Create site_sections table
CREATE TABLE IF NOT EXISTS site_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  home_page_id uuid NOT NULL REFERENCES company_home_pages(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  draft_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_content jsonb DEFAULT NULL,
  draft_styles jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_styles jsonb DEFAULT NULL,
  animation_preset text NOT NULL DEFAULT 'none',
  animation_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz DEFAULT NULL,
  UNIQUE(home_page_id, section_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_site_sections_home_page_id
  ON site_sections(home_page_id);

CREATE INDEX IF NOT EXISTS idx_site_sections_home_page_position
  ON site_sections(home_page_id, position);

-- Enable RLS
ALTER TABLE site_sections ENABLE ROW LEVEL SECURITY;

-- SELECT policy for authenticated users (admin/super_admin editing)
CREATE POLICY "Authenticated users can read own site sections"
  ON site_sections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_home_pages hp
      WHERE hp.id = site_sections.home_page_id
      AND (
        (hp.site_scope = 'platform' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
        OR (hp.company_id IS NOT NULL AND hp.company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid))
      )
    )
  );

-- SELECT policy for anon users (public site display)
CREATE POLICY "Anon can read published sections of active sites"
  ON site_sections
  FOR SELECT
  TO anon
  USING (
    site_sections.published_content IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM company_home_pages hp
      WHERE hp.id = site_sections.home_page_id
      AND hp.is_active = true
      AND hp.is_published = true
    )
  );

-- INSERT policy
CREATE POLICY "Admins can insert sections for own site"
  ON site_sections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_home_pages hp
      WHERE hp.id = site_sections.home_page_id
      AND (
        (hp.site_scope = 'platform' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
        OR (hp.company_id IS NOT NULL AND hp.company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid))
      )
    )
  );

-- UPDATE policy
CREATE POLICY "Admins can update sections for own site"
  ON site_sections
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_home_pages hp
      WHERE hp.id = site_sections.home_page_id
      AND (
        (hp.site_scope = 'platform' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
        OR (hp.company_id IS NOT NULL AND hp.company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_home_pages hp
      WHERE hp.id = site_sections.home_page_id
      AND (
        (hp.site_scope = 'platform' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
        OR (hp.company_id IS NOT NULL AND hp.company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid))
      )
    )
  );

-- DELETE policy
CREATE POLICY "Admins can delete sections for own site"
  ON site_sections
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_home_pages hp
      WHERE hp.id = site_sections.home_page_id
      AND (
        (hp.site_scope = 'platform' AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
        OR (hp.company_id IS NOT NULL AND hp.company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid))
      )
    )
  );
