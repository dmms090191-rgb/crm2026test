/*
  # STATUTS : L UNICITE DU NOM DEVIENT PAR SOCIETE, ET INSENSIBLE A LA CASSE

  Migration volontairement SEULE dans son commit, a la demande de David : elle touche une
  table du CRM EXISTANT (public.statuts, lue par le CRM Leads, le panel vendeur et le CRM
  Prospection), alors que la creation du CRM Prospection n'ajoutait rien a l'existant.
  Deux portees differentes, deux commits.

  ---------- LE DEFAUT, MESURE LE 02/11/2026 ----------

  statuts_nom_key est UNIQUE (nom) — sur le nom SEUL, sans company_id. Origine :
  supabase/migrations/20260317042359_000000_full_schema.sql, ou la colonne etait declaree
  `nom text UNIQUE NOT NULL`, ECRITE AVANT LE MULTI-TENANT. La migration 20260515095456 a
  ensuite ajoute company_id, sans retirer cette unicite devenue fausse.

  DEUX DEGATS, ET LE PREMIER FRAPPE TOUS LES JOURS :

    FONCTIONNEL. Deux Societes ne peuvent pas avoir un statut du meme nom. Si David cree
    « Prospect » et qu'une autre Societe l'a deja pris, son insertion echoue sur un 23505
    et l'ecran affiche « Erreur lors de la creation. » (Statuts.tsx:54) — sans dire
    pourquoi, et alors que sa propre liste ne montre aucun doublon. L'inverse est vrai
    aussi : il peut, sans le savoir, bloquer un nom pour toutes les autres Societes.

    ORACLE DE CONTENU. Un index unique est verifie HORS RLS. Le refus revele donc
    l'existence d'un nom chez une Societe voisine — une information qui ne devrait jamais
    traverser la cloison. C'est exactement la faute que le projet s'est interdite par
    ecrit, et deja corrigee une fois (20261019221621).

  Preuve que les deux formes coexistent aujourd'hui grace au seul hasard de la casse :
  « Nrp1 » (Societe a0000000-…-0001) et « nrp1 » (Societe 112ca840-…) cohabitent parce que
  l'unicite actuelle est SENSIBLE a la casse. Le controle cote interface, lui, compare en
  minuscules (Statuts.tsx:50) : la base et l'ecran ne disent donc pas la meme chose.

  ---------- CE QUE CELA CORRIGE, ET CE QUE CELA ALIGNE ----------

  Apres cette migration, la base dit ce que l'interface disait deja : unique PAR SOCIETE,
  et insensible a la casse. Les deux cessent de diverger — c'est le vrai gain, au-dela du
  deblocage des noms.

  csa_statuts porte deja exactement cette forme : UNIQUE (group_company_id, lower(nom)).
  On ne fait donc qu'etendre une convention maison, pas en inventer une.

  ---------- CE QUI A ETE VERIFIE AVANT D ECRIRE ----------

  AUCUN DOUBLON BLOQUANT. Mesure, role postgres, RLS ignoree :
    select company_id, lower(nom), count(*) from public.statuts
    group by 1, 2 having count(*) > 1
  rend ZERO ligne. L'index peut donc etre cree sans echouer.

  AUCUNE LIGNE SANS company_id. Toujours role postgres : 0 sur 7. Les NULL seraient de
  toute facon acceptes — un index unique les considere comme distincts — mais il faut le
  savoir : sur une base RECONSTRUITE depuis les migrations, 20260321210058 insere un
  statut « Nouveau » SANS company_id, qui resterait donc possible et invisible a tous sauf
  super_admin. Ce defaut-la est anterieur et hors perimetre ; il n'est pas aggrave ici.

  UN SEUL CODE DEPEND DE L ANCIENNE CONTRAINTE : 20260321210058_seed_default_nouveau_status
  .sql, ligne 18, qui fait `ON CONFLICT (nom) DO NOTHING`. Son horodatage (20260321) est
  ANTERIEUR a celui-ci (20261102) : sur une base reconstruite, elle s'execute pendant que
  statuts_nom_key existe encore. Aucune rupture. Balayage de src/ : aucun autre
  `onConflict` ne vise statuts.

  ROLLBACK :
    DROP INDEX IF EXISTS public.statuts_company_nom_unique;
    ALTER TABLE public.statuts ADD CONSTRAINT statuts_nom_key UNIQUE (nom);
    -- Le rollback ECHOUERA si, entre-temps, deux Societes ont pris le meme nom.
    -- C'est le signe que la correction servait : il faudra alors trancher les doublons.
*/

ALTER TABLE public.statuts
  DROP CONSTRAINT statuts_nom_key;

/*
 * UN INDEX, ET NON UNE CONTRAINTE DE TABLE : PostgreSQL n'accepte pas d'expression
 * (ici lower(nom)) dans une contrainte UNIQUE. La protection est la meme.
 *
 * ET ON NE TOUCHE PAS A statuts_id_company_unique, posee la veille par la migration du
 * CRM Prospection : elle sert de cible a la cle etrangere composee de
 * crm_prospection_leads, et la retirer casserait ce module.
 */
CREATE UNIQUE INDEX statuts_company_nom_unique
  ON public.statuts (company_id, lower(nom));

COMMENT ON INDEX public.statuts_company_nom_unique IS
  'Unicite du nom de statut PAR Societe et insensible a la casse. Remplace statuts_nom_key, qui etait unique sur le nom seul — un reliquat d''avant le multi-tenant qui empechait deux Societes d''avoir un statut homonyme, et dont le refus revelait le nom de la voisine.';
