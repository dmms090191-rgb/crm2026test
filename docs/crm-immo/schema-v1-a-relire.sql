/*
  ============================================================================
  CRM IMMO — SCHEMA V1

  CE FICHIER N'EST PAS UNE MIGRATION. Il n'est PAS applique.
  Il est ici pour relecture. Rien n'a touche Supabase.

  Quand tu valides, son contenu part tel quel dans
  supabase/migrations/<horodatage>_create_crm_immo.sql via apply_migration,
  et ce fichier de relecture disparait avec le commit du module.
  ============================================================================

  1. PORTEE

     CREE : 4 tables, 2 fonctions, 1 declencheur, 12 contraintes nommees,
     6 index explicites (+ 6 implicites par cle primaire ou unicite),
     12 policies.
     MODIFIE : rien. Aucune table existante, aucune policy existante,
     aucune donnee, aucune colonne. Migration strictement additive.

     Les quatre tables :

       crm_immo_acces     qui a le droit d'ouvrir le module
       crm_immo_dossiers  les dossiers immobiliers
       crm_immo_colonnes  les colonnes personnalisees (definitions)
       crm_immo_etats     l'etat lu/traite des alertes

     Aucune ligne n'est inseree. L'activation chez Bellisimmo
     (<company_id de la Societe equipee>) est un INSERT separe, que je te
     montrerai a part : une migration qui ecrit des donnees de production
     s'execute aussi sur toute base future, y compris une base de test.

  2. CE QUE J'AI AJOUTE A TA LISTE, ET POURQUOI

     a) `crm_immo_dossiers.valeurs jsonb`
        Les valeurs des colonnes personnalisees. C'est l'arbitrage que tu as
        valide au point 2.

     b) `crm_immo_dossiers.updated_at` + son declencheur
        Tu veux pouvoir modifier un dossier. Sans cette colonne, impossible de
        dire lequel a bouge. Convention deja en place dans le depot :
        update_<table>_updated_at().

     c) `crm_immo_dossiers.created_by`
        Qui a saisi le dossier. FK vers auth.users en ON DELETE SET NULL :
        supprimer un compte ne doit JAMAIS emporter des dossiers immobiliers,
        ni bloquer sa suppression.

     d) `crm_immo_etats.company_id`
        Tu as pose la regle au point 11 : toute table CRM Immo porte
        company_id en CASCADE. Mais cette colonne est aussi deduisible du
        dossier parent — donc elle peut MENTIR. Elle est verrouillee par une
        cle etrangere COMPOSEE (dossier_id, company_id) vers
        crm_immo_dossiers(id, company_id) : il devient impossible d'ecrire un
        etat qui reclame une autre Societe que son dossier. C'est a quoi sert
        l'UNIQUE (id, company_id) sur les dossiers, sans autre role.

     e) `crm_immo_acces.active` et `accorde_par`
        Pour revoquer sans effacer la trace. La source de verite devient
        « une ligne active existe », pas « une ligne existe ».

     f) La fonction `public.has_crm_immo_access(uuid)`
        Pour que « la SEULE source de verite » soit vraie jusque dans la base,
        et pas seulement dans l'interface. Les policies des trois tables de
        donnees l'appellent. Resultat : si tu revoques l'acces, les donnees
        deviennent illisibles le meme instant, meme par une requete directe.

  3. CE QUE JE N'AI PAS AJOUTE, ET POURQUOI

     a) PAS de « montant du loyer », PAS d'« adresse du bien »,
        PAS de « reference contrat », PAS de « garantie ».
        Tu les cites comme EXEMPLES de colonnes personnalisees (point 4 du
        premier brief). Les mettre en colonnes systeme contredirait ton
        intention : chaque agence a les siennes.

     b) PAS de colonne `cle` dans crm_immo_colonnes.
        La cle du jsonb est l'`id` de la colonne. Il est deja unique, deja
        stable, et deja la. Consequence directe : renommer une colonne
        n'ecrit RIEN dans les dossiers — c'est un UPDATE d'une seule ligne.
        Ta liste de 7 colonnes est donc respectee sans un champ de plus.

     c) PAS d'UNIQUE sur (company_id, position).
        Ce serait un piege : reordonner deux colonnes demande d'echanger deux
        positions, et l'echange passe par un etat transitoire en doublon. Avec
        une contrainte unique non differee, supabase-js echouerait au premier
        glisser-deposer. L'ordre se lit donc « ORDER BY position, created_at »
        — jamais « ORDER BY position » seul, sinon deux colonnes de meme
        position s'echangent a chaque rechargement.

     d) PAS de flag « colonne systeme protegee ».
        Les colonnes systeme ne sont pas des lignes de crm_immo_colonnes : ce
        sont de vraies colonnes de crm_immo_dossiers. Elles sont donc
        structurellement hors d'atteinte du bouton Supprimer. Un drapeau
        aurait ete une protection qu'un bug peut contourner ; la, il n'y a
        rien a contourner.

     e) PAS d'index GIN sur `valeurs`.
        La recherche V1 porte sur les champs systeme. Un GIN sur jsonb coute a
        chaque ecriture ; il s'ajoutera le jour ou tu voudras filtrer sur une
        colonne personnalisee, de maniere additive.

     f) PAS de table de notifications.
        Comme valide au point 3 : les alertes sont DERIVEES des dates.
        crm_immo_etats ne contient que ce que le calcul ne peut pas deviner,
        c'est-a-dire ce qu'un humain a fait. Une ligne n'y nait QUE si
        quelqu'un lit ou traite une alerte.

  4. LES TROIS CONTRAINTES ANTI-DOUBLON

     a) crm_immo_etats : UNIQUE (dossier_id, genre, periode)
        C'est exactement la cle que tu as demandee, et c'est elle qui empeche
        les 30 doublons d'une fin de contrat. `periode` vaut :
          - genre 'loyer'       -> 'AAAA-MM'      (ex. '2026-11')
          - genre 'fin_contrat' -> 'AAAA-MM-JJ'   (la date de fin elle-meme)
        Chaque format est verifie par contrainte, par genre.
        Effet voulu : un loyer revient le mois suivant (nouvelle periode), une
        fin de contrat ne revient jamais — sauf si tu CHANGES la date de fin,
        et la c'est une nouvelle echeance, donc une nouvelle alerte. C'est le
        comportement correct.

     b) crm_immo_acces : company_id est la CLE PRIMAIRE.
        Une Societe ne peut pas avoir deux droits d'acces contradictoires.

     c) crm_immo_colonnes : UNIQUE (company_id, lower(btrim(nom)))
        Deux colonnes « Garantie » chez la meme Societe est un bug, pas un
        choix. Insensible a la casse et aux espaces de bord, parce que
        « garantie » et « Garantie  » sont la meme colonne pour l'oeil.

     Volontairement AUCUNE contrainte d'unicite sur crm_immo_dossiers : une
     agence gere legitimement deux dossiers pour le meme nom (deux biens, deux
     baux). Inventer une cle naturelle ici bloquerait du travail reel.

  5. LES PREDICATS EXACTS DE LA CLOCHE

     Une alerte est ACTIVE si elle est derivee des dates ET qu'aucun etat ne
     la marque traitee :

       active   = (alerte derivee) ET (pas de ligne  OU  traitee_le IS NULL)
       traitee  = (alerte derivee) ET (ligne avec     traitee_le IS NOT NULL)
       badge    = (alerte derivee) ET (pas de ligne  OU  (lue_le IS NULL ET
                                                          traitee_le IS NULL))

     Le badge compte donc les NON LUES et NON TRAITEES. Marquer traite sans
     avoir lu retire bien l'alerte du badge, comme tu l'as tranche au point 5.
     Le filtre « Toutes » n'applique aucun des trois.

  6. SECURITE (RLS)

     Les trois tables de donnees portent mot pour mot les policies de
     `cabinets` (20261008184155), avec UNE conjonction en plus sur les
     branches Societe et Groupe : has_crm_immo_access(company_id).

       Societe (admin)                 ses propres lignes, module actif
       Groupe  (company_super_admin)   sa societe + ses filles, module actif
       Talvex  (super_admin)           tout, sans condition de module

     Talvex reste non conditionne, comme sur `cabinets` : sinon tu ne pourrais
     plus nettoyer les donnees d'une Societe a qui tu viens de retirer le
     module. La Visu passe par le role reel du jeton, donc elle suit ces
     regles sans code en plus.

     crm_immo_acces est a part, et c'est voulu :
       - LECTURE : une Societe lit sa ligne, un Groupe lit celles de ses
         filles, Talvex lit tout.
       - ECRITURE : Talvex uniquement. Il n'existe AUCUNE policy
         INSERT/UPDATE/DELETE pour admin ni pour company_super_admin, donc
         l'ecriture est refusee par defaut. Une Societe ne peut pas s'accorder
         le module elle-meme.

     UNE SEULE deviation par rapport au copie-colle de `cabinets`, et elle est
     deliberee : sur la branche Societe, le controle du module interroge le
     company_id DU JETON, pas la colonne de la ligne, et il est enveloppe dans
     un (SELECT ...). La condition d'egalite juste au-dessus garantit deja que
     les deux valent la meme chose, donc le sens est identique ; mais ecrit
     ainsi, Postgres evalue le controle UNE fois par requete au lieu d'une fois
     par dossier. Sur la branche Groupe c'est impossible : la ligne peut
     appartenir a une societe fille, donc le controle doit lire sa colonne.

     Les policies lisent le JWT directement, sans get_my_role() ni
     get_my_company_id() : ces fonctions n'ont aucune source locale.

  7. DEPENDANCES

     - public.is_child_company_of_caller(uuid), creee par
       20260914190653_fix_boutiques_csa_policy.sql. Verifiee presente en live.
     - public.companies(id), auth.users(id), gen_random_uuid().
     Les quatre noms de tables ont ete verifies libres en live.

  8. LE PIEGE DU JOUR 31

     `jour_encaissement` accepte 1 a 31, parce qu'un bail reel peut dire 31.
     Mais fevrier n'a pas de 31. Le calcul de l'echeance doit donc RABATTRE
     sur le dernier jour du mois (jour 31 -> 28/02, ou 29 en annee bissextile).
     Ce n'est pas la base qui le fait : c'est le code de derivation des
     alertes, et ce sera couvert par un test unitaire dedie.

  9. SAUVEGARDE / RESTAURATION  (ta question du point 11)

     A ajouter dans CRM_BACKUP_TABLES (src/pages/admin/views/sauvegarde/
     restoreConstants.ts), categorie 'crm' :
       crm_immo_dossiers, crm_immo_colonnes, crm_immo_etats
     et dans TABLES_WITH_COMPANY_ID (useRestoreCrm.ts), puisqu'elles portent
     toutes company_id.

     A NE PAS AJOUTER : crm_immo_acces.
     Raison mesuree dans le code : useRestoreCrm.ts:214 REECRIT company_id sur
     chaque ligne restauree, avec la company de destination. Une sauvegarde de
     Bellisimmo restauree chez une Societe voisine lui accorderait donc le
     module — exactement l'accident que tu redoutes. Le droit d'acces n'est pas
     une donnee de CRM, c'est une decision de Talvex : il reste hors du
     perimetre de sauvegarde, et seul un super_admin peut l'ecrire.

  10. ROLLBACK

     DROP TABLE IF EXISTS public.crm_immo_etats;
     DROP TABLE IF EXISTS public.crm_immo_colonnes;
     DROP TABLE IF EXISTS public.crm_immo_dossiers;
     DROP FUNCTION IF EXISTS public.has_crm_immo_access(uuid);
     DROP TABLE IF EXISTS public.crm_immo_acces;
     DROP FUNCTION IF EXISTS public.update_crm_immo_dossiers_updated_at();

     Dans cet ordre : les etats avant les dossiers, la fonction avant la table
     qu'elle lit. Aucun objet existant n'est touche par ce rollback.
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
--    Les 10 champs systeme de ton point 8, plus `valeurs` pour les colonnes
--    personnalisees. Rien d'autre.
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
--    Exactement les 7 champs de ton point 2. La cle du jsonb est `id`.
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

  -- LA contrainte anti-doublon que tu as demandee : une fin de contrat ne peut
  -- pas generer 30 lignes, un loyer revient avec une nouvelle periode.
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
