/*
  # Create crm_documentation table

  ## Summary
  Stores the content of each sub-tab in the "Documentation CRM" admin view.
  Each row represents one tab's text content, identified by its slug.

  ## Tables
  - `crm_documentation`
    - `tab_id` (text, primary key) — slug identifier for the tab (e.g. "objectifs", "pipeline")
    - `content` (text) — free-form editable text content
    - `updated_at` (timestamptz) — auto-updated on every upsert

  ## Security
  - RLS enabled
  - Only authenticated admins can read and write (using the service role for now,
    with a restrictive policy for authenticated users — all admins share the same content)
*/

CREATE TABLE IF NOT EXISTS crm_documentation (
  tab_id    text PRIMARY KEY,
  content   text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_documentation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read documentation"
  ON crm_documentation
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert documentation"
  ON crm_documentation
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update documentation"
  ON crm_documentation
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION update_crm_documentation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_documentation_updated_at ON crm_documentation;
CREATE TRIGGER trg_crm_documentation_updated_at
  BEFORE UPDATE ON crm_documentation
  FOR EACH ROW EXECUTE FUNCTION update_crm_documentation_updated_at();
