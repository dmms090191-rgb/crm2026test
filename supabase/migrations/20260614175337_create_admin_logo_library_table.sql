
CREATE TABLE admin_logo_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  file_path text NOT NULL,
  bg_mode text NOT NULL DEFAULT 'checker' CHECK (bg_mode IN ('checker', 'solid', 'gradient')),
  bg_color1 text NOT NULL DEFAULT '#ffffff',
  bg_color2 text NOT NULL DEFAULT '#000000',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_logo_library ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "sa_select_logo_library" ON admin_logo_library FOR SELECT
  TO authenticated USING (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );
CREATE POLICY "sa_insert_logo_library" ON admin_logo_library FOR INSERT
  TO authenticated WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );
CREATE POLICY "sa_update_logo_library" ON admin_logo_library FOR UPDATE
  TO authenticated USING (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  ) WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );
CREATE POLICY "sa_delete_logo_library" ON admin_logo_library FOR DELETE
  TO authenticated USING (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );

-- Admin: own company only
CREATE POLICY "admin_select_own_logo_library" ON admin_logo_library FOR SELECT
  TO authenticated USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  );
CREATE POLICY "admin_insert_own_logo_library" ON admin_logo_library FOR INSERT
  TO authenticated WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  );
CREATE POLICY "admin_update_own_logo_library" ON admin_logo_library FOR UPDATE
  TO authenticated USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  ) WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  );
CREATE POLICY "admin_delete_own_logo_library" ON admin_logo_library FOR DELETE
  TO authenticated USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  );

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-logo-library', 'admin-logo-library', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_upload_logo_library" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'admin-logo-library');

CREATE POLICY "auth_update_logo_library" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'admin-logo-library');

CREATE POLICY "auth_delete_logo_library" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'admin-logo-library');

CREATE POLICY "public_read_logo_library" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'admin-logo-library');
