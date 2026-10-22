/*
  L'ECHEANCIER DES LOYERS, ET LE RENOUVELLEMENT DE CONTRAT.

  ---------- LE PRINCIPE : ON NE STOCKE PAS CE QUI SE CALCULE ----------

  L'echeancier n'est PAS une table. Il se derive de (debut, fin, jour_encaissement),
  exactement comme les alertes se derivent des dates depuis l'origine du module. Un bail
  de trois ans ne pose donc aucune ligne : ni trente-six echeances vides, ni rien a
  regenerer le jour ou le jour d'encaissement change. Une donnee derivee qu'on stocke
  finit toujours par mentir sur sa source.

  Deux choses, et deux seulement, ne se derivent pas :

    - les PERIODES de contrat, parce que renouveler ecraserait l'ancienne ;
    - les ENCAISSEMENTS, parce qu'un paiement est un fait humain que rien ne calcule.

  ---------- CE QUI N'EST PAS UNE PREUVE DE PAIEMENT ----------

  `crm_immo_etats.traitee_le` ressemble a << encaisse >>. Ce n'en est pas un, et la base
  le dit elle-meme : << Traitee = exclue des actives et du badge >>. C'est l'etat d'une
  NOTIFICATION. On traite une alerte parce qu'on a appele le locataire. S'en servir
  declarerait en plus << non encaisses >> tous les loyers anterieurs au module, faute de
  ligne pour les porter.

  ROLLBACK :
    DROP TRIGGER trg_sync_contrat_depuis_dossier ON public.crm_immo_dossiers;
    DROP TABLE public.crm_immo_loyers;
    DROP TABLE public.crm_immo_contrats;
    DROP FUNCTION public.sync_contrat_depuis_dossier();
    DROP FUNCTION public.sync_dossier_depuis_contrat();
    DROP FUNCTION public.garde_crm_immo_loyers();
*/

-- ============================================================================
-- 1. LES PERIODES DE CONTRAT — toutes, y compris celle en cours
-- ============================================================================

CREATE TABLE public.crm_immo_contrats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  /* La cle COMPOSEE vers (id, company_id) empeche company_id de mentir : une ligne ne
     peut pas se declarer d'une Societe et pointer le dossier d'une autre. */
  company_id uuid NOT NULL,
  dossier_id uuid NOT NULL,

  debut date NOT NULL,
  fin   date NOT NULL,
  jour_encaissement smallint NOT NULL,

  /*
   * NULL = la periode EN COURS. Non NULL = une periode d'historique.
   *
   * Pas de booleen `actif` : deux lignes pourraient alors se dire actives, et il
   * faudrait du code pour l'empecher. Un horodatage NULL, avec l'index partiel plus
   * bas, rend l'unicite STRUCTURELLE.
   */
  cloture_le  timestamptz,
  cloture_par uuid,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),

  CONSTRAINT crm_immo_contrats_ordre   CHECK (fin >= debut),
  CONSTRAINT crm_immo_contrats_jour    CHECK (jour_encaissement BETWEEN 1 AND 31),
  CONSTRAINT crm_immo_contrats_cloture CHECK (cloture_par IS NULL OR cloture_le IS NOT NULL),

  CONSTRAINT crm_immo_contrats_dossier_fkey
    FOREIGN KEY (dossier_id, company_id)
    REFERENCES public.crm_immo_dossiers(id, company_id) ON DELETE CASCADE
);

/*
 * UNE SEULE periode en cours par dossier, garantie par la base.
 *
 * `company_id` est EN TETE, deliberement : un index unique est verifie HORS RLS, donc
 * son 23505 repondrait a travers les cloisons et dirait a une Societe voisine qu'une
 * ligne existe. C'est l'oracle de contenu corrige le 19 octobre sur crm_immo_etats ; on
 * ne le rouvre pas ici.
 *
 * Effet de bord voulu : un renouvellement DOIT cloturer avant d'inserer, sans quoi la
 * base refuse. L'ordre du renouvellement n'est plus une discipline, c'est une regle.
 */
