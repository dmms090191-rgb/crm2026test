/*
  # Fix company_logos RLS policies to allow Super Admin bypass

  1. Security Changes
    - Add super_admin bypass to SELECT, INSERT, UPDATE, DELETE policies
    - Super Admin needs to manage logos when impersonating an admin
    - Without this bypass, the SA's JWT company_id (Talvex) doesn't match
      the impersonated admin's company_id, causing RLS rejection
    - Regular admins remain strictly scoped to their own company_id
    - Anon SELECT policy is unchanged

  2. Important Notes
    - The storage bucket RLS already had the SA bypass
    - This brings the table-level RLS in line with the storage policies
    - SA is identified by: auth.jwt() -> 'app_metadata' ->> 'role' = 'super_admin'
*/

-- SELECT: own company OR super_admin
DROP POLICY IF EXISTS "Users can view own company logos" ON public.company_logos;
CREATE POLICY "Users can view own company logos"
  ON public.company_logos
  FOR SELECT
  TO authenticated
  USING (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
    OR ((auth.jwt() -> 'app_metadata') ->> 'role') = 'super_admin'
  );

-- INSERT: own company OR super_admin
DROP POLICY IF EXISTS "Users can insert logos for own company" ON public.company_logos;
CREATE POLICY "Users can insert logos for own company"
  ON public.company_logos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
    OR ((auth.jwt() -> 'app_metadata') ->> 'role') = 'super_admin'
  );

-- UPDATE: own company OR super_admin
DROP POLICY IF EXISTS "Users can update logos for own company" ON public.company_logos;
CREATE POLICY "Users can update logos for own company"
  ON public.company_logos
  FOR UPDATE
  TO authenticated
  USING (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
    OR ((auth.jwt() -> 'app_metadata') ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
    OR ((auth.jwt() -> 'app_metadata') ->> 'role') = 'super_admin'
  );

-- DELETE: own company OR super_admin
DROP POLICY IF EXISTS "Users can delete logos for own company" ON public.company_logos;
CREATE POLICY "Users can delete logos for own company"
  ON public.company_logos
  FOR DELETE
  TO authenticated
  USING (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
    OR ((auth.jwt() -> 'app_metadata') ->> 'role') = 'super_admin'
  );
