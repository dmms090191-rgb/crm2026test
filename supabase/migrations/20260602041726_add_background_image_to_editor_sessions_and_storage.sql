/*
  # Add background image support to editor sessions

  1. Modified Tables
    - `editor_sessions`
      - `background_image` (text, nullable) - URL of the background image for Zone 4

  2. Storage
    - Creates `editor-backgrounds` public bucket with 5MB file size limit
    - Authenticated users can upload, read, and delete files

  3. Notes
    - The background image replaces Zone 4 color/gradient when active
    - Stored as a public URL from the storage bucket
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'editor_sessions' AND column_name = 'background_image'
  ) THEN
    ALTER TABLE editor_sessions ADD COLUMN background_image text DEFAULT NULL;
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('editor-backgrounds', 'editor-backgrounds', true, 5242880)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth users can upload editor backgrounds'
  ) THEN
    CREATE POLICY "Auth users can upload editor backgrounds"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'editor-backgrounds');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public can read editor backgrounds'
  ) THEN
    CREATE POLICY "Public can read editor backgrounds"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'editor-backgrounds');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth users can delete editor backgrounds'
  ) THEN
    CREATE POLICY "Auth users can delete editor backgrounds"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'editor-backgrounds');
  END IF;
END $$;
