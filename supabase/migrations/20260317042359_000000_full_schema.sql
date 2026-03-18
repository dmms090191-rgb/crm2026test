/*
  # Full CRM Schema — Consolidated Migration

  This single migration replaces all previous incremental migrations (archived in _archive/).
  It creates the complete database schema from scratch for a fresh Supabase project.

  ## Tables Created
  1.  `registrations`         — Incoming registration requests from new users (anon submit)
  2.  `registration_requests` — Admin-reviewed registration requests with pending/approved/rejected status
  3.  `import_history`        — Tracks CSV import operations (file, counts, mode)
  4.  `vendors`               — Salesperson accounts with Supabase Auth link
  5.  `leads`                 — Core lead/prospect data, linked to imports and vendors
  6.  `vendor_comments`       — Admin comments on vendor profiles
  7.  `vendor_admin_messages` — Messaging thread between vendors and admin
  8.  `rdv_proposals`         — Appointment proposals submitted by vendors
  9.  `client_messages`       — Messaging thread between clients and admin/vendors
  10. `statuts`               — Custom CRM lead statuses with colors
  11. `crm_documentation`     — Rich text documentation tabs (persisted content)
  12. `crm_notes`             — Internal dated notes
  13. `crm_ideas`             — CRM improvement ideas with kanban status
  14. `crm_context_cards`     — Context cards for AI/ChatGPT integration
  15. `sidebar_order`         — Persisted sidebar navigation order per group/item
  16. `conversations`         — Chat conversation threads linking a lead and a vendor
  17. `messages`              — Individual messages within a conversation thread

  ## Views Created
  - `leads_sans_statut_count` — Count of leads with missing or unrecognized status

  ## Functions Created
  - `cleanup_orphan_import_history()` — Trigger: removes import_history rows with no leads
  - `update_crm_documentation_updated_at()` — Trigger: keeps updated_at current on crm_documentation
  - `update_crm_context_cards_updated_at()` — Trigger: keeps updated_at current on crm_context_cards
  - `find_duplicate_leads(emails, telephones)` — Finds leads matching given contact info
  - `get_public_table_names()` — Returns list of all public base tables

  ## Triggers Created
  - `trg_cleanup_import_history` — AFTER DELETE on leads
  - `trg_crm_documentation_updated_at` — BEFORE UPDATE on crm_documentation
  - `trg_crm_context_cards_updated_at` — BEFORE UPDATE on crm_context_cards

  ## Security
  - RLS enabled on all 17 tables
  - Most tables: full access for authenticated users
  - `registrations`: anon INSERT, authenticated SELECT/UPDATE/DELETE
  - `registration_requests`: anon + authenticated INSERT, authenticated SELECT/UPDATE/DELETE
  - `vendor_admin_messages`: public read/write (chat with unauthenticated vendors)
  - `conversations` / `messages`: full access for authenticated users
  - `leads_sans_statut_count` view: SELECT granted to authenticated

  ## Realtime
  - `leads` table added to supabase_realtime publication

  ## Indexes
  - leads_email_unique (partial unique on non-empty email)
  - leads_telephone_unique (partial unique on non-empty telephone)
  - vendor_admin_messages_vendor_id_idx
  - idx_conversations_lead_id
  - idx_conversations_vendor_auth_id
  - idx_messages_conversation_id
  - idx_messages_created_at

  ## Constraints corrected vs previous version
  - import_history: new_leads_count, duplicates_count, errors_count, import_mode are all NOT NULL
  - leads: statut and actif are NOT NULL
  - vendor_admin_messages.vendor_id: nullable (FK with ON DELETE CASCADE, no NOT NULL)
  - rdv_proposals.vendor_id: nullable (FK with ON DELETE CASCADE, no NOT NULL)
*/


