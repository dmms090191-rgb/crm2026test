/*
  # Create theme_config table

  Stores visibility, status, ordering, and metadata for each theme
  so the Super Admin can control which themes appear to users.

  1. New Tables
    - `theme_config`
      - `id` (uuid, primary key)
      - `theme_key` (text, unique) - matches the Theme type union from code
      - `label` (text) - display name (can be renamed by SA)
      - `status` (text) - one of: visible, hidden, rework, premium
      - `is_recommended` (boolean) - whether theme is highlighted as recommended
      - `is_favorite` (boolean) - whether theme is marked as favorite/star
      - `category` (text) - display category: dark, light, premium, business, glass
      - `display_order` (integer) - sort order for display
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `theme_config` table
    - Super Admin can do everything (role = super_admin in JWT)
    - Authenticated users can read visible themes only
*/

CREATE TABLE IF NOT EXISTS theme_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_key text UNIQUE NOT NULL,
  label text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'visible',
  is_recommended boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  category text NOT NULL DEFAULT 'dark',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE theme_config ENABLE ROW LEVEL SECURITY;

-- Super Admin full access (select)
CREATE POLICY "SA can read all theme configs"
  ON theme_config
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- Super Admin full access (insert)
CREATE POLICY "SA can insert theme configs"
  ON theme_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- Super Admin full access (update)
CREATE POLICY "SA can update theme configs"
  ON theme_config
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- Super Admin full access (delete)
CREATE POLICY "SA can delete theme configs"
  ON theme_config
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- Non-SA users can only read visible themes
CREATE POLICY "Authenticated users can read visible theme configs"
  ON theme_config
  FOR SELECT
  TO authenticated
  USING (
    status = 'visible' OR status = 'premium'
  );

-- Seed with current theme entries
INSERT INTO theme_config (theme_key, label, status, is_recommended, is_favorite, category, display_order)
VALUES
  ('dark',              'Midnight Blue',        'visible',   true,  false, 'dark',     1),
  ('graphite',          'Graphite',             'visible',   false, false, 'dark',     2),
  ('beige',             'Gold Noir',            'visible',   false, false, 'premium',  3),
  ('rose',              'Violet Royal',         'visible',   false, false, 'premium',  4),
  ('emerald',           'Emeraude',             'visible',   false, false, 'premium',  5),
  ('pink',              'Rose Neon',            'visible',   false, false, 'premium',  6),
  ('red',               'Crimson',              'visible',   false, false, 'premium',  7),
  ('orange',            'Ember',                'visible',   false, false, 'premium',  8),
  ('yellow',            'Soleil Noir',          'visible',   false, false, 'premium',  9),
  ('light',             'Clair Azur',           'visible',   true,  false, 'light',    10),
  ('luxury',            'Blanc Luxe',           'visible',   false, false, 'light',    11),
  ('highlevel_light',   'HighLevel Clair',      'visible',   false, false, 'business', 12),
  ('highlevel_dark',    'HighLevel Nuit',       'visible',   false, false, 'business', 13),
  ('highlevel_emerald', 'HighLevel Champagne',  'visible',   false, false, 'business', 14),
  ('glass',             'Glass',                'visible',   false, false, 'glass',    15)
ON CONFLICT (theme_key) DO NOTHING;
