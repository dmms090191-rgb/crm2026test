/*
  # Create statuts table

  ## Summary
  Creates a table to store custom CRM statuses that can be created by admins.

  ## New Tables
  - `statuts`
    - `id` (uuid, primary key)
    - `nom` (text, unique) - Status name
    - `couleur` (text) - Hex color for the status
    - `created_at` (timestamptz)

  ## Security
  - Enable RLS on `statuts` table
  - Authenticated users can read all statuts
  - Only authenticated users can insert/update/delete statuts

  ## Notes
  1. The `couleur` field stores a hex color string (e.g. #34d399)
  2. Statuts are unique by name to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS statuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text UNIQUE NOT NULL,
  couleur text NOT NULL DEFAULT '#38bdf8',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE statuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read statuts"
  ON statuts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert statuts"
  ON statuts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update statuts"
  ON statuts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete statuts"
  ON statuts FOR DELETE
  TO authenticated
  USING (true);
