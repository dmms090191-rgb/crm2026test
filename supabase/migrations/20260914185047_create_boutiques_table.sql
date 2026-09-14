/*
  # Table `boutiques` — module Boutique du panel Societe

  1. Objectif
     Une Societe peut gerer PLUSIEURS boutiques. Cette table porte la boutique
     elle-meme ; les elements futurs (3D, articles, ecrans, musique, lumieres,
     decoration) viendront dans des tables ENFANTS referencant `boutique_id`,
     jamais comme colonnes ajoutees ici.

  2. Colonnes
     - `id`           uuid, cle primaire
     - `company_id`   uuid, la Societe proprietaire (FK -> companies, CASCADE)
     - `name`         text, nom donne par la Societe
     - `template_key` text nullable : 'johanna-mode-luxe' ou NULL (personnalisee)
     - `status`       text, 'active' par defaut
     - `created_at`   timestamptz, automatique

  3. Securite (RLS)
     - Societe (`admin`)              : ses propres boutiques
     - Groupe (`company_super_admin`) : sa societe + ses societes filles
     - Talvex (`super_admin`)         : tout
     Les policies lisent le JWT directement, sans dependre de `get_my_role()` ni
     de `get_my_company_id()` : ces fonctions n'ont aucune source locale, la table
     reste donc reconstructible depuis ce seul fichier.
*/

CREATE TABLE IF NOT EXISTS public.boutiques (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  template_key text,
  status       text        NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS boutiques_company_id_idx
  ON public.boutiques USING btree (company_id);

ALTER TABLE public.boutiques ENABLE ROW LEVEL SECURITY;

-- Societe : uniquement les boutiques de sa propre company.
CREATE POLICY "Admin manage own company boutiques"
  ON public.boutiques AS PERMISSIVE FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
  );

-- Groupe : sa propre company et ses societes filles (necessaire pour la Visu).
CREATE POLICY "CSA manage child company boutiques"
  ON public.boutiques AS PERMISSIVE FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin'
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR company_id IN (
        SELECT c.id FROM public.companies c
        WHERE c.parent_company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      )
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin'
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR company_id IN (
        SELECT c.id FROM public.companies c
        WHERE c.parent_company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      )
    )
  );

-- Talvex Administrateur : acces complet.
CREATE POLICY "SA manage all boutiques"
  ON public.boutiques AS PERMISSIVE FOR ALL TO authenticated
  USING      ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');