CREATE UNIQUE INDEX crm_immo_contrats_une_seule_en_cours
  ON public.crm_immo_contrats (company_id, dossier_id) WHERE cloture_le IS NULL;

/* L'historique d'un dossier, de la periode en cours a la plus ancienne. */
CREATE INDEX crm_immo_contrats_historique_idx
  ON public.crm_immo_contrats (company_id, dossier_id, debut DESC);

-- ============================================================================
-- 2. LES ENCAISSEMENTS
-- ============================================================================

CREATE TABLE public.crm_immo_loyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  dossier_id uuid NOT NULL,

  /*
   * L'ECHEANCE REELLE, et non la periode 'AAAA-MM'.
   *
   * Deux raisons. C'est d'abord ce que l'utilisateur voit : la ligne qu'il coche porte
   * une date. Et une periode serait AMBIGUE apres un renouvellement — si un bail finit
   * le 20 octobre et que le suivant commence le 21, le mois 2026-10 appartiendrait aux
   * deux. Une date, elle, n'appartient qu'a une seule periode.
   *
   * Consequence voulue : l'encaissement SURVIT au renouvellement. Il est attache au
   * loyer, pas au contrat qui l'a fait naitre.
   */
  echeance date NOT NULL,

  encaisse_le  timestamptz NOT NULL DEFAULT now(),
  encaisse_par uuid DEFAULT auth.uid(),

  /*
   * L'ANNULATION GARDE SA TRACE.
   *
   * Une ligne annulee ne compte plus comme encaissee — l'echeance redevient due — mais
   * la correction reste lisible, avec sa date, son auteur et son motif. Un encaissement
   * ne se supprime pas : il s'annule.
   */
  annule_le        timestamptz,
  annule_par       uuid,
  motif_annulation text,

  created_at timestamptz NOT NULL DEFAULT now(),

  /* On ne peut pas poser un auteur ou un motif d'annulation sans annulation. */
  CONSTRAINT crm_immo_loyers_annulation CHECK (
    (annule_par IS NULL AND motif_annulation IS NULL) OR annule_le IS NOT NULL
  ),
  CONSTRAINT crm_immo_loyers_motif_borne CHECK (
    motif_annulation IS NULL OR char_length(motif_annulation) <= 500
  ),

  CONSTRAINT crm_immo_loyers_dossier_fkey
    FOREIGN KEY (dossier_id, company_id)
    REFERENCES public.crm_immo_dossiers(id, company_id) ON DELETE CASCADE
);

/*
 * UN SEUL encaissement ACTIF par echeance — les annules s'empilent librement.
 *
 * C'est la clause WHERE qui rend l'annulation possible sans perdre la trace : sans
 * elle, un loyer encaisse puis annule puis re-encaisse heurterait l'unicite, et il
 * faudrait reecrire la ligne annulee — donc effacer la correction qu'on voulait garder.
 */
CREATE UNIQUE INDEX crm_immo_loyers_un_actif_par_echeance
  ON public.crm_immo_loyers (company_id, dossier_id, echeance) WHERE annule_le IS NULL;

/* Tout l'echeancier d'un dossier en une lecture. */
CREATE INDEX crm_immo_loyers_par_dossier_idx
  ON public.crm_immo_loyers (company_id, dossier_id, echeance);

