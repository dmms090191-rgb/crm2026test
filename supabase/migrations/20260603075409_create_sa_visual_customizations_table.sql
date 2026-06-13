/*
  # Create SA Visual Customizations Table (Experimental)

  Stores per-user per-element visual customizations for the new experimental
  visual customization mode. This is parallel to the existing editor system
  and does NOT replace any existing customization storage.

  1. New Tables
    - `sa_visual_customizations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `scope` (text, e.g. 'sa_dashboard') - which view the customization belongs to
      - `element_id` (text) - stable id of the element being customized
      - `element_type` (text) - 'card' | 'button' | 'text'
      - `config` (jsonb) - the customization payload
      - `updated_at` (timestamptz)
  2. Security
    - Enable RLS on `sa_visual_customizations`
    - Users can manage only their own rows
*/

CREATE TABLE IF NOT EXISTS sa_visual_customizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'sa_dashboard',
  element_id text NOT NULL,
  element_type text NOT NULL DEFAULT 'card',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope, element_id)
);

CREATE INDEX IF NOT EXISTS sa_visual_customizations_user_scope_idx
  ON sa_visual_customizations (user_id, scope);

ALTER TABLE sa_visual_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own customizations"
  ON sa_visual_customizations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customizations"
  ON sa_visual_customizations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own customizations"
  ON sa_visual_customizations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own customizations"
  ON sa_visual_customizations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
