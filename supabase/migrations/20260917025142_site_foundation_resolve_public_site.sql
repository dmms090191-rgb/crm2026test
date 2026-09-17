-- Fondations Site 4/4 : resolution serveur d'un site public (preparation du futur portail par domaine).
-- Le SERVEUR determine l'entreprise proprietaire a partir du domaine reellement utilise (ou du slug
-- sur un hote Talvex), jamais a partir d'un company_id fourni par le navigateur.
-- Regles :
--   - si p_host est fourni (domaine personnalise) : seul un site actif dont le domaine est verifie repond ;
--     le slug est alors ignore (un domaine ne peut pas afficher le site d'une autre entreprise) ;
--   - sinon, resolution par slug d'un site actif.
-- Ne renvoie que les colonnes publiques (miroir de PUBLIC_HOME_PAGE_COLUMNS). Pas encore branchee a l'interface.

create or replace function public.resolve_public_site(p_host text default null, p_slug text default null)
returns table (
  id uuid,
  company_id uuid,
  site_scope text,
  slug text,
  custom_domain text,
  domain_verified boolean,
  is_active boolean,
  is_published boolean,
  active_template_id uuid,
  title text,
  subtitle text,
  welcome_message text,
  logo_url text,
  main_color text,
  secondary_color text,
  hero_image_url text,
  app_icon_url text
)
language sql
stable
security definer
set search_path = ''
as $$
  with norm as (
    select
      nullif(pg_catalog.regexp_replace(pg_catalog.regexp_replace(
        pg_catalog.lower(pg_catalog.btrim(coalesce(p_host, ''))), '^www\.', ''), '\.$', ''), '') as host,
      nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_slug, ''))), '') as slug
  )
  select hp.id, hp.company_id, hp.site_scope, hp.slug, hp.custom_domain, hp.domain_verified, hp.is_active,
         hp.is_published, hp.active_template_id, hp.title, hp.subtitle, hp.welcome_message, hp.logo_url,
         hp.main_color, hp.secondary_color, hp.hero_image_url, hp.app_icon_url
  from public.company_home_pages hp, norm
  where hp.is_active
    and (
      (norm.host is not null and hp.domain_verified
        and pg_catalog.regexp_replace(pg_catalog.lower(hp.custom_domain), '^www\.', '') = norm.host)
      or (norm.host is null and norm.slug is not null and pg_catalog.lower(hp.slug) = norm.slug)
    )
  limit 1;
$$;

revoke all on function public.resolve_public_site(text, text) from public;
grant execute on function public.resolve_public_site(text, text) to anon, authenticated, service_role;

comment on function public.resolve_public_site(text, text) is
  'Fondations Site : resout le site public (colonnes publiques uniquement) par domaine verifie, sinon par slug. Base du futur portail de connexion par domaine.';
