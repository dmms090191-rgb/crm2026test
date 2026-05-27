/*
  # Create doc_tab_labels table

  Stores custom display labels for documentation tabs.
  The tab_id remains immutable; only the displayed label changes.

  1. New Tables
    - `doc_tab_labels`
      - `tab_id` (text, primary key) - matches TABS_DEFAULT id values
      - `label` (text, not null) - custom display label set by admin
      - `updated_at` (timestamptz) - auto-updated on change

  2. Security
    - Enable RLS on `doc_tab_labels` table
    - Add policies for authenticated users to read, insert, update, and delete
*/

CREATE TABLE IF NOT EXISTS doc_tab_labels (
  tab_id text PRIMARY KEY,
  label text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE doc_tab_labels ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read tab labels' AND tablename = 'doc_tab_labels') THEN
  CREATE POLICY "Authenticated users can read tab labels"
    ON doc_tab_labels
    FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert tab labels' AND tablename = 'doc_tab_labels') THEN
  CREATE POLICY "Authenticated users can insert tab labels"
    ON doc_tab_labels
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update tab labels' AND tablename = 'doc_tab_labels') THEN
  CREATE POLICY "Authenticated users can update tab labels"
    ON doc_tab_labels
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete tab labels' AND tablename = 'doc_tab_labels') THEN
  CREATE POLICY "Authenticated users can delete tab labels"
    ON doc_tab_labels
    FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;
