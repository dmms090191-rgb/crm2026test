/*
  # Create custom columns configuration tables

  1. New Tables
    - `custom_columns`
      - `id` (uuid, primary key) - unique column identifier
      - `table_key` (text, not null) - which table this column belongs to (sa_crm_societe, sa_liste_admins, admin_crm, vendor_leads)
      - `owner_id` (uuid, not null) - the user who created this column
      - `column_key` (text, not null) - unique technical key (e.g., custom_note_1716000000)
      - `label` (text, not null) - display name
      - `field_type` (text, not null, default 'text') - type: text, url, phone, email, date, badge
      - `visible_desktop` (boolean, default true)
      - `visible_detail` (boolean, default true)
      - `position` (integer, default 999)
      - `created_at` (timestamptz, default now())

    - `custom_column_values`
      - `id` (uuid, primary key)
      - `custom_column_id` (uuid, references custom_columns.id ON DELETE CASCADE)
      - `row_id` (text, not null) - the id of the row (prospect, admin, lead...)
      - `value` (text, default '')
      - Unique constraint on (custom_column_id, row_id)

  2. Security
    - RLS enabled on both tables
    - Authenticated users can manage their own custom columns
    - Authenticated users can manage values for columns they own

  3. Notes
    - Each table (CRM, Admins, etc.) has its own custom columns identified by table_key
    - Deleting a custom column cascades to delete all its values
*/

-- Custom columns definition table
CREATE TABLE IF NOT EXISTS custom_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_key text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id),
  column_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  visible_desktop boolean NOT NULL DEFAULT true,
  visible_detail boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 999,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE custom_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom columns"
  ON custom_columns FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own custom columns"
  ON custom_columns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own custom columns"
  ON custom_columns FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own custom columns"
  ON custom_columns FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Custom column values table
CREATE TABLE IF NOT EXISTS custom_column_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_column_id uuid NOT NULL REFERENCES custom_columns(id) ON DELETE CASCADE,
  row_id text NOT NULL,
  value text NOT NULL DEFAULT '',
  CONSTRAINT custom_column_values_unique UNIQUE (custom_column_id, row_id)
);

ALTER TABLE custom_column_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view values of own custom columns"
  ON custom_column_values FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_columns
      WHERE custom_columns.id = custom_column_values.custom_column_id
      AND custom_columns.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert values for own custom columns"
  ON custom_column_values FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_columns
      WHERE custom_columns.id = custom_column_values.custom_column_id
      AND custom_columns.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update values of own custom columns"
  ON custom_column_values FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_columns
      WHERE custom_columns.id = custom_column_values.custom_column_id
      AND custom_columns.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_columns
      WHERE custom_columns.id = custom_column_values.custom_column_id
      AND custom_columns.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete values of own custom columns"
  ON custom_column_values FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM custom_columns
      WHERE custom_columns.id = custom_column_values.custom_column_id
      AND custom_columns.owner_id = auth.uid()
    )
  );

-- Index for fast lookups by table_key and owner
CREATE INDEX IF NOT EXISTS idx_custom_columns_table_owner ON custom_columns(table_key, owner_id);

-- Index for fast lookups of values by column
CREATE INDEX IF NOT EXISTS idx_custom_column_values_column ON custom_column_values(custom_column_id);
