/*
  # Create company_home_pages table

  1. New Tables
    - `company_home_pages`
      - `id` (uuid, primary key)
      - `company_id` (uuid, unique, FK to companies.id, cascade delete)
      - `title` (text, not null, default '')
      - `subtitle` (text, not null, default '')
      - `welcome_message` (text, not null, default '')
      - `logo_url` (text, nullable)
      - `main_color` (text, nullable, default '#0ea5e9')
      - `secondary_color` (text, nullable, default '#10b981')
      - `hero_image_url` (text, nullable)
      - `is_active` (boolean, not null, default true)
      - `created_at` (timestamptz, not null, default now())
      - `updated_at` (timestamptz, not null, default now())

  2. Security
    - Enable RLS on `company_home_pages`
    - SELECT: any authenticated user can read
    - INSERT: super_admin only
    - UPDATE: super_admin only
    - DELETE: super_admin only

  3. Notes
    - One home page per company (UNIQUE constraint on company_id)
    - Super Admin manages these pages for each business
    - Admins read their own company's page to display a personalized welcome banner
*/

CREATE TABLE IF NOT EXISTS company_home_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  welcome_message text NOT NULL DEFAULT '',
  logo_url text,
  main_color text DEFAULT '#0ea5e9',
  secondary_color text DEFAULT '#10b981',
  hero_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE company_home_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view company home pages"
  ON company_home_pages
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin can insert company home pages"
  ON company_home_pages
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Super admin can update company home pages"
  ON company_home_pages
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "Super admin can delete company home pages"
  ON company_home_pages
  FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');
