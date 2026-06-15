-- Table to store which sidebar tabs are hidden per panel role, managed by Rois Admin
CREATE TABLE IF NOT EXISTS panel_hidden_tabs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  panel_role text NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  hidden_tabs jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (panel_role, company_id)
);

-- Also allow rows with NULL company_id (global panel config)
CREATE UNIQUE INDEX panel_hidden_tabs_role_null_company
  ON panel_hidden_tabs (panel_role) WHERE company_id IS NULL;

ALTER TABLE panel_hidden_tabs ENABLE ROW LEVEL SECURITY;

-- Only super_admin (Rois Admin) can read/write
CREATE POLICY "select_panel_hidden_tabs" ON panel_hidden_tabs FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_panel_hidden_tabs" ON panel_hidden_tabs FOR INSERT
  TO authenticated WITH CHECK (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  );
CREATE POLICY "update_panel_hidden_tabs" ON panel_hidden_tabs FOR UPDATE
  TO authenticated USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  ) WITH CHECK (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  );
CREATE POLICY "delete_panel_hidden_tabs" ON panel_hidden_tabs FOR DELETE
  TO authenticated USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
  );
