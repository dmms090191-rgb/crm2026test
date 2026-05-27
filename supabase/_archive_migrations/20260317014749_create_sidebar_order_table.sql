/*
  # Create sidebar_order table

  ## Purpose
  Persists the user-defined ordering of Documentation sections and CRM Pages
  in the Documentation CRM sidebar.

  ## New Tables
  - `sidebar_order`
    - `group_id` (text, primary key together with `position`) — either "docs" or "pages"
    - `item_key` (text) — tab id (docs) or page label (pages)
    - `position` (integer) — 0-based sort order within the group

  ## Security
  - RLS enabled
  - Authenticated users can read and write (shared config table, no per-user ownership needed)
*/

CREATE TABLE IF NOT EXISTS sidebar_order (
  group_id text NOT NULL,
  item_key text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, item_key)
);

ALTER TABLE sidebar_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sidebar order"
  ON sidebar_order FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sidebar order"
  ON sidebar_order FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sidebar order"
  ON sidebar_order FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sidebar order"
  ON sidebar_order FOR DELETE
  TO authenticated
  USING (true);
