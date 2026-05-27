/*
  # Create glass library images table

  1. New Tables
    - `glass_library_images`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `storage_path` (text, path in theme-backgrounds bucket)
      - `public_url` (text, public URL for the image)
      - `filename` (text, original filename)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `glass_library_images` table
    - Users can only CRUD their own images

  3. Notes
    - Each user has their own image library
    - Images are stored in the existing theme-backgrounds Supabase Storage bucket
    - Only the URL/path is stored in the table, never base64 data
*/

CREATE TABLE IF NOT EXISTS glass_library_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  filename text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE glass_library_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own library images"
  ON glass_library_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own library images"
  ON glass_library_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own library images"
  ON glass_library_images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_glass_library_images_user_id
  ON glass_library_images(user_id);
