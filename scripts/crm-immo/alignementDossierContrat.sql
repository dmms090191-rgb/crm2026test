-- =============================================================================
-- SONDE : LE DOSSIER ET SON CONTRAT RESTENT-ILS D'ACCORD ?
--
-- A executer telle quelle dans le SQL Editor de Supabase, ou par MCP.
-- Elle N'ECRIT RIEN : chaque bloc leve une exception a la fin, ce qui annule sa
-- transaction. Le rapport arrive dans le message d'erreur. C'est volontaire —
-- une sonde qui laisse des traces n'est pas une sonde.
--
-- Remplacer les deux valeurs ci-dessous par une Societe qui possede le module et
-- par l'un de ses admins (c'est ce qui rend la mesure HONNETE : en `postgres`,
-- la RLS est ignoree et le relevé ne prouve rien).
--
--   :societe  = crm_immo_acces.company_id, actif
--   :admin    = auth.users.id d'un admin de cette Societe
--
-- Ce qu'on attend, et pourquoi :
--   1) vider UNE date       -> le dossier est ramene aux valeurs de la periode
--   2) vider LES TROIS      -> idem
--   3) dates inversees      -> REFUS 23514, pas une substitution muette
--   4) jour hors 1..31      -> REFUS 23514
--   5) renouvellement       -> ancienne periode conservee, dossier sur la nouvelle
--   6) dossier sans contrat -> reste vide, aucune periode inventee
--   7) divergences finales  -> 0
-- =============================================================================

BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"<<ADMIN_UUID>>","role":"authenticated","app_metadata":{"company_id":"<<SOCIETE_UUID>>","role":"admin"}}';

DO $$
DECLARE
  v_company uuid := '<<SOCIETE_UUID>>';
  v_d uuid; v_vide uuid; v_r text := ''; v_dos record; v_c record;
