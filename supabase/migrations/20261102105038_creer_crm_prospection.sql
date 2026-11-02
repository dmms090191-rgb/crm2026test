/*
  # CRM PROSPECTION — module du panel Societe (V1)

  Un CRM de prospection simple, demande par David le 02/11/2026 : des personnes a
  contacter, avec leur entreprise, un lien, un statut et un commentaire. Rien d'autre.
  Explicitement ECARTE de cette version a sa demande : automatisations, IA, appels,
  WhatsApp, e-mails automatiques, agenda, scoring, pipeline, historique.

  Migration ADDITIVE : 1 table neuve, 1 fonction, 1 declencheur, 2 index, 2 policies,
  et UNE contrainte ajoutee a une table existante (voir le point 1, elle ne peut pas
  echouer). Elle ne modifie aucune policy existante, aucune colonne existante, aucune
  donnee.

  ---------- CE QUI A ETE AUDITE AVANT D'ECRIRE CECI ----------

  LE SYSTEME DE STATUTS EST REUTILISE, PAS REINVENTE. Exigence premiere de David. Le
  catalogue du panel Societe est public.statuts (id, nom, couleur, company_id), RLS
  active, cloisonne par company_id. C'est celui-la, et pas un autre.

  LE FAUX AMI, MESURE ET ECARTE : public.crm_system_statuses porte le meilleur nom des
  neuf tables candidates — et n'a AUCUN company_id. Ses policies tiennent au seul
  get_my_role() IN ('super_admin','admin') : ses 7 lignes sont lisibles, MODIFIABLES et
  EFFACABLES par l'admin de n'importe quelle Societe. C'est la liste d'etats de la page
  System. Y brancher la colonne Statut aurait donne l'inverse exact de l'isolation
  demandee.

  ---------- POURQUOI statut_id ET PAS statut text ----------

  La convention existante lie par le NOM : leads.statut est un text sans cle etrangere.
  Mesure du 02/11/2026 (role postgres, RLS ignoree) de ce que cela coute : 31 leads sur
  33 portent 'Nouveau', qui n'existe dans AUCUNE ligne de statuts ; supprimer un statut
  ne declenche rien, et la ligne garde une etiquette morte, affichee en bleu de secours
  et introuvable par le filtre Statut ; renommer un statut est impossible.

  Le lien PAR IDENTIFIANT existe deja dans ce meme panel — crm_system_items.status_id
  REFERENCES crm_system_statuses(id) ON DELETE SET NULL — ce n'est donc pas une
  invention. Decision de David apres lecture de l'audit.

  ROLLBACK :
    DROP TABLE IF EXISTS public.crm_prospection_leads;
    DROP FUNCTION IF EXISTS public.update_crm_prospection_leads_updated_at();
    ALTER TABLE public.statuts DROP CONSTRAINT IF EXISTS statuts_id_company_unique;
*/


-- ===========================================================================
-- 1. LA CIBLE DE LA CLE ETRANGERE COMPOSEE
--
--    Une cle etrangere simple (statut_id -> statuts.id) laisserait une Societe
--    pointer le statut d'une AUTRE Societe : rien dans la base ne l'en
--    empecherait, seule la RLS de statuts limiterait ce qu'elle peut LIRE.
--    La cle composee (statut_id, company_id) rend ce pointage impossible.
--
--    `id` etant deja la cle primaire de statuts, cette contrainte ne peut
--    JAMAIS echouer et ne change aucun comportement existant. Meme geste que
--    crm_immo_dossiers_id_company_unique, pose pour la meme raison.
-- ===========================================================================

ALTER TABLE public.statuts
  ADD CONSTRAINT statuts_id_company_unique UNIQUE (id, company_id);


-- ===========================================================================
-- 2. LA TABLE
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.crm_prospection_leads (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Les colonnes demandees, dans l'ordre demande.
  nom         text        NOT NULL,
  prenom      text,
  email       text,
  poste       text,
  entreprise  text,
  lien        text,
  statut_id   uuid,
  commentaire text,

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Un nom d'espaces n'est pas un nom : la ligne serait invisible au tableau.
  CONSTRAINT crm_prospection_leads_nom_non_vide
    CHECK (btrim(nom) <> ''),

  /*
   * LE LIEN EST RENDU DANS UN <a href> OUVERT DANS UN NOUVEL ONGLET, et c'est
   * David qui l'a demande ainsi. Sans borne sur le schema, une valeur
   * `javascript:...` ou `data:text/html,...` devient du code execute AU CLIC,
   * dans la session de qui ouvre le tableau — donc avec son jeton et ses droits.
   *
   * La base refuse, et le front n'a plus a y penser. Aucune table du depot ne
   * contraignait jusqu'ici un champ d'URL : sa_company_prospects.site_internet
   * et .lien_google_maps sont de simples `text DEFAULT ''` sans CHECK.
   */
  CONSTRAINT crm_prospection_leads_lien_http
    CHECK (lien IS NULL OR lien ~* '^https?://'),

  -- Un commentaire de CRM est une note, pas un document. Meme borne que CRM Immo.
  CONSTRAINT crm_prospection_leads_commentaire_borne
    CHECK (commentaire IS NULL OR length(commentaire) <= 5000),

  /*
   * LE STATUT, ET LE PIEGE DE SA SUPPRESSION.
   *
   * ON DELETE SET NULL (statut_id) : LA LISTE DE COLONNES N'EST PAS DECORATIVE.
   * Sur une cle etrangere COMPOSEE, PostgreSQL met a NULL TOUTES les colonnes
   * referencantes quand la liste est absente — donc AUSSI company_id, qui est
   * NOT NULL. La suppression d'un statut echouerait alors sur une violation de
   * contrainte, et David ne pourrait PLUS supprimer un statut depuis sa vue
   * Statuts : le nouveau CRM casserait l'ancien.
   *
   * La syntaxe par colonne exige PostgreSQL 15 ou plus. Mesure du 02/11/2026 :
   * PostgreSQL 17.6.
   *
   * NULL = « Sans statut ». C'est la representation propre de l'absence, la ou
   * le CRM existant emploie la chaine magique 'Nouveau' — qui n'existe dans
   * aucune ligne de statuts et doit etre rattrapee par du code a chaque lecture.
   */
  CONSTRAINT crm_prospection_leads_statut_fkey
    FOREIGN KEY (statut_id, company_id)
    REFERENCES public.statuts (id, company_id)
    ON DELETE SET NULL (statut_id)
);