-- ============================================================================
-- 3. LA SYNCHRONISATION — une seule verite
-- ============================================================================
--
-- Les trois colonnes du dossier (date_entree, date_fin_contrat, jour_encaissement)
-- restent : elles alimentent le tableau, la recherche, le tri, les alertes, la
-- sauvegarde et le formulaire. Mais elles ne sont plus qu'un REFLET de la periode en
-- cours, tenu par la base et non par la discipline.
--
-- DEUX declencheurs, et chacun porte une garde STRICTE : il n'ecrit que si les valeurs
-- different reellement. C'est cette garde qui arrete la recursion — un UPDATE dont le
-- WHERE ne retient aucune ligne ne declenche rien, donc la chaine s'arrete au premier
-- aller-retour, toujours.
--
-- SECURITY DEFINER, et pourquoi : en INVOKER, un UPDATE bloque par la RLS ne toucherait
-- aucune ligne EN SILENCE, et les deux tables divergeraient sans que rien ne le signale.
-- Le pouvoir est borne de trois facons, verifiables ligne par ligne ci-dessous :
--   - `search_path = ''` : aucun nom n'est resolu ailleurs que la ou il est ecrit ;
--   - company_id et dossier_id viennent de la LIGNE ECRITE, jamais d'un parametre : il
--     n'existe aucun moyen de designer une autre Societe ;
--   - EXECUTE est retire a PUBLIC juste apres, comme pour has_crm_immo_access.

CREATE OR REPLACE FUNCTION public.sync_dossier_depuis_contrat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  /* Pris sur la ligne ecrite. Aucun appelant ne peut les choisir. */
  d_id uuid := COALESCE(NEW.dossier_id, OLD.dossier_id);
  c_id uuid := COALESCE(NEW.company_id, OLD.company_id);
  p    record;
BEGIN
  /*
   * La periode en cours. A defaut, la plus RECENTE.
   *
   * Pourquoi ce repli : un bail arrive a terme et non renouvele n'a plus de periode en
   * cours. Vider les dates du dossier effacerait alors sa date de fin — donc son alerte
   * de fin de contrat et sa colonne dans le tableau. Un dossier doit continuer a
   * montrer son dernier contrat connu.
   */
  SELECT debut, fin, jour_encaissement INTO p
  FROM public.crm_immo_contrats
  WHERE dossier_id = d_id AND company_id = c_id
  ORDER BY (cloture_le IS NULL) DESC, debut DESC
  LIMIT 1;

  /* Plus aucune periode : on ne touche a rien. Les colonnes gardent ce qui a ete saisi,
     et aucune periode ne vient les contredire. */
  IF NOT FOUND THEN RETURN NULL; END IF;

  UPDATE public.crm_immo_dossiers
     SET date_entree       = p.debut,
         date_fin_contrat  = p.fin,
         jour_encaissement = p.jour_encaissement
   WHERE id = d_id AND company_id = c_id
     AND (date_entree       IS DISTINCT FROM p.debut
       OR date_fin_contrat  IS DISTINCT FROM p.fin
       OR jour_encaissement IS DISTINCT FROM p.jour_encaissement);

  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_contrat_depuis_dossier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  /*
   * Un contrat INCOMPLET n'est pas un contrat.
   *
   * On ne fabrique pas de periode a partir d'une saisie a moitie remplie, ni d'une
   * periode a l'envers que la table refuserait. Le dossier garde ses valeurs,
   * l'echeancier dit qu'il n'y a pas encore de periode, et les deux disent vrai.
   */
  IF NEW.date_entree IS NULL OR NEW.date_fin_contrat IS NULL OR NEW.jour_encaissement IS NULL
     OR NEW.date_fin_contrat < NEW.date_entree
     OR NEW.jour_encaissement < 1 OR NEW.jour_encaissement > 31 THEN
    RETURN NULL;
  END IF;

  /* NEW.id et NEW.company_id viennent de la ligne ecrite, que la RLS vient d'autoriser. */
  UPDATE public.crm_immo_contrats
     SET debut = NEW.date_entree, fin = NEW.date_fin_contrat,
         jour_encaissement = NEW.jour_encaissement
   WHERE dossier_id = NEW.id AND company_id = NEW.company_id AND cloture_le IS NULL
     AND (debut             IS DISTINCT FROM NEW.date_entree
       OR fin               IS DISTINCT FROM NEW.date_fin_contrat
       OR jour_encaissement IS DISTINCT FROM NEW.jour_encaissement);

  /* Rien mis a jour ET aucune periode en cours : c'est le premier contrat du dossier. */
  IF NOT FOUND AND NOT EXISTS (
    SELECT 1 FROM public.crm_immo_contrats
     WHERE dossier_id = NEW.id AND company_id = NEW.company_id AND cloture_le IS NULL
  ) THEN
    INSERT INTO public.crm_immo_contrats (company_id, dossier_id, debut, fin, jour_encaissement)
    VALUES (NEW.company_id, NEW.id, NEW.date_entree, NEW.date_fin_contrat, NEW.jour_encaissement);
  END IF;

  RETURN NULL;
