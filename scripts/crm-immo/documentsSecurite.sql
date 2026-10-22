/*
 * SONDE DE SECURITE DU MODULE DOCUMENTS — a lancer telle quelle, elle s'annule seule.
 *
 * ---------- POURQUOI CE FICHIER NE PEUT PAS ETRE UN TEST TypeScript ----------
 *
 * Ce qu'on verifie ici est la RLS, et la RLS ne se mesure que sous un VRAI role avec un
 * VRAI jeton. `execute_sql` du MCP Supabase tourne en role `postgres`, qui CONTOURNE la
 * RLS : une mesure faite ainsi dirait toujours << tout est accessible >>, ce qui est vrai
 * et sans rapport avec ce que vit l'application. Chaque bloc fait donc
 * `set_config('role', 'authenticated')` et pose des claims JWT, et renvoie `current_user`
 * comme preuve de soi.
 *
 * ---------- ELLE S'ANNULE ELLE-MEME ----------
 *
 * Tout tient dans un bloc DO qui finit par RAISE EXCEPTION : le rapport arrive dans le
 * message d'erreur, et la transaction est annulee. Aucune des Societes, aucun des
 * dossiers ni des documents fabriques ici ne survit — verifie apres coup, et c'est la
 * seule facon honnete de mesurer un cloisonnement sans une seconde Societe reelle.
 *
 * Resultat obtenu le 22 octobre 2026 sur le projet live :
 *   role de mesure ............ authenticated
 *   documents reellement en base : 2 (un chez A, un chez B)
 *   vus au total .............. 1
 *   vus chez A (les miens) .... 1
 *   vus chez B (voisine) ...... 0
 *   SELECT par UUID connu de B  0
 *   UPDATE sur le doc de B .... 0 ligne(s)
 *   DELETE sur le doc de B .... 0 ligne(s)
 *   INSERT document croise .... refuse 23503
 *   INSERT classeur croise .... refuse 23503
 *   chemin Storage de A ....... t
 *   chemin Storage de B ....... f
 *
 * Le refus en 23503 vient de la CLE ETRANGERE COMPOSEE, et non de la RLS : c'est
 * exactement son role. Et ce code ne renseigne sur rien — avec son propre company_id, un
 * appelant obtient 23503 pour tout dossier_id qui ne lui appartient pas, qu'il existe
 * ailleurs ou qu'il n'existe pas du tout.
 */

-- ===========================================================================
-- BLOC A — LE CLOISONNEMENT ENTRE DEUX SOCIETES
-- ===========================================================================
DO $$
DECLARE
  v_a uuid := '87875350-40c8-4ee5-be3b-9398fa4106bf';   -- Bellisimmo, a le module
  v_dossier_a uuid := 'a0f395b2-63e8-4ebf-94d4-7dd2a92b607c';
  v_b uuid; v_dossier_b uuid; v_doc_b uuid; v_user uuid;
  v_vus_a int; v_vus_b int; v_total int;
  v_insert_croise text; v_classeur_croise text; v_lu_par_uuid int;
  v_update_croise int; v_delete_croise int;
  v_chemin_a bool; v_chemin_b bool; v_role text;
