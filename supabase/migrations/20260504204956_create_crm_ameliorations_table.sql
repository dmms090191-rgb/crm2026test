/*
  # Create crm_ameliorations table

  Tracks improvement items (ameliorations) for the CRM project.

  1. New Tables
    - `crm_ameliorations`
      - `id` (uuid, primary key)
      - `title` (text, not null) - title of the improvement
      - `description` (text, default '') - detailed description
      - `status` (text, default 'todo') - current status (todo, in_progress, done)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `crm_ameliorations`
    - Authenticated users can select, insert, update, and delete
*/

CREATE TABLE IF NOT EXISTS crm_ameliorations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'todo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_ameliorations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'crm_ameliorations' AND policyname = 'Authenticated can read ameliorations'
  ) THEN
    CREATE POLICY "Authenticated can read ameliorations"
      ON crm_ameliorations
      FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'crm_ameliorations' AND policyname = 'Authenticated can insert ameliorations'
  ) THEN
    CREATE POLICY "Authenticated can insert ameliorations"
      ON crm_ameliorations
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'crm_ameliorations' AND policyname = 'Authenticated can update ameliorations'
  ) THEN
    CREATE POLICY "Authenticated can update ameliorations"
      ON crm_ameliorations
      FOR UPDATE
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'crm_ameliorations' AND policyname = 'Authenticated can delete ameliorations'
  ) THEN
    CREATE POLICY "Authenticated can delete ameliorations"
      ON crm_ameliorations
      FOR DELETE
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
