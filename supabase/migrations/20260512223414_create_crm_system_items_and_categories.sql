/*
  # Create system items and categories tables

  Mirrors the ameliorations structure for a new "System" tab in Documentation CRM.

  1. New Tables
    - `crm_system_categories`
      - `id` (uuid, primary key)
      - `name` (text, not null) - category display name
      - `position` (integer, default 0) - ordering
      - `created_at` (timestamptz, default now())

    - `crm_system_items`
      - `id` (uuid, primary key)
      - `title` (text, not null) - title of the system item
      - `description` (text, default '') - detailed description
      - `status` (text, default 'todo') - current status (todo, in_progress, done)
      - `position` (integer, default 0) - ordering within category
      - `category_id` (uuid, nullable, FK to crm_system_categories with CASCADE delete)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on both tables
    - Authenticated users can select, insert, update, and delete
*/

-- Categories table
CREATE TABLE IF NOT EXISTS crm_system_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_system_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can select system categories' AND tablename = 'crm_system_categories') THEN
  CREATE POLICY "Authenticated users can select system categories"
    ON crm_system_categories
    FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert system categories' AND tablename = 'crm_system_categories') THEN
  CREATE POLICY "Authenticated users can insert system categories"
    ON crm_system_categories
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update system categories' AND tablename = 'crm_system_categories') THEN
  CREATE POLICY "Authenticated users can update system categories"
    ON crm_system_categories
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete system categories' AND tablename = 'crm_system_categories') THEN
  CREATE POLICY "Authenticated users can delete system categories"
    ON crm_system_categories
    FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

-- Items table
CREATE TABLE IF NOT EXISTS crm_system_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo',
  position integer NOT NULL DEFAULT 0,
  category_id uuid REFERENCES crm_system_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_system_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can select system items' AND tablename = 'crm_system_items') THEN
  CREATE POLICY "Authenticated users can select system items"
    ON crm_system_items
    FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert system items' AND tablename = 'crm_system_items') THEN
  CREATE POLICY "Authenticated users can insert system items"
    ON crm_system_items
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update system items' AND tablename = 'crm_system_items') THEN
  CREATE POLICY "Authenticated users can update system items"
    ON crm_system_items
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete system items' AND tablename = 'crm_system_items') THEN
  CREATE POLICY "Authenticated users can delete system items"
    ON crm_system_items
    FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;
