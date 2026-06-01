/*
  # Create theme_categories table and migrate theme_config.category

  1. New Tables
    - `theme_categories`
      - `id` (uuid, primary key)
      - `slug` (text, unique) - internal key used for filtering
      - `name` (text) - display name (renamable by SA)
      - `sort_order` (integer) - display order of the tab
      - `is_system` (boolean) - protected system categories (all, rework, hidden)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modified Tables
    - `theme_config`
      - Add `category_id` (uuid, FK to theme_categories)
      - Keep `category` text column for backwards compatibility during migration

  3. Security
    - Enable RLS on `theme_categories`
    - SA can do everything
    - Authenticated users can read all categories

  4. Seed Data
    - Insert default categories matching existing slugs: dark, light, premium, business, glass
    - Insert special SA-only virtual categories: recommended, rework, hidden (as system)
    - Backfill theme_config.category_id from existing category text values
*/

-- Create theme_categories table
CREATE TABLE IF NOT EXISTS theme_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE theme_categories ENABLE ROW LEVEL SECURITY;

-- SA full access
CREATE POLICY "SA can read all theme categories"
  ON theme_categories FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "SA can insert theme categories"
  ON theme_categories FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "SA can update theme categories"
  ON theme_categories FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

CREATE POLICY "SA can delete theme categories"
  ON theme_categories FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Non-SA users can read categories
CREATE POLICY "Authenticated users can read theme categories"
  ON theme_categories FOR SELECT TO authenticated
  USING (is_system = false);

-- Seed default categories
INSERT INTO theme_categories (slug, name, sort_order, is_system) VALUES
  ('all',         'Tous',            0,  true),
  ('dark',        'Sombres',         1,  false),
  ('light',       'Clairs',          2,  false),
  ('premium',     'Premium',         3,  false),
  ('business',    'Business',        4,  false),
  ('glass',       'Glass',           5,  false),
  ('recommended', 'Recommandes',     6,  true),
  ('rework',      'A retravailler',  7,  true),
  ('hidden',      'Masques',         8,  true)
ON CONFLICT (slug) DO NOTHING;

-- Add category_id column to theme_config
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'theme_config' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE theme_config ADD COLUMN category_id uuid REFERENCES theme_categories(id);
  END IF;
END $$;

-- Backfill category_id from existing category text
UPDATE theme_config tc
SET category_id = cat.id
FROM theme_categories cat
WHERE tc.category = cat.slug
  AND tc.category_id IS NULL;