-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- FUNCTIONS (before tables that reference them via triggers)
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_orphan_import_history()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM import_history
  WHERE id = OLD.import_id
    AND NOT EXISTS (
      SELECT 1 FROM leads WHERE import_id = OLD.import_id
    );
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION update_crm_documentation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_crm_context_cards_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ============================================================
-- TABLE: registrations
-- ============================================================
CREATE TABLE IF NOT EXISTS registrations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    text        NOT NULL DEFAULT '',
  last_name     text        NOT NULL DEFAULT '',
  email         text        NOT NULL DEFAULT '',
  password      text        NOT NULL DEFAULT '',
  phone         text        NOT NULL DEFAULT '',
  status        text        NOT NULL DEFAULT 'pending',
  registered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'registrations' AND policyname = 'Anon can submit registration'
  ) THEN
    CREATE POLICY "Anon can submit registration"
      ON registrations FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'registrations' AND policyname = 'Authenticated can view registrations'
  ) THEN
    CREATE POLICY "Authenticated can view registrations"
      ON registrations FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'registrations' AND policyname = 'Authenticated can update registrations'
  ) THEN
    CREATE POLICY "Authenticated can update registrations"
      ON registrations FOR UPDATE
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'registrations' AND policyname = 'Authenticated can delete registrations'
  ) THEN
    CREATE POLICY "Authenticated can delete registrations"
      ON registrations FOR DELETE
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;


-- ============================================================
-- TABLE: registration_requests
-- ============================================================
CREATE TABLE IF NOT EXISTS registration_requests (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text        NOT NULL DEFAULT '',
  last_name  text        NOT NULL DEFAULT '',
  email      text        NOT NULL DEFAULT '',
  password   text        NOT NULL DEFAULT '',
  phone      text        NOT NULL DEFAULT '',
  status     text        NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'registration_requests' AND policyname = 'Anyone can submit a registration request'
  ) THEN
    CREATE POLICY "Anyone can submit a registration request"
      ON registration_requests FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'registration_requests' AND policyname = 'Authenticated users can view all requests'
  ) THEN
    CREATE POLICY "Authenticated users can view all requests"
      ON registration_requests FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'registration_requests' AND policyname = 'Authenticated users can update requests'
  ) THEN
    CREATE POLICY "Authenticated users can update requests"
      ON registration_requests FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'registration_requests' AND policyname = 'Authenticated users can delete requests'
  ) THEN
    CREATE POLICY "Authenticated users can delete requests"
      ON registration_requests FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;


-- ============================================================
-- TABLE: import_history
-- ============================================================
CREATE TABLE IF NOT EXISTS import_history (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name        text        NOT NULL DEFAULT '',
  lead_count       integer     NOT NULL DEFAULT 0,
  columns          jsonb       NOT NULL DEFAULT '[]',
  imported_at      timestamptz NOT NULL DEFAULT now(),
  new_leads_count  integer     NOT NULL DEFAULT 0,
  duplicates_count integer     NOT NULL DEFAULT 0,
  errors_count     integer     NOT NULL DEFAULT 0,
  import_mode      text        NOT NULL DEFAULT 'ignore',
  source_file      text,
  imported_by      uuid
);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'import_history' AND policyname = 'Authenticated can view import history') THEN
    CREATE POLICY "Authenticated can view import history" ON import_history FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'import_history' AND policyname = 'Authenticated can insert import history') THEN
    CREATE POLICY "Authenticated can insert import history" ON import_history FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'import_history' AND policyname = 'Authenticated can update import history') THEN
    CREATE POLICY "Authenticated can update import history" ON import_history FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'import_history' AND policyname = 'Authenticated can delete import history') THEN
    CREATE POLICY "Authenticated can delete import history" ON import_history FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;