COMMENT ON TABLE public.crm_prospection_leads IS
  'CRM de prospection du panel Societe. Isole par company_id. Le statut reference public.statuts par cle etrangere composee : une Societe ne peut pas pointer le statut d''une autre.';

/*
 * POURQUOI `entreprise` ET NON `societe`.
 *
 * Dans Talvex, « Societe » designe le locataire : la table companies, la colonne
 * company_id, le niveau de role. Ici le mot designe l'EMPLOYEUR DU PROSPECT. Deux
 * `societe` de sens different dans la meme table se confondraient en six mois, et la
 * confusion porterait precisement sur la cle d'isolation.
 *
 * L'en-tete de colonne affiche bien « Societe », comme David l'a demande : seul le nom
 * technique differe.
 */
COMMENT ON COLUMN public.crm_prospection_leads.entreprise IS
  'Entreprise du PROSPECT (son employeur). Affichee « Societe » dans l''interface. Sans aucun rapport avec companies/company_id, qui est la Societe Talvex proprietaire de la ligne.';

COMMENT ON COLUMN public.crm_prospection_leads.statut_id IS
  'Reference public.statuts(id), le MEME catalogue que le CRM Leads. NULL = sans statut.';


-- ===========================================================================
-- 3. LA DATE DE MODIFICATION
--    Fonction PROPRE au module, et non celle de CRM Immo : reutiliser
--    update_crm_immo_dossiers_updated_at() coupleraient les deux modules, et un
--    DROP FUNCTION dans le rollback de CRM Immo casserait ce declencheur-ci.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.update_crm_prospection_leads_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_prospection_leads_updated_at
  BEFORE UPDATE ON public.crm_prospection_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_crm_prospection_leads_updated_at();


-- ===========================================================================
-- 4. LES INDEX
-- ===========================================================================

-- Toute requete du module filtre sur company_id.
CREATE INDEX IF NOT EXISTS crm_prospection_leads_company_id_idx
  ON public.crm_prospection_leads USING btree (company_id);

-- Le filtre « Statut » de la barre de filtres, et le tri par statut.
CREATE INDEX IF NOT EXISTS crm_prospection_leads_statut_idx
  ON public.crm_prospection_leads USING btree (company_id, statut_id);


-- ===========================================================================
-- 5. LA RLS
--
--    L'AUTORITE EST LE JETON VERIFIE PAR LE SERVEUR, jamais le companyId du
--    navigateur. Mesure du 02/11/2026 en role authenticated : un jeton admin
--    d'une Societe voit 11 leads sur les 33 que voit postgres, et 1 statut sur
--    7 ; en role anon, 0.
--
--    Forme INLINE de la lecture du jeton : c'est la convention des migrations
--    recentes (les 10 dernieres de CRM Immo). La forme get_my_role() /
--    get_my_company_id() existe aussi et reste majoritaire dans le schema ; les
--    deux sont vivantes et equivalentes. On ne melange pas les deux dans une
--    meme politique.
-- ===========================================================================

ALTER TABLE public.crm_prospection_leads ENABLE ROW LEVEL SECURITY;

-- La Societe : ses lignes, et rien d'autre.
CREATE POLICY "Admin manage own company prospection leads"
  ON public.crm_prospection_leads AS PERMISSIVE FOR ALL TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
  );

/*
 * Talvex : partout. C'est la convention du schema — les 20 tables isolees par
 * company_id en ont toutes une — et elle a deux consequences concretes qu'il faut
 * connaitre plutot que decouvrir : la restauration de sauvegarde fonctionne, et une
 * suppression multiple ecrite `.in('id', ids)` SANS `.eq('company_id', ...)` n'est
 * bornee par RIEN quand c'est Talvex qui agit.
 *
 * D'ou la regle, validee par David, tenue cote client ET par un releve : toute
 * suppression porte les DEUX clauses. La RLS est la ceinture, la clause client la
 * bretelle — et pour Talvex, la bretelle est la seule des deux.
 */
CREATE POLICY "SA manage all prospection leads"
  ON public.crm_prospection_leads AS PERMISSIVE FOR ALL TO authenticated
  USING      ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');
