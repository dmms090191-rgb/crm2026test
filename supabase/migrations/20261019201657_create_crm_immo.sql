/*
  # CRM IMMO — module metier autonome du panel Societe (V1)

  Migration strictement ADDITIVE : 4 tables neuves, 2 fonctions, 1 declencheur,
  12 contraintes nommees, 6 index, 12 policies. Elle ne modifie aucune table
  existante, aucune policy existante, aucune colonne, aucune donnee.

    crm_immo_acces     qui a le droit d'ouvrir le module (seule source de verite)
    crm_immo_dossiers  les dossiers immobiliers
    crm_immo_colonnes  les colonnes personnalisees (definitions)
    crm_immo_etats     l'etat lu/traite des alertes

  Aucune ligne n'est inseree ici. L'activation du module chez une Societe est
  un INSERT separe, deliberement hors migration : une migration qui ecrit des
  donnees de production s'executerait aussi sur toute base future, y compris
  une base de test.

  LE RAISONNEMENT COMPLET est dans docs/crm-immo/schema-v1-a-relire.sql,
  conserve dans le depot a la demande de David : pourquoi chaque colonne existe,
  ce qui a ete volontairement ECARTE (montant du loyer, adresse du bien,
  colonne `cle`, unicite sur position, drapeau de colonne protegee), les trois
  contraintes anti-doublon, les predicats exacts du badge de la cloche, et le
  piege du jour 31 en fevrier. Ne pas dupliquer ces explications ici : un seul
  endroit, sinon les deux divergent.

  DEPENDANCE : public.is_child_company_of_caller(uuid), creee par
  20260914190653_fix_boutiques_csa_policy.sql.

  ROLLBACK :
    DROP TABLE IF EXISTS public.crm_immo_etats;
    DROP TABLE IF EXISTS public.crm_immo_colonnes;
    DROP TABLE IF EXISTS public.crm_immo_dossiers;
    DROP FUNCTION IF EXISTS public.has_crm_immo_access(uuid);
    DROP TABLE IF EXISTS public.crm_immo_acces;
    DROP FUNCTION IF EXISTS public.update_crm_immo_dossiers_updated_at();
*/


-- ===========================================================================
-- 1. LE DROIT D'ACCES AU MODULE
--    La seule source de verite. Une ligne active = la Societe possede CRM Immo.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.crm_immo_acces (
  company_id  uuid        PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  active      boolean     NOT NULL DEFAULT true,
  accorde_le  timestamptz NOT NULL DEFAULT now(),
  accorde_par uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  note        text
);

COMMENT ON TABLE public.crm_immo_acces IS
  'Droit d''ouvrir le module CRM Immo. Seule source de verite. Ecriture reservee a super_admin. Hors perimetre de sauvegarde : une restauration reecrit company_id et accorderait le module a la mauvaise Societe.';

ALTER TABLE public.crm_immo_acces ENABLE ROW LEVEL SECURITY;

-- Societe : lit sa propre ligne, et seulement en lecture.
CREATE POLICY "Admin read own crm immo access"
  ON public.crm_immo_acces AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
  );

-- Groupe : lit sa ligne et celles de ses societes filles (necessaire a la Visu).
CREATE POLICY "CSA read child company crm immo access"
  ON public.crm_immo_acces AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin'
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR public.is_child_company_of_caller(company_id)
    )
  );

-- Talvex Administrateur : le seul a pouvoir accorder ou retirer le module.
CREATE POLICY "SA manage all crm immo access"
  ON public.crm_immo_acces AS PERMISSIVE FOR ALL TO authenticated
  USING      ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');


-- ===========================================================================
-- 2. LA FONCTION DE CONTROLE
--    SECURITY DEFINER pour lire crm_immo_acces sans dependre de la RLS de
--    cette table, et pour ne pas evaluer une policy par ligne de dossier.
--    Meme forme que is_child_company_of_caller : search_path vide, noms
--    entierement qualifies, execution rendue a `authenticated` seulement.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.has_crm_immo_access(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crm_immo_acces a
    WHERE a.company_id = p_company_id
      AND a.active
  );
$$;

REVOKE ALL ON FUNCTION public.has_crm_immo_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_crm_immo_access(uuid) TO authenticated;