-- ============================================================
-- TABLE: vendors
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name   text        NOT NULL DEFAULT '',
  last_name    text        NOT NULL DEFAULT '',
  email        text        UNIQUE NOT NULL DEFAULT '',
  password     text        NOT NULL DEFAULT '',
  phone        text        NOT NULL DEFAULT '',
  created_at   timestamptz DEFAULT now(),
  auth_user_id uuid        REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendors' AND policyname = 'Authenticated can view vendors') THEN
    CREATE POLICY "Authenticated can view vendors" ON vendors FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendors' AND policyname = 'Authenticated can insert vendors') THEN
    CREATE POLICY "Authenticated can insert vendors" ON vendors FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendors' AND policyname = 'Authenticated can update vendors') THEN
    CREATE POLICY "Authenticated can update vendors" ON vendors FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendors' AND policyname = 'Authenticated can delete vendors') THEN
    CREATE POLICY "Authenticated can delete vendors" ON vendors FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;


-- ============================================================
-- TABLE: leads
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id   uuid        REFERENCES import_history(id) ON DELETE CASCADE,
  data        jsonb       NOT NULL DEFAULT '{}',
  imported_at timestamptz NOT NULL DEFAULT now(),
  statut      text        NOT NULL DEFAULT 'Nouveau',
  actif       boolean     NOT NULL DEFAULT true,
  vendor_id   uuid        REFERENCES vendors(id) ON DELETE SET NULL,
  prenom      text,
  nom         text,
  email       text,
  telephone   text,
  source      text        DEFAULT 'csv_import',
  source_file text
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_email_unique
  ON leads (email)
  WHERE email IS NOT NULL AND email != '';

CREATE UNIQUE INDEX IF NOT EXISTS leads_telephone_unique
  ON leads (telephone)
  WHERE telephone IS NOT NULL AND telephone != '';

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Authenticated can view leads') THEN
    CREATE POLICY "Authenticated can view leads" ON leads FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Authenticated can insert leads') THEN
    CREATE POLICY "Authenticated can insert leads" ON leads FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Authenticated can update leads') THEN
    CREATE POLICY "Authenticated can update leads" ON leads FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leads' AND policyname = 'Authenticated can delete leads') THEN
    CREATE POLICY "Authenticated can delete leads" ON leads FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cleanup_import_history'
  ) THEN
    CREATE TRIGGER trg_cleanup_import_history
      AFTER DELETE ON leads
      FOR EACH ROW
      EXECUTE FUNCTION cleanup_orphan_import_history();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE leads;
  END IF;
END $$;


