-- =============================================================================
-- SONDE : LA RESTAURATION CRM IMMO
--
-- A executer telle quelle dans le SQL Editor de Supabase, ou par MCP.
-- Elle N'ECRIT RIEN : chaque bloc leve une exception a la fin, ce qui annule sa
-- transaction. Le rapport arrive dans le message d'erreur.
--
-- Remplacer les trois valeurs par une Societe qui possede le module, l'un de ses
-- admins, et une Societe SANS le module — c'est ce qui rend la mesure HONNETE : en
-- `postgres`, la RLS est ignoree et le relevé ne prouve rien.
--
--   <<SOCIETE_UUID>>      la Societe de DESTINATION (elle a crm_immo_acces)
--   <<ADMIN_UUID>>        un admin de cette Societe
--   <<SANS_MODULE_UUID>>  une Societe SANS crm_immo_acces (bloc C)
--
-- =============================================================================
-- BLOC A — LE CONFLIT 23505 QUI FAISAIT PERDRE DES LOTS ENTIERS
--
-- CE QUI ECHOUAIT AVANT : restaurer un dossier complet declenche la creation
-- automatique d'une periode AVEC UN ID NEUF. La periode du FICHIER arrive ensuite,
-- porte un autre id et cloture_le IS NULL, et heurte l'index partiel unique -> 23505.
-- L'envoi se faisant par lots de 500, jusqu'a 500 periodes valides etaient perdues.
--
-- CE QU'ON ATTEND :
--   1) la restauration des dossiers ne cree AUCUNE periode fantome
--   2) la restauration des contrats passe, et la periode porte l'ID DU FICHIER
--   3) le dossier est aligne sur elle
--   4) le drapeau est retombe des la sortie de la fonction
--   5) HORS restauration, le declencheur cree toujours sa periode
--   6) une ligne fautive ne tue plus ses voisines
--   7) une table hors du perimetre CRM Immo est refusee
--   8) aucune divergence dossier / contrat ne subsiste
-- =============================================================================

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"<<ADMIN_UUID>>","role":"authenticated","app_metadata":{"company_id":"<<SOCIETE_UUID>>","role":"admin"}}';

DO $$
DECLARE
  v_co uuid := '<<SOCIETE_UUID>>';
  v_d  uuid := '11111111-1111-4111-8111-111111111111';  -- l'id PORTE PAR LE FICHIER
  v_k  uuid := '22222222-2222-4222-8222-222222222222';  -- idem, pour la periode
  v_r  text := '';
  v_a  jsonb;
  v_b  jsonb;
BEGIN
  -- ---------------------------------------------------------------- 1
  v_a := crm_immo_restaurer_lot('crm_immo_dossiers', jsonb_build_array(jsonb_build_object(
    'id', v_d, 'company_id', v_co, 'nom', 'SONDE', 'prenom', 'Restauration',
    'date_entree', '2026-02-01', 'date_fin_contrat', '2027-01-31', 'jour_encaissement', 15,
    'valeurs', '{}'::jsonb)), v_co);
  v_r := format('1) dossiers -> %s | periodes fantomes = %s',
                v_a::text, (SELECT count(*) FROM crm_immo_contrats WHERE dossier_id = v_d));

  -- ---------------------------------------------------------------- 2 et 3
  v_b := crm_immo_restaurer_lot('crm_immo_contrats', jsonb_build_array(jsonb_build_object(
    'id', v_k, 'company_id', v_co, 'dossier_id', v_d,
    'debut', '2026-02-01', 'fin', '2027-01-31', 'jour_encaissement', 15)), v_co);
  v_r := v_r || format(' || 2) contrats -> %s | periode en base = %s (fichier : %s) | total = %s',
    v_b::text,
    (SELECT id FROM crm_immo_contrats WHERE dossier_id = v_d AND cloture_le IS NULL),
    v_k,
    (SELECT count(*) FROM crm_immo_contrats WHERE dossier_id = v_d));
  v_r := v_r || format(' || 3) dossier %s..%s j=%s',
    (SELECT date_entree FROM crm_immo_dossiers WHERE id = v_d),
    (SELECT date_fin_contrat FROM crm_immo_dossiers WHERE id = v_d),
    (SELECT jour_encaissement FROM crm_immo_dossiers WHERE id = v_d));

  -- ---------------------------------------------------------------- 4
  v_r := v_r || format(' || 4) drapeau apres la fonction = %s',
    coalesce(current_setting('talvex.restauration', true), '(absent)'));

  -- ---------------------------------------------------------------- 5
  -- La securite normale doit etre intacte hors restauration.
  INSERT INTO crm_immo_dossiers (company_id, nom, date_entree, date_fin_contrat, jour_encaissement)
  VALUES (v_co, 'SONDE', '2026-03-01', '2027-02-28', 3);
  v_r := v_r || format(' || 5) hors restauration, un dossier complet cree sa periode = %s',
    (SELECT count(*) FROM crm_immo_contrats k JOIN crm_immo_dossiers d ON d.id = k.dossier_id
      WHERE d.nom = 'SONDE' AND d.date_entree = '2026-03-01'));

  -- ---------------------------------------------------------------- 6
  -- Trois commentaires : le deuxieme vise un dossier qui n'existe pas.
  v_a := crm_immo_restaurer_lot('crm_immo_commentaires', jsonb_build_array(
    jsonb_build_object('id', '33333333-3333-4333-8333-333333333333', 'company_id', v_co, 'dossier_id', v_d, 'contenu', 'bon'),
    jsonb_build_object('id', '44444444-4444-4444-8444-444444444444', 'company_id', v_co, 'dossier_id', '99999999-9999-4999-8999-999999999999', 'contenu', 'orphelin'),
    jsonb_build_object('id', '55555555-5555-4555-8555-555555555555', 'company_id', v_co, 'dossier_id', v_d, 'contenu', 'bon aussi')), v_co);
  v_r := v_r || format(' || 6) lot mixte -> ecrites=%s refusees=%s (code %s) | en base=%s',
    v_a -> 'ecrites', jsonb_array_length(v_a -> 'refusees'),
    (v_a -> 'refusees' -> 0 ->> 'code'),
    (SELECT count(*) FROM crm_immo_commentaires WHERE dossier_id = v_d));

  -- ---------------------------------------------------------------- 7
  BEGIN
    PERFORM crm_immo_restaurer_lot('companies', jsonb_build_array(jsonb_build_object('id', v_co)), v_co);
    v_r := v_r || ' || 7) table hors perimetre ACCEPTEE (ANORMAL)';
  EXCEPTION WHEN others THEN
    v_r := v_r || format(' || 7) table hors perimetre REFUSEE %s', SQLSTATE);
  END;

  -- ---------------------------------------------------------------- 8
  v_r := v_r || format(' || 8) divergences dossier/contrat = %s',
    (SELECT count(*) FROM crm_immo_contrats k JOIN crm_immo_dossiers d ON d.id = k.dossier_id
      WHERE k.cloture_le IS NULL
        AND (d.date_entree       IS DISTINCT FROM k.debut
          OR d.date_fin_contrat  IS DISTINCT FROM k.fin
          OR d.jour_encaissement IS DISTINCT FROM k.jour_encaissement)));

  RAISE EXCEPTION 'SONDE A (annulee) :: % :: role=%', v_r, current_user;
