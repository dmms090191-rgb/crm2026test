
CREATE TABLE admin_logo_ra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  logo_url text,
  bg_mode text NOT NULL DEFAULT 'checker' CHECK (bg_mode IN ('checker', 'solid', 'gradient')),
  bg_color1 text NOT NULL DEFAULT '#ffffff',
  bg_color2 text NOT NULL DEFAULT '#000000',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

ALTER TABLE admin_logo_ra ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "sa_select_admin_logo_ra" ON admin_logo_ra FOR SELECT
  TO authenticated USING (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );
CREATE POLICY "sa_insert_admin_logo_ra" ON admin_logo_ra FOR INSERT
  TO authenticated WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );
CREATE POLICY "sa_update_admin_logo_ra" ON admin_logo_ra FOR UPDATE
  TO authenticated USING (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  ) WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );
CREATE POLICY "sa_delete_admin_logo_ra" ON admin_logo_ra FOR DELETE
  TO authenticated USING (
    (auth.jwt()->'app_metadata'->>'role') = 'super_admin'
  );

-- Admin: own company only
CREATE POLICY "admin_select_own_logo_ra" ON admin_logo_ra FOR SELECT
  TO authenticated USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  );
CREATE POLICY "admin_insert_own_logo_ra" ON admin_logo_ra FOR INSERT
  TO authenticated WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  );
CREATE POLICY "admin_update_own_logo_ra" ON admin_logo_ra FOR UPDATE
  TO authenticated USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  ) WITH CHECK (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  );
CREATE POLICY "admin_delete_own_logo_ra" ON admin_logo_ra FOR DELETE
  TO authenticated USING (
    (auth.jwt()->'app_metadata'->>'role') = 'admin'
    AND company_id::text = (auth.jwt()->'app_metadata'->>'company_id')
  );

-- Storage bucket for admin logo RA uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('admin-logo-ra', 'admin-logo-ra', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_upload_admin_logo_ra" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'admin-logo-ra');

CREATE POLICY "auth_update_admin_logo_ra" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'admin-logo-ra');

CREATE POLICY "auth_delete_admin_logo_ra" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'admin-logo-ra');

CREATE POLICY "public_read_admin_logo_ra" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'admin-logo-ra');
