/*
  # Create sa_argumentaires table

  1. New Tables
    - `sa_argumentaires`
      - `id` (uuid, primary key)
      - `title` (text, NOT NULL) - Titre de l'argumentaire
      - `content` (text, NOT NULL, default '') - Contenu HTML riche
      - `position` (integer, default 0) - Ordre d'affichage
      - `created_at` (timestamptz) - Date de creation

  2. Security
    - Enable RLS on `sa_argumentaires` table
    - Authenticated users can select, insert, update, delete
    - Super admin only table (no company_id needed)
*/

CREATE TABLE IF NOT EXISTS sa_argumentaires (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text        NOT NULL,
  content    text        NOT NULL DEFAULT '',
  position   integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sa_argumentaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view argumentaires"
  ON sa_argumentaires
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert argumentaires"
  ON sa_argumentaires
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update argumentaires"
  ON sa_argumentaires
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete argumentaires"
  ON sa_argumentaires
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
