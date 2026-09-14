/*
  # Groupe : acces aux boutiques de ses Societes

  1. Probleme constate
     La policy « CSA manage child company boutiques » testait l'appartenance via
     un sous-SELECT sur `companies`. Or `companies` porte sa propre RLS : un
     `company_super_admin` n'y voit QUE sa propre ligne, jamais ses filles.
     Le sous-SELECT retournait donc toujours vide, et la branche Groupe ne
     pouvait jamais s'activer. Verifie en live : 0 boutique visible pour un
     Groupe dont la Societe fille en possede une.

  2. Correctif
     Une fonction SECURITY DEFINER dediee UNIQUEMENT a cette question :
     « la company X est-elle une fille de la company de l'appelant ? »
     Elle contourne la RLS de `companies` pour ce seul test booleen.

  3. Portee — volontairement etroite
     - Ne modifie AUCUNE policy de `companies`.
     - Ne touche PAS a `csa_company_statuts`, qui presente le meme motif
       (hors perimetre, signale separement).
     - Modifie la seule policy Groupe de `boutiques`, par ALTER POLICY :
       pas de DROP, la table n'est donc a aucun instant sans protection.

  4. Securite
     - `SET search_path = ''` : empeche tout detournement par search_path.
     - La fonction ne verifie PAS le role : c'est la policy qui s'en charge.
       Elle reste ainsi a usage unique et ne peut rien exposer d'autre qu'un
       booleen de filiation.
     - Execution revoquee a PUBLIC, accordee au seul role `authenticated`.
*/

CREATE OR REPLACE FUNCTION public.is_child_company_of_caller(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies c
    WHERE c.id = p_company_id
      AND c.parent_company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
  );
$$;

REVOKE ALL ON FUNCTION public.is_child_company_of_caller(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_child_company_of_caller(uuid) TO authenticated;

ALTER POLICY "CSA manage child company boutiques"
  ON public.boutiques
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin'
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR public.is_child_company_of_caller(company_id)
    )
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin'
    AND (
      company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
      OR public.is_child_company_of_caller(company_id)
    )
  );
