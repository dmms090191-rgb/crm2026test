/*
  # CRM IMMO — l identite d une alerte gagne le CONTRAT (etape 1 sur 2)

  Identite AVANT :  UNIQUE (company_id, dossier_id, genre, periode)
  Identite APRES :  UNIQUE NULLS NOT DISTINCT (company_id, dossier_id, contrat_id, genre, periode)

  ---------------------------------------------------------------------------
  LE DEFAUT QUE DAVID A TROUVE, ET QUI EST MESURE
  ---------------------------------------------------------------------------

  Une version precedente ajoutait la colonne en laissant les lignes existantes a
  contrat_id NULL, puis deployait le code qui ecrit un contrat_id REEL. David a vu le
  piege avant l application, et le test l a confirme — en transaction annulee, sur la
  base reelle, le 23 octobre 2026 :

      INSERT ... (company, dossier, contrat_REEL, 'loyer', '2026-10')
      ON CONFLICT (company_id, dossier_id, contrat_id, genre, periode) DO UPDATE ...

      -> 23505  duplicate key value violates unique constraint
                "crm_immo_etats_unique_par_echeance"

  POURQUOI. La ligne existante porte contrat_id NULL ; la nouvelle porte un contrat reel.
  Sur la cle a CINQ colonnes, NULL et un uuid sont differents — meme avec NULLS NOT
  DISTINCT, qui rend les NULL egaux ENTRE EUX et non egaux a une valeur. Il n y a donc
  pas de conflit a inferer, et le ON CONFLICT ne capture rien. Mais l ANCIENNE contrainte
  a QUATRE colonnes, elle, voit deux lignes identiques — et refuse. Le marquage
  « lue » / « traitee » serait tombe en erreur pour chaque alerte deja marquee.

  LA PARADE : il ne doit plus exister UNE SEULE ligne a contrat_id NULL quand le nouveau
  code se deploie. Cette migration fait donc le BACKFILL, dans la meme transaction que
  l ajout de la colonne.

  ---------------------------------------------------------------------------
  LE BACKFILL REFUSE DE DEVINER
  ---------------------------------------------------------------------------

  Il ne s applique que si CHAQUE ligne a exactement UN contrat candidat. S il y en a zero
  ou plusieurs, la migration LEVE UNE EXCEPTION et s annule entierement, plutot que
  d ecrire un contrat arbitraire que personne ne saurait plus corriger.

  Releve du 23 octobre 2026, en role postgres : les 2 lignes existantes appartiennent au
  meme dossier, qui ne porte qu UN contrat (5e68dc17…, 2026-10-06 -> 2026-10-20, jour 20).
  Candidats : 1 et 1. Le backfill est donc non ambigu — mais la garde reste, parce que la
  base de demain n est pas celle d aujourd hui.

  ---------------------------------------------------------------------------
  POURQUOI L ANCIENNE CONTRAINTE RESTE ENCORE
  ---------------------------------------------------------------------------

  Le code en ligne ecrit son upsert ainsi :

      .upsert(ligne, { onConflict: 'company_id,dossier_id,genre,periode' })

  Postgres INFERE l index depuis cette liste de colonnes. Retirer la contrainte a quatre
  colonnes maintenant ferait tomber chaque marquage en 42P10, « no unique or exclusion
  constraint matching the ON CONFLICT specification ». Elle part a l etape 2, APRES le
  deploiement. Les deux contraintes coexistent sans se gener : une fois le backfill fait,
  elles sont equivalentes tant qu un dossier ne porte pas deux contrats sur un meme mois.

  ---------------------------------------------------------------------------
  POURQUOI UNE CONTRAINTE ET PAS UN INDEX SUR EXPRESSION
  ---------------------------------------------------------------------------

  Un premier brouillon posait l unicite par COALESCE(contrat_id, '00…0'::uuid). Un index
  SUR EXPRESSION n est pas inferable par une liste de colonnes : l upsert serait tombe en
  42P10 des l application. La base tourne en PostgreSQL 17.6 ; NULLS NOT DISTINCT existe
  depuis la 15 et donne le meme effet avec une VRAIE contrainte, donc inferable.

  ---------------------------------------------------------------------------
  NULL ET L ANTI-DOUBLON
  ---------------------------------------------------------------------------

  Apres backfill, plus aucune ligne ne porte NULL. La colonne reste neanmoins nullable :
  une alerte dont le contrat n est pas identifiable doit pouvoir exister. NULLS NOT
  DISTINCT garantit alors que deux telles lignes, memes dossier / genre / periode, sont
  des doublons et sont refusees — exactement la regle d avant.

  CE QUE CETTE MIGRATION NE FAIT PAS : aucune policy RLS touchee (les trois portent sur
  company_id et le role, jamais sur une colonne precise), aucune autre table, aucun autre
  module, et le CHECK de format reste tel quel.

  ROLLBACK :
    ALTER TABLE public.crm_immo_etats DROP CONSTRAINT crm_immo_etats_identite_unique;
    ALTER TABLE public.crm_immo_etats DROP CONSTRAINT crm_immo_etats_contrat_fk;
    ALTER TABLE public.crm_immo_etats DROP COLUMN contrat_id;   -- le backfill part avec
    ALTER TABLE public.crm_immo_contrats DROP CONSTRAINT crm_immo_contrats_id_company_unique;
*/

