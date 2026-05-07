/*
  # Create chat-files storage bucket

  Creates the public storage bucket used for file attachments in chat messages
  (vendor-admin and client-admin conversations).

  1. Storage
    - Public bucket `chat-files` with 10MB file size limit
  2. Security
    - Authenticated users can upload files
    - Public read access (bucket is public)
    - Authenticated users can delete files
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-files', 'chat-files', true, 10485760)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can upload chat files'
  ) THEN
    CREATE POLICY "Authenticated users can upload chat files"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'chat-files');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public can read chat files'
  ) THEN
    CREATE POLICY "Public can read chat files"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'chat-files');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated users can delete chat files'
  ) THEN
    CREATE POLICY "Authenticated users can delete chat files"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'chat-files');
  END IF;
END $$;