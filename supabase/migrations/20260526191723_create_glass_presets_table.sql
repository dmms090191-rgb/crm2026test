/*
  # Create glass presets table and ensure theme-backgrounds bucket exists

  1. Storage
    - Creates public `theme-backgrounds` bucket (10MB limit) if not exists
    - Policies for authenticated upload, public read, authenticated delete

  2. New Tables
    - `glass_presets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, cascade delete)
      - `name` (text, user-defined name for the preset)
      - `image_storage_path` (text, path in theme-backgrounds bucket)
      - `image_public_url` (text, public URL for the image)
      - `config` (jsonb, full GlassConfig settings for this preset)
      - `position` (integer, ordering)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Enable RLS on `glass_presets`
    - Users can only CRUD their own presets

  4. Notes
    - Each user can have multiple glass presets, each with its own image and settings
    - The config jsonb stores: blur, cardTransparency, overlayMode, accentColor,
      overlayOpacity, brightness, saturation, backgroundBlur
    - Position allows user-defined ordering of presets
*/

-- Ensure theme-backgrounds bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('theme-backgrounds', 'theme-backgrounds', true, 10485760)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth users can upload theme backgrounds'
  ) THEN
    CREATE POLICY "Auth users can upload theme backgrounds"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'theme-backgrounds');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public can read theme backgrounds'
  ) THEN
    CREATE POLICY "Public can read theme backgrounds"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'theme-backgrounds');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Auth users can delete theme backgrounds'
  ) THEN
    CREATE POLICY "Auth users can delete theme backgrounds"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'theme-backgrounds');
  END IF;
END $$;

-- Create glass_presets table
CREATE TABLE IF NOT EXISTS glass_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Glass personnalise',
  image_storage_path text NOT NULL,
  image_public_url text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE glass_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own glass presets"
  ON glass_presets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own glass presets"
  ON glass_presets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own glass presets"
  ON glass_presets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own glass presets"
  ON glass_presets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_glass_presets_user_id
  ON glass_presets(user_id);
