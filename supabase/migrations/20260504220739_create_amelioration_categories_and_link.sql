/*
  # Create amelioration categories and link to ameliorations

  1. New Tables
    - `crm_amelioration_categories`
      - `id` (uuid, primary key)
      - `name` (text, not null) - category display name
      - `position` (integer, default 0) - ordering
      - `created_at` (timestamptz, default now())

  2. Modified Tables
    - `crm_ameliorations`
      - Added `category_id` (uuid, nullable, FK to crm_amelioration_categories with CASCADE delete)

  3. Security
    - Enable RLS on `crm_amelioration_categories`
    - Policy for authenticated users to perform all operations
*/

CREATE TABLE IF NOT EXISTS crm_amelioration_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_amelioration_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can select categories' AND tablename = 'crm_amelioration_categories') THEN
  CREATE POLICY "Authenticated users can select categories"
    ON crm_amelioration_categories
    FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert categories' AND tablename = 'crm_amelioration_categories') THEN
  CREATE POLICY "Authenticated users can insert categories"
    ON crm_amelioration_categories
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update categories' AND tablename = 'crm_amelioration_categories') THEN
  CREATE POLICY "Authenticated users can update categories"
    ON crm_amelioration_categories
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete categories' AND tablename = 'crm_amelioration_categories') THEN
  CREATE POLICY "Authenticated users can delete categories"
    ON crm_amelioration_categories
    FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_ameliorations' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE crm_ameliorations
      ADD COLUMN category_id uuid REFERENCES crm_amelioration_categories(id) ON DELETE CASCADE;
  END IF;
END $$;