-- ============================================================
-- FUNCTION: find_duplicate_leads
-- ============================================================
CREATE OR REPLACE FUNCTION find_duplicate_leads(
  p_emails      text[],
  p_telephones  text[]
)
RETURNS TABLE (
  lead_id        uuid,
  lead_email     text,
  lead_telephone text,
  lead_nom       text,
  lead_prenom    text,
  match_type     text
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    l.id                AS lead_id,
    l.email             AS lead_email,
    l.telephone         AS lead_telephone,
    l.nom               AS lead_nom,
    l.prenom            AS lead_prenom,
    CASE
      WHEN l.email     = ANY(p_emails)
       AND l.telephone = ANY(p_telephones) THEN 'both'
      WHEN l.email     = ANY(p_emails)     THEN 'email'
      ELSE 'telephone'
    END AS match_type
  FROM leads l
  WHERE
    (l.email     = ANY(p_emails)     AND l.email     IS NOT NULL AND l.email     != '')
    OR
    (l.telephone = ANY(p_telephones) AND l.telephone IS NOT NULL AND l.telephone != '');
$$;


-- ============================================================
-- TABLE: vendor_comments
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  uuid        NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  content    text        NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_comments' AND policyname = 'Authenticated can view vendor comments') THEN
    CREATE POLICY "Authenticated can view vendor comments" ON vendor_comments FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_comments' AND policyname = 'Authenticated can insert vendor comments') THEN
    CREATE POLICY "Authenticated can insert vendor comments" ON vendor_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_comments' AND policyname = 'Authenticated can update vendor comments') THEN
    CREATE POLICY "Authenticated can update vendor comments" ON vendor_comments FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_comments' AND policyname = 'Authenticated can delete vendor comments') THEN
    CREATE POLICY "Authenticated can delete vendor comments" ON vendor_comments FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;


-- ============================================================
-- TABLE: vendor_admin_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_admin_messages (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_auth_id uuid,
  vendor_id      uuid        REFERENCES vendors(id) ON DELETE CASCADE,
  content        text        NOT NULL DEFAULT '',
  sender         text        NOT NULL DEFAULT 'vendor',
  file_url       text,
  file_name      text,
  file_type      text        CHECK (file_type IN ('image', 'document')),
  deleted        boolean     NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_admin_messages_vendor_id_idx
  ON vendor_admin_messages (vendor_id);

ALTER TABLE vendor_admin_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_admin_messages' AND policyname = 'Anyone can view vendor admin messages') THEN
    CREATE POLICY "Anyone can view vendor admin messages" ON vendor_admin_messages FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_admin_messages' AND policyname = 'Anyone can insert vendor admin messages') THEN
    CREATE POLICY "Anyone can insert vendor admin messages" ON vendor_admin_messages FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_admin_messages' AND policyname = 'Anyone can update vendor admin messages') THEN
    CREATE POLICY "Anyone can update vendor admin messages" ON vendor_admin_messages FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ============================================================
-- TABLE: rdv_proposals
-- ============================================================
CREATE TABLE IF NOT EXISTS rdv_proposals (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id      uuid        REFERENCES vendors(id) ON DELETE CASCADE,
  lead_id        uuid        REFERENCES leads(id) ON DELETE SET NULL,
  lead_name      text        NOT NULL DEFAULT '',
  lead_phone     text        NOT NULL DEFAULT '',
  lead_email     text        NOT NULL DEFAULT '',
  proposed_date  date        NOT NULL,
  proposed_time  text        NOT NULL DEFAULT '',
  notes          text        NOT NULL DEFAULT '',
  status         text        NOT NULL DEFAULT 'pending',
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE rdv_proposals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rdv_proposals' AND policyname = 'Authenticated can view rdv proposals') THEN
    CREATE POLICY "Authenticated can view rdv proposals" ON rdv_proposals FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rdv_proposals' AND policyname = 'Authenticated can insert rdv proposals') THEN
    CREATE POLICY "Authenticated can insert rdv proposals" ON rdv_proposals FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rdv_proposals' AND policyname = 'Authenticated can update rdv proposals') THEN
    CREATE POLICY "Authenticated can update rdv proposals" ON rdv_proposals FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'rdv_proposals' AND policyname = 'Authenticated can delete rdv proposals') THEN
    CREATE POLICY "Authenticated can delete rdv proposals" ON rdv_proposals FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;


-- ============================================================
-- TABLE: client_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS client_messages (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  content        text        NOT NULL DEFAULT '',
  sender         text        NOT NULL DEFAULT 'client'
                             CHECK (sender IN ('client', 'admin', 'vendor')),
  client_auth_id uuid        NOT NULL,
  read           boolean     NOT NULL DEFAULT false,
  vendor_id      uuid        REFERENCES vendors(id) ON DELETE SET NULL,
  file_url       text,
  file_name      text,
  file_type      text        CHECK (file_type IN ('image', 'document')),
  deleted        boolean     NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_messages' AND policyname = 'Authenticated can view client messages') THEN
    CREATE POLICY "Authenticated can view client messages" ON client_messages FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_messages' AND policyname = 'Authenticated can insert client messages') THEN
    CREATE POLICY "Authenticated can insert client messages" ON client_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_messages' AND policyname = 'Authenticated can update client messages') THEN
    CREATE POLICY "Authenticated can update client messages" ON client_messages FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'client_messages' AND policyname = 'Authenticated can delete client messages') THEN
    CREATE POLICY "Authenticated can delete client messages" ON client_messages FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;


-- ============================================================
-- TABLE: statuts
-- ============================================================
CREATE TABLE IF NOT EXISTS statuts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        text        UNIQUE NOT NULL,
  couleur    text        NOT NULL DEFAULT '#38bdf8',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE statuts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'statuts' AND policyname = 'Authenticated can view statuts') THEN
    CREATE POLICY "Authenticated can view statuts" ON statuts FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'statuts' AND policyname = 'Authenticated can insert statuts') THEN
    CREATE POLICY "Authenticated can insert statuts" ON statuts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'statuts' AND policyname = 'Authenticated can update statuts') THEN
    CREATE POLICY "Authenticated can update statuts" ON statuts FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'statuts' AND policyname = 'Authenticated can delete statuts') THEN
    CREATE POLICY "Authenticated can delete statuts" ON statuts FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;


