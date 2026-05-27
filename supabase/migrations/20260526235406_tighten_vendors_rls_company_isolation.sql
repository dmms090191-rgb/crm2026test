/*
  # Tighten vendors RLS to enforce company-level isolation

  1. Changes
    - Drop all 4 old permissive policies on `vendors` (SELECT, INSERT, UPDATE, DELETE)
    - Replace with role-specific policies that check company_id

  2. Access Rules
    - Super Admin: full access to all vendors across all companies
    - Admin: access only to vendors belonging to their own company
    - Vendor: can SELECT vendors in own company, can UPDATE own record only
    - Client: can SELECT vendors in their company (to see their assigned vendor/conseiller)

  3. Security
    - All policies use JWT app_metadata for role and company_id checks
    - Vendors cannot modify other vendors' records
    - Only Admin and SA can insert/delete vendors
*/

-- Drop old permissive policies
DROP POLICY IF EXISTS "Authenticated can view vendors" ON vendors;
DROP POLICY IF EXISTS "Authenticated can insert vendors" ON vendors;
DROP POLICY IF EXISTS "Authenticated can update vendors" ON vendors;
DROP POLICY IF EXISTS "Authenticated can delete vendors" ON vendors;

-- SELECT policies
CREATE POLICY "SA can view all vendors"
  ON vendors FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company vendors"
  ON vendors FOR SELECT TO authenticated
  USING (
    get_my_role() = 'admin'
    AND company_id = get_my_company_id()
  );

CREATE POLICY "Vendor can view own company vendors"
  ON vendors FOR SELECT TO authenticated
  USING (
    get_my_role() = 'vendor'
    AND company_id = get_my_company_id()
  );

CREATE POLICY "Client can view own company vendors"
  ON vendors FOR SELECT TO authenticated
  USING (
    get_my_role() = 'client'
    AND company_id IN (SELECT client_company_ids())
  );

-- INSERT policies (only Admin and SA)
CREATE POLICY "SA can insert vendors"
  ON vendors FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert vendors in own company"
  ON vendors FOR INSERT TO authenticated
  WITH CHECK (
    get_my_role() = 'admin'
    AND company_id = get_my_company_id()
  );

-- UPDATE policies
CREATE POLICY "SA can update all vendors"
  ON vendors FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company vendors"
  ON vendors FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'admin'
    AND company_id = get_my_company_id()
  )
  WITH CHECK (
    get_my_role() = 'admin'
    AND company_id = get_my_company_id()
  );

CREATE POLICY "Vendor can update own record"
  ON vendors FOR UPDATE TO authenticated
  USING (
    get_my_role() = 'vendor'
    AND auth_user_id = auth.uid()
  )
  WITH CHECK (
    get_my_role() = 'vendor'
    AND auth_user_id = auth.uid()
  );

-- DELETE policies (only Admin and SA)
CREATE POLICY "SA can delete all vendors"
  ON vendors FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can delete own company vendors"
  ON vendors FOR DELETE TO authenticated
  USING (
    get_my_role() = 'admin'
    AND company_id = get_my_company_id()
  );
