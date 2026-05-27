/*
  # Restrict CRM internal tables and lock down legacy empty tables

  1. CRM internal tables (used by admins but lacking company_id)
    These tables are shared admin tools. We restrict them to admin + super_admin roles
    (excluding vendors and clients who should never access internal CRM config).
    Tables: audit_history, content_blocks, content_block_infos, content_block_tasks,
    crm_ameliorations, crm_amelioration_categories, crm_context_cards,
    crm_discovered_tables, crm_ideas, crm_system_categories,
    crm_system_items, crm_system_statuses

  2. Legacy empty tables (messages, registration_requests)
    These tables have 0 rows and overly permissive policies.
    Lock them down to super_admin only until their purpose is clarified.

  3. Security
    - Vendors and clients can no longer access CRM internal tables
    - Legacy tables are locked to prevent misuse
    
  Note: A future migration should add company_id to these CRM internal tables
  for proper per-company isolation between admins.
*/

-- ═══════════════════════════════════════
-- audit_history (admin + SA only)
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can view audit history" ON audit_history;
DROP POLICY IF EXISTS "Authenticated users can insert audit history" ON audit_history;

CREATE POLICY "SA can view all audit history"
  ON audit_history FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "Admin can view audit history"
  ON audit_history FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');

CREATE POLICY "SA can insert audit history"
  ON audit_history FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "Admin can insert audit history"
  ON audit_history FOR INSERT TO authenticated
  WITH CHECK (get_my_role() = 'admin');

-- ═══════════════════════════════════════
-- content_blocks (admin + SA only)
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can view content blocks" ON content_blocks;
DROP POLICY IF EXISTS "Authenticated users can insert content blocks" ON content_blocks;
DROP POLICY IF EXISTS "Authenticated users can update content blocks" ON content_blocks;
DROP POLICY IF EXISTS "Authenticated users can delete content blocks" ON content_blocks;

CREATE POLICY "SA or Admin can view content blocks"
  ON content_blocks FOR SELECT TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can insert content blocks"
  ON content_blocks FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can update content blocks"
  ON content_blocks FOR UPDATE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can delete content blocks"
  ON content_blocks FOR DELETE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

-- ═══════════════════════════════════════
-- content_block_infos (admin + SA only)
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can view block infos" ON content_block_infos;
DROP POLICY IF EXISTS "Authenticated users can insert block infos" ON content_block_infos;
DROP POLICY IF EXISTS "Authenticated users can update block infos" ON content_block_infos;
DROP POLICY IF EXISTS "Authenticated users can delete block infos" ON content_block_infos;

CREATE POLICY "SA or Admin can view block infos"
  ON content_block_infos FOR SELECT TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can insert block infos"
  ON content_block_infos FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can update block infos"
  ON content_block_infos FOR UPDATE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can delete block infos"
  ON content_block_infos FOR DELETE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

-- ═══════════════════════════════════════
-- content_block_tasks (admin + SA only)
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can view block tasks" ON content_block_tasks;
DROP POLICY IF EXISTS "Authenticated users can insert block tasks" ON content_block_tasks;
DROP POLICY IF EXISTS "Authenticated users can update block tasks" ON content_block_tasks;
DROP POLICY IF EXISTS "Authenticated users can delete block tasks" ON content_block_tasks;

CREATE POLICY "SA or Admin can view block tasks"
  ON content_block_tasks FOR SELECT TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can insert block tasks"
  ON content_block_tasks FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can update block tasks"
  ON content_block_tasks FOR UPDATE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can delete block tasks"
  ON content_block_tasks FOR DELETE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

-- ═══════════════════════════════════════
-- crm_ameliorations (admin + SA only)
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated can read ameliorations" ON crm_ameliorations;
DROP POLICY IF EXISTS "Authenticated can insert ameliorations" ON crm_ameliorations;
DROP POLICY IF EXISTS "Authenticated can update ameliorations" ON crm_ameliorations;
DROP POLICY IF EXISTS "Authenticated can delete ameliorations" ON crm_ameliorations;

CREATE POLICY "SA or Admin can view ameliorations"
  ON crm_ameliorations FOR SELECT TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can insert ameliorations"
  ON crm_ameliorations FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can update ameliorations"
  ON crm_ameliorations FOR UPDATE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can delete ameliorations"
  ON crm_ameliorations FOR DELETE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

-- ═══════════════════════════════════════
-- crm_amelioration_categories (admin + SA only)
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can select categories" ON crm_amelioration_categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON crm_amelioration_categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON crm_amelioration_categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON crm_amelioration_categories;

CREATE POLICY "SA or Admin can view amelioration categories"
  ON crm_amelioration_categories FOR SELECT TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can insert amelioration categories"
  ON crm_amelioration_categories FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can update amelioration categories"
  ON crm_amelioration_categories FOR UPDATE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can delete amelioration categories"
  ON crm_amelioration_categories FOR DELETE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

-- ═══════════════════════════════════════
-- crm_context_cards (admin + SA only)
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated can view context cards" ON crm_context_cards;
DROP POLICY IF EXISTS "Authenticated can insert context cards" ON crm_context_cards;
DROP POLICY IF EXISTS "Authenticated can update context cards" ON crm_context_cards;
DROP POLICY IF EXISTS "Authenticated can delete context cards" ON crm_context_cards;

