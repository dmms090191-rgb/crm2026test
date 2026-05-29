/*
  # Tighten storage RLS for company-logos bucket

  1. Security Changes
    - Replace permissive storage policies with company-scoped ones
    - INSERT: users can only upload to their own company folder
    - UPDATE: users can only update files in their own company folder
    - DELETE: users can only delete files in their own company folder
    - SELECT (public read): unchanged — logos need to be publicly viewable
    - Super Admin can access all company folders

  2. Important Notes
    - File paths follow format: {company_id}/logo-{timestamp}.{ext}
    - Storage path folder (1st segment) must match user's company_id
    - Public SELECT is kept for logo display on public sites and sidebar
*/

-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete company logos" ON storage.objects;

-- INSERT: only into own company folder, or SA can insert anywhere
CREATE POLICY "Users can upload logos to own company folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (
      (storage.foldername(name))[1] = ((auth.jwt() -> 'app_metadata') ->> 'company_id')
      OR ((auth.jwt() -> 'app_metadata') ->> 'role') = 'super_admin'
    )
  );

-- UPDATE: only own company folder, or SA
CREATE POLICY "Users can update logos in own company folder"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (
      (storage.foldername(name))[1] = ((auth.jwt() -> 'app_metadata') ->> 'company_id')
      OR ((auth.jwt() -> 'app_metadata') ->> 'role') = 'super_admin'
    )
  )
  WITH CHECK (
    bucket_id = 'company-logos'
    AND (
      (storage.foldername(name))[1] = ((auth.jwt() -> 'app_metadata') ->> 'company_id')
      OR ((auth.jwt() -> 'app_metadata') ->> 'role') = 'super_admin'
    )
  );

-- DELETE: only own company folder, or SA
CREATE POLICY "Users can delete logos in own company folder"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND (
      (storage.foldername(name))[1] = ((auth.jwt() -> 'app_metadata') ->> 'company_id')
      OR ((auth.jwt() -> 'app_metadata') ->> 'role') = 'super_admin'
    )
  );