-- ===========================================================================
-- 3. LES DOSSIERS IMMOBILIERS
--    Les 10 champs systeme, plus `valeurs` pour les colonnes personnalisees.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.update_crm_immo_dossiers_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.crm_immo_dossiers (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Les 10 champs systeme.
  nom               text        NOT NULL,
  prenom            text,
  email             text,
  telephone         text,
  date_entree       date,
  date_fin_contrat  date,
  locataire         text,
  proprietaire      text,
  jour_encaissement smallint,
  commentaire       text,

  -- Les valeurs des colonnes personnalisees, indexees par crm_immo_colonnes.id.
  valeurs           jsonb       NOT NULL DEFAULT '{}'::jsonb,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Un nom d'espaces n'est pas un nom : la ligne serait invisible au tableau.
  CONSTRAINT crm_immo_dossiers_nom_non_vide
    CHECK (btrim(nom) <> ''),

  -- 1 a 31 : un bail reel peut dire 31. Le rabattement sur le dernier jour du
  -- mois est fait par le calcul des alertes, pas ici.
  CONSTRAINT crm_immo_dossiers_jour_encaissement_valide
    CHECK (jour_encaissement IS NULL OR jour_encaissement BETWEEN 1 AND 31),

  -- Un contrat ne peut pas finir avant d'avoir commence.
  CONSTRAINT crm_immo_dossiers_dates_coherentes
    CHECK (
      date_entree IS NULL
      OR date_fin_contrat IS NULL
      OR date_fin_contrat >= date_entree
    ),

  -- `valeurs` est un dictionnaire, jamais un tableau ni un scalaire.
  CONSTRAINT crm_immo_dossiers_valeurs_objet
    CHECK (jsonb_typeof(valeurs) = 'object'),

  -- Sert UNIQUEMENT de cible a la cle etrangere composee de crm_immo_etats.
  -- Sans elle, un etat pourrait declarer une Societe differente de son dossier.
  CONSTRAINT crm_immo_dossiers_id_company_unique
    UNIQUE (id, company_id)
);

COMMENT ON COLUMN public.crm_immo_dossiers.valeurs IS
  'Valeurs des colonnes personnalisees, indexees par crm_immo_colonnes.id. Une cle orpheline (colonne supprimee) est inerte : elle n''est jamais lue, et supprimer une colonne ne reecrit donc aucun dossier.';

COMMENT ON COLUMN public.crm_immo_dossiers.jour_encaissement IS
  'Jour du mois (1-31) ou le loyer est encaisse. V1 : mensuel. Une periodicite differente s''ajoutera en colonne voisine, sans reinterpreter celle-ci.';

CREATE TRIGGER trg_crm_immo_dossiers_updated_at
  BEFORE UPDATE ON public.crm_immo_dossiers
  FOR EACH ROW EXECUTE FUNCTION public.update_crm_immo_dossiers_updated_at();

-- Toute requete du module filtre sur company_id.
CREATE INDEX IF NOT EXISTS crm_immo_dossiers_company_id_idx
  ON public.crm_immo_dossiers USING btree (company_id);

-- Le balayage J-30 ne lit que les dossiers qui ont une date de fin.
CREATE INDEX IF NOT EXISTS crm_immo_dossiers_fin_contrat_idx
  ON public.crm_immo_dossiers USING btree (company_id, date_fin_contrat)
  WHERE date_fin_contrat IS NOT NULL;

-- Le balayage des loyers ne lit que les dossiers qui ont un jour d'encaissement.
CREATE INDEX IF NOT EXISTS crm_immo_dossiers_encaissement_idx
  ON public.crm_immo_dossiers USING btree (company_id)
  WHERE jour_encaissement IS NOT NULL;

ALTER TABLE public.crm_immo_dossiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage own company crm immo dossiers"
  ON public.crm_immo_dossiers AS PERMISSIVE FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    AND (SELECT public.has_crm_immo_access(((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid))
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    AND (SELECT public.has_crm_immo_access(((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid))
  );

CREATE POLICY "CSA manage child company crm immo dossiers"
  ON public.crm_immo_dossiers AS PERMISSIVE FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin'
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR public.is_child_company_of_caller(company_id)
    )
    AND public.has_crm_immo_access(company_id)
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin'
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR public.is_child_company_of_caller(company_id)
    )
    AND public.has_crm_immo_access(company_id)
  );

CREATE POLICY "SA manage all crm immo dossiers"
  ON public.crm_immo_dossiers AS PERMISSIVE FOR ALL TO authenticated
  USING      ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');


-- ===========================================================================
-- 4. LES COLONNES PERSONNALISEES (definitions)
--    7 champs. La cle du jsonb des dossiers est l'`id` de la colonne, ce qui
--    rend un renommage gratuit : aucun dossier n'est reecrit.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.crm_immo_colonnes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nom        text        NOT NULL,
  type       text        NOT NULL,
  position   integer     NOT NULL DEFAULT 0,
  masquee    boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT crm_immo_colonnes_nom_non_vide
    CHECK (btrim(nom) <> ''),

  -- Les 4 types V1. En ajouter un plus tard = remplacer cette seule contrainte.
  CONSTRAINT crm_immo_colonnes_type_connu
    CHECK (type IN ('texte', 'nombre', 'date', 'oui_non')),

  CONSTRAINT crm_immo_colonnes_position_positive
    CHECK (position >= 0)
);