-- ============================================================
-- TABLE: crm_documentation
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_documentation (
  tab_id     text        PRIMARY KEY,
  content    text        NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_documentation ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_documentation' AND policyname = 'Authenticated can view crm documentation') THEN
    CREATE POLICY "Authenticated can view crm documentation" ON crm_documentation FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_documentation' AND policyname = 'Authenticated can insert crm documentation') THEN
    CREATE POLICY "Authenticated can insert crm documentation" ON crm_documentation FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_documentation' AND policyname = 'Authenticated can update crm documentation') THEN
    CREATE POLICY "Authenticated can update crm documentation" ON crm_documentation FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crm_documentation_updated_at'
  ) THEN
    CREATE TRIGGER trg_crm_documentation_updated_at
      BEFORE UPDATE ON crm_documentation
      FOR EACH ROW
      EXECUTE FUNCTION update_crm_documentation_updated_at();
  END IF;
END $$;


-- ============================================================
-- TABLE: crm_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_notes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL DEFAULT '',
  content    text        NOT NULL DEFAULT '',
  note_date  date        NOT NULL DEFAULT CURRENT_DATE,
  time_start text        NOT NULL DEFAULT '',
  time_end   text        NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_notes' AND policyname = 'Authenticated can view crm notes') THEN
    CREATE POLICY "Authenticated can view crm notes" ON crm_notes FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_notes' AND policyname = 'Authenticated can insert crm notes') THEN
    CREATE POLICY "Authenticated can insert crm notes" ON crm_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_notes' AND policyname = 'Authenticated can update crm notes') THEN
    CREATE POLICY "Authenticated can update crm notes" ON crm_notes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_notes' AND policyname = 'Authenticated can delete crm notes') THEN
    CREATE POLICY "Authenticated can delete crm notes" ON crm_notes FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;


-- ============================================================
-- TABLE: sidebar_order
-- ============================================================
CREATE TABLE IF NOT EXISTS sidebar_order (
  group_id text    NOT NULL,
  item_key text    NOT NULL,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (group_id, item_key)
);

ALTER TABLE sidebar_order ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sidebar_order' AND policyname = 'Authenticated can view sidebar order') THEN
    CREATE POLICY "Authenticated can view sidebar order" ON sidebar_order FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sidebar_order' AND policyname = 'Authenticated can insert sidebar order') THEN
    CREATE POLICY "Authenticated can insert sidebar order" ON sidebar_order FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sidebar_order' AND policyname = 'Authenticated can update sidebar order') THEN
    CREATE POLICY "Authenticated can update sidebar order" ON sidebar_order FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sidebar_order' AND policyname = 'Authenticated can delete sidebar order') THEN
    CREATE POLICY "Authenticated can delete sidebar order" ON sidebar_order FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;


