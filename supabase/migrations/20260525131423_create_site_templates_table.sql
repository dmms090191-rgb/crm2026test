/*
  # Create site_templates table

  1. New Tables
    - `site_templates`
      - `id` (uuid, primary key)
      - `name` (text, template display name)
      - `slug` (text, unique, URL-friendly identifier)
      - `template_key` (text, unique, maps to React component)
      - `description` (text, short description)
      - `category` (text, industry/sector)
      - `thumbnail_url` (text, nullable, preview image)
      - `is_default` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `site_templates`
    - SELECT policy for all authenticated users
    - INSERT/UPDATE/DELETE policies for super_admin only

  3. Seed Data
    - 6 starter templates: Talvex officiel, Energie renouvelable,
      Pompe a chaleur, Fitness, Immobilier, Renovation
*/

CREATE TABLE IF NOT EXISTS site_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  slug text UNIQUE NOT NULL,
  template_key text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  thumbnail_url text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE site_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view templates
CREATE POLICY "Authenticated users can view templates"
  ON site_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Super admin can insert templates
CREATE POLICY "Super admin can insert templates"
  ON site_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );

-- Super admin can update templates
CREATE POLICY "Super admin can update templates"
  ON site_templates
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );

-- Super admin can delete templates
CREATE POLICY "Super admin can delete templates"
  ON site_templates
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
  );

-- Seed 6 starter templates
INSERT INTO site_templates (name, slug, template_key, description, category, is_default) VALUES
  ('Talvex officiel', 'talvex-officiel', 'talvex_official', 'Site officiel moderne pour presenter Talvex, ses fonctions, ses panels, son IA, ses sites, ses domaines et ses automatisations futures.', 'SaaS / CRM', true),
  ('Energie renouvelable', 'energie-renouvelable', 'renewable_energy', 'Template pour les entreprises d''energie renouvelable, panneaux solaires, economies d''energie et demandes de devis.', 'Energie', false),
  ('Pompe a chaleur', 'pompe-a-chaleur', 'heat_pump', 'Template pour les societes qui installent des pompes a chaleur, avec gestion des demandes, visites techniques et rendez-vous.', 'Installation / Travaux', false),
  ('Fitness / Musculation', 'fitness-musculation', 'fitness', 'Template pour salle de sport, coach, musculation, inscription, suivi client et prise de rendez-vous.', 'Sport', false),
  ('Immobilier', 'immobilier', 'real_estate', 'Template pour agences immobilieres, prospects acheteurs/vendeurs, visites et demandes de contact.', 'Immobilier', false),
  ('Renovation', 'renovation', 'renovation', 'Template pour entreprises de renovation, demandes de devis, chantiers, suivi client et rendez-vous.', 'Batiment', false)
ON CONFLICT (slug) DO NOTHING;
