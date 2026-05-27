/*
  # Create custom statuses table for System tracking

  1. New Tables
    - `crm_system_statuses`
      - `id` (uuid, primary key)
      - `name` (text, not null) - display name of the status
      - `color` (text, not null, default '#3b82f6') - hex color for visual display
      - `icon` (text, not null, default 'circle') - lucide icon name
      - `position` (integer, default 0) - ordering
      - `is_active` (boolean, default true) - whether the status is usable
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on table
    - Authenticated users can select, insert, update, delete

  3. Seed data
    - Fonctionnel (green)
    - A faire (orange)
    - Bug (red)
    - A ameliorer (blue)
    - En cours (yellow)
    - A tester (cyan)
    - Urgent (red/dark)

  4. Modified Tables
    - `crm_system_items`
      - Added `status_id` (uuid, nullable, FK to crm_system_statuses)
*/

-- Statuses table
CREATE TABLE IF NOT EXISTS crm_system_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  icon text NOT NULL DEFAULT 'circle',
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_system_statuses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can select system statuses' AND tablename = 'crm_system_statuses') THEN
  CREATE POLICY "Authenticated users can select system statuses"
    ON crm_system_statuses
    FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert system statuses' AND tablename = 'crm_system_statuses') THEN
  CREATE POLICY "Authenticated users can insert system statuses"
    ON crm_system_statuses
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update system statuses' AND tablename = 'crm_system_statuses') THEN
  CREATE POLICY "Authenticated users can update system statuses"
    ON crm_system_statuses
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete system statuses' AND tablename = 'crm_system_statuses') THEN
  CREATE POLICY "Authenticated users can delete system statuses"
    ON crm_system_statuses
    FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

-- Add status_id to items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'crm_system_items' AND column_name = 'status_id'
  ) THEN
    ALTER TABLE crm_system_items ADD COLUMN status_id uuid REFERENCES crm_system_statuses(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Seed default statuses
INSERT INTO crm_system_statuses (name, color, icon, position, is_active) VALUES
  ('Fonctionnel', '#22c55e', 'check-circle', 0, true),
  ('A faire', '#f97316', 'alert-circle', 1, true),
  ('Bug', '#ef4444', 'x-circle', 2, true),
  ('A ameliorer', '#3b82f6', 'arrow-up-circle', 3, true),
  ('En cours', '#eab308', 'loader', 4, true),
  ('A tester', '#06b6d4', 'flask-conical', 5, true),
  ('Urgent', '#dc2626', 'flame', 6, true)
ON CONFLICT DO NOTHING;
