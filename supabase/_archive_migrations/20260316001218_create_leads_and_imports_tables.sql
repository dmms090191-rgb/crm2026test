/*
  # Create leads and import_history tables

  ## Purpose
  Stores imported leads from CSV files and tracks the history of each import operation.
  Leads are sent to the CRM view after validation.

  ## New Tables

  ### `leads`
  - `id` (uuid, primary key)
  - `import_id` (uuid, FK to import_history) - which import batch this lead came from
  - `data` (jsonb) - flexible storage for all CSV columns (keys = column names, values = cell values)
  - `imported_at` (timestamptz) - when the lead was created

  ### `import_history`
  - `id` (uuid, primary key)
  - `file_name` (text) - original CSV filename
  - `lead_count` (integer) - number of leads in this import
  - `columns` (jsonb) - array of column names detected from CSV header
  - `imported_at` (timestamptz) - when the import was validated

  ## Security
  - RLS enabled on both tables
  - Only authenticated users (admins) can read, insert, update, delete
*/

CREATE TABLE IF NOT EXISTS import_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL DEFAULT '',
  lead_count integer NOT NULL DEFAULT 0,
  columns jsonb NOT NULL DEFAULT '[]',
  imported_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can select import_history"
  ON import_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Auth can insert import_history"
  ON import_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Auth can update import_history"
  ON import_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Auth can delete import_history"
  ON import_history FOR DELETE
  TO authenticated
  USING (true);


CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid REFERENCES import_history(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}',
  imported_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can select leads"
  ON leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Auth can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Auth can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Auth can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (true);