-- ============================================================
-- TABLE: crm_ideas
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_ideas (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL DEFAULT '',
  content    text        NOT NULL DEFAULT '',
  idea_date  date        NOT NULL DEFAULT CURRENT_DATE,
  status     text        NOT NULL DEFAULT 'idea',
  position   integer     NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE crm_ideas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_ideas' AND policyname = 'Authenticated can view crm ideas') THEN
    CREATE POLICY "Authenticated can view crm ideas" ON crm_ideas FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_ideas' AND policyname = 'Authenticated can insert crm ideas') THEN
    CREATE POLICY "Authenticated can insert crm ideas" ON crm_ideas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_ideas' AND policyname = 'Authenticated can update crm ideas') THEN
    CREATE POLICY "Authenticated can update crm ideas" ON crm_ideas FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_ideas' AND policyname = 'Authenticated can delete crm ideas') THEN
    CREATE POLICY "Authenticated can delete crm ideas" ON crm_ideas FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;


-- ============================================================
-- TABLE: crm_context_cards
-- ============================================================
CREATE TABLE IF NOT EXISTS crm_context_cards (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL DEFAULT '',
  content    text        NOT NULL DEFAULT '',
  position   integer     NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE crm_context_cards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_context_cards' AND policyname = 'Authenticated can view context cards') THEN
    CREATE POLICY "Authenticated can view context cards" ON crm_context_cards FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_context_cards' AND policyname = 'Authenticated can insert context cards') THEN
    CREATE POLICY "Authenticated can insert context cards" ON crm_context_cards FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_context_cards' AND policyname = 'Authenticated can update context cards') THEN
    CREATE POLICY "Authenticated can update context cards" ON crm_context_cards FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_context_cards' AND policyname = 'Authenticated can delete context cards') THEN
    CREATE POLICY "Authenticated can delete context cards" ON crm_context_cards FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crm_context_cards_updated_at'
  ) THEN
    CREATE TRIGGER trg_crm_context_cards_updated_at
      BEFORE UPDATE ON crm_context_cards
      FOR EACH ROW
      EXECUTE FUNCTION update_crm_context_cards_updated_at();
  END IF;
END $$;


-- ============================================================
-- TABLE: conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        uuid        REFERENCES leads(id) ON DELETE CASCADE,
  vendor_auth_id uuid,
  type           text        NOT NULL DEFAULT 'client-vendor',
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_lead_id
  ON conversations (lead_id);

CREATE INDEX IF NOT EXISTS idx_conversations_vendor_auth_id
  ON conversations (vendor_auth_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Authenticated users can read conversations') THEN
    CREATE POLICY "Authenticated users can read conversations" ON conversations FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Authenticated users can insert conversations') THEN
    CREATE POLICY "Authenticated users can insert conversations" ON conversations FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Authenticated users can update conversations') THEN
    CREATE POLICY "Authenticated users can update conversations" ON conversations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;


-- ============================================================
-- TABLE: messages
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_role     text        NOT NULL,
  sender_auth_id  uuid,
  sender_name     text,
  content         text,
  file_url        text,
  file_name       text,
  file_type       text,
  deleted_at      timestamptz,
  deleted_by_role text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON messages (conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON messages (created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Authenticated users can read messages') THEN
    CREATE POLICY "Authenticated users can read messages" ON messages FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Authenticated users can insert messages') THEN
    CREATE POLICY "Authenticated users can insert messages" ON messages FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Authenticated users can update messages') THEN
    CREATE POLICY "Authenticated users can update messages" ON messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Authenticated users can delete messages') THEN
    CREATE POLICY "Authenticated users can delete messages" ON messages FOR DELETE TO authenticated USING (true);
  END IF;
END $$;


-- ============================================================
-- VIEW: leads_sans_statut_count
-- ============================================================
CREATE OR REPLACE VIEW leads_sans_statut_count AS
  SELECT COUNT(*) AS count
  FROM leads l
  LEFT JOIN statuts s ON s.nom = l.statut
  WHERE l.statut = '' OR l.statut IS NULL OR s.nom IS NULL;

GRANT SELECT ON leads_sans_statut_count TO authenticated;


-- ============================================================
-- FUNCTION: get_public_table_names
-- ============================================================
CREATE OR REPLACE FUNCTION get_public_table_names()
RETURNS TABLE(table_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.table_name::text
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
  ORDER BY t.table_name;
$$;

REVOKE ALL ON FUNCTION get_public_table_names() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_public_table_names() TO authenticated;
