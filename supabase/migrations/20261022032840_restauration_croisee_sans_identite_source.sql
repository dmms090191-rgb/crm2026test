/*
 * UNE RESTAURATION CROISEE NE TRANSPORTE PLUS L'IDENTITE DE PERSONNE.
 *
 * ---------- CE QUI SE PASSAIT ----------
 *
 * Restaurer la sauvegarde d'une Societe A dans une Societe B reecrivait `company_id`,
 * mais laissait intactes les colonnes qui designent des PERSONNES. `auth.users` etant
 * global, la cle etrangere passait sans broncher : B se retrouvait avec des dossiers
 * attribues a des salaries de A, et rien ne le signalait.
 *
 * David : << Je ne veux pas transporter silencieusement l'identite d'un utilisateur
 * d'une Societe vers une autre. Mais ne fabrique pas une fausse attribution
 * historique. >>
 *
 * ---------- LES SIX COLONNES CONCERNEES, ET LEUR NULLABILITE ----------
 *
 * Relevé du 22 octobre 2026 sur les six tables restaurables :
 *
 *   crm_immo_dossiers      created_by                   nullable
 *   crm_immo_commentaires  created_by                   nullable
 *   crm_immo_contrats      created_by, cloture_par      nullables
 *   crm_immo_loyers        encaisse_par, annule_par     nullables
 *   crm_immo_colonnes      (aucune)
 *   crm_immo_etats         (aucune)
 *
 * TOUTES sont nullables. La regle est donc simple, et elle ne fabrique rien : sur une
 * restauration croisee, elles deviennent NULL. Mettre l'utilisateur qui restaure a la
 * place serait precisement la fausse attribution qu'on refuse — il n'a ni cree ce
 * dossier, ni encaisse ce loyer.
 *
 * Les deux CHECK concernes l'acceptent :
 *   crm_immo_contrats_cloture   (cloture_par IS NULL) OR (cloture_le IS NOT NULL)
 *   crm_immo_loyers_annulation  (annule_par IS NULL AND motif IS NULL) OR (annule_le IS NOT NULL)
 * Vider `annule_par` en gardant `annule_le` reste valide par la seconde branche : la
 * trace de l'annulation demeure, seul son auteur disparait.
 *
 * ---------- COMMENT LA FONCTION SAIT QUE LA RESTAURATION EST CROISEE ----------
 *
 * Le client ne reecrit plus `company_id` avant d'envoyer : les lignes arrivent avec
 * celui du FICHIER, et la Societe de destination est passee a part. La fonction compare
 * les deux, LIGNE PAR LIGNE, et c'est elle qui reecrit.
 *
 * C'est ce qui rend la regle verifiable : avant, la fonction recevait des lignes deja
 * reecrites et ne pouvait plus distinguer une restauration croisee d'une restauration
 * sur place.
 *
 * ---------- ET LE CAS << MEME SOCIETE >> ----------
 *
 * Les valeurs du fichier sont conservees telles quelles. Si l'utilisateur qu'elles
 * designent a ete supprime depuis l'export, la cle etrangere leve 23503 : la ligne est
 * RAPPORTEE avec son code, sans emporter ses voisines. On ne devine pas a sa place.
 */