CREATE POLICY "SA or Admin can view context cards"
  ON crm_context_cards FOR SELECT TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can insert context cards"
  ON crm_context_cards FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can update context cards"
  ON crm_context_cards FOR UPDATE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can delete context cards"
  ON crm_context_cards FOR DELETE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

-- ═══════════════════════════════════════
-- crm_discovered_tables (admin + SA only)
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can read discovered tables" ON crm_discovered_tables;
DROP POLICY IF EXISTS "Authenticated users can insert discovered tables" ON crm_discovered_tables;
DROP POLICY IF EXISTS "Authenticated users can update discovered tables" ON crm_discovered_tables;
DROP POLICY IF EXISTS "Authenticated users can delete discovered tables" ON crm_discovered_tables;

CREATE POLICY "SA or Admin can view discovered tables"
  ON crm_discovered_tables FOR SELECT TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can insert discovered tables"
  ON crm_discovered_tables FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can update discovered tables"
  ON crm_discovered_tables FOR UPDATE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can delete discovered tables"
  ON crm_discovered_tables FOR DELETE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

-- ═══════════════════════════════════════
-- crm_ideas (admin + SA only)
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated can view crm ideas" ON crm_ideas;
DROP POLICY IF EXISTS "Authenticated can insert crm ideas" ON crm_ideas;
DROP POLICY IF EXISTS "Authenticated can update crm ideas" ON crm_ideas;
DROP POLICY IF EXISTS "Authenticated can delete crm ideas" ON crm_ideas;

CREATE POLICY "SA or Admin can view crm ideas"
  ON crm_ideas FOR SELECT TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can insert crm ideas"
  ON crm_ideas FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can update crm ideas"
  ON crm_ideas FOR UPDATE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can delete crm ideas"
  ON crm_ideas FOR DELETE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

-- ═══════════════════════════════════════
-- crm_system_categories (admin + SA only)
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can select system categories" ON crm_system_categories;
DROP POLICY IF EXISTS "Authenticated users can insert system categories" ON crm_system_categories;
DROP POLICY IF EXISTS "Authenticated users can update system categories" ON crm_system_categories;
DROP POLICY IF EXISTS "Authenticated users can delete system categories" ON crm_system_categories;

CREATE POLICY "SA or Admin can view system categories"
  ON crm_system_categories FOR SELECT TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can insert system categories"
  ON crm_system_categories FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can update system categories"
  ON crm_system_categories FOR UPDATE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can delete system categories"
  ON crm_system_categories FOR DELETE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

-- ═══════════════════════════════════════
-- crm_system_items (admin + SA only)
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can select system items" ON crm_system_items;
DROP POLICY IF EXISTS "Authenticated users can insert system items" ON crm_system_items;
DROP POLICY IF EXISTS "Authenticated users can update system items" ON crm_system_items;
DROP POLICY IF EXISTS "Authenticated users can delete system items" ON crm_system_items;

CREATE POLICY "SA or Admin can view system items"
  ON crm_system_items FOR SELECT TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can insert system items"
  ON crm_system_items FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can update system items"
  ON crm_system_items FOR UPDATE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can delete system items"
  ON crm_system_items FOR DELETE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

-- ═══════════════════════════════════════
-- crm_system_statuses (admin + SA only)
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can select system statuses" ON crm_system_statuses;
DROP POLICY IF EXISTS "Authenticated users can insert system statuses" ON crm_system_statuses;
DROP POLICY IF EXISTS "Authenticated users can update system statuses" ON crm_system_statuses;
DROP POLICY IF EXISTS "Authenticated users can delete system statuses" ON crm_system_statuses;

CREATE POLICY "SA or Admin can view system statuses"
  ON crm_system_statuses FOR SELECT TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can insert system statuses"
  ON crm_system_statuses FOR INSERT TO authenticated
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can update system statuses"
  ON crm_system_statuses FOR UPDATE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'))
  WITH CHECK (get_my_role() IN ('super_admin', 'admin'));

CREATE POLICY "SA or Admin can delete system statuses"
  ON crm_system_statuses FOR DELETE TO authenticated
  USING (get_my_role() IN ('super_admin', 'admin'));

-- ═══════════════════════════════════════
-- messages (legacy empty table - lock to SA only)
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Enable read access for all users" ON messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON messages;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON messages;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON messages;

CREATE POLICY "SA only can view messages"
  ON messages FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

-- ═══════════════════════════════════════
-- registration_requests (legacy empty table - lock mutations to SA only)
-- ═══════════════════════════════════════
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON registration_requests;
DROP POLICY IF EXISTS "Enable read access for all users" ON registration_requests;
DROP POLICY IF EXISTS "Enable update for all users" ON registration_requests;
DROP POLICY IF EXISTS "Enable delete for all users" ON registration_requests;

CREATE POLICY "Anon can insert registration requests"
  ON registration_requests FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "SA only can view registration requests"
  ON registration_requests FOR SELECT TO authenticated
  USING (get_my_role() = 'super_admin');

CREATE POLICY "SA only can update registration requests"
  ON registration_requests FOR UPDATE TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

CREATE POLICY "SA only can delete registration requests"
  ON registration_requests FOR DELETE TO authenticated
  USING (get_my_role() = 'super_admin');
