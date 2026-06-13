/*
  # Create AI Generated Images table and storage

  1. New Tables
    - `ai_generated_images`
      - `id` (uuid, primary key)
      - `company_id` (uuid, FK to companies, required)
      - `user_id` (uuid, FK to auth.users, required)
      - `operation` (text - generate, img2img, outpaint, upscale, edit)
      - `source_image_url` (text, nullable - original image for edits)
      - `generated_image_url` (text, required - final result)
      - `storage_path` (text, required - path in storage bucket)
      - `prompt` (text, required)
      - `model` (text, default 'sd3.5-large')
      - `width` (integer)
      - `height` (integer)
      - `credits_used` (numeric, default 0)
      - `metadata` (jsonb - seed, steps, cfg_scale, etc.)
      - `name` (text, default 'Image generee')
      - `created_at` (timestamptz)

  2. Storage
    - Create `ai-images` bucket for generated images

  3. Security
    - Enable RLS on `ai_generated_images`
    - Admin/SA can CRUD images scoped by company_id via jwt app_metadata
    - Super admin can read all images

  4. Indexes
    - company_id for fast filtering
    - user_id for ownership queries
    - created_at for sorting
*/

-- Table
CREATE TABLE IF NOT EXISTS ai_generated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation text NOT NULL DEFAULT 'generate',
  source_image_url text,
  generated_image_url text NOT NULL,
  storage_path text NOT NULL,
  prompt text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT 'sd3.5-large',
  width integer NOT NULL DEFAULT 1024,
  height integer NOT NULL DEFAULT 1024,
  credits_used numeric NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  name text NOT NULL DEFAULT 'Image generee',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_generated_images ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_company_id ON ai_generated_images(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_user_id ON ai_generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_images_created_at ON ai_generated_images(created_at DESC);

-- RLS Policies

-- Users can read images from their own company or SA can read all
CREATE POLICY "Users can read own company images"
  ON ai_generated_images FOR SELECT
  TO authenticated
  USING (
    company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
    OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- Admin/SA can insert images for their company
CREATE POLICY "Users can insert own company images"
  ON ai_generated_images FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      company_id = (auth.jwt() -> 'app_metadata' ->> 'company_id')::uuid
      OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
    )
  );

-- Users can update their own images
CREATE POLICY "Users can update own images"
  ON ai_generated_images FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own images
CREATE POLICY "Users can delete own images"
  ON ai_generated_images FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-images', 'ai-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload to their own folder
CREATE POLICY "Authenticated users can upload ai images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ai-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: public can read
CREATE POLICY "Public can read ai images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'ai-images');

-- Storage RLS: owners can delete their own files
CREATE POLICY "Users can delete own ai images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'ai-images' AND (storage.foldername(name))[1] = auth.uid()::text);