/* 1. De quoi referencer un contrat SANS franchir le cloisonnement.
      Le module reference toujours par cle COMPOSEE (id, company_id). crm_immo_dossiers et
      crm_immo_classeurs portent deja cet unique ; crm_immo_contrats, non. Il ne relache
      rien : id est deja cle primaire, donc deja unique a lui seul. */
ALTER TABLE public.crm_immo_contrats
  ADD CONSTRAINT crm_immo_contrats_id_company_unique UNIQUE (id, company_id);

/* 2. Le contrat dans l etat. */
ALTER TABLE public.crm_immo_etats
  ADD COLUMN contrat_id uuid;

ALTER TABLE public.crm_immo_etats
  ADD CONSTRAINT crm_immo_etats_contrat_fk
  FOREIGN KEY (contrat_id, company_id)
  REFERENCES public.crm_immo_contrats (id, company_id)
  ON UPDATE CASCADE ON DELETE CASCADE;

COMMENT ON COLUMN public.crm_immo_etats.contrat_id IS
  'La periode de contrat a laquelle cette alerte se rapporte. Cle etrangere COMPOSEE avec company_id : une ligne ne peut pas pointer vers le contrat d''une autre Societe. ON DELETE CASCADE : c''est la base qui cascade, jamais l''application. Nullable pour une alerte dont le contrat n''est pas identifiable, mais le backfill du 23 octobre 2026 n''en a laisse aucune.';

/* 3. LE BACKFILL, qui refuse de deviner.
      La garde passe AVANT l ecriture : si une seule ligne n a pas exactement un candidat,
      la migration entiere s annule. */
DO $backfill$
DECLARE
  v_ambigues int;
BEGIN
  SELECT count(*) INTO v_ambigues
  FROM public.crm_immo_etats e
  WHERE e.contrat_id IS NULL
    AND ( SELECT count(*) FROM public.crm_immo_contrats c
          WHERE c.dossier_id = e.dossier_id
            AND c.company_id = e.company_id
            AND ( (e.genre = 'fin_contrat' AND c.fin::text = e.periode)
               OR (e.genre = 'loyer'
                   AND to_char(c.debut, 'YYYY-MM') <= e.periode
                   AND to_char(c.fin,   'YYYY-MM') >= e.periode) )
        ) <> 1;

  IF v_ambigues > 0 THEN
    RAISE EXCEPTION
      'Backfill impossible : % ligne(s) de crm_immo_etats n''ont pas EXACTEMENT un contrat candidat. Migration annulee — ces lignes doivent etre tranchees a la main avant de rejouer.',
      v_ambigues;
  END IF;

  UPDATE public.crm_immo_etats e
  SET contrat_id = c.id
  FROM public.crm_immo_contrats c
  WHERE e.contrat_id IS NULL
    AND c.dossier_id = e.dossier_id
    AND c.company_id = e.company_id
    AND ( (e.genre = 'fin_contrat' AND c.fin::text = e.periode)
       OR (e.genre = 'loyer'
           AND to_char(c.debut, 'YYYY-MM') <= e.periode
           AND to_char(c.fin,   'YYYY-MM') >= e.periode) );

  /* Garde de sortie : plus aucune ligne sans contrat. C est CETTE propriete qui rend le
     deploiement suivant sur. */
  SELECT count(*) INTO v_ambigues FROM public.crm_immo_etats WHERE contrat_id IS NULL;
  IF v_ambigues > 0 THEN
    RAISE EXCEPTION 'Backfill incomplet : % ligne(s) restent a contrat_id NULL. Migration annulee.', v_ambigues;
  END IF;
END
$backfill$;

/* 4. La nouvelle identite. L ancienne contrainte RESTE : elle part a l etape 2. */
ALTER TABLE public.crm_immo_etats
  ADD CONSTRAINT crm_immo_etats_identite_unique
  UNIQUE NULLS NOT DISTINCT (company_id, dossier_id, contrat_id, genre, periode);

COMMENT ON CONSTRAINT crm_immo_etats_identite_unique ON public.crm_immo_etats IS
  'L identite d une alerte : Societe, dossier, CONTRAT, genre, periode. company_id est en tete pour CLOISONNER l''index — sans lui, l''erreur 23505 repondrait a travers les Societes (voir 20261019221621). NULLS NOT DISTINCT parce que NULL <> NULL rendrait l''unicite inoperante sur une ligne sans contrat, ce qui percerait l''anti-doublon en silence.';
