/*
  # CRM IMMO — suppression d un index devenu redondant

  Quatrieme et derniere migration de la couche base du module. Les trois
  precedentes ne sont PAS reecrites :
    20261019201657_create_crm_immo                       le schema
    20261019210120_harden_crm_immo_access_function       la fuite de la fonction
    20261019221621_scope_crm_immo_etats_unique_to_company l oracle de contenu

  POURQUOI CET INDEX NE SERT PLUS A RIEN

  20261019201657 a cree crm_immo_etats_company_id_idx sur (company_id) seul.
  A l epoque c etait utile : la contrainte d unicite portait sur
  (dossier_id, genre, periode) et son index commencait donc par dossier_id,
  pas par company_id.

  20261019221621 a porte cette contrainte sur
  (company_id, dossier_id, genre, periode). Son index commence desormais par
  company_id et sert donc, PAR SON PREFIXE, tout ce que servait l index dedie :
    - toute requete du module, qui filtre toujours sur company_id ;
    - la cascade de suppression d une Societe, qui cherche
      (company_id = $1) sur crm_immo_etats ;
    - la cascade de suppression d un dossier, qui cherche
      (dossier_id = $1 AND company_id = $2) — deux egalites, dont company_id.

  Deux index pour la meme recherche, c est du temps d ecriture paye deux fois
  sur chaque INSERT et chaque UPDATE d etat, sans aucun gain en lecture.

  CE QUI RESTE APRES : 11 index sur les 4 tables du module, soit
    - 6 implicites : 4 cles primaires, UNIQUE (id, company_id) sur les
      dossiers, UNIQUE (company_id, dossier_id, genre, periode) sur les etats ;
    - 5 explicites : 3 sur les dossiers (company_id, et les deux partiels pour
      le balayage J-30 et celui des loyers), 2 sur les colonnes (l unique
      d expression sur le nom, et (company_id, position)).
  crm_immo_etats n a plus d index explicite : sa contrainte d unicite suffit.

  CE QUE CETTE MIGRATION NE FAIT PAS : aucune table, aucune colonne, aucune
  contrainte, aucune policy, aucune fonction, aucune donnee, aucun autre
  module. Elle ne touche ni l oracle d existence par cle primaire globale, ni
  le module d introspection public, ni le Realtime, ni les droits des vendeurs
  et des clients.

  ROLLBACK :
    CREATE INDEX IF NOT EXISTS crm_immo_etats_company_id_idx
      ON public.crm_immo_etats USING btree (company_id);
*/

DROP INDEX IF EXISTS public.crm_immo_etats_company_id_idx;
