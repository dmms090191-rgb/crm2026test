/*
  # Add company_id to business tables (multi-tenant preparation)

  1. Modified Tables (17 tables)
    - leads, vendors, import_history, statuts, registrations,
      rdv_proposals, client_messages, vendor_admin_messages,
      conversations, vendor_comments, crm_notes, crm_tasks,
      crm_documentation, doc_tab_labels, crm_custom_pages,
      crm_page_checklist_items, sidebar_order

  2. Changes per table
    - Add column: company_id (uuid, nullable, FK to companies)
    - Backfill all existing rows with David's company: a0000000-0000-0000-0000-000000000001
    - Add index on company_id for main business tables (Groupe A)

  3. Tables NOT modified
    - messages (child of conversations via FK, isolation will come through conversations.company_id)
    - companies (already exists from Step 1)
    - No auth tables modified
    - No existing RLS policies modified

  4. Important Notes
    - company_id is NULLABLE -- NOT NULL will be added in a future step once frontend passes company_id on inserts
    - No RLS changes on existing tables
    - No frontend changes
    - All existing queries continue to work unchanged
    - All of David's data remains fully accessible
    - Rollback: ALTER TABLE x DROP COLUMN IF EXISTS company_id (safe, removes column + indexes + FK)
*/

-- ============================================================
-- GROUPE A : Main business tables (with indexes)
-- ============================================================

-- 1. leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE leads SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);

-- 2. vendors
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE vendors SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendors_company_id ON vendors(company_id);

-- 3. import_history
ALTER TABLE import_history
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE import_history SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_import_history_company_id ON import_history(company_id);

-- 4. statuts
ALTER TABLE statuts
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE statuts SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_statuts_company_id ON statuts(company_id);

-- 5. registrations
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE registrations SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_registrations_company_id ON registrations(company_id);

-- 6. rdv_proposals
ALTER TABLE rdv_proposals
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE rdv_proposals SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_rdv_proposals_company_id ON rdv_proposals(company_id);

-- 7. client_messages
ALTER TABLE client_messages
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE client_messages SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_client_messages_company_id ON client_messages(company_id);

-- 8. vendor_admin_messages
ALTER TABLE vendor_admin_messages
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE vendor_admin_messages SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_admin_messages_company_id ON vendor_admin_messages(company_id);

-- 9. conversations
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE conversations SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_company_id ON conversations(company_id);

-- 10. vendor_comments
ALTER TABLE vendor_comments
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE vendor_comments SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- ============================================================
-- GROUPE B : Config/documentation tables (no indexes needed)
-- ============================================================

-- 11. crm_notes
ALTER TABLE crm_notes
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE crm_notes SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- 12. crm_tasks
ALTER TABLE crm_tasks
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE crm_tasks SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- 13. crm_documentation
ALTER TABLE crm_documentation
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE crm_documentation SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- 14. doc_tab_labels
ALTER TABLE doc_tab_labels
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE doc_tab_labels SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- 15. crm_custom_pages
ALTER TABLE crm_custom_pages
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE crm_custom_pages SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- 16. crm_page_checklist_items
ALTER TABLE crm_page_checklist_items
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE crm_page_checklist_items SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- 17. sidebar_order
ALTER TABLE sidebar_order
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
UPDATE sidebar_order SET company_id = 'a0000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
