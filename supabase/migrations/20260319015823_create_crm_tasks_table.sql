/*
  # Create crm_tasks table

  1. New Tables
    - `crm_tasks`
      - `id` (uuid, primary key, auto-generated)
      - `page_key` (text, not null) - identifies which CRM page the task belongs to (e.g. "page-accueil")
      - `title` (text, not null) - task title
      - `description` (text, default '') - optional task description
      - `status` (text, default 'todo') - one of 'todo', 'doing', 'done'
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `crm_tasks` table
    - Add SELECT policy for authenticated users
    - Add INSERT policy for authenticated users
    - Add UPDATE policy for authenticated users
    - Add DELETE policy for authenticated users

  3. Notes
    - Independent table, no foreign keys to other tables
    - Status constrained via CHECK to 'todo', 'doing', 'done'
    - Existing checklist system remains untouched
*/

CREATE TABLE IF NOT EXISTS crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo', 'doing', 'done')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view tasks' AND tablename = 'crm_tasks') THEN
  CREATE POLICY "Authenticated users can view tasks"
    ON crm_tasks
    FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create tasks' AND tablename = 'crm_tasks') THEN
  CREATE POLICY "Authenticated users can create tasks"
    ON crm_tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update tasks' AND tablename = 'crm_tasks') THEN
  CREATE POLICY "Authenticated users can update tasks"
    ON crm_tasks
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete tasks' AND tablename = 'crm_tasks') THEN
  CREATE POLICY "Authenticated users can delete tasks"
    ON crm_tasks
    FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;
