/*
  # Create crm_custom_pages table

  Stores custom CRM pages (tabs) created by admins in the Documentation CRM sidebar.
  Each custom page has a stable, immutable `page_key` (slug) used to link all related
  content (content_blocks, crm_tasks, crm_page_checklist_items, sidebar_order).
  The `label` is the display name and can be renamed freely without affecting linked data.

  1. New Tables
    - `crm_custom_pages`
      - `id` (uuid, primary key)
      - `page_key` (text, unique, not null) - stable key, generated once at creation, never modified
      - `label` (text, not null) - display name, freely renamable
      - `icon_name` (text, default 'FileText') - Lucide icon name
      - `position` (integer, default 0) - fallback ordering
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `crm_custom_pages`
    - Authenticated users can SELECT, INSERT, UPDATE, DELETE
*/

CREATE TABLE IF NOT EXISTS crm_custom_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text UNIQUE NOT NULL,
  label text NOT NULL,
  icon_name text NOT NULL DEFAULT 'FileText',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crm_custom_pages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view custom pages' AND tablename = 'crm_custom_pages') THEN
  CREATE POLICY "Authenticated users can view custom pages"
    ON crm_custom_pages
    FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert custom pages' AND tablename = 'crm_custom_pages') THEN
  CREATE POLICY "Authenticated users can insert custom pages"
    ON crm_custom_pages
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update custom pages' AND tablename = 'crm_custom_pages') THEN
  CREATE POLICY "Authenticated users can update custom pages"
    ON crm_custom_pages
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete custom pages' AND tablename = 'crm_custom_pages') THEN
  CREATE POLICY "Authenticated users can delete custom pages"
    ON crm_custom_pages
    FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_crm_custom_pages_page_key ON crm_custom_pages(page_key);
CREATE INDEX IF NOT EXISTS idx_crm_custom_pages_position ON crm_custom_pages(position);