END $$;

ROLLBACK;

-- =============================================================================
-- BLOC B — AUCUNE IDENTITE NE TRAVERSE LES CLOISONS
--
-- `auth.users` est GLOBAL : restaurer la sauvegarde d'une Societe A dans une Societe B
-- reecrivait company_id, mais laissait created_by, cloture_par, encaisse_par et
-- annule_par pointer sur des salaries de A. La cle etrangere passait sans broncher.
--
-- CE QU'ON ATTEND :
--   A) MEME Societe   -> created_by est CONSERVE
--   B) AUTRE Societe  -> company reecrite, created_by VIDE, et la ligne comptee
--   C) contrats       -> created_by et cloture_par vides, mais cloture_le CONSERVEE
--   D) loyers         -> encaisse_par et annule_par vides, mais annule_le et le MOTIF
--                        conserves : la trace de l'annulation survit, pas son auteur
--   E) la question directe : plus AUCUNE ligne ne porte l'uuid de la Societe source
-- =============================================================================

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"<<ADMIN_UUID>>","role":"authenticated","app_metadata":{"company_id":"<<SOCIETE_UUID>>","role":"admin"}}';

DO $$
DECLARE
  v_cible  uuid := '<<SOCIETE_UUID>>';
  v_source uuid := '00000000-0000-4000-8000-0000000000aa';  -- la Societe du FICHIER
  v_userA  uuid := '<<ADMIN_UUID>>';                        -- un utilisateur reel
  v_d1 uuid := '11111111-1111-4111-8111-aaaaaaaaaaaa';
  v_d2 uuid := '11111111-1111-4111-8111-bbbbbbbbbbbb';
  v_k2 uuid := '22222222-2222-4222-8222-bbbbbbbbbbbb';
  v_l2 uuid := '33333333-3333-4333-8333-bbbbbbbbbbbb';
  v_r text; v_a jsonb;