CREATE OR REPLACE FUNCTION public.crm_immo_restaurer_lot(
  p_table text,
  p_lignes jsonb,
  p_company_cible uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_identites   text[];
  v_lot_croise  boolean;
  v_colonnes    text;
  v_maj         text;
  v_sql         text;
  v_ligne       jsonb;
  v_origine     text;
  v_col         text;
  v_ecrites     integer := 0;
  v_anonymisees integer := 0;
  v_refusees    jsonb := '[]'::jsonb;
BEGIN
  /*
   * LA LISTE BLANCHE. Le nom de table ne vient JAMAIS tel quel dans du SQL : il est
   * d'abord compare a une liste close. Un nom hors de cette liste est refuse avant
   * qu'aucun texte ne soit assemble.
   */
  IF p_table NOT IN ('crm_immo_dossiers', 'crm_immo_colonnes', 'crm_immo_etats',
                     'crm_immo_commentaires', 'crm_immo_contrats', 'crm_immo_loyers') THEN
    RAISE EXCEPTION 'Table hors du périmètre CRM Immo : %', p_table USING ERRCODE = 'TLV05';
  END IF;

  IF p_company_cible IS NULL THEN
    RAISE EXCEPTION 'La Société de destination est obligatoire.' USING ERRCODE = 'TLV05';
  END IF;

  IF p_lignes IS NULL OR jsonb_typeof(p_lignes) <> 'array' THEN
    RAISE EXCEPTION 'Les lignes doivent être un tableau JSON.' USING ERRCODE = 'TLV05';
  END IF;
  IF jsonb_array_length(p_lignes) = 0 THEN
    RETURN jsonb_build_object('ecrites', 0, 'anonymisees', 0, 'refusees', '[]'::jsonb);
  END IF;

  /* Les colonnes qui designent une PERSONNE, table par table. Ecrites en toutes
     lettres : une liste deduite d'un motif de nom finirait par rater une colonne ou en
     attraper une qui n'en est pas. */
  v_identites := CASE p_table
    WHEN 'crm_immo_dossiers'     THEN ARRAY['created_by']
    WHEN 'crm_immo_commentaires' THEN ARRAY['created_by']
    WHEN 'crm_immo_contrats'     THEN ARRAY['created_by', 'cloture_par']
    WHEN 'crm_immo_loyers'       THEN ARRAY['encaisse_par', 'annule_par']
    ELSE ARRAY[]::text[]
  END;

  /*
   * LE LOT EST-IL CROISE ? Si au moins une ligne vient d'une autre Societe, les
   * colonnes d'identite doivent entrer dans l'instruction — sinon leur DEFAUT
   * (`auth.uid()` pour trois d'entre elles) s'appliquerait et attribuerait la ligne a
   * celui qui restaure. Exactement la fausse attribution qu'on refuse.
   */
  v_lot_croise := EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_lignes) e
     WHERE (e ->> 'company_id') IS DISTINCT FROM p_company_cible::text
  );

  /*
   * LES COLONNES : celles du catalogue, croisees avec celles que le lot contient, plus
   * `company_id` (toujours reecrit) et les identites quand le lot est croise.
   *
   * Elles viennent du catalogue, pas de l'appelant — un nom inconnu ne peut donc pas
   * entrer dans le SQL. `%I` les echappe de toute facon.
   */
  WITH demandees AS (
    SELECT jsonb_object_keys(p_lignes -> 0) AS nom
    UNION SELECT 'company_id'
    UNION SELECT unnest(v_identites) WHERE v_lot_croise
  )
  SELECT string_agg(format('%I', c.column_name), ', ' ORDER BY c.ordinal_position),
         string_agg(format('%I = EXCLUDED.%I', c.column_name, c.column_name), ', ' ORDER BY c.ordinal_position)
            FILTER (WHERE c.column_name <> 'id')
    INTO v_colonnes, v_maj
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table
    AND c.column_name IN (SELECT nom FROM demandees);

  IF v_colonnes IS NULL THEN
    RAISE EXCEPTION 'Aucune colonne reconnue dans le lot pour %', p_table USING ERRCODE = 'TLV05';
  END IF;

  /* Sans autre colonne que `id`, il n'y a rien a mettre a jour : on ne touche pas. */
  IF v_maj IS NULL THEN
    v_sql := format(
      'INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I, $1) ON CONFLICT (id) DO NOTHING',
      p_table, v_colonnes, v_colonnes, p_table);
  ELSE
    v_sql := format(
      'INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I, $1) ON CONFLICT (id) DO UPDATE SET %s',
      p_table, v_colonnes, v_colonnes, p_table, v_maj);
  END IF;

  /*
   * LE DRAPEAU EST POSE AU PLUS TARD, juste avant les ecritures, et baisse juste
   * apres. Tout ce qui precede — liste blanche, forme du lot, catalogue — se fait sans
   * lui : un refus n'a aucune raison de laisser le drapeau derriere lui.
   *
   * SECURITY INVOKER, et c'est tout le modele de securite : la RLS des six tables
   * s'applique a chaque ecriture, y compris au `company_id` reecrit ici. Un appelant
   * qui viserait une Societe interdite recevrait 42501 sur chaque ligne.
   */
  PERFORM set_config('talvex.restauration', 'on', true);

  FOR v_ligne IN SELECT * FROM jsonb_array_elements(p_lignes)
  LOOP
    /* La Societe d'ORIGINE, lue AVANT d'etre reecrite. */
    v_origine := v_ligne ->> 'company_id';
    v_ligne := jsonb_set(v_ligne, '{company_id}', to_jsonb(p_company_cible), true);

    IF v_origine IS DISTINCT FROM p_company_cible::text THEN
      /* Restauration CROISEE : aucune identite de la Societe source ne passe. */
      FOREACH v_col IN ARRAY v_identites LOOP
        v_ligne := jsonb_set(v_ligne, ARRAY[v_col], 'null'::jsonb, true);
      END LOOP;
      IF array_length(v_identites, 1) > 0 THEN
        v_anonymisees := v_anonymisees + 1;
      END IF;
    END IF;

    /*
     * LIGNE A LIGNE, et chacune dans son propre bloc.
     *
     * Un lot de 500 qui rencontrait un conflit perdait les 500. Le bloc EXCEPTION ouvre
     * une sous-transaction par ligne : une ligne refusee est annulee seule, enregistree
     * avec son code, et les suivantes continuent.
     */
    BEGIN
      EXECUTE v_sql USING v_ligne;
      v_ecrites := v_ecrites + 1;
    EXCEPTION WHEN others THEN
      v_refusees := v_refusees || jsonb_build_object(
        'id', v_ligne ->> 'id',
        'code', SQLSTATE,
        'message', left(SQLERRM, 300));
    END;
  END LOOP;

  PERFORM set_config('talvex.restauration', 'off', true);

  RETURN jsonb_build_object(
    'ecrites', v_ecrites,
    'anonymisees', v_anonymisees,
    'refusees', v_refusees);
END; $function$;

/* L'ancienne signature a deux arguments disparait : la laisser vivre, c'est laisser un
   chemin par lequel une restauration croisee transporterait encore des identites. */
DROP FUNCTION IF EXISTS public.crm_immo_restaurer_lot(text, jsonb);

REVOKE ALL ON FUNCTION public.crm_immo_restaurer_lot(text, jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_immo_restaurer_lot(text, jsonb, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.crm_immo_restaurer_lot(text, jsonb, uuid) FROM service_role;
GRANT EXECUTE ON FUNCTION public.crm_immo_restaurer_lot(text, jsonb, uuid) TO authenticated;

COMMENT ON FUNCTION public.crm_immo_restaurer_lot(text, jsonb, uuid) IS
  'Ecrit un lot de lignes CRM Immo sous drapeau de restauration (transaction-local), ligne a ligne, en rapportant les refus. Reecrit company_id vers la Societe de destination et, quand la ligne vient d''une AUTRE Societe, vide les colonnes qui designent une personne (created_by, cloture_par, encaisse_par, annule_par) : aucune identite de la Societe source ne survit, et aucune fausse attribution n''est fabriquee. SECURITY INVOKER : la RLS des six tables s''applique entierement.';