COMMENT ON TABLE public.crm_immo_colonnes IS
  'Definitions des colonnes personnalisees CRM Immo, par Societe. Les colonnes systeme ne sont PAS ici : ce sont de vraies colonnes de crm_immo_dossiers, donc structurellement non supprimables.';

COMMENT ON COLUMN public.crm_immo_colonnes.position IS
  'Rang d''affichage. Volontairement NON unique : un glisser-deposer passe par un etat transitoire en doublon. Lire avec ORDER BY position, created_at.';

-- Deux colonnes du meme nom chez la meme Societe est un bug, pas un choix.
CREATE UNIQUE INDEX IF NOT EXISTS crm_immo_colonnes_nom_unique_idx
  ON public.crm_immo_colonnes (company_id, lower(btrim(nom)));

CREATE INDEX IF NOT EXISTS crm_immo_colonnes_company_position_idx
  ON public.crm_immo_colonnes USING btree (company_id, position);

ALTER TABLE public.crm_immo_colonnes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage own company crm immo colonnes"
  ON public.crm_immo_colonnes AS PERMISSIVE FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    AND (SELECT public.has_crm_immo_access(((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid))
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    AND (SELECT public.has_crm_immo_access(((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid))
  );

CREATE POLICY "CSA manage child company crm immo colonnes"
  ON public.crm_immo_colonnes AS PERMISSIVE FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin'
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR public.is_child_company_of_caller(company_id)
    )
    AND public.has_crm_immo_access(company_id)
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin'
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR public.is_child_company_of_caller(company_id)
    )
    AND public.has_crm_immo_access(company_id)
  );

CREATE POLICY "SA manage all crm immo colonnes"
  ON public.crm_immo_colonnes AS PERMISSIVE FOR ALL TO authenticated
  USING      ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');


-- ===========================================================================
-- 5. L'ETAT DES ALERTES
--    Les alertes elles-memes ne sont PAS stockees : elles sont derivees des
--    dates des dossiers. Cette table ne garde que ce que le calcul ne peut pas
--    deviner — ce qu'un humain a fait. Une ligne n'y nait QUE si quelqu'un lit
--    ou traite une alerte.
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.crm_immo_etats (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  dossier_id uuid        NOT NULL,

  genre      text        NOT NULL,
  periode    text        NOT NULL,

  lue_le     timestamptz,
  traitee_le timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT crm_immo_etats_genre_connu
    CHECK (genre IN ('fin_contrat', 'loyer')),

  -- Le format de `periode` depend du genre, et il est verifie :
  --   loyer       -> 'AAAA-MM'    (l'echeance revient le mois suivant)
  --   fin_contrat -> 'AAAA-MM-JJ' (la date de fin : elle ne revient jamais)
  CONSTRAINT crm_immo_etats_periode_valide
    CHECK (
      (genre = 'loyer' AND periode ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
      OR
      (genre = 'fin_contrat' AND periode ~ '^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$')
    ),

  -- LA contrainte anti-doublon : une fin de contrat ne peut pas generer 30
  -- lignes, un loyer revient avec une nouvelle periode.
  CONSTRAINT crm_immo_etats_unique_par_echeance
    UNIQUE (dossier_id, genre, periode),

  -- Cle etrangere COMPOSEE : empeche un etat de reclamer une autre Societe que
  -- celle de son dossier. company_id ne peut donc pas mentir.
  CONSTRAINT crm_immo_etats_dossier_fk
    FOREIGN KEY (dossier_id, company_id)
    REFERENCES public.crm_immo_dossiers (id, company_id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

COMMENT ON TABLE public.crm_immo_etats IS
  'Etat lu/traite des alertes CRM Immo. Les alertes sont derivees des dates, jamais stockees. Badge = alerte derivee sans ligne, ou ligne avec lue_le IS NULL ET traitee_le IS NULL. Traitee = exclue des actives et du badge, mais conservee pour le filtre Traitees.';

-- Pas d'index sur dossier_id seul : la contrainte UNIQUE ci-dessus en cree
-- deja un, dont dossier_id est la premiere colonne.
CREATE INDEX IF NOT EXISTS crm_immo_etats_company_id_idx
  ON public.crm_immo_etats USING btree (company_id);

ALTER TABLE public.crm_immo_etats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage own company crm immo etats"
  ON public.crm_immo_etats AS PERMISSIVE FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    AND (SELECT public.has_crm_immo_access(((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid))
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    AND (SELECT public.has_crm_immo_access(((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid))
  );

CREATE POLICY "CSA manage child company crm immo etats"
  ON public.crm_immo_etats AS PERMISSIVE FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin'
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR public.is_child_company_of_caller(company_id)
    )
    AND public.has_crm_immo_access(company_id)
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin'
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR public.is_child_company_of_caller(company_id)
    )
    AND public.has_crm_immo_access(company_id)
  );

CREATE POLICY "SA manage all crm immo etats"
  ON public.crm_immo_etats AS PERMISSIVE FOR ALL TO authenticated
  USING      ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');
