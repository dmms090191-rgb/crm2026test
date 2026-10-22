/*
 * LE DRAPEAU NE DOIT VIVRE QUE PENDANT L'ECRITURE QUI LE JUSTIFIE.
 *
 * `set_config(..., true)` est TRANSACTION-local, pas fonction-local. Mesure du
 * 22 octobre 2026 : apres l'appel, dans la meme transaction, le drapeau valait encore
 * << on >>. Dans une transaction neuve il est bien absent — PostgREST ouvrant une
 * transaction par requete HTTP, il ne fuit donc pas en production.
 *
 * Mais cette garantie repose sur la FORME de l'appelant, pas sur la fonction. On la
 * rend locale : le drapeau est baisse avant chaque sortie. Si une exception traverse
 * la fonction, la transaction entiere est de toute facon annulee.
 */

CREATE OR REPLACE FUNCTION public.crm_immo_restaurer_lot(p_table text, p_lignes jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_colonnes  text;
  v_maj       text;
  v_sql       text;
  v_ligne     jsonb;
  v_ecrites   integer := 0;
  v_refusees  jsonb := '[]'::jsonb;
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

  IF p_lignes IS NULL OR jsonb_typeof(p_lignes) <> 'array' THEN
    RAISE EXCEPTION 'Les lignes doivent être un tableau JSON.' USING ERRCODE = 'TLV05';
  END IF;
  IF jsonb_array_length(p_lignes) = 0 THEN
    RETURN jsonb_build_object('ecrites', 0, 'refusees', '[]'::jsonb);
  END IF;

  /*
   * LES COLONNES : celles qui existent VRAIMENT dans la table, et qui sont PRESENTES
   * dans le lot. Elles viennent du catalogue, pas de l'appelant — un nom inconnu ne
   * peut donc pas entrer dans le SQL. `%I` les echappe de toute facon.
   *
   * Prendre l'intersection evite d'ecraser par NULL une colonne que le fichier ne
   * contient pas.
   */
  SELECT string_agg(format('%I', c.column_name), ', ' ORDER BY c.ordinal_position),
         string_agg(format('%I = EXCLUDED.%I', c.column_name, c.column_name), ', ' ORDER BY c.ordinal_position)
            FILTER (WHERE c.column_name <> 'id')
    INTO v_colonnes, v_maj
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = p_table
    AND c.column_name IN (SELECT jsonb_object_keys(p_lignes -> 0));

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
   * s'applique a chaque ecriture. Le drapeau ne desactive QUE l'auto-creation d'une
   * periode depuis un dossier et la reecriture des colonnes du dossier depuis sa
   * periode. Les policies, les CHECK, les index uniques et les cles etrangeres restent
   * entiers.
   */
  PERFORM set_config('talvex.restauration', 'on', true);

  /*
   * LIGNE A LIGNE, et chacune dans son propre bloc.
   *
   * Un lot de 500 qui rencontrait un conflit perdait les 500. Le bloc EXCEPTION ouvre
   * une sous-transaction par ligne : une ligne refusee est annulee seule, enregistree
   * avec son code, et les suivantes continuent.
   *
   * C'est plus lent qu'un seul INSERT — 500 instructions au lieu d'une — et c'est
   * assume : une restauration est rare, une perte silencieuse est definitive.
   */
  FOR v_ligne IN SELECT * FROM jsonb_array_elements(p_lignes)
  LOOP
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

  RETURN jsonb_build_object('ecrites', v_ecrites, 'refusees', v_refusees);
END; $function$;

REVOKE ALL ON FUNCTION public.crm_immo_restaurer_lot(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_immo_restaurer_lot(text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.crm_immo_restaurer_lot(text, jsonb) FROM service_role;
GRANT EXECUTE ON FUNCTION public.crm_immo_restaurer_lot(text, jsonb) TO authenticated;
