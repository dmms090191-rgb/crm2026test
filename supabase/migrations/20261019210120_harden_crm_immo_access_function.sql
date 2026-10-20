/*
  # CRM IMMO — durcissement de has_crm_immo_access et de son declencheur

  Corrige un defaut de securite mesure APRES l application de
  20261019201657_create_crm_immo. Cette migration-la n est PAS reecrite : elle
  reste la trace exacte de ce qui a tourne. Celle-ci corrige par-dessus, en
  additif.

  ---------------------------------------------------------------------------
  LE DEFAUT, ET LE PIEGE A RETENIR POUR TOUTE PROCHAINE FONCTION DU DEPOT
  ---------------------------------------------------------------------------

  La migration precedente ecrit, comme le fait deja
  is_child_company_of_caller :

      REVOKE ALL ON FUNCTION public.has_crm_immo_access(uuid) FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION public.has_crm_immo_access(uuid) TO authenticated;

  et commente « execution rendue a authenticated seulement ». C EST FAUX, et
  la formule est fausse pour TOUTE fonction creee dans le schema public de ce
  projet :

  REVOKE ... FROM PUBLIC ne retire que le droit du pseudo-role PUBLIC. Les
  ALTER DEFAULT PRIVILEGES de Supabase ont DEJA pose, au moment du CREATE, un
  GRANT EXECUTE NOMINATIF sur anon, authenticated et service_role. Le REVOKE
  ne les touche pas. ACL relevee en live apres la migration precedente :

      {postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}

  Mesure HTTPS, avec la seule cle publishable et AUCUN compte :
      POST /rest/v1/rpc/has_crm_immo_access {"p_company_id":"<Bellisimmo>"} -> 200 true
      POST /rest/v1/rpc/has_crm_immo_access {"p_company_id":"<Torah>"}      -> 200 false
  La reponse DISCRIMINE : c etait un oracle public « cette Societe utilise-t-elle
  CRM Immo ? », et une Societe voisine connectee pouvait meme BALAYER le parc
  pour en dresser la carte commerciale. Aucune donnee client ne sortait — la RLS
  des 4 tables tient, un GET anonyme sur chacune rend 0 ligne — mais la liste
  des agences immobilieres de Talvex etait lisible par tout le monde.

  POURQUOI is_child_company_of_caller N AVAIT PAS CE PROBLEME, alors que son
  ACL est identique : sa reponse depend du JWT DE L APPELANT, donc elle rend
  toujours false a un anonyme. Elle ne fuit rien. La reponse de
  has_crm_immo_access ne dependait que de son ARGUMENT. Le copier-coller du
  patron etait fidele ; le raisonnement, non. C est ce decalage qu il faut
  retenir : une fonction SECURITY DEFINER dont la reponse ne depend pas de
  l appelant est un oracle, quel que soit le patron qu elle imite.

  ---------------------------------------------------------------------------
  CE QUE FAIT CETTE MIGRATION — trois points, decides par David
  ---------------------------------------------------------------------------

  1. LE CORPS DE LA FONCTION ne repond plus que si l appelant a le droit de
     savoir : la Societe elle-meme, son Groupe parent au sens de
     is_child_company_of_caller, ou Talvex. La fonction reste SECURITY DEFINER
     — elle doit lire crm_immo_acces sans dependre de la RLS de cette table —
     mais elle porte desormais sa propre regle d habilitation.

     Verifie AVANT application, dans une transaction annulee ou les 12 policies
     utilisaient deja ce corps (chaque ligne porte son current_user) :

       anonyme (role anon)          false      0 dossier vu
       Ruth / Bellisimmo            true       1 dossier vu
       Torah, soeur de Bellisimmo   false      0 dossier vu
       johanna boutique 1, soeur    false      0 dossier vu
       GROUPE Johanna               true  (sa fille) / false (hors Groupe)
       Or Expert, sans module       false / false
       Talvex super_admin           true       1 dossier vu
       postgres, contre-epreuve     true       1 dossier vu  <- donne son sens aux 7 lignes

     La derniere ligne est celle qui prouve les autres : en postgres, RLS
     contournee, le dossier EST visible. Les 0 des voisines viennent donc de la
     RLS, pas d une table vide.

     AUCUN acces legitime n est casse : Ruth travaille, le Groupe garde sa
     fille sans rien gagner hors du Groupe, Talvex voit tout. C etait le vrai
     risque de ce correctif.

     Le nouveau corps ferme deja la fuite a lui seul (ligne 1 : false pour un
     anonyme). Le REVOKE ci-dessous est une seconde barriere, pas un doublon.

  2. L ACL EST POSEE EXPLICITEMENT, en nommant anon, puisque c est le seul
     moyen de lui retirer son droit. service_role GARDE EXECUTE : il porte
     rolbypassrls, n est jamais expose au navigateur, et lui retirer ce droit
     ne fermerait rien tout en cassant un futur traitement cote serveur.

  3. LE DECLENCHEUR updated_at recoit un search_path fixe. Son corps n utilise
     que now(), qui vit dans pg_catalog — toujours resolu quel que soit le
     search_path — donc search_path = '' est sans effet de bord. 15 autres
     fonctions du depot ont le meme defaut ; celle-ci n en fait plus partie.

  CE QUE CETTE MIGRATION NE FAIT PAS : aucune table, aucune colonne, aucune
  contrainte, aucun index, aucune policy, aucune donnee. Les 12 policies
  continuent d appeler la fonction par son OID, inchange par CREATE OR REPLACE.

  ROLLBACK : reposer le corps de 20261019201657_create_crm_immo, puis
    GRANT EXECUTE ON FUNCTION public.has_crm_immo_access(uuid) TO anon;
    ALTER FUNCTION public.update_crm_immo_dossiers_updated_at() RESET search_path;
  (le rollback REOUVRE la fuite : ne le jouer que pour un diagnostic)
*/


-- 1. La fonction ne repond plus qu a qui a le droit de savoir.
CREATE OR REPLACE FUNCTION public.has_crm_immo_access(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crm_immo_acces a
    WHERE a.company_id = p_company_id
      AND a.active
      AND (
        -- la Societe elle-meme
        p_company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
        -- son Groupe parent
        OR public.is_child_company_of_caller(p_company_id)
        -- Talvex
        OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
      )
  );
$$;

-- 2. L ACL, posee en nommant anon : c est le seul moyen de lui retirer EXECUTE.
--    CREATE OR REPLACE conserve les droits existants, donc ce bloc vient APRES.
REVOKE ALL ON FUNCTION public.has_crm_immo_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_crm_immo_access(uuid) TO authenticated, service_role;

-- 3. Le declencheur : search_path fixe. Le corps n appelle que now(), resolu
--    depuis pg_catalog en toutes circonstances.
ALTER FUNCTION public.update_crm_immo_dossiers_updated_at() SET search_path = '';
