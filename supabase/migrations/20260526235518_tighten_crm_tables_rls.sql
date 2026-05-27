/*
  # Tighten RLS on CRM tables for company-level isolation

  1. Affected Tables
    - `crm_documentation` — CRM documentation entries
    - `crm_notes` — CRM notes
    - `crm_tasks` — CRM tasks
    - `crm_custom_pages` — custom CRM pages
    - `crm_page_checklist_items` — checklist items for CRM pages

  2. Access Rules
    - Super Admin: full access to all companies
    - Admin: access only to own company data
    - Vendor/Client: no direct access to CRM config tables (admin-only features)

  3. Security
    - Policies use get_my_role() and get_my_company_id() helpers
    - CRM config tables are restricted to admin and super admin only
*/

-- ═══════════════════════════════════════
-- crm_documentation
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated can view crm documentation" ON crm_documentation;
DROP POLICY IF EXISTS "Authenticated can insert crm documentation" ON crm_documentation;
DROP POLICY IF EXISTS "Authenticated can update crm documentation" ON crm_documentation;

CREATE POLICY "SA can view all crm documentation"
  ON crm_documentation FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company crm documentation"
  ON crm_documentation FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can insert crm documentation"
  ON crm_documentation FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert own company crm documentation"
  ON crm_documentation FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can update all crm documentation"
  ON crm_documentation FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company crm documentation"
  ON crm_documentation FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

-- ═══════════════════════════════════════
-- crm_notes
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated can view crm notes" ON crm_notes;
DROP POLICY IF EXISTS "Authenticated can insert crm notes" ON crm_notes;
DROP POLICY IF EXISTS "Authenticated can update crm notes" ON crm_notes;
DROP POLICY IF EXISTS "Authenticated can delete crm notes" ON crm_notes;

CREATE POLICY "SA can view all crm notes"
  ON crm_notes FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company crm notes"
  ON crm_notes FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can insert crm notes"
  ON crm_notes FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert own company crm notes"
  ON crm_notes FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can update all crm notes"
  ON crm_notes FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company crm notes"
  ON crm_notes FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can delete crm notes"
  ON crm_notes FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can delete own company crm notes"
  ON crm_notes FOR DELETE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

-- ═══════════════════════════════════════
-- crm_tasks
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Authenticated users can create tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON crm_tasks;
DROP POLICY IF EXISTS "Authenticated users can delete tasks" ON crm_tasks;

CREATE POLICY "SA can view all crm tasks"
  ON crm_tasks FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company crm tasks"
  ON crm_tasks FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can insert crm tasks"
  ON crm_tasks FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert own company crm tasks"
  ON crm_tasks FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can update all crm tasks"
  ON crm_tasks FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company crm tasks"
  ON crm_tasks FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can delete crm tasks"
  ON crm_tasks FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can delete own company crm tasks"
  ON crm_tasks FOR DELETE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

-- ═══════════════════════════════════════
-- crm_custom_pages
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can view custom pages" ON crm_custom_pages;
DROP POLICY IF EXISTS "Authenticated users can insert custom pages" ON crm_custom_pages;
DROP POLICY IF EXISTS "Authenticated users can update custom pages" ON crm_custom_pages;
DROP POLICY IF EXISTS "Authenticated users can delete custom pages" ON crm_custom_pages;

CREATE POLICY "SA can view all custom pages"
  ON crm_custom_pages FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company custom pages"
  ON crm_custom_pages FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can insert custom pages"
  ON crm_custom_pages FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert own company custom pages"
  ON crm_custom_pages FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can update all custom pages"
  ON crm_custom_pages FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company custom pages"
  ON crm_custom_pages FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can delete custom pages"
  ON crm_custom_pages FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can delete own company custom pages"
  ON crm_custom_pages FOR DELETE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

-- ═══════════════════════════════════════
-- crm_page_checklist_items
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated can view checklist items" ON crm_page_checklist_items;
DROP POLICY IF EXISTS "Authenticated can insert checklist items" ON crm_page_checklist_items;
DROP POLICY IF EXISTS "Authenticated can update checklist items" ON crm_page_checklist_items;
DROP POLICY IF EXISTS "Authenticated can delete checklist items" ON crm_page_checklist_items;

CREATE POLICY "SA can view all checklist items"
  ON crm_page_checklist_items FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view own company checklist items"
  ON crm_page_checklist_items FOR SELECT TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can insert checklist items"
  ON crm_page_checklist_items FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert own company checklist items"
  ON crm_page_checklist_items FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can update all checklist items"
  ON crm_page_checklist_items FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can update own company checklist items"
  ON crm_page_checklist_items FOR UPDATE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id())
  WITH CHECK (get_my_role() = 'admin' AND company_id = get_my_company_id());

CREATE POLICY "SA can delete checklist items"
  ON crm_page_checklist_items FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can delete own company checklist items"
  ON crm_page_checklist_items FOR DELETE TO authenticated
  USING (get_my_role() = 'admin' AND company_id = get_my_company_id());
