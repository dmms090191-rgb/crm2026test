/*
  # Add slug and domain columns to company_home_pages

  1. New Columns
    - `slug` (text, unique, nullable) - URL path identifier, e.g. "dma" for /site/dma
    - `custom_domain` (text, unique, nullable) - Future custom domain, e.g. "dma.talvex.com"
    - `domain_status` (text, not null, default 'not_configured') - Status of domain configuration
    - `domain_verified` (boolean, not null, default false) - Whether domain DNS is verified

  2. Security
    - Add SELECT policy for anonymous users so public site pages can be loaded without login
    - Only active pages with a slug are publicly visible

  3. Notes
    - slug is used for /site/:slug public URL
    - custom_domain is reserved for future subdomain/domain mapping
    - domain_status values: 'not_configured', 'pending', 'active', 'error'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'slug'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN slug text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'custom_domain'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN custom_domain text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'domain_status'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN domain_status text NOT NULL DEFAULT 'not_configured';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_home_pages' AND column_name = 'domain_verified'
  ) THEN
    ALTER TABLE company_home_pages ADD COLUMN domain_verified boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE POLICY "Public can view active pages by slug"
  ON company_home_pages
  FOR SELECT
  TO anon
  USING (is_active = true AND slug IS NOT NULL);