BEGIN
  SELECT id INTO v_user FROM auth.users LIMIT 1;

  /* Une seule Societe possede le module aujourd'hui. On en fabrique une seconde DANS la
     transaction : c'est la seule facon de mesurer un cloisonnement, et rien n'en reste. */
  INSERT INTO public.companies (id, name, entity_type)
    VALUES (gen_random_uuid(), 'SONDE Societe B', 'societe') RETURNING id INTO v_b;
  INSERT INTO public.crm_immo_acces (company_id, active) VALUES (v_b, true);
  INSERT INTO public.crm_immo_dossiers (company_id, nom)
    VALUES (v_b, 'SONDE client B') RETURNING id INTO v_dossier_b;

  INSERT INTO public.crm_immo_documents (company_id, dossier_id, nom_affiche, chemin, mime, taille, statut, created_by)
    VALUES (v_a, v_dossier_a, 'bail A.pdf', v_a || '/' || v_dossier_a || '/' || gen_random_uuid() || '.pdf',
            'application/pdf', 1000, 'pret', v_user);
  INSERT INTO public.crm_immo_documents (company_id, dossier_id, nom_affiche, chemin, mime, taille, statut, created_by)
    VALUES (v_b, v_dossier_b, 'SECRET B.pdf', v_b || '/' || v_dossier_b || '/' || gen_random_uuid() || '.pdf',
            'application/pdf', 1000, 'pret', v_user)
    RETURNING id INTO v_doc_b;

  /* On devient un VRAI Admin de la Societe A. */
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user, 'role', 'authenticated',
      'app_metadata', json_build_object('role', 'admin', 'company_id', v_a))::text, true);
  PERFORM set_config('role', 'authenticated', true);
  v_role := current_user;

  SELECT count(*) INTO v_total FROM public.crm_immo_documents;
  SELECT count(*) INTO v_vus_a FROM public.crm_immo_documents WHERE company_id = v_a;
  SELECT count(*) INTO v_vus_b FROM public.crm_immo_documents WHERE company_id = v_b;

  /* L'ATTAQUE PAR UUID CONNU : on connait l'identifiant exact du document de la voisine. */
  SELECT count(*) INTO v_lu_par_uuid FROM public.crm_immo_documents WHERE id = v_doc_b;
  UPDATE public.crm_immo_documents SET nom_affiche = 'vole' WHERE id = v_doc_b;
  GET DIAGNOSTICS v_update_croise = ROW_COUNT;
  DELETE FROM public.crm_immo_documents WHERE id = v_doc_b;
  GET DIAGNOSTICS v_delete_croise = ROW_COUNT;

  /* L'ATTAQUE PAR dossier_id ETRANGER : son propre company_id sur le dossier de l'autre. */
  BEGIN
    INSERT INTO public.crm_immo_documents (company_id, dossier_id, nom_affiche, chemin, mime, taille)
      VALUES (v_a, v_dossier_b, 'intrusion.pdf', v_a || '/x/' || gen_random_uuid() || '.pdf',
              'application/pdf', 10);
    v_insert_croise := 'ACCEPTE -- FAILLE';
  EXCEPTION WHEN others THEN v_insert_croise := 'refuse ' || SQLSTATE;
  END;
  BEGIN
    INSERT INTO public.crm_immo_classeurs (company_id, dossier_id, nom)
      VALUES (v_a, v_dossier_b, 'intrusion');
    v_classeur_croise := 'ACCEPTE -- FAILLE';
  EXCEPTION WHEN others THEN v_classeur_croise := 'refuse ' || SQLSTATE;
  END;

  /* LES POLICIES STORAGE, evaluees sous ce meme jeton. */
  v_chemin_a := public.crm_immo_chemin_autorise(v_a || '/' || v_dossier_a || '/x.pdf');
  v_chemin_b := public.crm_immo_chemin_autorise(v_b || '/' || v_dossier_b || '/x.pdf');

  PERFORM set_config('role', 'postgres', true);

  RAISE EXCEPTION E'BLOC A (transaction annulee)\n'
    '  role de mesure ............ %\n'
    '  documents reellement en base : 2 (un chez A, un chez B)\n'
    '  vus au total .............. %\n'
    '  vus chez A (les miens) .... %\n'
    '  vus chez B (voisine) ...... %   <- doit etre 0\n'
    '  SELECT par UUID connu de B  %   <- doit etre 0\n'
    '  UPDATE sur le doc de B .... % ligne(s)   <- doit etre 0\n'
    '  DELETE sur le doc de B .... % ligne(s)   <- doit etre 0\n'
    '  INSERT document croise .... %\n'
    '  INSERT classeur croise .... %\n'
    '  chemin Storage de A ....... %   <- doit etre true\n'
    '  chemin Storage de B ....... %   <- doit etre false',
    v_role, v_total, v_vus_a, v_vus_b, v_lu_par_uuid,
    v_update_croise, v_delete_croise, v_insert_croise, v_classeur_croise,
    v_chemin_a, v_chemin_b;
END $$;

-- ===========================================================================
-- BLOC B — UNE SOCIETE SANS LE MODULE, ET LE REFUS DE SUPPRIMER
-- ===========================================================================
/*
 * Resultat obtenu le 22 octobre 2026 :
 *   suppression avec un document : TLV06 :: Cette societe possede encore des documents...
 *   suppression sans document ... acceptee (correct)
 *   restauration croisee classeur : {"ecrites": 1, "refusees": [], "anonymisees": 1}
 *   restauration croisee document : {"ecrites": 1, "refusees": [], "anonymisees": 1}
 *   created_by apres restauration : NULL
 *   lignes portant encore l'identite ou la Societe source : 0
 *   table hors liste blanche .... refuse TLV05
 */
DO $$
DECLARE
  v_a uuid := '87875350-40c8-4ee5-be3b-9398fa4106bf';
  v_dossier_a uuid := 'a0f395b2-63e8-4ebf-94d4-7dd2a92b607c';
  v_b uuid; v_dossier_b uuid; v_user uuid; v_user2 uuid;
  v_suppr_bloquee text; v_suppr_apres text;
  v_classeur_id uuid := gen_random_uuid(); v_doc_id uuid := gen_random_uuid();
  v_res_classeur jsonb; v_res_doc jsonb;
  v_auteur uuid; v_survivants int; v_tlv05 text;
  v_sans_module uuid; v_acces_sans_module boolean;
