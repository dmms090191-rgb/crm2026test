/*
 * LE RENOUVELLEMENT DEVIENT UNE SEULE OPERATION.
 *
 * ---------- CE QU'IL ETAIT ----------
 *
 * Deux requetes HTTP, donc DEUX transactions : cloturer la periode en cours, puis
 * inserer la nouvelle. Entre les deux, l'etat valide de la base ne contient aucune
 * periode en cours. Si la seconde echoue — reseau, onglet ferme, refus RLS — le bail
 * reste cloture sans remplacant.
 *
 * David : << Soit tout reussit, soit rien ne change. Deux onglets en parallele ne
 * doivent pas pouvoir creer un etat intermediaire incoherent. >>
 *
 * ---------- POURQUOI LE VERROU PORTE SUR LE DOSSIER ----------
 *
 * Le reflexe serait de verrouiller la periode en cours :
 *
 *   SELECT id FROM crm_immo_contrats WHERE cloture_le IS NULL FOR UPDATE;
 *
 * Il ne serialise RIEN, et c'est contre-intuitif. En READ COMMITTED, quand T1 valide,
 * T2 est reveillee et PostgreSQL REEVALUE la clause WHERE sur la version la plus
 * recente de la ligne (EvalPlanQual). Or `cloture_le` n'est plus NULL : la ligne ne
 * qualifie plus, T2 obtient ZERO ligne, croit qu'aucune periode n'est en cours, et
 * insere — pour heurter l'index partiel unique en 23505.
 *
 * Un verrou ne serialise que sur un objet dont l'existence ne depend pas de
 * l'operation. On verrouille donc la ligne du DOSSIER, qui ne bouge pas.
 *
 * ---------- ET POURQUOI ON EXIGE LA PERIODE ATTENDUE ----------
 *
 * Meme avec le bon verrou, deux renouvellements successifs reussiraient tous les deux :
 * T2 attend, relit, trouve la periode TOUTE NEUVE de T1, la cloture a son tour et en
 * insere une troisieme. Aucune erreur, mais le travail de T1 est enterre une seconde
 * apres avoir ete fait.
 *
 * L'appelant annonce donc la periode qu'il croit en cours. Si ce n'est plus elle, on
 * refuse en le disant. C'est le seul moyen de distinguer << je renouvelle ce bail-ci >>
 * de << je renouvelle ce que je trouverai >>.
 *
 * ---------- SECURITY INVOKER, ET C'EST UN CHOIX ----------
 *
 * Les declencheurs du module sont en DEFINER, pour une raison precise, ecrite dans leur
 * migration : ils ecrivent une table AUTRE que celle que l'appelant venait de toucher,
 * et ils ne prennent AUCUN parametre — company_id et dossier_id viennent de la ligne
 * ecrite, donc rien ne peut designer une autre Societe.
 *
 * Cette fonction-ci prend des parametres. En DEFINER, la RLS de crm_immo_contrats ne
 * s'appliquerait plus et n'importe quel `authenticated` pourrait poster le dossier_id
 * d'une autre Societe ; il faudrait recopier les trois policies dans le corps, et elles
 * divergeraient au premier ajustement. Pire : l'index partiel unique porte company_id
 * EN TETE precisement pour que son 23505 ne reponde pas a travers les cloisons — en
 * DEFINER, sans WITH CHECK, il redeviendrait un oracle d'existence.
 *
 * Le seul argument contre INVOKER est le SILENCE : un UPDATE refuse par la RLS ne
 * touche aucune ligne sans rien dire. Il se regle par GET DIAGNOSTICS et un RAISE, pas
 * par un changement de regime de securite.
 *
 * Precedent du depot : lock_upsert_panel_hidden_tabs, le seul autre RPC d'ecriture, est
 * lui aussi en INVOKER, pour la meme raison.
 */

