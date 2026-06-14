-- Table for saving Calquer Logo work sessions
CREATE TABLE logo_trace_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Sans titre',
  original_image_data text,
  svg_content text,
  current_svg_content text,
  editor_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE logo_trace_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_sessions" ON logo_trace_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_sessions" ON logo_trace_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_sessions" ON logo_trace_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_sessions" ON logo_trace_sessions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_logo_trace_sessions_user_id ON logo_trace_sessions(user_id);