END; $$;

-- ============================================================================
-- 4. LE GARDE DES ENCAISSEMENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.garde_crm_immo_loyers()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  /* Une annulation ne se defait pas : elle EST la trace de la correction. Pour
     re-encaisser, on cree une NOUVELLE ligne — l'index partiel le permet. */
  IF TG_OP = 'UPDATE' AND OLD.annule_le IS NOT NULL THEN
    RAISE EXCEPTION 'crm_immo_loyers : une annulation est definitive, creez un nouvel encaissement'
      USING ERRCODE = '42501';
  END IF;

  /* Et un encaissement ne s'efface pas : il s'annule. Sans cela, la trace demandee se
     perdrait d'un simple DELETE. */
  IF TG_OP = 'DELETE' AND current_user NOT IN ('postgres', 'supabase_admin') THEN
    RAISE EXCEPTION 'crm_immo_loyers : un encaissement s annule, il ne se supprime pas'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE(NEW, OLD);
END; $$;

-- ============================================================================
-- 5. LES DECLENCHEURS
-- ============================================================================

CREATE TRIGGER trg_sync_dossier_depuis_contrat
  AFTER INSERT OR UPDATE OR DELETE ON public.crm_immo_contrats
  FOR EACH ROW EXECUTE FUNCTION public.sync_dossier_depuis_contrat();

CREATE TRIGGER trg_sync_contrat_depuis_dossier
  AFTER INSERT OR UPDATE ON public.crm_immo_dossiers
  FOR EACH ROW EXECUTE FUNCTION public.sync_contrat_depuis_dossier();

CREATE TRIGGER trg_garde_crm_immo_loyers
  BEFORE UPDATE OR DELETE ON public.crm_immo_loyers
  FOR EACH ROW EXECUTE FUNCTION public.garde_crm_immo_loyers();

-- ============================================================================
-- 6. LE POUVOIR DES FONCTIONS, REDUIT AU STRICT NECESSAIRE
-- ============================================================================
--
-- CREATE FUNCTION accorde EXECUTE a PUBLIC par defaut. Pour une fonction
-- SECURITY DEFINER, cela veut dire : n'importe qui peut l'appeler avec les droits de
-- son proprietaire. Ces trois-la n'ont aucune raison d'etre appelees a la main — un
-- declencheur s'execute sans que l'appelant ait besoin du droit EXECUTE.
--
-- C'est exactement ce qui a ete fait pour has_crm_immo_access : ni PUBLIC, ni anon.

REVOKE ALL ON FUNCTION public.sync_dossier_depuis_contrat()  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_contrat_depuis_dossier()  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.garde_crm_immo_loyers()        FROM PUBLIC;

-- ============================================================================
-- 7. LES DROITS SUR LES TABLES
-- ============================================================================