BEGIN
  SELECT id INTO v_user FROM auth.users ORDER BY id LIMIT 1;
  SELECT id INTO v_user2 FROM auth.users ORDER BY id DESC LIMIT 1;

  -- B1. Le refus de supprimer une Societe qui porte encore des documents.
  INSERT INTO public.companies (id, name, entity_type)
    VALUES (gen_random_uuid(), 'SONDE B', 'societe') RETURNING id INTO v_b;
  INSERT INTO public.crm_immo_acces (company_id, active) VALUES (v_b, true);
  INSERT INTO public.crm_immo_dossiers (company_id, nom)
    VALUES (v_b, 'SONDE client') RETURNING id INTO v_dossier_b;
  INSERT INTO public.crm_immo_documents (company_id, dossier_id, nom_affiche, chemin, mime, taille, statut, created_by)
    VALUES (v_b, v_dossier_b, 'bail.pdf', v_b||'/'||v_dossier_b||'/'||gen_random_uuid()||'.pdf',
            'application/pdf', 2048, 'pret', v_user);

  BEGIN
    DELETE FROM public.companies WHERE id = v_b;
    v_suppr_bloquee := 'ACCEPTEE -- LE GARDE-FOU NE MARCHE PAS';
  EXCEPTION WHEN others THEN v_suppr_bloquee := SQLSTATE || ' :: ' || left(SQLERRM, 95);
  END;

  DELETE FROM public.crm_immo_documents WHERE company_id = v_b;
  BEGIN
    DELETE FROM public.companies WHERE id = v_b;
    v_suppr_apres := 'acceptee (correct)';
  EXCEPTION WHEN others THEN v_suppr_apres := 'REFUSEE A TORT : ' || SQLSTATE;
  END;

  -- B2. Une Societe SANS le module n'a aucun acces, meme par un chemin Storage.
  SELECT c.id INTO v_sans_module FROM public.companies c
   WHERE NOT EXISTS (SELECT 1 FROM public.crm_immo_acces a WHERE a.company_id = c.id AND a.active)
   LIMIT 1;

  -- B3. La restauration CROISEE n'emporte aucune identite.
  INSERT INTO public.companies (id, name, entity_type)
    VALUES (gen_random_uuid(), 'SONDE B2', 'societe') RETURNING id INTO v_b;
  INSERT INTO public.crm_immo_acces (company_id, active) VALUES (v_b, true);

  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', v_user2, 'role', 'authenticated',
      'app_metadata', json_build_object('role', 'admin', 'company_id', v_a))::text, true);
  PERFORM set_config('role', 'authenticated', true);

  v_acces_sans_module := public.crm_immo_chemin_autorise(v_sans_module || '/x/y.pdf');

  v_res_classeur := public.crm_immo_restaurer_lot('crm_immo_classeurs',
    jsonb_build_array(jsonb_build_object(
      'id', v_classeur_id, 'company_id', v_b, 'dossier_id', v_dossier_a,
      'nom', 'Pieces restaurees', 'created_by', v_user)), v_a);

  v_res_doc := public.crm_immo_restaurer_lot('crm_immo_documents',
    jsonb_build_array(jsonb_build_object(
      'id', v_doc_id, 'company_id', v_b, 'dossier_id', v_dossier_a,
      'classeur_id', v_classeur_id, 'nom_affiche', 'bail restaure.pdf',
      'chemin', v_a||'/'||v_dossier_a||'/'||v_doc_id||'.pdf',
      'mime', 'application/pdf', 'taille', 4096, 'statut', 'pret',
      'created_by', v_user)), v_a);

  SELECT created_by INTO v_auteur FROM public.crm_immo_documents WHERE id = v_doc_id;
  SELECT count(*) INTO v_survivants FROM public.crm_immo_documents
    WHERE created_by = v_user OR company_id = v_b;

  BEGIN
    PERFORM public.crm_immo_restaurer_lot('companies', '[]'::jsonb, v_a);
    v_tlv05 := 'ACCEPTEE -- FAILLE';
  EXCEPTION WHEN others THEN v_tlv05 := 'refuse ' || SQLSTATE;
  END;

  PERFORM set_config('role', 'postgres', true);

  RAISE EXCEPTION E'BLOC B (transaction annulee)\n'
    '  suppression de Societe AVEC un document : %\n'
    '  suppression de Societe SANS document ... : %\n'
    '  chemin Storage d une Societe sans module : %   <- doit etre false\n'
    '  restauration croisee classeur .......... : %\n'
    '  restauration croisee document .......... : %\n'
    '  created_by du document apres restauration: %   <- doit etre NULL\n'
    '  lignes portant l identite ou la Societe source : %   <- doit etre 0\n'
    '  table hors liste blanche ............... : %',
    v_suppr_bloquee, v_suppr_apres, v_acces_sans_module,
    v_res_classeur::text, v_res_doc::text, coalesce(v_auteur::text, 'NULL'),
    v_survivants, v_tlv05;
END $$;