BEGIN
  -- ---------------------------------------------------------------- 1 et 2
  INSERT INTO crm_immo_dossiers (company_id, nom, prenom, date_entree, date_fin_contrat, jour_encaissement)
  VALUES (v_company, 'SONDE', 'Alignement', '2026-04-01', '2027-03-31', 7)
  RETURNING id INTO v_d;

  UPDATE crm_immo_dossiers SET date_fin_contrat = null WHERE id = v_d;
  SELECT date_entree::text de, coalesce(date_fin_contrat::text,'(VIDE)') df, jour_encaissement j
    INTO v_dos FROM crm_immo_dossiers WHERE id = v_d;
  SELECT count(*) FILTER (WHERE cloture_le IS NULL) n, min(fin::text) f
    INTO v_c FROM crm_immo_contrats WHERE dossier_id = v_d;
  v_r := format('1) une date videe -> DOSSIER %s..%s j=%s / CONTRAT %s periode fin=%s',
                v_dos.de, v_dos.df, v_dos.j, v_c.n, v_c.f);

  UPDATE crm_immo_dossiers SET date_entree = null, date_fin_contrat = null, jour_encaissement = null WHERE id = v_d;
  SELECT coalesce(date_entree::text,'(VIDE)') de, coalesce(date_fin_contrat::text,'(VIDE)') df,
         coalesce(jour_encaissement::text,'(VIDE)') j
    INTO v_dos FROM crm_immo_dossiers WHERE id = v_d;
  v_r := v_r || format(' || 2) les trois videes -> DOSSIER %s..%s j=%s', v_dos.de, v_dos.df, v_dos.j);

  -- ---------------------------------------------------------------- 3 et 4
  -- Une saisie INVALIDE doit rester refusee bruyamment. Le declencheur BEFORE
  -- s'execute avant les CHECK : s'il la rattrapait, il rendrait l'erreur muette.
  BEGIN
    UPDATE crm_immo_dossiers SET date_entree = '2027-12-01', date_fin_contrat = '2026-01-01' WHERE id = v_d;
    v_r := v_r || ' || 3) dates inversees ACCEPTEES (ANORMAL)';
  EXCEPTION WHEN others THEN
    v_r := v_r || format(' || 3) dates inversees REFUSEES %s', SQLSTATE);
  END;

  BEGIN
    UPDATE crm_immo_dossiers SET jour_encaissement = 44 WHERE id = v_d;
    v_r := v_r || ' || 4) jour 44 ACCEPTE (ANORMAL)';
  EXCEPTION WHEN others THEN
    v_r := v_r || format(' || 4) jour 44 REFUSE %s', SQLSTATE);
  END;

  -- ---------------------------------------------------------------- 5
  -- Le renouvellement tel que l'application le fait : CLOTURER, puis INSERER.
  -- L'ordre est impose par l'index partiel unique, pas par discipline.
  UPDATE crm_immo_contrats SET cloture_le = now() WHERE dossier_id = v_d AND cloture_le IS NULL;
  SELECT coalesce(date_fin_contrat::text,'(VIDE)') df INTO v_dos FROM crm_immo_dossiers WHERE id = v_d;
  v_r := v_r || format(' || 5a) apres cloture seule -> DOSSIER fin=%s', v_dos.df);

  INSERT INTO crm_immo_contrats (company_id, dossier_id, debut, fin, jour_encaissement)
  VALUES (v_company, v_d, '2027-07-01', '2028-06-30', 15);
  SELECT date_entree::text de, date_fin_contrat::text df, jour_encaissement j
    INTO v_dos FROM crm_immo_dossiers WHERE id = v_d;
  SELECT count(*) n, count(*) FILTER (WHERE cloture_le IS NOT NULL) h
    INTO v_c FROM crm_immo_contrats WHERE dossier_id = v_d;
  v_r := v_r || format(' || 5b) apres insertion -> DOSSIER %s..%s j=%s / %s periodes dont %s en historique',
                       v_dos.de, v_dos.df, v_dos.j, v_c.n, v_c.h);

  -- Et vider apres renouvellement doit ramener a la NOUVELLE periode.
  UPDATE crm_immo_dossiers SET date_entree = null WHERE id = v_d;
  SELECT date_entree::text de, date_fin_contrat::text df INTO v_dos FROM crm_immo_dossiers WHERE id = v_d;
  v_r := v_r || format(' || 5c) vidage post-renouvellement -> DOSSIER %s..%s', v_dos.de, v_dos.df);

  -- ---------------------------------------------------------------- 6
  -- Un dossier sans contrat est legitime : on n'invente aucune periode.
  INSERT INTO crm_immo_dossiers (company_id, nom, prenom) VALUES (v_company, 'SONDE', 'SansContrat')
  RETURNING id INTO v_vide;
  UPDATE crm_immo_dossiers SET date_entree = '2026-05-01' WHERE id = v_vide;
  SELECT coalesce(date_fin_contrat::text,'(VIDE)') df INTO v_dos FROM crm_immo_dossiers WHERE id = v_vide;
  SELECT count(*) n INTO v_c FROM crm_immo_contrats WHERE dossier_id = v_vide;
  v_r := v_r || format(' || 6) dossier incomplet -> fin=%s / %s periode', v_dos.df, v_c.n);

  -- ---------------------------------------------------------------- 7
  SELECT count(*) n INTO v_c
  FROM crm_immo_contrats k JOIN crm_immo_dossiers d ON d.id = k.dossier_id
  WHERE k.cloture_le IS NULL
    AND (d.date_entree       IS DISTINCT FROM k.debut
      OR d.date_fin_contrat  IS DISTINCT FROM k.fin
      OR d.jour_encaissement IS DISTINCT FROM k.jour_encaissement);
  v_r := v_r || format(' || 7) divergences restantes = %s', v_c.n);

  RAISE EXCEPTION 'SONDE (annulee) :: % :: role=%', v_r, current_user;
END $$;

ROLLBACK;