ALTER TABLE public.crm_immo_contrats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_immo_loyers   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage own company crm immo contrats"
  ON public.crm_immo_contrats FOR ALL TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    AND (SELECT public.has_crm_immo_access(((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid))
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    AND (SELECT public.has_crm_immo_access(((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid))
  );

CREATE POLICY "CSA manage child company crm immo contrats"
  ON public.crm_immo_contrats FOR ALL TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin')
    AND (company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
         OR public.is_child_company_of_caller(company_id))
    AND public.has_crm_immo_access(company_id)
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin')
    AND (company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
         OR public.is_child_company_of_caller(company_id))
    AND public.has_crm_immo_access(company_id)
  );

CREATE POLICY "SA manage all crm immo contrats"
  ON public.crm_immo_contrats FOR ALL TO authenticated
  USING      (((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'))
  WITH CHECK (((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'));

CREATE POLICY "Admin manage own company crm immo loyers"
  ON public.crm_immo_loyers FOR ALL TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    AND (SELECT public.has_crm_immo_access(((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid))
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    AND (SELECT public.has_crm_immo_access(((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid))
  );

CREATE POLICY "CSA manage child company crm immo loyers"
  ON public.crm_immo_loyers FOR ALL TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin')
    AND (company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
         OR public.is_child_company_of_caller(company_id))
    AND public.has_crm_immo_access(company_id)
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin')
    AND (company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
         OR public.is_child_company_of_caller(company_id))
    AND public.has_crm_immo_access(company_id)
  );

CREATE POLICY "SA manage all crm immo loyers"
  ON public.crm_immo_loyers FOR ALL TO authenticated
  USING      (((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'))
  WITH CHECK (((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'));

-- ============================================================================
-- 8. LA REPRISE DE L'EXISTANT
-- ============================================================================
--
-- Chaque dossier dont le contrat est COMPLET recoit sa periode en cours. Les autres
-- n'en recoivent aucune : on ne fabrique pas une periode a partir d'une saisie
-- incomplete.
--
-- Aucune donnee n'est modifiee. On ne fait que REFLETER dans la nouvelle table ce que
-- le dossier dit deja — le declencheur de synchronisation, en retour, ne trouvera donc
-- aucune difference et n'ecrira rien.

INSERT INTO public.crm_immo_contrats (company_id, dossier_id, debut, fin, jour_encaissement)
SELECT company_id, id, date_entree, date_fin_contrat, jour_encaissement
FROM public.crm_immo_dossiers
WHERE date_entree IS NOT NULL
  AND date_fin_contrat IS NOT NULL
  AND jour_encaissement IS NOT NULL
  AND date_fin_contrat >= date_entree
  AND jour_encaissement BETWEEN 1 AND 31;

-- ============================================================================
-- 9. LA DOCUMENTATION EN BASE
-- ============================================================================

COMMENT ON TABLE public.crm_immo_contrats IS
  'Les PERIODES de contrat d''un dossier, historique compris. La periode en cours est celle dont cloture_le est NULL, et un index partiel garantit qu''il n''y en a jamais deux — donc qu''un renouvellement cloture avant de creer. Les trois colonnes du dossier (date_entree, date_fin_contrat, jour_encaissement) en sont un REFLET tenu par declencheur : cette table est la source. L''echeancier n''est PAS stocke, il se derive de (debut, fin, jour_encaissement).';

COMMENT ON TABLE public.crm_immo_loyers IS
  'Les ENCAISSEMENTS reellement constates. Une ligne n''existe que si le loyer a ete encaisse : l''absence vaut non encaisse, comme pour crm_immo_etats. Une annulation pose annule_le et CONSERVE la ligne — elle ne compte plus comme encaissee, mais la correction reste lisible. Un index partiel n''autorise qu''UN encaissement actif par echeance, et autant d''annules qu''il le faut. La cle est l''echeance REELLE et non le mois, parce qu''un renouvellement peut partager un mois entre deux periodes.';

COMMENT ON COLUMN public.crm_immo_loyers.echeance IS
  'La date du loyer. L''encaissement y est attache, donc il survit a un renouvellement de contrat.';

COMMENT ON COLUMN public.crm_immo_contrats.cloture_le IS
  'NULL = periode EN COURS. Un index partiel unique garantit qu''il n''y en a qu''une par dossier.';
