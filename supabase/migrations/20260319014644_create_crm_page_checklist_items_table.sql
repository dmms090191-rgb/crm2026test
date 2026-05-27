/*
  # Create crm_page_checklist_items table

  Interactive checklist items for CRM page development tracking.
  Each item belongs to a page (via page_key) and a section (ui, fonctionnalites, tests, ux-design).

  1. New Tables
    - `crm_page_checklist_items`
      - `id` (uuid, primary key) - unique identifier
      - `page_key` (text, not null) - page identifier (e.g. "page-accueil")
      - `section` (text, not null) - section category (ui / fonctionnalites / tests / ux-design)
      - `label` (text, not null) - checklist item description
      - `checked` (boolean, default false) - completion status
      - `position` (integer, default 0) - display order within section
      - `is_custom` (boolean, default false) - whether user-created
      - `created_at` (timestamptz) - creation timestamp
      - `updated_at` (timestamptz) - last update timestamp

  2. Functions
    - `update_crm_page_checklist_items_updated_at()` - trigger function to auto-update updated_at

  3. Triggers
    - `trg_crm_page_checklist_items_updated_at` - BEFORE UPDATE trigger on crm_page_checklist_items

  4. Security
    - Enable RLS on `crm_page_checklist_items` table
    - Authenticated users can SELECT, INSERT, UPDATE, DELETE
*/

CREATE OR REPLACE FUNCTION update_crm_page_checklist_items_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS crm_page_checklist_items (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key   text        NOT NULL DEFAULT '',
  section    text        NOT NULL DEFAULT '',
  label      text        NOT NULL DEFAULT '',
  checked    boolean     NOT NULL DEFAULT false,
  position   integer     NOT NULL DEFAULT 0,
  is_custom  boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_page_checklist_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_page_checklist_items' AND policyname = 'Authenticated can view checklist items') THEN
    CREATE POLICY "Authenticated can view checklist items"
      ON crm_page_checklist_items FOR SELECT
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_page_checklist_items' AND policyname = 'Authenticated can insert checklist items') THEN
    CREATE POLICY "Authenticated can insert checklist items"
      ON crm_page_checklist_items FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_page_checklist_items' AND policyname = 'Authenticated can update checklist items') THEN
    CREATE POLICY "Authenticated can update checklist items"
      ON crm_page_checklist_items FOR UPDATE
      TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_page_checklist_items' AND policyname = 'Authenticated can delete checklist items') THEN
    CREATE POLICY "Authenticated can delete checklist items"
      ON crm_page_checklist_items FOR DELETE
      TO authenticated
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crm_page_checklist_items_updated_at'
  ) THEN
    CREATE TRIGGER trg_crm_page_checklist_items_updated_at
      BEFORE UPDATE ON crm_page_checklist_items
      FOR EACH ROW
      EXECUTE FUNCTION update_crm_page_checklist_items_updated_at();
  END IF;
END $$;
