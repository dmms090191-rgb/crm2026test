CREATE TABLE IF NOT EXISTS page_label_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_key text NOT NULL,
  tab_key text NOT NULL,
  company_id uuid,
  target_user_id uuid,
  labels jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(panel_key, tab_key, company_id, target_user_id)
);

ALTER TABLE page_label_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_page_label_overrides" ON page_label_overrides FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_page_label_overrides" ON page_label_overrides FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "update_page_label_overrides" ON page_label_overrides FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_page_label_overrides" ON page_label_overrides FOR DELETE
  TO authenticated USING (true);
