/*
  # CRM IMMO — retrait de l ancienne identite (etape 2 sur 2)

  A N APPLIQUER QU APRES le deploiement du code qui ecrit contrat_id et dont l upsert
  nomme les CINQ colonnes de la nouvelle cle. Jamais avant.

  ---------------------------------------------------------------------------
  POURQUOI DEUX ETAPES, ET PAS UNE
  ---------------------------------------------------------------------------

  L upsert de useCrmImmoAlertes.ts nomme explicitement les colonnes de la cle :

      .upsert(ligne, { onConflict: 'company_id,dossier_id,genre,periode' })

  Postgres INFERE l index a partir de cette liste. Retirer l ancienne contrainte avant
  que le code ne soit deploye ferait echouer chaque marquage « lue » / « traitee » en
  42P10. Retirer apres, c est une seconde sans risque : les deux contraintes coexistent
  pendant toute la fenetre de deploiement.

  ---------------------------------------------------------------------------
  CE QUE LE RETRAIT CHANGE REELLEMENT
  ---------------------------------------------------------------------------

  L ancienne contrainte est PLUS STRICTE que la nouvelle : elle interdit deux lignes de
  meme dossier / genre / periode, quels que soient leurs contrats. C est precisement ce
  qu il faut lever — deux contrats d un meme dossier qui se chevauchent sur un meme mois
  doivent pouvoir porter chacun son etat.

  Tant qu elle est la, le comportement reste celui d avant : aucun doublon possible, et
  un chevauchement rend une erreur 23505 au lieu de deux lignes distinctes. C est une
  degradation acceptable pendant une fenetre de deploiement, pas une regle a garder.

  ROLLBACK :
    ALTER TABLE public.crm_immo_etats
      ADD CONSTRAINT crm_immo_etats_unique_par_echeance
      UNIQUE (company_id, dossier_id, genre, periode);
  (il ECHOUERA si des lignes de meme dossier/genre/periode ont ete creees avec des
   contrats differents entre-temps — c est le signe que la nouvelle regle a deja servi,
   et qu il ne faut pas revenir en arriere sans examiner ces lignes)
*/

ALTER TABLE public.crm_immo_etats
  DROP CONSTRAINT crm_immo_etats_unique_par_echeance;

COMMENT ON TABLE public.crm_immo_etats IS
  'Etat lu/traite des alertes CRM Immo. Les alertes sont derivees des dates, jamais stockees. Badge = alerte derivee sans ligne, ou ligne avec lue_le IS NULL ET traitee_le IS NULL. Traitee = exclue des actives et du badge, mais conservee pour le filtre Traitees. Identite depuis le 23 octobre 2026 : (company_id, dossier_id, contrat_id, genre, periode), avec NULLS NOT DISTINCT sur contrat_id.';
