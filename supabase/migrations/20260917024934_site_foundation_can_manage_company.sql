-- Fondations Site 2/4 : autorisation serveur centralisee du perimetre Site.
-- can_manage_company(cible) :
--   Talvex Administrateur (super_admin) -> toute entreprise existante ;
--   Groupe (company_super_admin)        -> son Groupe + ses Societes directement rattachees ;
--   Societe (admin)                     -> sa Societe uniquement ;
--   Commercial, Client, anon, compte sans role -> rien.
-- Decision fondee sur app_metadata du JWT (non modifiable par l'utilisateur) et sur companies.
-- Gerer le SITE d'une entreprise ne donne AUCUN acces a son CRM : cette fonction n'est utilisee
-- que par les policies Site (company_home_pages, site_sections, site_template_assignments).
-- Aucun DROP : les policies Societe existantes sont renommees puis elargies au Groupe via la fonction.

create or replace function public.can_manage_company(p_company_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_raw_company text := auth.jwt() -> 'app_metadata' ->> 'company_id';
  v_caller_company uuid;
  v_target_type text;
  v_target_parent uuid;
  v_caller_type text;
begin
  if p_company_id is null then
    return false;
  end if;

  select c.entity_type, c.parent_company_id
    into v_target_type, v_target_parent
    from public.companies c
   where c.id = p_company_id;
  if not found then
    return false;
  end if;

  if v_role = 'super_admin' then
    return true;
  end if;

  if v_raw_company is null
     or v_raw_company !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  v_caller_company := v_raw_company::uuid;

  if v_role = 'admin' then
    return p_company_id = v_caller_company
       and v_target_type is distinct from 'groupe'
       and v_target_type is distinct from 'platform';
  end if;

  if v_role = 'company_super_admin' then
    select c.entity_type into v_caller_type from public.companies c where c.id = v_caller_company;
    if not found or v_caller_type in ('societe', 'platform') then
      return false;
    end if;
    if p_company_id = v_caller_company then
      return true;
    end if;
    return v_target_parent = v_caller_company
       and v_target_type is distinct from 'groupe'
       and v_target_type is distinct from 'platform';
  end if;

  return false;
end;
$$;

revoke all on function public.can_manage_company(uuid) from public, anon;
grant execute on function public.can_manage_company(uuid) to authenticated, service_role;

comment on function public.can_manage_company(uuid) is
  'Fondations Site : l acteur (JWT app_metadata) peut-il gerer le SITE de cette entreprise ? super_admin : toutes ; company_super_admin : son Groupe et ses Societes filles ; admin : sa Societe. Ne donne aucun droit CRM.';

-- Contexte Site d'une cible nommee : ne renvoie rien si l'acteur ne peut pas gerer cette entreprise.
create or replace function public.get_site_context(p_company_id uuid)
returns table (
  target_company_id uuid,
  target_name text,
  target_entity_type text,
  target_parent_company_id uuid,
  parent_name text,
  parent_entity_type text,
  relation text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_raw_company text := auth.jwt() -> 'app_metadata' ->> 'company_id';
  v_caller_company uuid;
begin
  if not public.can_manage_company(p_company_id) then
    return;
  end if;
  if v_raw_company ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_caller_company := v_raw_company::uuid;
  end if;

  return query
    select c.id, c.name, c.entity_type, c.parent_company_id, p.name, p.entity_type,
      case
        when v_caller_company is not null and c.id = v_caller_company then 'self'
        when v_role = 'company_super_admin' and c.parent_company_id = v_caller_company then 'group_child'
        when v_role = 'super_admin' then 'platform_admin'
        else 'other'
      end
    from public.companies c
    left join public.companies p on p.id = c.parent_company_id
    where c.id = p_company_id;
end;
$$;

revoke all on function public.get_site_context(uuid) from public, anon;
grant execute on function public.get_site_context(uuid) to authenticated, service_role;

-- Policies company_home_pages : la gestion d'un site d'entreprise passe par can_manage_company.
alter policy "Admin can insert own company site" on public.company_home_pages
  rename to "Site managers can insert managed company site";
alter policy "Site managers can insert managed company site" on public.company_home_pages
  with check (site_scope = 'company' and company_id is not null and public.can_manage_company(company_id));

alter policy "Admin can update own company site" on public.company_home_pages
  rename to "Site managers can update managed company site";
alter policy "Site managers can update managed company site" on public.company_home_pages
  using (site_scope = 'company' and company_id is not null and public.can_manage_company(company_id))
  with check (site_scope = 'company' and company_id is not null and public.can_manage_company(company_id));

create policy "Site managers can view managed company site"
  on public.company_home_pages
  as permissive
  for select
  to authenticated
  using (site_scope = 'company' and company_id is not null and public.can_manage_company(company_id));

-- Policies site_sections : ecriture reservee aux gestionnaires du site (plus aucun Commercial),
-- lecture pour les gestionnaires et, pour tout compte connecte, les sections publiees d'un site publie.
alter policy "Authenticated users can read own site sections" on public.site_sections
  rename to "Site managers or published site can read sections";
alter policy "Site managers or published site can read sections" on public.site_sections
  using (exists (
    select 1 from public.company_home_pages hp
    where hp.id = site_sections.home_page_id
      and (
        (hp.site_scope = 'platform' and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
        or (hp.company_id is not null and public.can_manage_company(hp.company_id))
        or (site_sections.published_content is not null and hp.is_active and hp.is_published)
      )
  ));

alter policy "Admins can insert sections for own site" on public.site_sections
  rename to "Site managers can insert sections";
alter policy "Site managers can insert sections" on public.site_sections
  with check (exists (
    select 1 from public.company_home_pages hp
    where hp.id = site_sections.home_page_id
      and (
        (hp.site_scope = 'platform' and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
        or (hp.company_id is not null and public.can_manage_company(hp.company_id))
      )
  ));

alter policy "Admins can update sections for own site" on public.site_sections
  rename to "Site managers can update sections";
alter policy "Site managers can update sections" on public.site_sections
  using (exists (
    select 1 from public.company_home_pages hp
    where hp.id = site_sections.home_page_id
      and (
        (hp.site_scope = 'platform' and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
        or (hp.company_id is not null and public.can_manage_company(hp.company_id))
      )
  ))
  with check (exists (
    select 1 from public.company_home_pages hp
    where hp.id = site_sections.home_page_id
      and (
        (hp.site_scope = 'platform' and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
        or (hp.company_id is not null and public.can_manage_company(hp.company_id))
      )
  ));

alter policy "Admins can delete sections for own site" on public.site_sections
  rename to "Site managers can delete sections";
alter policy "Site managers can delete sections" on public.site_sections
  using (exists (
    select 1 from public.company_home_pages hp
    where hp.id = site_sections.home_page_id
      and (
        (hp.site_scope = 'platform' and ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
        or (hp.company_id is not null and public.can_manage_company(hp.company_id))
      )
  ));

-- Instance de site : auteur et date de modification tenue par la base.
alter table public.company_home_pages
  add column if not exists created_by uuid default auth.uid() references auth.users(id) on delete set null;

comment on column public.company_home_pages.created_by is
  'Compte qui a cree l instance de site (acteur reel, meme en Visu). NULL pour les lignes anterieures.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create or replace trigger trg_company_home_pages_set_updated_at
  before update on public.company_home_pages
  for each row
  execute function public.set_updated_at();
