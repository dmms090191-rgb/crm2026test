/*
  # Create audit_history table

  1. New Tables
    - `audit_history`
      - `id` (uuid, primary key, auto-generated)
      - `global_score` (integer, NOT NULL) - overall audit score at time of run
      - `total_checks` (integer, NOT NULL) - total number of checks performed
      - `ok_count` (integer, NOT NULL, default 0) - checks with OK status
      - `warning_count` (integer, NOT NULL, default 0) - checks with warning status
      - `error_count` (integer, NOT NULL, default 0) - checks with error status
      - `section_scores` (jsonb, NOT NULL) - per-section breakdown { sectionId: { score, ok, warn, err } }
      - `created_at` (timestamptz, default now()) - when the audit was run

  2. Security
    - Enable RLS on `audit_history` table
    - SELECT policy for authenticated users
    - INSERT policy for authenticated users
*/

CREATE TABLE IF NOT EXISTS audit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  global_score integer NOT NULL,
  total_checks integer NOT NULL,
  ok_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  section_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view audit history' AND tablename = 'audit_history') THEN
  CREATE POLICY "Authenticated users can view audit history"
    ON audit_history
    FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert audit history' AND tablename = 'audit_history') THEN
  CREATE POLICY "Authenticated users can insert audit history"
    ON audit_history
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;
