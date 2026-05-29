/*
  # Tighten ALL company_logos RLS policies to strict company_id matching

  1. Security Changes
    - Remove the super_admin bypass from SELECT, INSERT, UPDATE, DELETE
    - Now ALL roles (including super_admin) are scoped strictly by their own company_id
    - Super Admin has company_id = b0000000-0000-0000-0000-000000000001 (Talvex)
    - Each admin has their own company_id

  2. Important Notes
    - This ensures complete multi-tenant isolation for the Logo module
    - Super Admin sees only Talvex logos
    - Admin A sees only Admin A's company logos
    - Admin B sees only Admin B's company logos
    - Anon can still see active logos for public display
*/

-- SELECT: strict company_id match for all authenticated users
DROP POLICY IF EXISTS "Users can view own company logos" ON public.company_logos;
CREATE POLICY "Users can view own company logos"
  ON public.company_logos
  FOR SELECT
  TO authenticated
  USING (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
  );

-- INSERT: strict company_id match
DROP POLICY IF EXISTS "Admin can insert logos for own company" ON public.company_logos;
CREATE POLICY "Users can insert logos for own company"
  ON public.company_logos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
  );

-- UPDATE: strict company_id match
DROP POLICY IF EXISTS "Admin can update logos for own company" ON public.company_logos;
CREATE POLICY "Users can update logos for own company"
  ON public.company_logos
  FOR UPDATE
  TO authenticated
  USING (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
  )
  WITH CHECK (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
  );

-- DELETE: strict company_id match
DROP POLICY IF EXISTS "Admin can delete logos for own company" ON public.company_logos;
CREATE POLICY "Users can delete logos for own company"
  ON public.company_logos
  FOR DELETE
  TO authenticated
  USING (
    company_id = (((auth.jwt() -> 'app_metadata') ->> 'company_id')::uuid)
  );
