/*
  # Tighten RLS on operations tables for company-level isolation

  1. Affected Tables
    - `registrations` — lead registration requests
    - `statuts` — lead status definitions per company
    - `rdv_proposals` — appointment proposals
    - `import_history` — lead import history
    - `sidebar_order` — sidebar ordering preferences
    - `doc_tab_labels` — documentation tab labels

  2. Access Rules
    - Super Admin: full access to all companies
    - Admin: access only to own company data
    - Vendor: read access to statuts and rdv_proposals in own company; can insert/update rdv_proposals
    - Client: read access to statuts and rdv_proposals in their company; can insert/update rdv_proposals

  3. Security
    - Policies use get_my_role() and get_my_company_id() helpers
*/

-- ═══════════════════════════════════════
-- registrations
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated can view registrations" ON registrations;
DROP POLICY IF EXISTS "Authenticated can update registrations" ON registrations;
DROP POLICY IF EXISTS "Authenticated can delete registrations" ON registrations;

CREATE POLICY "SA can view all registrations"
  ON registrations FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company registrations"
  ON registrations FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can update all registrations"
  ON registrations FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company registrations"
  ON registrations FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can delete registrations"
  ON registrations FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can delete own company registrations"
  ON registrations FOR DELETE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

-- ═══════════════════════════════════════
-- statuts
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated can view statuts" ON statuts;
DROP POLICY IF EXISTS "Authenticated can insert statuts" ON statuts;
DROP POLICY IF EXISTS "Authenticated can update statuts" ON statuts;
DROP POLICY IF EXISTS "Authenticated can delete statuts" ON statuts;

CREATE POLICY "SA can view all statuts"
  ON statuts FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company statuts"
  ON statuts FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can view own company statuts"
  ON statuts FOR SELECT TO authenticated
  USING (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "Client can view own company statuts"
  ON statuts FOR SELECT TO authenticated
  USING (get_my_role() = 'client' AND company_id IN (SELECT client_company_ids()));

CREATE POLICY "SA can insert statuts"
  ON statuts FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert own company statuts"
  ON statuts FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can update all statuts"
  ON statuts FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company statuts"
  ON statuts FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can delete statuts"
  ON statuts FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can delete own company statuts"
  ON statuts FOR DELETE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

-- ═══════════════════════════════════════
-- rdv_proposals
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated can view rdv proposals" ON rdv_proposals;
DROP POLICY IF EXISTS "Authenticated can insert rdv proposals" ON rdv_proposals;
DROP POLICY IF EXISTS "Authenticated can update rdv proposals" ON rdv_proposals;
DROP POLICY IF EXISTS "Authenticated can delete rdv proposals" ON rdv_proposals;

CREATE POLICY "SA can view all rdv proposals"
  ON rdv_proposals FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company rdv proposals"
  ON rdv_proposals FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can view own company rdv proposals"
  ON rdv_proposals FOR SELECT TO authenticated
  USING (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "Client can view own company rdv proposals"
  ON rdv_proposals FOR SELECT TO authenticated
  USING (get_my_role() = 'client' AND company_id IN (SELECT client_company_ids()));

CREATE POLICY "SA can insert rdv proposals"
  ON rdv_proposals FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert own company rdv proposals"
  ON rdv_proposals FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can insert own company rdv proposals"
  ON rdv_proposals FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "Client can insert own company rdv proposals"
  ON rdv_proposals FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'client' AND company_id IN (SELECT client_company_ids()));

CREATE POLICY "SA can update all rdv proposals"
  ON rdv_proposals FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company rdv proposals"
  ON rdv_proposals FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can update own company rdv proposals"
  ON rdv_proposals FOR UPDATE TO authenticated
  USING (get_my_role() = 'vendor' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "Client can update own company rdv proposals"
  ON rdv_proposals FOR UPDATE TO authenticated
  USING (get_my_role() = 'client' AND company_id IN (SELECT client_company_ids()))
  WITH CHECK (get_my_role() = 'client' AND company_id IN (SELECT client_company_ids()));

CREATE POLICY "SA can delete rdv proposals"
  ON rdv_proposals FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can delete own company rdv proposals"
  ON rdv_proposals FOR DELETE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

-- ═══════════════════════════════════════
-- import_history
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated can view import history" ON import_history;
DROP POLICY IF EXISTS "Authenticated can insert import history" ON import_history;
DROP POLICY IF EXISTS "Authenticated can update import history" ON import_history;
DROP POLICY IF EXISTS "Authenticated can delete import history" ON import_history;

CREATE POLICY "SA can view all import history"
  ON import_history FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company import history"
  ON import_history FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can insert import history"
  ON import_history FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert own company import history"
  ON import_history FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can update all import history"
  ON import_history FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company import history"
  ON import_history FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can delete import history"
  ON import_history FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can delete own company import history"
  ON import_history FOR DELETE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

-- ═══════════════════════════════════════
-- sidebar_order
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated can view sidebar order" ON sidebar_order;
DROP POLICY IF EXISTS "Authenticated can insert sidebar order" ON sidebar_order;
DROP POLICY IF EXISTS "Authenticated can update sidebar order" ON sidebar_order;
DROP POLICY IF EXISTS "Authenticated can delete sidebar order" ON sidebar_order;

CREATE POLICY "SA can view all sidebar order"
  ON sidebar_order FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company sidebar order"
  ON sidebar_order FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can view own company sidebar order"
  ON sidebar_order FOR SELECT TO authenticated
  USING (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "SA can insert sidebar order"
  ON sidebar_order FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert own company sidebar order"
  ON sidebar_order FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can insert own company sidebar order"
  ON sidebar_order FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "SA can update all sidebar order"
  ON sidebar_order FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company sidebar order"
  ON sidebar_order FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can update own company sidebar order"
  ON sidebar_order FOR UPDATE TO authenticated
  USING (get_my_role() = 'vendor' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "SA can delete sidebar order"
  ON sidebar_order FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can delete own company sidebar order"
  ON sidebar_order FOR DELETE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

-- ═══════════════════════════════════════
-- doc_tab_labels
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can read tab labels" ON doc_tab_labels;
DROP POLICY IF EXISTS "Authenticated users can insert tab labels" ON doc_tab_labels;
DROP POLICY IF EXISTS "Authenticated users can update tab labels" ON doc_tab_labels;
DROP POLICY IF EXISTS "Authenticated users can delete tab labels" ON doc_tab_labels;

CREATE POLICY "SA can view all doc tab labels"
  ON doc_tab_labels FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company doc tab labels"
  ON doc_tab_labels FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can insert doc tab labels"
  ON doc_tab_labels FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert own company doc tab labels"
  ON doc_tab_labels FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can update all doc tab labels"
  ON doc_tab_labels FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company doc tab labels"
  ON doc_tab_labels FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can delete doc tab labels"
  ON doc_tab_labels FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can delete own company doc tab labels"
  ON doc_tab_labels FOR DELETE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());
