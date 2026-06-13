/*
  # Create SA Visual Presets Table (Experimental)

  Stores reusable style presets per user, scoped by element type
  (card, button, text) for the new experimental visual customization mode.

  1. New Tables
    - `sa_visual_presets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `element_type` (text) - 'card' | 'button' | 'text'
      - `name` (text) - user-chosen preset name
      - `config` (jsonb) - the preset payload
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS on `sa_visual_presets`
    - Users can manage only their own presets
*/

CREATE TABLE IF NOT EXISTS sa_visual_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  element_type text NOT NULL,
  name text NOT NULL DEFAULT '',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sa_visual_presets_user_type_idx
  ON sa_visual_presets (user_id, element_type);

ALTER TABLE sa_visual_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own presets"
  ON sa_visual_presets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presets"
  ON sa_visual_presets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presets"
  ON sa_visual_presets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own presets"
  ON sa_visual_presets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
