/*
 * LA RESTAURATION CESSE DE SE SABOTER ELLE-MEME.
 *
 * ---------- LE DEFAUT, MESURE ----------
 *
 * L'ordre de restauration impose les DOSSIERS avant les CONTRATS : la cle etrangere
 * composee (dossier_id, company_id) l'exige. Or restaurer un dossier complet declenche
 * trg_sync_contrat_depuis_dossier, qui cree une periode AVEC UN ID NEUF.
 *
 * Quand crm_immo_contrats arrive ensuite, la periode du FICHIER porte un autre id et
 * `cloture_le IS NULL` : elle heurte l'index partiel unique
 * crm_immo_contrats_une_seule_en_cours -> 23505. Et comme l'envoi se fait par lots de
 * 500, c'est jusqu'a 500 periodes valides perdues d'un coup.
 *
 * ---------- ET CE N'ETAIT PAS LE SEUL ----------
 *
 * QUATRE unicites metier ne sont pas la cle primaire, et aucune n'est absorbee par un
 * `ON CONFLICT (id)` :
 *
 *   crm_immo_contrats   (company_id, dossier_id) WHERE cloture_le IS NULL
 *   crm_immo_loyers     (company_id, dossier_id, echeance) WHERE annule_le IS NULL
 *   crm_immo_etats      (company_id, dossier_id, genre, periode)
 *   crm_immo_colonnes   (company_id, lower(btrim(nom)))
 *
 * Les deux premieres sont des index PARTIELS. PostgREST n'emet qu'une liste de
 * colonnes dans `on_conflict=`, jamais le predicat `WHERE` qu'un index partiel exige
 * pour etre infere : ces deux tables sont donc INUPSERTABLES sur leur cle metier depuis
 * le navigateur, quelle que soit la correction tentee cote client.
 *
 * ---------- LES DEUX CORRECTIONS ----------
 *
 * 1. UN DRAPEAU DE RESTAURATION, pose dans la MEME transaction que l'ecriture.
 *
 *    PostgREST ouvre une transaction par requete HTTP : un set_config pose dans une
 *    requete ne survit pas a la suivante. Le seul montage ou le drapeau et l'ecriture
 *    partagent une transaction est une fonction appelee en RPC, qui fait les deux.
 *
 *    `is_local = true` : le drapeau meurt au COMMIT. Sans cela il survivrait dans une
 *    session mutualisee et recyclee, et fuirait vers les requetes d'autres Societes.
 *
 *    Ce qu'il desactive : UNIQUEMENT l'auto-creation d'une periode depuis un dossier,
 *    et la reecriture des trois colonnes du dossier depuis sa periode. Rien d'autre.
 *    La RLS, les CHECK, les index uniques et les cles etrangeres restent entiers — le
 *    23505 de `une_seule_en_cours` continue d'interdire deux periodes en cours PENDANT
 *    la restauration.
 *
 * 2. UNE ECRITURE LIGNE A LIGNE, dont l'echec ne tue plus ses voisines.
 *
 *    Un lot de 500 qui rencontre un conflit perdait les 500. Chaque ligne est desormais
 *    ecrite dans son propre bloc, et une ligne refusee est RAPPORTEE avec son code et
 *    son message au lieu d'emporter le reste.
 */

-- ---------------------------------------------------------------------------
-- 1. LES DEUX DECLENCHEURS APPRENNENT A SE TAIRE PENDANT UNE RESTAURATION
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_contrat_depuis_dossier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  /*
   * PENDANT UNE RESTAURATION, le fichier fait foi.
   *
   * Creer une periode ici poserait un id NEUF, que le fichier ne contient pas : la
   * periode d'origine arriverait ensuite et heurterait l'index partiel unique. On se
   * tait donc, et crm_immo_contrats restaure ses propres lignes.
   *
   * `current_setting(nom, true)` — la forme a DEUX arguments est obligatoire : sans
   * elle, un GUC jamais pose leve 42704 au lieu de rendre NULL.
   */
  IF coalesce(current_setting('talvex.restauration', true), '') = 'on' THEN
    RETURN NULL;
  END IF;

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
END; $function$;

CREATE OR REPLACE FUNCTION public.garder_dossier_aligne_sur_contrat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  p record;
BEGIN
  /*
   * PENDANT UNE RESTAURATION, le fichier fait foi — meme quand il contient des dates
   * vides. Ramener ces colonnes a la valeur d'une periode encore en base ferait
   * restaurer autre chose que ce que le fichier contient, et le rapport annoncerait
   * une reussite.
   */
  IF coalesce(current_setting('talvex.restauration', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  /*
   * UNIQUEMENT l'incomplet.
   *
   * Les valeurs invalides mais non nulles sont laissees aux CHECK de la table, qui les
   * refusent avec un code d'erreur lisible. Les intercepter ici les rendrait muettes.
   */
  IF NEW.date_entree IS NOT NULL
     AND NEW.date_fin_contrat IS NOT NULL
     AND NEW.jour_encaissement IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.debut, c.fin, c.jour_encaissement INTO p
  FROM public.crm_immo_contrats c
  WHERE c.dossier_id = NEW.id
    AND c.company_id = NEW.company_id
    AND c.cloture_le IS NULL;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  NEW.date_entree       := p.debut;
  NEW.date_fin_contrat  := p.fin;
  NEW.jour_encaissement := p.jour_encaissement;
  RETURN NEW;
END; $function$;

-- ---------------------------------------------------------------------------
-- 2. L'ECRITURE D'UN LOT, SOUS DRAPEAU, LIGNE A LIGNE
-- ---------------------------------------------------------------------------

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
   * SECURITY INVOKER, et c'est tout le modele de securite.
   *
   * La RLS des six tables s'applique a chaque ecriture : un admin ne peut ecrire que
   * dans sa Societe, un Groupe que dans ses filles, et `has_crm_immo_access` reste
   * exigee. Le `company_id` porte par les lignes est donc verifie par le WITH CHECK
   * des policies — il n'a pas a etre revalide ici, et le revalider a la main
   * divergerait des policies au premier ajustement.
   *
   * En SECURITY DEFINER, cette fonction deviendrait au contraire un moyen d'ecrire
   * chez n'importe qui : c'est exactement ce que la regle du module interdit.
   */
  PERFORM set_config('talvex.restauration', 'on', true);

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

  RETURN jsonb_build_object('ecrites', v_ecrites, 'refusees', v_refusees);
END; $function$;

REVOKE ALL ON FUNCTION public.crm_immo_restaurer_lot(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crm_immo_restaurer_lot(text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.crm_immo_restaurer_lot(text, jsonb) FROM service_role;
GRANT EXECUTE ON FUNCTION public.crm_immo_restaurer_lot(text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.crm_immo_restaurer_lot(text, jsonb) IS
  'Ecrit un lot de lignes CRM Immo sous drapeau de restauration (transaction-local), ligne a ligne, en rapportant les refus au lieu de perdre le lot. SECURITY INVOKER : la RLS des six tables s''applique entierement. Le drapeau ne desactive QUE l''auto-creation d''une periode depuis un dossier et la reecriture des colonnes du dossier depuis sa periode.';
