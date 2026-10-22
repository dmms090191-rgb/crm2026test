/*
  LES TROIS FONCTIONS DE DECLENCHEUR N'ONT BESOIN D'AUCUN « EXECUTE ».

  La migration precedente avait retire EXECUTE a PUBLIC. Ce n'etait pas suffisant :
  Supabase accorde EXECUTE a `anon`, `authenticated` et `service_role` sur toute
  fonction nouvellement creee, par PRIVILEGES PAR DEFAUT. Le relevé le montrait :

    sync_contrat_depuis_dossier | DEFINER | anon=X | authenticated=X | service_role=X

  Une fonction SECURITY DEFINER appelable par `anon` est une surface d'attaque gratuite.
  Celles-ci n'ont aucune raison d'etre appelees a la main : un declencheur s'execute
  sans que l'appelant ait le droit EXECUTE sur sa fonction — PostgreSQL ne le verifie
  qu'a la CREATION du declencheur, jamais au declenchement.

  C'est d'ailleurs ce qui avait ete fait pour has_crm_immo_access, qui n'accorde rien a
  `anon`. On aligne, en plus strict : ni anon, ni authenticated, ni service_role.

  Verifie apres coup par un relevé reel : un admin `authenticated` modifie son dossier,
  et la synchronisation a bien lieu malgre l'absence d'EXECUTE.

  ROLLBACK :
    GRANT EXECUTE ON FUNCTION public.sync_dossier_depuis_contrat() TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.sync_contrat_depuis_dossier() TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.garde_crm_immo_loyers()       TO anon, authenticated, service_role;
*/

REVOKE ALL ON FUNCTION public.sync_dossier_depuis_contrat()
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.sync_contrat_depuis_dossier()
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.garde_crm_immo_loyers()
  FROM PUBLIC, anon, authenticated, service_role;
