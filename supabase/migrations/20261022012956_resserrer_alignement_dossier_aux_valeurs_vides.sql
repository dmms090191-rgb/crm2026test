/*
 * LE RATTRAPAGE NE DOIT PAS AVALER UNE ERREUR QUE LA BASE SIGNALAIT.
 *
 * La migration precedente reecrivait les trois colonnes du dossier des que la saisie
 * etait incomplete OU invalide. Le volet << invalide >> etait de trop, et nuisible :
 *
 *   - crm_immo_dossiers_dates_coherentes  CHECK (date_fin_contrat >= date_entree)
 *   - crm_immo_dossiers_jour_encaissement_valide  CHECK (jour_encaissement BETWEEN 1 AND 31)
 *
 * Ces deux contraintes refusent deja ces ecritures, BRUYAMMENT (23514). Or un
 * declencheur BEFORE s'execute AVANT la verification des contraintes : en corrigeant
 * NEW, il empechait la contrainte de voir quoi que ce soit. Une date inversee envoyee
 * par l'API REST n'etait plus refusee, elle etait silencieusement remplacee. On avait
 * echange un refus lisible contre une substitution muette.
 *
 * Et ce n'etait pas necessaire : une saisie invalide NE DIVERGE PAS. Elle est refusee,
 * donc la ligne n'est pas ecrite, donc le dossier continue de refleter sa periode.
 *
 * ---------- LE SEUL CAS QUI DIVERGEAIT VRAIMENT ----------
 *
 * Les deux CHECK acceptent NULL. Un NULL passe donc les contraintes, est ecrit, et
 * sync_contrat_depuis_dossier sort sans toucher la periode : c'est LA, et seulement la,
 * que les deux sources se contredisaient. C'est exactement le cas D mesure le
 * 22 octobre 2026.
 *
 * Le declencheur ne traite donc plus que celui-la.
 *
 * ---------- ET SI UNE CONTRAINTE ETAIT RELACHEE UN JOUR ----------
 *
 * Le trou se rouvrirait. Ce n'est pas ce declencheur qui doit s'en premunir, c'est un
 * test : scripts/crm-immo/alignementDossierContrat.test.ts verifie que les deux CHECK
 * existent toujours, et tombe si l'une disparait.
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

  /*
   * NEW.id et NEW.company_id viennent de la ligne ecrite, que la RLS vient d'autoriser.
   * La lecture porte sur le COUPLE (dossier_id, company_id) : la cle etrangere composee
   * garantit qu'une periode porte toujours le company_id de son dossier, donc cette
   * requete ne peut jamais atteindre la periode d'une autre Societe — meme en
   * SECURITY DEFINER, et meme si un appelant choisissait lui-meme NEW.id.
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

REVOKE ALL ON FUNCTION public.garder_dossier_aligne_sur_contrat() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.garder_dossier_aligne_sur_contrat() FROM anon;
REVOKE ALL ON FUNCTION public.garder_dossier_aligne_sur_contrat() FROM authenticated;
REVOKE ALL ON FUNCTION public.garder_dossier_aligne_sur_contrat() FROM service_role;

COMMENT ON FUNCTION public.garder_dossier_aligne_sur_contrat() IS
  'Tant qu''une periode en cours existe dans crm_immo_contrats, une saisie qui laisse VIDE l''une des trois colonnes de contrat du dossier est ramenee aux valeurs de cette periode. Les valeurs invalides mais non nulles restent refusees par les CHECK de la table, bruyamment.';
