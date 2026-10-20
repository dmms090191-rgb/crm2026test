/*
  # CRM IMMO — la contrainte anti-doublon des etats est cloisonnee par Societe

  Troisieme et derniere migration de securite du module. Les deux precedentes
  ne sont PAS reecrites :
    20261019201657_create_crm_immo                  le schema
    20261019210120_harden_crm_immo_access_function  la fuite de la fonction
  Celle-ci corrige par-dessus, en additif.

  ---------------------------------------------------------------------------
  LE DEFAUT : UN ORACLE DE CONTENU ENTRE SOCIETES
  ---------------------------------------------------------------------------

  crm_immo_etats_unique_par_echeance etait UNIQUE (dossier_id, genre, periode) :
  la SEULE contrainte d unicite du module qui n incluait PAS company_id. Un
  index unique est verifie HORS RLS, et avant le declenchement de la cle
  etrangere. Resultat mesure, en role authenticated, par une Societe qui
  detient le module et connait un dossier_id qui n est pas le sien :

    periode deja prise chez la voisine  ->  23505  duplicate key value ...
    periode libre chez la voisine       ->  23503  violates foreign key ...

  Deux SQLSTATE differents pour deux etats du monde que l appelante n a pas le
  droit de connaitre, alors qu un SELECT sur la meme table lui rend 0 ligne.
  Ce n est pas une existence, c est un CONTENU : « Bellisimmo a-t-elle deja
  traite le loyer de novembre sur ce dossier ? »

  CE QUE CE DEFAUT APPREND, ET QUI VAUT POUR TOUT LE DEPOT : la documentation
  du module justifiait la cle etrangere COMPOSEE par « company_id ne peut donc
  pas mentir ». C est vrai de ce qui se PERSISTE, et faux de ce qui se LIT DANS
  L ERREUR. Une contrainte d unicite est un canal de lecture : toute contrainte
  d unicite d une table multi-tenant doit porter company_id, sinon elle repond
  a travers les cloisons.

  ---------------------------------------------------------------------------
  POURQUOI LA REGLE METIER N EST PAS RELACHEE D UN POUCE
  ---------------------------------------------------------------------------

  Ajouter company_id en tete pourrait sembler AFFAIBLIR l unicite : deux
  Societes pourraient alors porter le meme (dossier_id, genre, periode). C est
  impossible, et c est la cle etrangere composee qui l interdit :

    FOREIGN KEY (dossier_id, company_id) REFERENCES crm_immo_dossiers (id, company_id)

  Un dossier_id donne n existe que chez UNE Societe, donc dossier_id determine
  fonctionnellement company_id. Ajouter company_id a la contrainte n ajoute
  aucune liberte : l unicité reste exactement « une alerte par dossier, par
  genre, par periode ». Seul l INDEX change, et il devient cloisonne.

  Apres correction, les deux sondes ci-dessus rendent le MEME 23503 : la
  contrainte unique ne collisionne plus entre Societes, donc c est la cle
  etrangere qui parle la premiere, et elle refuse a l identique dans les deux
  cas. Plus de difference, plus d oracle.

  ---------------------------------------------------------------------------
  UNE AFFIRMATION DE LA PREMIERE MIGRATION DEVIENT FAUSSE
  ---------------------------------------------------------------------------

  20261019201657 porte ce commentaire, que son fichier conserve puisqu il ne
  doit pas etre reecrit :

    « Pas d index sur dossier_id seul : la contrainte UNIQUE ci-dessus en cree
      deja un, dont dossier_id est la premiere colonne. »

  Ce n est plus vrai : la premiere colonne de l index devient company_id.
  C EST SANS CONSEQUENCE, et pour une raison precise : la cle etrangere est
  COMPOSEE, donc la verification de cascade cherche
  (dossier_id = $1 AND company_id = $2) — deux egalites, dont company_id. Le
  nouvel index (company_id, dossier_id, genre, periode) sert donc cette
  recherche par son prefixe. Et toute requete du module filtre de toute facon
  sur company_id, puisque c est le cloisonnement. Verifie apres application :
  la cascade dossier -> etats fonctionne toujours.

  EFFET DE BORD A CONNAITRE, NON TRAITE ICI : crm_immo_etats_company_id_idx,
  sur (company_id) seul, devient REDONDANT — le nouvel index unique a
  company_id en tete et sert tout ce que lui servait. Le supprimer ferait
  gagner un peu d ecriture. David n a pas valide cette suppression, donc elle
  n est pas faite : signale, pas decide.

  CE QUE CETTE MIGRATION NE FAIT PAS : aucune table, aucune colonne, aucune
  policy, aucune fonction, aucune donnee, aucun autre module. Elle ne touche ni
  l oracle d existence par cle primaire globale (un seul bit, exige de detenir
  le module ET de connaitre un uuid v4), ni le module d introspection public,
  ni le Realtime, ni les droits des vendeurs et des clients : quatre chantiers
  separes, laisses a David.

  Les trois tables de donnees sont VIDES au moment ou cette migration passe :
  le DROP puis ADD ne reconstruit aucun index sur des lignes existantes et ne
  peut echouer sur un doublon preexistant.

  ROLLBACK :
    ALTER TABLE public.crm_immo_etats DROP CONSTRAINT crm_immo_etats_unique_par_echeance;
    ALTER TABLE public.crm_immo_etats ADD  CONSTRAINT crm_immo_etats_unique_par_echeance
      UNIQUE (dossier_id, genre, periode);
  (le rollback REOUVRE l oracle : ne le jouer que pour un diagnostic)
*/

ALTER TABLE public.crm_immo_etats
  DROP CONSTRAINT crm_immo_etats_unique_par_echeance;

ALTER TABLE public.crm_immo_etats
  ADD CONSTRAINT crm_immo_etats_unique_par_echeance
  UNIQUE (company_id, dossier_id, genre, periode);

COMMENT ON CONSTRAINT crm_immo_etats_unique_par_echeance ON public.crm_immo_etats IS
  'Une alerte par dossier, par genre, par periode. company_id est en tete pour CLOISONNER l''index : sans lui, l''erreur 23505 repondait a travers les Societes et revelait si une voisine detenait deja cette echeance. L''unicite n''est pas relachee : la cle etrangere composee garantit que dossier_id determine company_id.';
