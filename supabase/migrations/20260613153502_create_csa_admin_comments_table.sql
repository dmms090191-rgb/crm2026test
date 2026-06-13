CREATE TABLE IF NOT EXISTS csa_admin_comments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE csa_admin_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csa_select_own_comments" ON csa_admin_comments
  FOR SELECT TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) IN ('company_super_admin', 'super_admin')
  );

CREATE POLICY "csa_insert_own_comments" ON csa_admin_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) IN ('company_super_admin', 'super_admin')
    AND auth.uid() = author_id
  );

CREATE POLICY "csa_delete_own_comments" ON csa_admin_comments
  FOR DELETE TO authenticated
  USING (
    (SELECT (auth.jwt() -> 'app_metadata' ->> 'role')) IN ('company_super_admin', 'super_admin')
    AND auth.uid() = author_id
  );
