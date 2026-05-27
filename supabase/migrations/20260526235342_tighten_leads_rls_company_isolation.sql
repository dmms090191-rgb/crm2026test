/*
  # Tighten leads RLS to enforce company-level isolation

  1. Changes
    - Drop all 4 old permissive policies on `leads` (SELECT, INSERT, UPDATE, DELETE)
    - Replace with role-specific policies that check company_id

  2. Access Rules
    - Super Admin: full access to all leads across all companies
    - Admin: access only to leads belonging to their own company
    - Vendor: access only to leads belonging to their own company
    - Client: can only SELECT leads matching their own email within their company

  3. Security
    - All policies use JWT app_metadata for role and company_id checks
    - Clients are restricted to their own email-matched leads only
    - No cross-company data leakage possible at the database level
*/

-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated can view leads" ON leads;
DROP POLICY IF EXISTS "Authenticated can insert leads" ON leads;
DROP POLICY IF EXISTS "Authenticated can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated can delete leads" ON leads;

-- SELECT policies
CREATE POLICY "SA can view all leads"
  ON leads FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company leads"
  ON leads FOR SELECT TO authenticated
  USING (
    get_my_role() = 'admin'
    AND company_id = get_my_company_id()
  );

CREATE POLICY "Vendor can view own company leads"
  ON leads FOR SELECT TO authenticated
  USING (
    get_my_role() = 'vendor'
    AND company_id = get_my_company_id()
  );

CREATE POLICY "Client can view own leads"
  ON leads FOR SELECT TO authenticated
  USING (
    get_my_role() = 'client'
    AND email = (auth.jwt() ->> 'email')
    AND company_id IN (SELECT client_company_ids())
  );

-- INSERT policies
CREATE POLICY "SA can insert leads"
  ON leads FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert leads in own company"
  ON leads FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'admin'
    AND company_id = get_my_company_id()
  );

CREATE POLICY "Vendor can insert leads in own company"
  ON leads FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'vendor'
    AND company_id = get_my_company_id()
  );

-- UPDATE policies
CREATE POLICY "SA can update all leads"
  ON leads FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company leads"
  ON leads FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'admin'
    AND company_id = get_my_company_id()
  )
  WITH CHECK (
    get_my_role() = 'admin'
    AND company_id = get_my_company_id()
  );

CREATE POLICY "Vendor can update own company leads"
  ON leads FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'vendor'
    AND company_id = get_my_company_id()
  )
  WITH CHECK (
    get_my_role() = 'vendor'
    AND company_id = get_my_company_id()
  );

-- DELETE policies
CREATE POLICY "SA can delete all leads"
  ON leads FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can delete own company leads"
  ON leads FOR DELETE TO authenticated
  USING (
    get_my_role() = 'admin'
    AND company_id = get_my_company_id()
  );
