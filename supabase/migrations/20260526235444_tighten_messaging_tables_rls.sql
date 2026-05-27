/*
  # Tighten RLS on messaging tables for company-level isolation

  1. Affected Tables
    - `client_messages` — messages between admin/vendor and client
    - `vendor_admin_messages` — messages between vendor and admin
    - `vendor_comments` — admin comments on vendors
    - `conversations` — conversation threads

  2. Access Rules (per table)
    - Super Admin: full access to all companies
    - Admin: access only to own company data
    - Vendor: access only to own company data
    - Client: can view/insert messages in companies where they have an active lead

  3. Security
    - All policies use get_my_role() and get_my_company_id() helpers
    - No cross-company data leakage at the database level
*/

-- ═══════════════════════════════════════
-- client_messages
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated can view client messages" ON client_messages;
DROP POLICY IF EXISTS "Authenticated can insert client messages" ON client_messages;
DROP POLICY IF EXISTS "Authenticated can update client messages" ON client_messages;
DROP POLICY IF EXISTS "Authenticated can delete client messages" ON client_messages;

CREATE POLICY "SA can view all client messages"
  ON client_messages FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company client messages"
  ON client_messages FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can view own company client messages"
  ON client_messages FOR SELECT TO authenticated
  USING (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "Client can view own company client messages"
  ON client_messages FOR SELECT TO authenticated
  USING (get_my_role() = 'client' AND company_id IN (SELECT client_company_ids()));

CREATE POLICY "SA can insert client messages"
  ON client_messages FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert own company client messages"
  ON client_messages FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can insert own company client messages"
  ON client_messages FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "Client can insert own company client messages"
  ON client_messages FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'client' AND company_id IN (SELECT client_company_ids()));

CREATE POLICY "SA can update all client messages"
  ON client_messages FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company client messages"
  ON client_messages FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can update own company client messages"
  ON client_messages FOR UPDATE TO authenticated
  USING (get_my_role() = 'vendor' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "Client can update own company client messages"
  ON client_messages FOR UPDATE TO authenticated
  USING (get_my_role() = 'client' AND company_id IN (SELECT client_company_ids()))
  WITH CHECK (get_my_role() = 'client' AND company_id IN (SELECT client_company_ids()));

CREATE POLICY "SA can delete client messages"
  ON client_messages FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can delete own company client messages"
  ON client_messages FOR DELETE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

-- ═══════════════════════════════════════
-- vendor_admin_messages
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can view vendor admin messages" ON vendor_admin_messages;
DROP POLICY IF EXISTS "Authenticated users can insert vendor admin messages" ON vendor_admin_messages;
DROP POLICY IF EXISTS "Authenticated users can update vendor admin messages" ON vendor_admin_messages;

CREATE POLICY "SA can view all vendor admin messages"
  ON vendor_admin_messages FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company vendor admin messages"
  ON vendor_admin_messages FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can view own company vendor admin messages"
  ON vendor_admin_messages FOR SELECT TO authenticated
  USING (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "SA can insert vendor admin messages"
  ON vendor_admin_messages FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert own company vendor admin messages"
  ON vendor_admin_messages FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can insert own company vendor admin messages"
  ON vendor_admin_messages FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "SA can update all vendor admin messages"
  ON vendor_admin_messages FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company vendor admin messages"
  ON vendor_admin_messages FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can update own company vendor admin messages"
  ON vendor_admin_messages FOR UPDATE TO authenticated
  USING (get_my_role() = 'vendor' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'vendor' AND company_id = get_my_company_id());

-- ═══════════════════════════════════════
-- vendor_comments
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated can view vendor comments" ON vendor_comments;
DROP POLICY IF EXISTS "Authenticated can insert vendor comments" ON vendor_comments;
DROP POLICY IF EXISTS "Authenticated can update vendor comments" ON vendor_comments;
DROP POLICY IF EXISTS "Authenticated can delete vendor comments" ON vendor_comments;

CREATE POLICY "SA can view all vendor comments"
  ON vendor_comments FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company vendor comments"
  ON vendor_comments FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can insert vendor comments"
  ON vendor_comments FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert own company vendor comments"
  ON vendor_comments FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can update all vendor comments"
  ON vendor_comments FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company vendor comments"
  ON vendor_comments FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can delete vendor comments"
  ON vendor_comments FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can delete own company vendor comments"
  ON vendor_comments FOR DELETE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

-- ═══════════════════════════════════════
-- conversations
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can read conversations" ON conversations;

CREATE POLICY "SA can view all conversations"
  ON conversations FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company conversations"
  ON conversations FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "Vendor can view own company conversations"
  ON conversations FOR SELECT TO authenticated
  USING (get_my_role() = 'vendor' AND company_id = get_my_company_id());

CREATE POLICY "Client can view own company conversations"
  ON conversations FOR SELECT TO authenticated
  USING (get_my_role() = 'client' AND company_id IN (SELECT client_company_ids()));
