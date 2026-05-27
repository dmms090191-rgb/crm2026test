/*
  # Create content blocks system for "Page d'accueil"

  1. New Tables
    - `content_blocks`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `utility` (text, default '')
      - `position` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `content_block_tasks`
      - `id` (uuid, primary key)
      - `block_id` (uuid, foreign key to content_blocks)
      - `text` (text, not null)
      - `status` (text, check: todo/doing/done)
      - `position` (integer, default 0)
      - `created_at` (timestamptz)
    - `content_block_infos`
      - `id` (uuid, primary key)
      - `block_id` (uuid, foreign key to content_blocks)
      - `text` (text, not null)
      - `position` (integer, default 0)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all 3 tables
    - Authenticated users can SELECT, INSERT, UPDATE, DELETE on all tables
*/

CREATE TABLE IF NOT EXISTS content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  utility text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view content blocks' AND tablename = 'content_blocks') THEN
  CREATE POLICY "Authenticated users can view content blocks"
    ON content_blocks FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert content blocks' AND tablename = 'content_blocks') THEN
  CREATE POLICY "Authenticated users can insert content blocks"
    ON content_blocks FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update content blocks' AND tablename = 'content_blocks') THEN
  CREATE POLICY "Authenticated users can update content blocks"
    ON content_blocks FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete content blocks' AND tablename = 'content_blocks') THEN
  CREATE POLICY "Authenticated users can delete content blocks"
    ON content_blocks FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

CREATE TABLE IF NOT EXISTS content_block_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
  text text NOT NULL,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_block_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view block tasks' AND tablename = 'content_block_tasks') THEN
  CREATE POLICY "Authenticated users can view block tasks"
    ON content_block_tasks FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert block tasks' AND tablename = 'content_block_tasks') THEN
  CREATE POLICY "Authenticated users can insert block tasks"
    ON content_block_tasks FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update block tasks' AND tablename = 'content_block_tasks') THEN
  CREATE POLICY "Authenticated users can update block tasks"
    ON content_block_tasks FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete block tasks' AND tablename = 'content_block_tasks') THEN
  CREATE POLICY "Authenticated users can delete block tasks"
    ON content_block_tasks FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

CREATE TABLE IF NOT EXISTS content_block_infos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES content_blocks(id) ON DELETE CASCADE,
  text text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_block_infos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view block infos' AND tablename = 'content_block_infos') THEN
  CREATE POLICY "Authenticated users can view block infos"
    ON content_block_infos FOR SELECT
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert block infos' AND tablename = 'content_block_infos') THEN
  CREATE POLICY "Authenticated users can insert block infos"
    ON content_block_infos FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can update block infos' AND tablename = 'content_block_infos') THEN
  CREATE POLICY "Authenticated users can update block infos"
    ON content_block_infos FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
END IF;
END $$;

DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can delete block infos' AND tablename = 'content_block_infos') THEN
  CREATE POLICY "Authenticated users can delete block infos"
    ON content_block_infos FOR DELETE
    TO authenticated
    USING (auth.uid() IS NOT NULL);
END IF;
END $$;
