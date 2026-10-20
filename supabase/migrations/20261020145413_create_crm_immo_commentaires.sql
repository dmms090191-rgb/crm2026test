/*
  CRM IMMO — L'HISTORIQUE DES COMMENTAIRES D'UN DOSSIER.

  ---------- CE QUI EXISTAIT, ET POURQUOI CE N'EST PAS ASSEZ ----------

  `crm_immo_dossiers.commentaire` est une colonne `text` unique. Chaque modification du
  dossier l'ECRASE : il n'y a pas d'historique, pas de date, pas d'auteur, et une note
  ecrite en mars disparait sans trace quand on en ecrit une en avril. Dans un CRM
  immobilier, ou l'on note des appels, des relances et des etats des lieux, c'est la
  donnee qu'on consulte le plus et la seule qu'on ne peut pas relire.

  ---------- POURQUOI UNE TABLE, ET NON UN JSONB ----------

  Exigence explicite de David : << Ne stocke pas tout l'historique dans un gros JSON. >>
  Elle est fondee. Un tableau jsonb dans la ligne du dossier :
    - se reecrit ENTIEREMENT a chaque ajout, donc deux onglets ouverts se perdent
      mutuellement des commentaires, en silence ;
    - ne peut pas porter de cle etrangere vers auth.users pour l'auteur ;
    - ne se compte pas sans lire toute la ligne, alors que le tableau doit afficher
      << Commentaires (3) >> sur chaque ligne ;
    - grossit la ligne du dossier, qui est lue a chaque rendu du tableau.

  ---------- LA COLONNE `commentaire` N'EST PAS SUPPRIMEE ----------

  Elle reste en base, et elle reste remplissable. Regle de la maison : on masque, on ne
  supprime pas. Le front cesse de l'afficher comme un long texte et cesse d'y ecrire,
  mais une Societe qui aurait deja saisi quelque chose ne le perd pas.

  Mesure faite avant d'ecrire cette migration, en `postgres` :
    SELECT count(*) FROM crm_immo_dossiers  ->  0 ligne, 0 commentaire, 0 Societe.
  Aucune donnee a reprendre : la reprise serait du code mort des sa premiere execution.

  ---------- LE CLOISONNEMENT ----------

  La cle etrangere est COMPOSEE — (dossier_id, company_id) vers
  crm_immo_dossiers(id, company_id) — exactement comme crm_immo_etats. Ce n'est pas une
  coquetterie : avec une FK simple sur `dossier_id`, une Societe pourrait inserer un
  commentaire portant SON company_id sur le dossier d'une voisine, et la RLS le
  laisserait passer puisqu'elle ne regarde que company_id. La cle composee rend cette
  ligne impossible a ecrire : company_id ne peut pas mentir.

  AUCUNE CONTRAINTE D'UNICITE. C'est volontaire, et c'est aussi ce qui evite ici
  l'oracle de contenu corrige le 19 octobre sur crm_immo_etats : un index unique est
  verifie HORS RLS, donc son erreur 23505 repond a travers les cloisons. Plusieurs
  commentaires par dossier sont le propre d'un historique — il n'y a donc rien a rendre
  unique, et rien qui puisse repondre.

  ---------- LES DROITS ----------

  Les trois memes politiques que les trois autres tables de donnees, au mot pres :
  Admin sur sa Societe, Groupe sur ses filles, Talvex partout — et TOUTES conditionnees a
  has_crm_immo_access(). Aucune logique de droit parallele : les commentaires suivent
  exactement le droit du dossier.

  ROLLBACK :
    DROP TABLE public.crm_immo_commentaires;
  (la table est nouvelle et vide : le rollback ne perd rien)
*/

CREATE TABLE public.crm_immo_commentaires (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  dossier_id  uuid NOT NULL,
  contenu     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  /* auth.uid() par defaut : l'auteur n'est alors pas une valeur que le client
     choisit d'envoyer ou non. ON DELETE SET NULL — un commentaire survit au depart
     de la personne qui l'a ecrit, comme un dossier survit a son createur. */
  created_by  uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT crm_immo_commentaires_contenu_non_vide
    CHECK (btrim(contenu) <> ''),

  /* 5000 caracteres, soit environ deux pages. Un commentaire de CRM est une note, pas
     un document : sans borne, un copier-coller malheureux grossit la sauvegarde de la
     Societe et la liste devient illisible. La borne est large a dessein. */
  CONSTRAINT crm_immo_commentaires_contenu_borne
    CHECK (char_length(contenu) <= 5000),

  CONSTRAINT crm_immo_commentaires_dossier_fk
    FOREIGN KEY (dossier_id, company_id)
    REFERENCES public.crm_immo_dossiers(id, company_id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

/*
  L'index sert les DEUX lectures du module, et la cascade :
    - la liste d'un dossier, du plus recent au plus ancien ;
    - le compte par dossier, pour << Commentaires (3) >> sur chaque ligne du tableau ;
    - la suppression en cascade, qui cherche (dossier_id, company_id) — servie par le
      prefixe (company_id, dossier_id).
  Sans lui, supprimer un dossier balayerait toute la table.
*/
CREATE INDEX crm_immo_commentaires_dossier_recent_idx
  ON public.crm_immo_commentaires (company_id, dossier_id, created_at DESC);

ALTER TABLE public.crm_immo_commentaires ENABLE ROW LEVEL SECURITY;

/* ---------------------------------------------------------------------------
   LES TROIS POLITIQUES, copiees sur celles de crm_immo_dossiers.

   Toutes passent par has_crm_immo_access() : une Societe qui perd le module perd
   l'acces a ses commentaires au meme instant qu'a ses dossiers, sans second reglage.
   --------------------------------------------------------------------------- */

CREATE POLICY "Admin manage own company crm immo commentaires"
  ON public.crm_immo_commentaires FOR ALL TO authenticated
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

CREATE POLICY "CSA manage child company crm immo commentaires"
  ON public.crm_immo_commentaires FOR ALL TO authenticated
  USING (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin')
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR public.is_child_company_of_caller(company_id)
    )
    AND public.has_crm_immo_access(company_id)
  )
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin')
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR public.is_child_company_of_caller(company_id)
    )
    AND public.has_crm_immo_access(company_id)
  );

CREATE POLICY "SA manage all crm immo commentaires"
  ON public.crm_immo_commentaires FOR ALL TO authenticated
  USING (((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'))
  WITH CHECK (((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'));

COMMENT ON TABLE public.crm_immo_commentaires IS
  'Historique des commentaires d''un dossier CRM Immo : une ligne par commentaire, jamais ecrasee. Remplace l''usage de crm_immo_dossiers.commentaire, qui reste en base mais n''est plus alimentee par l''interface. Cle etrangere COMPOSEE (dossier_id, company_id) : company_id ne peut pas mentir, et supprimer un dossier emporte ses commentaires.';

COMMENT ON COLUMN public.crm_immo_commentaires.created_by IS
  'auth.uid() par defaut. ON DELETE SET NULL : un commentaire survit au depart de son auteur.';
