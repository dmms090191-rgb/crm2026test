-- Etape 0.2 bis : detection exacte, cote serveur, d un email present sur un lead d une AUTRE Societe.
-- Utilisee par l edge function update-user-password (client service_role) pour empecher une Societe
-- de prendre le compte d un client d une autre Societe en recopiant son email dans son propre CRM.
-- Remplace une recherche PostgREST ilike + limit + filtre JS, contournable par inondation de lignes.
-- Comparaison exacte apres normalisation (minuscules, espaces/tabulations/retours/espace insecable retires
-- en debut et fin), filtre de Societe dans la requete elle-meme, EXISTS (aucune limite contournable).
-- SECURITY INVOKER : appelee en service_role (RLS contournee par le role, pas par la fonction).
-- EXECUTE reserve a service_role (sinon oracle d existence d un email pour anon/authenticated).

create or replace function public.email_on_other_company_leads(p_email text, p_company_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  with norm as (
    select pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, ''), E' \t\r\n' || pg_catalog.chr(160))) as e
  )
  select case
    when (select e from norm) = '' then true
    else exists (
      select 1
      from public.leads l, norm
      where l.company_id is distinct from p_company_id
        and (
          pg_catalog.lower(pg_catalog.btrim(coalesce(l.email, ''), E' \t\r\n' || pg_catalog.chr(160))) = norm.e
          or pg_catalog.lower(pg_catalog.btrim(coalesce(l.data ->> 'Email', ''), E' \t\r\n' || pg_catalog.chr(160))) = norm.e
        )
    )
  end;
$$;

revoke all on function public.email_on_other_company_leads(text, uuid) from public, anon, authenticated;
grant execute on function public.email_on_other_company_leads(text, uuid) to service_role;

comment on function public.email_on_other_company_leads(text, uuid) is
  'Etape 0.2 bis : true si l email (normalise) figure sur un lead dont company_id differe de p_company_id (NULL compris), ou si l email est vide (refus par defaut). EXECUTE reserve a service_role (edge function update-user-password).';
