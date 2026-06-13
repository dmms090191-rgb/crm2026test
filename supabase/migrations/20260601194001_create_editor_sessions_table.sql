/*
  # Create editor_sessions table

  Stores the working state of the Editor Mode so users can resume
  their work after closing and reopening the editor.

  1. New Tables
    - `editor_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique per user)
      - `zone_overrides` (jsonb) - zone background overrides for zone1-zone4
      - `text_overrides` (jsonb) - text color overrides by key
      - `saved_solids` (jsonb) - saved solid colors list
      - `saved_gradients` (jsonb) - saved gradient colors list
      - `panel_positions` (jsonb) - x/y positions of the 3 editor panels
      - `active_zone` (text) - currently selected zone
      - `editor_tab` (text) - active tab: fonds or texte
      - `color_mode` (text) - active color mode: solid or gradient
      - `unified_drag` (boolean) - whether panels move together
      - `updated_at` (timestamptz) - last save timestamp
      - `created_at` (timestamptz) - row creation timestamp

  2. Security
    - Enable RLS on `editor_sessions` table
    - Users can only read/write their own session
*/

CREATE TABLE IF NOT EXISTS editor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zone_overrides jsonb DEFAULT '{}'::jsonb,
  text_overrides jsonb DEFAULT '{}'::jsonb,
  saved_solids jsonb DEFAULT '[]'::jsonb,
  saved_gradients jsonb DEFAULT '[]'::jsonb,
  panel_positions jsonb DEFAULT '{}'::jsonb,
  active_zone text DEFAULT 'zone1',
  editor_tab text DEFAULT 'fonds',
  color_mode text DEFAULT 'solid',
  unified_drag boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT editor_sessions_user_unique UNIQUE (user_id)
);

ALTER TABLE editor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own editor session"
  ON editor_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own editor session"
  ON editor_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own editor session"
  ON editor_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own editor session"
  ON editor_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