CREATE OR REPLACE FUNCTION public.crm_immo_renouveler(
  p_dossier_id uuid,
  p_periode_attendue uuid,
  p_debut date,
  p_fin date,
  p_jour smallint
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_company   uuid;
  v_active    uuid;
  v_lignes    integer;
  v_nouvelle  uuid;
BEGIN
  /* Les bornes, avant toute ecriture. Les CHECK de la table les refuseraient aussi,
     mais avec un message illisible pour qui lit l'ecran. */
  IF p_debut IS NULL OR p_fin IS NULL THEN
    RAISE EXCEPTION 'Les deux dates sont nécessaires.' USING ERRCODE = 'TLV02';
  END IF;
  IF p_fin < p_debut THEN
    RAISE EXCEPTION 'La date de fin ne peut pas précéder la date de début.' USING ERRCODE = 'TLV02';
  END IF;
  IF p_jour IS NULL OR p_jour < 1 OR p_jour > 31 THEN
    RAISE EXCEPTION 'Le jour d''encaissement doit être entre 1 et 31.' USING ERRCODE = 'TLV02';
  END IF;

  /*
   * LE VERROU. Il porte sur le dossier, et il est pris AVANT toute lecture des
   * periodes : c'est lui qui met les renouvellements concurrents a la file.
   *
   * La RLS s'applique a ce SELECT : un dossier d'une autre Societe est simplement
   * invisible, et on sort par NOT FOUND. company_id vient de la LIGNE lue, jamais d'un
   * parametre — il n'y a donc aucun moyen de designer une Societe voisine.
   */
  SELECT d.company_id INTO v_company
  FROM public.crm_immo_dossiers d
  WHERE d.id = p_dossier_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dossier introuvable ou droits insuffisants.' USING ERRCODE = 'TLV01';
  END IF;

  /* La periode en cours, maintenant que personne d'autre ne peut la changer. */
  SELECT c.id INTO v_active
  FROM public.crm_immo_contrats c
  WHERE c.dossier_id = p_dossier_id
    AND c.company_id = v_company
    AND c.cloture_le IS NULL;

  /*
   * L'ACCORD SUR CE QU'ON RENOUVELLE.
   *
   * `IS DISTINCT FROM` et non `<>` : les deux cotes peuvent etre NULL — premier contrat
   * d'un dossier, ou periode deja cloturee par quelqu'un d'autre. Avec `<>`, NULL rend
   * NULL, donc ni vrai ni faux, et la garde ne se declencherait jamais.
   */
  IF v_active IS DISTINCT FROM p_periode_attendue THEN
    RAISE EXCEPTION 'Ce bail vient d''être modifié par ailleurs. Rouvrez la fiche avant de renouveler.'
      USING ERRCODE = 'TLV03';
  END IF;

  IF v_active IS NOT NULL THEN
    /*
     * CLOTURER AVANT D'INSERER, et ce n'est pas une discipline : l'index partiel
     * unique (company_id, dossier_id) WHERE cloture_le IS NULL interdit deux periodes
     * en cours. Inserer d'abord leverait 23505.
     *
     * auth.uid() rend l'appelant. Sous search_path = '', pg_catalog reste cherche
     * implicitement, et `auth` est nomme en toutes lettres.
     */
    UPDATE public.crm_immo_contrats
       SET cloture_le = now(), cloture_par = auth.uid()
     WHERE id = v_active AND company_id = v_company;

    /*
     * LE SILENCE DE LA RLS, RENDU BRUYANT.
     *
     * Un UPDATE refuse par une policy ne touche aucune ligne et ne leve rien. Sans ce
     * compte, on enchainerait sur l'INSERT en croyant avoir cloture, et l'index
     * repondrait 23505 — un message incomprehensible pour un probleme de droits.
     */
    GET DIAGNOSTICS v_lignes = ROW_COUNT;
    IF v_lignes = 0 THEN
      RAISE EXCEPTION 'Renouvellement refusé : droits insuffisants.' USING ERRCODE = 'TLV04';
    END IF;
  END IF;

  INSERT INTO public.crm_immo_contrats (company_id, dossier_id, debut, fin, jour_encaissement)
  VALUES (v_company, p_dossier_id, p_debut, p_fin, p_jour)
  RETURNING id INTO v_nouvelle;

  /*
   * Rien a faire pour le dossier : trg_sync_dossier_depuis_contrat a deja reporte les
   * trois colonnes sur lui, dans CETTE transaction. Les ecrire ici serait une seconde
   * source pour la meme verite.
   *
   * Et tout ce qui precede partage une seule transaction : si l'INSERT echoue, la
   * cloture est annulee avec. Soit les deux, soit aucune.
   */
  RETURN v_nouvelle;
END; $function$;

/*
 * Les privileges par defaut de Supabase accordent EXECUTE a anon, authenticated et
 * service_role sur toute fonction nouvellement creee. On retire tout, puis on rend a
 * `authenticated` seul : le renouvellement part du navigateur d'un admin connecte, et
 * `anon` n'a rien a faire ici. La RLS reste la vraie barriere — ce GRANT dit seulement
 * qui a le droit d'essayer.
 */
REVOKE ALL ON FUNCTION public.crm_immo_renouveler(uuid, uuid, date, date, smallint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_immo_renouveler(uuid, uuid, date, date, smallint) FROM anon;
REVOKE ALL ON FUNCTION public.crm_immo_renouveler(uuid, uuid, date, date, smallint) FROM service_role;
GRANT EXECUTE ON FUNCTION public.crm_immo_renouveler(uuid, uuid, date, date, smallint) TO authenticated;

COMMENT ON FUNCTION public.crm_immo_renouveler(uuid, uuid, date, date, smallint) IS
  'Renouvelle un bail en UNE transaction : cloture la periode attendue et cree la nouvelle, ou ne change rien. Verrouille la ligne du dossier (pas la periode, qui cesse de qualifier sous READ COMMITTED) et refuse si la periode en cours n''est plus celle annoncee. SECURITY INVOKER : la RLS de crm_immo_contrats s''applique. Codes : TLV01 dossier introuvable, TLV02 dates invalides, TLV03 periode deja changee, TLV04 refus de droits.';
