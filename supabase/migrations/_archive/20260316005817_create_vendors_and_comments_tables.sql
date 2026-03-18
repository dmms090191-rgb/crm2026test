/*
  # Create vendors and vendor_comments tables

  1. New Tables
    - `vendors`
      - `id` (uuid, primary key)
      - `first_name` (text) - Prénom
      - `last_name` (text) - Nom
      - `email` (text, unique) - Adresse email
      - `password` (text) - PIN à 6 chiffres stocké en clair pour affichage admin
      - `phone` (text) - Téléphone
      - `created_at` (timestamptz)

    - `vendor_comments`
      - `id` (uuid, primary key)
      - `vendor_id` (uuid, FK -> vendors.id, cascade delete)
      - `content` (text) - Contenu du commentaire
      - `created_at` (timestamptz) - Date et heure automatiques

  2. Security
    - RLS enabled on both tables
    - Authenticated users can select, insert, update, delete vendors
    - Authenticated users can manage vendor_comments
*/

CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL DEFAULT '',
  last_name text NOT NULL DEFAULT '',
  email text UNIQUE NOT NULL DEFAULT '',
  password text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert vendors"
  ON vendors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update vendors"
  ON vendors FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete vendors"
  ON vendors FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS vendor_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vendor_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select vendor_comments"
  ON vendor_comments FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert vendor_comments"
  ON vendor_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update vendor_comments"
  ON vendor_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete vendor_comments"
  ON vendor_comments FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
