/*
  # Table `cabinets` — module Cabinet du panel Societe

  1. Objectif
     Une Societe peut gerer PLUSIEURS cabinets, exactement comme elle gere
     plusieurs boutiques. Cette table porte le cabinet lui-meme ; les elements
     futurs (scene 3D, salles, equipements, praticiens, agenda) viendront dans
     des tables ENFANTS referencant `cabinet_id`, jamais comme colonnes
     ajoutees ici. C'est la meme discipline que `boutiques`.

  2. Pourquoi une table dediee, et non une colonne de type sur `boutiques`
     Les enfants d'une boutique declarent `boutique_id ... ON DELETE CASCADE`.
     Faire cohabiter les deux metiers dans une seule table rendrait ces enfants
     ambigus : `boutique_reglages` s'appliquerait aussi aux cabinets, et la
     cascade emporterait des lignes qui ne la concernent pas. Un cabinet aura
     ses propres enfants, rattaches a `cabinet_id`.

  3. Colonnes — miroir de `boutiques`
     - `id`               uuid, cle primaire
     - `company_id`       uuid, la Societe proprietaire (FK -> companies, CASCADE)
     - `name`             text, nom donne par la Societe
     - `template_key`     text nullable : cle du modele d'origine, NULL si cree de zero
     - `template_version` integer nullable : version du modele servie a ce cabinet
     - `status`           text, 'active' par defaut
     - `created_at`       timestamptz, automatique

     `template_version` est presente DES LA CREATION, contrairement a
     `boutiques` qui a du l'ajouter apres coup. La lecon est deja tiree : le
     jour ou un modele de cabinet evoluera, sa v2 se publiera A COTE de la v1 et
     seuls les cabinets dont cette colonne change y passeront. Sans cela,
     publier une v2 modifierait la scene de tous les cabinets existants d'un
     coup, sans retour arriere.

  4. Securite (RLS) — strictement les memes regles que `boutiques`
     - Societe (`admin`)              : ses propres cabinets
     - Groupe (`company_super_admin`) : sa societe + ses societes filles
     - Talvex (`super_admin`)         : tout
     Les policies lisent le JWT directement, sans dependre de `get_my_role()`
     ni de `get_my_company_id()` : ces fonctions n'ont aucune source locale.

  5. Dependance
     La branche Groupe reutilise `public.is_child_company_of_caller(uuid)`,
     creee par 20260914190653_fix_boutiques_csa_policy.sql. Elle existe donc
     deja quand cette migration s'applique. La raison de son existence vaut
     ici a l'identique : un sous-SELECT sur `companies` retournerait toujours
     vide, car un `company_super_admin` n'y voit que sa propre ligne.

  6. Portee
     Cette migration CREE une table neuve. Elle ne modifie aucune table
     existante, aucune policy existante, aucune donnee.
*/

CREATE TABLE IF NOT EXISTS public.cabinets (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  template_key     text,
  template_version integer,
  status           text        NOT NULL DEFAULT 'active',
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cabinets_company_id_idx
  ON public.cabinets USING btree (company_id);

ALTER TABLE public.cabinets ENABLE ROW LEVEL SECURITY;

-- Societe : uniquement les cabinets de sa propre company.
CREATE POLICY "Admin manage own company cabinets"
  ON public.cabinets AS PERMISSIVE FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
  );

-- Groupe : sa propre company et ses societes filles (necessaire pour la Visu).
CREATE POLICY "CSA manage child company cabinets"
  ON public.cabinets AS PERMISSIVE FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin'
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR public.is_child_company_of_caller(company_id)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin'
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR public.is_child_company_of_caller(company_id)
    )
  );

-- Talvex Administrateur : acces complet.
CREATE POLICY "SA manage all cabinets"
  ON public.cabinets AS PERMISSIVE FOR ALL TO authenticated
  USING      ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');
