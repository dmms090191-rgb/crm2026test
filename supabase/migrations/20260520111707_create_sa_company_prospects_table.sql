/*
  # Create sa_company_prospects table

  1. New Tables
    - `sa_company_prospects`
      - `id` (uuid, primary key)
      - `nom` (text, NOT NULL) - Nom de la societe
      - `site_internet` (text) - URL du site web
      - `lien_google_maps` (text) - Lien Google Maps
      - `telephone` (text) - Numero de telephone
      - `adresse` (text) - Adresse postale
      - `secteur_activite` (text) - Secteur d'activite
      - `descriptif` (text) - Notes / descriptif libre
      - `statut` (text, default 'Nouveau') - Statut de prospection
      - `created_at` (timestamptz) - Date de creation

  2. Security
    - Enable RLS on `sa_company_prospects` table
    - Authenticated users can select, insert, update, delete
    - Super admin only table (no company_id needed)
*/

CREATE TABLE IF NOT EXISTS sa_company_prospects (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nom              text        NOT NULL,
  site_internet    text        DEFAULT '',
  lien_google_maps text        DEFAULT '',
  telephone        text        DEFAULT '',
  adresse          text        DEFAULT '',
  secteur_activite text        DEFAULT '',
  descriptif       text        DEFAULT '',
  statut           text        NOT NULL DEFAULT 'Nouveau',
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sa_company_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view prospects"
  ON sa_company_prospects
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert prospects"
  ON sa_company_prospects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update prospects"
  ON sa_company_prospects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete prospects"
  ON sa_company_prospects
  FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);
