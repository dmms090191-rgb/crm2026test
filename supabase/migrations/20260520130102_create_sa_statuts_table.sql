/*
  # Create sa_statuts table (Super Admin statuts)

  1. New Tables
    - `sa_statuts`
      - `id` (uuid, primary key)
      - `nom` (text, NOT NULL) - Nom du statut
      - `couleur` (text, NOT NULL, default '#38bdf8') - Couleur hexadecimale
      - `created_at` (timestamptz) - Date de creation

  2. Security
    - Enable RLS on `sa_statuts` table
    - Authenticated users can select, insert, update, delete
    - Independent from the admin `statuts` table
    - Used exclusively by Super Admin > CRM Societe > Societes prospects

  3. Important Notes
    - This table is completely independent from the existing `statuts` table
    - The `statuts` table remains untouched and continues to serve admin CRM / leads
    - `sa_statuts` serves only the Super Admin prospect status workflow
*/

CREATE TABLE IF NOT EXISTS sa_statuts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        text        NOT NULL,
  couleur    text        NOT NULL DEFAULT '#38bdf8',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sa_statuts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sa_statuts"
  ON sa_statuts
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert sa_statuts"
  ON sa_statuts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update sa_statuts"
  ON sa_statuts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete sa_statuts"
  ON sa_statuts
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
