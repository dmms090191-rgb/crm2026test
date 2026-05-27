/*
  # Tighten company_home_pages authenticated SELECT policy

  1. Changes
    - Drop the old "Authenticated users can view company home pages" policy
      that allowed any authenticated user to see all pages
    - Replace with role-specific policies

  2. Access Rules
    - Super Admin: can view all company home pages
    - Admin: can view own company's page
    - Vendor: can view own company's page
    - Client: can view pages of companies where they have an active lead
    - Note: Anon policies for public site viewing remain unchanged

  3. Preserved Policies (not touched)
    - "Anon can view active template pages" — for public site rendering
    - "Public can view active pages by slug" — for public slug-based access
    - All INSERT/UPDATE/DELETE policies — already properly restricted
*/

DROP POLICY IF EXISTS "Authenticated users can view company home pages" ON company_home_pages;

CREATE POLICY "SA can view all company home pages"
  ON company_home_pages FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company home page"
  ON company_home_pages FOR SELECT TO authenticated
  USING (
    get_my_role() = 'admin'
    AND (company_id = get_my_company_id() OR company_id IS NULL)
  );

CREATE POLICY "Vendor can view own company home page"
  ON company_home_pages FOR SELECT TO authenticated
  USING (
    get_my_role() = 'vendor'
    AND company_id = get_my_company_id()
  );

CREATE POLICY "Client can view own company home page"
  ON company_home_pages FOR SELECT TO authenticated
  USING (
    get_my_role() = 'client'
    AND company_id IN (SELECT client_company_ids())
  );