BEGIN
  -- A. MEME Societe : la ligne du fichier porte deja la Societe cible.
  v_a := crm_immo_restaurer_lot('crm_immo_dossiers', jsonb_build_array(jsonb_build_object(
    'id', v_d1, 'company_id', v_cible, 'nom', 'SONDE', 'prenom', 'MemeSociete',
    'created_by', v_userA, 'valeurs', '{}'::jsonb)), v_cible);
  v_r := format('A) meme Societe -> %s | created_by conserve = %s',
    v_a::text, (SELECT created_by::text FROM crm_immo_dossiers WHERE id = v_d1));

  -- B. AUTRE Societe : la ligne du fichier porte la Societe SOURCE.
  v_a := crm_immo_restaurer_lot('crm_immo_dossiers', jsonb_build_array(jsonb_build_object(
    'id', v_d2, 'company_id', v_source, 'nom', 'SONDE', 'prenom', 'AutreSociete',
    'created_by', v_userA, 'valeurs', '{}'::jsonb)), v_cible);
  v_r := v_r || format(' || B) autre Societe -> %s | company reecrite = %s | created_by = %s',
    v_a::text,
    (SELECT company_id = v_cible FROM crm_immo_dossiers WHERE id = v_d2),
    coalesce((SELECT created_by::text FROM crm_immo_dossiers WHERE id = v_d2), '(NULL)'));

  -- C. contrats : deux colonnes d'identite, et un FAIT a conserver.
  v_a := crm_immo_restaurer_lot('crm_immo_contrats', jsonb_build_array(jsonb_build_object(
    'id', v_k2, 'company_id', v_source, 'dossier_id', v_d2,
    'debut', '2026-01-01', 'fin', '2026-12-31', 'jour_encaissement', 5,
    'created_by', v_userA, 'cloture_le', '2026-06-01T10:00:00Z', 'cloture_par', v_userA)), v_cible);
  v_r := v_r || format(' || C) contrats -> %s | created_by=%s cloture_par=%s cloture_le gardee=%s',
    v_a -> 'ecrites',
    coalesce((SELECT created_by::text FROM crm_immo_contrats WHERE id = v_k2), '(NULL)'),
    coalesce((SELECT cloture_par::text FROM crm_immo_contrats WHERE id = v_k2), '(NULL)'),
    (SELECT cloture_le IS NOT NULL FROM crm_immo_contrats WHERE id = v_k2));

  -- D. loyers : la trace de l'annulation doit survivre, pas son auteur.
  v_a := crm_immo_restaurer_lot('crm_immo_loyers', jsonb_build_array(jsonb_build_object(
    'id', v_l2, 'company_id', v_source, 'dossier_id', v_d2, 'echeance', '2026-03-05',
    'encaisse_le', '2026-03-05T10:00:00Z', 'encaisse_par', v_userA,
    'annule_le', '2026-04-01T10:00:00Z', 'annule_par', v_userA, 'motif_annulation', 'erreur')), v_cible);
  v_r := v_r || format(' || D) loyers -> %s | encaisse_par=%s annule_par=%s annule_le gardee=%s motif garde=%s',
    v_a -> 'ecrites',
    coalesce((SELECT encaisse_par::text FROM crm_immo_loyers WHERE id = v_l2), '(NULL)'),
    coalesce((SELECT annule_par::text FROM crm_immo_loyers WHERE id = v_l2), '(NULL)'),
    (SELECT annule_le IS NOT NULL FROM crm_immo_loyers WHERE id = v_l2),
    (SELECT motif_annulation FROM crm_immo_loyers WHERE id = v_l2));

  -- E. LA QUESTION DIRECTE.
  v_r := v_r || format(' || E) lignes portant encore %s = %s',
    v_userA,
    (SELECT count(*) FROM crm_immo_dossiers WHERE id = v_d2 AND created_by = v_userA)
    + (SELECT count(*) FROM crm_immo_contrats WHERE id = v_k2 AND (created_by = v_userA OR cloture_par = v_userA))
    + (SELECT count(*) FROM crm_immo_loyers  WHERE id = v_l2 AND (encaisse_par = v_userA OR annule_par = v_userA)));

  RAISE EXCEPTION 'SONDE B (annulee) :: % :: role=%', v_r, current_user;
END $$;

ROLLBACK;

-- =============================================================================
-- BLOC C — UNE SOCIETE SANS LE MODULE
--
-- Les douze policies des six tables exigent has_crm_immo_access. Sans le module, chaque
-- ligne part en 42501. C'est correct cote securite ; l'interface le demande desormais
-- AVANT de lancer, et ne lance pas.
--
-- Ce bloc verifie la BASE : la fonction que l'interface interroge rend bien `false`, et
-- une ecriture est bien refusee. L'arret cote interface, lui, est verifie par
-- scripts/crm-immo/restaurationCrmImmo.test.ts.
-- =============================================================================

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"<<ADMIN_UUID>>","role":"authenticated","app_metadata":{"company_id":"<<SOCIETE_UUID>>","role":"admin"}}';

DO $$
DECLARE
  v_avec  uuid := '<<SOCIETE_UUID>>';
  v_sans  uuid := '<<SANS_MODULE_UUID>>';
  v_r text; v_a jsonb;
BEGIN
  v_r := format('1) has_crm_immo_access : avec module = %s | sans module = %s',
    has_crm_immo_access(v_avec), has_crm_immo_access(v_sans));

  v_a := crm_immo_restaurer_lot('crm_immo_dossiers', jsonb_build_array(jsonb_build_object(
    'id', '77777777-7777-4777-8777-777777777777', 'company_id', v_sans,
    'nom', 'SONDE', 'valeurs', '{}'::jsonb)), v_sans);
  v_r := v_r || format(' || 2) ecriture vers la Societe sans module -> ecrites=%s refusee avec le code %s',
    v_a -> 'ecrites', (v_a -> 'refusees' -> 0 ->> 'code'));

  RAISE EXCEPTION 'SONDE C (annulee) :: % :: role=%', v_r, current_user;
END $$;

ROLLBACK;
