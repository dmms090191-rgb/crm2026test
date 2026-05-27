/*
  # Restrict all sa_* tables to super_admin role only

  1. Affected Tables
    - `sa_admin_order` — super admin ordering of admins
    - `sa_ai_apis` — AI API keys and configuration
    - `sa_argumentaires` — super admin sales arguments
    - `sa_company_prospects` — super admin prospect companies
    - `sa_crm_societe_comments` — super admin comments on prospects
    - `sa_statuts` — super admin status definitions

  2. Changes
    - Drop all old "Authenticated users can ..." policies (were open to ALL users)
    - Replace with super_admin-only policies using get_my_role()

  3. Security
    - Only users with role = 'super_admin' can read or write these tables
    - Admins, vendors, and clients cannot access any of this data
*/

-- ═══════════════════════════════════════
-- sa_admin_order
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can view admin order" ON sa_admin_order;
DROP POLICY IF EXISTS "Authenticated users can insert admin order" ON sa_admin_order;
DROP POLICY IF EXISTS "Authenticated users can update admin order" ON sa_admin_order;
DROP POLICY IF EXISTS "Authenticated users can delete admin order" ON sa_admin_order;

CREATE POLICY "SA can view admin order"
  ON sa_admin_order FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "SA can insert admin order"
  ON sa_admin_order FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "SA can update admin order"
  ON sa_admin_order FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "SA can delete admin order"
  ON sa_admin_order FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

-- ═══════════════════════════════════════
-- sa_ai_apis
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can view ai apis" ON sa_ai_apis;
DROP POLICY IF EXISTS "Authenticated users can insert ai apis" ON sa_ai_apis;
DROP POLICY IF EXISTS "Authenticated users can update ai apis" ON sa_ai_apis;
DROP POLICY IF EXISTS "Authenticated users can delete ai apis" ON sa_ai_apis;

CREATE POLICY "SA can view ai apis"
  ON sa_ai_apis FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "SA can insert ai apis"
  ON sa_ai_apis FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "SA can update ai apis"
  ON sa_ai_apis FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "SA can delete ai apis"
  ON sa_ai_apis FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

-- ═══════════════════════════════════════
-- sa_argumentaires
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can view argumentaires" ON sa_argumentaires;
DROP POLICY IF EXISTS "Authenticated users can insert argumentaires" ON sa_argumentaires;
DROP POLICY IF EXISTS "Authenticated users can update argumentaires" ON sa_argumentaires;
DROP POLICY IF EXISTS "Authenticated users can delete argumentaires" ON sa_argumentaires;

CREATE POLICY "SA can view argumentaires"
  ON sa_argumentaires FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "SA can insert argumentaires"
  ON sa_argumentaires FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "SA can update argumentaires"
  ON sa_argumentaires FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "SA can delete argumentaires"
  ON sa_argumentaires FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

-- ═══════════════════════════════════════
-- sa_company_prospects
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can view prospects" ON sa_company_prospects;
DROP POLICY IF EXISTS "Authenticated users can insert prospects" ON sa_company_prospects;
DROP POLICY IF EXISTS "Authenticated users can update prospects" ON sa_company_prospects;
DROP POLICY IF EXISTS "Authenticated users can delete prospects" ON sa_company_prospects;

CREATE POLICY "SA can view prospects"
  ON sa_company_prospects FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "SA can insert prospects"
  ON sa_company_prospects FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "SA can update prospects"
  ON sa_company_prospects FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "SA can delete prospects"
  ON sa_company_prospects FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

-- ═══════════════════════════════════════
-- sa_crm_societe_comments
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can view societe comments" ON sa_crm_societe_comments;
DROP POLICY IF EXISTS "Authenticated users can insert societe comments" ON sa_crm_societe_comments;
DROP POLICY IF EXISTS "Authenticated users can delete societe comments" ON sa_crm_societe_comments;

CREATE POLICY "SA can view societe comments"
  ON sa_crm_societe_comments FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "SA can insert societe comments"
  ON sa_crm_societe_comments FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "SA can update societe comments"
  ON sa_crm_societe_comments FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "SA can delete societe comments"
  ON sa_crm_societe_comments FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

-- ═══════════════════════════════════════
-- sa_statuts
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can view sa_statuts" ON sa_statuts;
DROP POLICY IF EXISTS "Authenticated users can insert sa_statuts" ON sa_statuts;
DROP POLICY IF EXISTS "Authenticated users can update sa_statuts" ON sa_statuts;
DROP POLICY IF EXISTS "Authenticated users can delete sa_statuts" ON sa_statuts;

CREATE POLICY "SA can view sa statuts"
  ON sa_statuts FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "SA can insert sa statuts"
  ON sa_statuts FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "SA can update sa statuts"
  ON sa_statuts FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "SA can delete sa statuts"
  ON sa_statuts FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');
