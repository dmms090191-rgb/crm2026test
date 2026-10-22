/*
 * LE DOSSIER NE PEUT PLUS CONTREDIRE SON CONTRAT.
 *
 * ---------- LA DIVERGENCE, MESUREE ----------
 *
 * Le 22 octobre 2026, en faisant travailler les declencheurs puis en annulant la
 * transaction, on a obtenu ceci :
 *
 *   A) un dossier complet cree bien UNE periode, aux memes dates ;
 *   B) modifier la periode fait suivre le dossier ;
 *   C) modifier le dossier fait suivre la periode ;
 *   D) VIDER date_fin_contrat sur le dossier laisse la periode INTACTE.
 *
 * Apres D : le dossier dit << pas de date de fin >>, et crm_immo_contrats tient
 * toujours 2026-03-10..2027-03-09 comme periode en cours. Deux sources, deux verites.
 *
 * La cause est dans sync_contrat_depuis_dossier : devant une saisie incomplete, elle
 * fait RETURN NULL. Elle a raison de ne pas fabriquer une periode a moitie remplie —
 * mais elle laisse alors le dossier affirmer le contraire de ce que dit le contrat.
 *
 * ---------- LA REGLE CHOISIE ----------
 *
 * David : << La source de verite reste crm_immo_contrats. >>
 *
 * On l'applique litteralement :
 *
 *   TANT QU'UNE PERIODE EN COURS EXISTE, les trois colonnes du dossier SONT celles de
 *   cette periode. Une saisie qui les laisse incompletes est ramenee a la valeur du
 *   contrat, avant d'etre ecrite.
 *
 * Donc : rien n'est supprime, rien n'est cloture, rien n'est refuse. La periode reste
 * intacte, le dossier redevient son miroir, et les deux disent la meme chose.
 *
 * Pourquoi PAS les trois autres options envisagees :
 *
 *   - SUPPRIMER la periode : detruit un contrat reel sur une faute de frappe, et David
 *     a pose la regle inverse — masquer, jamais supprimer.
 *   - LA CLOTURER : elle sortirait de l'historique actif, le bail disparaitrait des
 *     quatre compteurs de contrat, et sync_dossier_depuis_contrat la reecrirait aussitot
 *     sur le dossier par son repli. On aurait echange une divergence contre une autre.
 *   - REFUSER par une exception : l'enregistrement du dossier echouerait en entier, y
 *     compris pour une modification de nom faite en meme temps.
 *
 * ---------- CE QUI N'EST VOLONTAIREMENT PAS FAIT ----------
 *
 * L'implication inverse — << aucune periode en cours DONC dossier vide >> — n'est PAS
 * imposee, et c'est delibere :
 *
 *   - le renouvellement se fait en DEUX requetes (cloturer, puis inserer). Entre les
 *     deux, aucune periode n'est en cours. Vider le dossier a cet instant effacerait
 *     ses dates, et les perdrait si la seconde requete echouait ;
 *   - un bail arrive a terme et non renouvele doit continuer a montrer son dernier
 *     contrat connu — c'est la raison d'etre du repli de sync_dossier_depuis_contrat.
 *
 * ---------- POURQUOI UN DECLENCHEUR << BEFORE >> ----------
 *
 * Un AFTER devrait corriger par un second UPDATE, qui se redeclencherait. Un BEFORE
 * corrige NEW sur place : une seule ecriture, aucune recursion possible.
 *
 * Et il s'arrete la : quand la saisie est complete, il rend NEW tel quel, et c'est
 * sync_contrat_depuis_dossier qui propage la modification vers la periode. Le chemin
 * normal d'edition n'est pas touche.
 */

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
   * Les MEMES conditions que sync_contrat_depuis_dossier, mot pour mot.
   *
   * Si les deux fonctions ne s'accordaient pas sur ce qu'est un contrat << complet >>,
   * une saisie acceptee par l'une et rejetee par l'autre rouvrirait exactement la
   * divergence qu'on ferme ici.
   *
   * Deux CHECK de la table rendent deja les cas << dates inversees >> et << jour hors
   * de 1..31 >> inatteignables. Ils sont testes quand meme : une contrainte peut etre
   * relachee un jour, pas cette fonction.
   */
  IF NEW.date_entree IS NOT NULL
     AND NEW.date_fin_contrat IS NOT NULL
     AND NEW.jour_encaissement IS NOT NULL
     AND NEW.date_fin_contrat >= NEW.date_entree
     AND NEW.jour_encaissement >= 1 AND NEW.jour_encaissement <= 31 THEN
    RETURN NEW;
  END IF;

  /*
   * NEW.id et NEW.company_id viennent de la ligne ecrite, que la RLS vient d'autoriser.
   * Aucun appelant ne choisit la Societe lue : le cloisonnement tient meme si la
   * fonction est SECURITY DEFINER.
   *
   * Un index partiel unique (company_id, dossier_id) WHERE cloture_le IS NULL garantit
   * qu'il y a AU PLUS une periode en cours : ce SELECT ne peut pas en rendre deux.
   */
  SELECT c.debut, c.fin, c.jour_encaissement INTO p
  FROM public.crm_immo_contrats c
  WHERE c.dossier_id = NEW.id
    AND c.company_id = NEW.company_id
    AND c.cloture_le IS NULL;

  /* Aucune periode en cours : un dossier sans contrat est parfaitement legitime —
     un prospect, une saisie commencee. On n'invente rien. */
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  NEW.date_entree       := p.debut;
  NEW.date_fin_contrat  := p.fin;
  NEW.jour_encaissement := p.jour_encaissement;
  RETURN NEW;
END; $function$;

/* Aucun EXECUTE public : PostgreSQL verifie ce droit a la CREATION du declencheur,
   jamais a son declenchement. Le declencheur fonctionne donc avec zero privilege
   accorde — c'est deja la regle des deux fonctions de synchronisation voisines. */
REVOKE ALL ON FUNCTION public.garder_dossier_aligne_sur_contrat() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.garder_dossier_aligne_sur_contrat() FROM anon;
REVOKE ALL ON FUNCTION public.garder_dossier_aligne_sur_contrat() FROM authenticated;
REVOKE ALL ON FUNCTION public.garder_dossier_aligne_sur_contrat() FROM service_role;

DROP TRIGGER IF EXISTS trg_garder_dossier_aligne_sur_contrat ON public.crm_immo_dossiers;

/*
 * BEFORE, donc avant trg_sync_contrat_depuis_dossier qui est un AFTER.
 *
 * Sur INSERT, NEW.id existe deja (le defaut de colonne est applique avant les
 * declencheurs BEFORE) mais aucune periode ne peut encore le referencer : la fonction
 * sort par NOT FOUND. La restauration ne peut pas etre touchee non plus — la cle
 * etrangere composite (dossier_id, company_id) impose de restaurer les dossiers AVANT
 * les contrats, donc aucune periode n'existe quand les dossiers arrivent.
 */
CREATE TRIGGER trg_garder_dossier_aligne_sur_contrat
BEFORE INSERT OR UPDATE ON public.crm_immo_dossiers
FOR EACH ROW
EXECUTE FUNCTION public.garder_dossier_aligne_sur_contrat();

COMMENT ON FUNCTION public.garder_dossier_aligne_sur_contrat() IS
  'Tant qu''une periode en cours existe dans crm_immo_contrats, les trois colonnes de contrat du dossier sont ramenees a celles de cette periode. Ferme la divergence mesuree le 22 octobre 2026 : vider date_fin_contrat laissait la periode intacte.';
