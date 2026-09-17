-- Etape 0.1 : fermer l'acces anon et la recherche entre societes de find_duplicate_leads.
-- Principe : SECURITY INVOKER, la RLS de public.leads s'applique a l'appelant.
-- Signature, noms de parametres, DEFAULT et colonnes de retour INCHANGES. Aucun DROP.
-- search_path = public, pg_temp (et non '') : client_company_ids(), appelee par la policy
-- client de leads, reference `leads` sans schema.

-- 1) Surcharge appelee par le frontend (src/pages/admin/views/import/useImportLeads.ts)
CREATE OR REPLACE FUNCTION public.find_duplicate_leads(
  p_emails      text[],
  p_telephones  text[],
  p_company_id  uuid DEFAULT NULL
)
RETURNS TABLE (
  lead_id        uuid,
  lead_email     text,
  lead_telephone text,
  lead_nom       text,
  lead_prenom    text,
  match_type     text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    l.id        AS lead_id,
    l.email     AS lead_email,
    l.telephone AS lead_telephone,
    l.nom       AS lead_nom,
    l.prenom    AS lead_prenom,
    CASE
      WHEN l.email = ANY(p_emails) AND l.telephone = ANY(p_telephones) THEN 'both'
      WHEN l.email = ANY(p_emails) THEN 'email'
      ELSE 'telephone'
    END AS match_type
  FROM public.leads l
  WHERE (
          (l.email     = ANY(p_emails)     AND l.email     IS NOT NULL AND l.email     <> '')
       OR (l.telephone = ANY(p_telephones) AND l.telephone IS NOT NULL AND l.telephone <> '')
        )
    AND (p_company_id IS NULL OR l.company_id = p_company_id);
$$;

REVOKE ALL ON FUNCTION public.find_duplicate_leads(text[], text[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_duplicate_leads(text[], text[], uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.find_duplicate_leads(text[], text[], uuid) IS
  'Dedoublonnage import CSV. SECURITY INVOKER : ne renvoie que les leads lisibles par l''appelant (RLS leads). p_company_id restreint a la societe visee (Visu). Etape 0.1.';

-- 2) Ancienne surcharge 2 arguments : non utilisee (le frontend envoie toujours p_company_id).
--    Neutralisee sans DROP : INVOKER + plus aucun EXECUTE pour anon ni authenticated.
CREATE OR REPLACE FUNCTION public.find_duplicate_leads(
  p_emails      text[],
  p_telephones  text[]
)
RETURNS TABLE (
  lead_id        uuid,
  lead_email     text,
  lead_telephone text,
  lead_nom       text,
  lead_prenom    text,
  match_type     text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    l.id        AS lead_id,
    l.email     AS lead_email,
    l.telephone AS lead_telephone,
    l.nom       AS lead_nom,
    l.prenom    AS lead_prenom,
    CASE
      WHEN l.email = ANY(p_emails) AND l.telephone = ANY(p_telephones) THEN 'both'
      WHEN l.email = ANY(p_emails) THEN 'email'
      ELSE 'telephone'
    END AS match_type
  FROM public.leads l
  WHERE (l.email     = ANY(p_emails)     AND l.email     IS NOT NULL AND l.email     <> '')
     OR (l.telephone = ANY(p_telephones) AND l.telephone IS NOT NULL AND l.telephone <> '');
$$;

REVOKE ALL ON FUNCTION public.find_duplicate_leads(text[], text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_duplicate_leads(text[], text[]) TO service_role;

COMMENT ON FUNCTION public.find_duplicate_leads(text[], text[]) IS
  'OBSOLETE, conservee (pas de DROP). Remplacee par la surcharge (text[], text[], uuid). EXECUTE reserve a service_role. Etape 0.1.';
