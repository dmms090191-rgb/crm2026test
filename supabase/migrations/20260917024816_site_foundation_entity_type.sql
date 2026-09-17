-- Fondations Site 1/4 : type d'entite des entreprises (platform / groupe / societe) et coherence de la hierarchie.
-- Aucune donnee supprimee. Le type n'est PAS deduit de company_tier (valeurs historiques non fiables).
-- Classement des lignes existantes par regle explicite (comptes qui revendiquent l'entreprise + hierarchie) ;
-- toute ligne ambigue fait ECHOUER la migration (aucun type devine en silence).
-- entity_type reste NULLABLE tant que les edge functions de creation (create-user, create-company-super-admin,
-- create-admin-for-super-admin) ne sont pas redeployees avec un type explicite : NULL = entreprise non qualifiee.

alter table public.companies add column if not exists entity_type text;

alter table public.companies add constraint companies_entity_type_check
  check (entity_type is null or entity_type in ('platform', 'groupe', 'societe'));

comment on column public.companies.entity_type is
  'Type Talvex de l entreprise : platform (Talvex), groupe, societe. NULL = non qualifiee (creation par une ancienne edge function). Modifiable uniquement par le serveur ou Talvex Administrateur.';

-- 1) Classement des lignes existantes
do $$
declare
  r record;
  v_type text;
  v_ambigus text := '';
begin
  for r in
    select c.id, c.parent_company_id,
      (select count(*) from public.companies ch where ch.parent_company_id = c.id) as nb_filles,
      (select count(*) from auth.users u where u.raw_app_meta_data ->> 'company_id' = c.id::text
         and u.raw_app_meta_data ->> 'role' = 'super_admin') as n_talvex,
      (select count(*) from auth.users u where u.raw_app_meta_data ->> 'company_id' = c.id::text
         and u.raw_app_meta_data ->> 'role' = 'company_super_admin') as n_groupe,
      (select count(*) from auth.users u where u.raw_app_meta_data ->> 'company_id' = c.id::text
         and u.raw_app_meta_data ->> 'role' in ('admin', 'vendor')) as n_societe
    from public.companies c
    where c.entity_type is null
  loop
    v_type := case
      when r.n_talvex > 0 and r.n_groupe = 0 and r.n_societe = 0
           and r.parent_company_id is null and r.nb_filles = 0 then 'platform'
      when r.n_groupe > 0 and r.n_talvex = 0 and r.n_societe = 0
           and r.parent_company_id is null then 'groupe'
      when r.n_talvex = 0 and r.n_groupe = 0 and r.nb_filles = 0
           and (r.n_societe > 0 or r.parent_company_id is not null) then 'societe'
      else null
    end;
    if v_type is null then
      v_ambigus := v_ambigus || r.id::text || ' ';
    else
      update public.companies set entity_type = v_type where id = r.id;
    end if;
  end loop;

  if v_ambigus <> '' then
    raise exception 'entity_type ambigu, migration annulee pour : %', v_ambigus;
  end if;

  if exists (
    select 1 from public.companies s
    left join public.companies p on p.id = s.parent_company_id
    where s.parent_company_id is not null and coalesce(p.entity_type, '') <> 'groupe'
  ) then
    raise exception 'incoherence : une entreprise a un parent qui n est pas un Groupe';
  end if;
end $$;

-- 2) Une seule entreprise plateforme
create unique index if not exists companies_single_platform
  on public.companies (entity_type) where entity_type = 'platform';

-- 3) Aides de lecture (SECURITY DEFINER : le declencheur tourne avec les droits de l'appelant,
--    qui ne voit pas forcement la ligne parente a cause de la RLS). Ne renvoient qu'un booleen.
create or replace function public.company_can_be_parent(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.companies c
    where c.id = p_company_id
      and c.parent_company_id is null
      and (c.entity_type = 'groupe' or c.entity_type is null)
  );
$$;

create or replace function public.company_has_children(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.companies c where c.parent_company_id = p_company_id);
$$;

revoke all on function public.company_can_be_parent(uuid) from public, anon;
revoke all on function public.company_has_children(uuid) from public, anon;
grant execute on function public.company_can_be_parent(uuid) to authenticated, service_role;
grant execute on function public.company_has_children(uuid) to authenticated, service_role;

-- 4) Garde de coherence de la hierarchie
create or replace function public.guard_companies_hierarchy()
returns trigger
language plpgsql
security invoker            -- current_user = role reel de l'appelant
set search_path = ''
as $$
declare
  v_server boolean := current_user in ('service_role', 'postgres', 'supabase_admin');
  v_talvex boolean := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin';
begin
  -- Une entreprise rattachee a un parent est une Societe par definition.
  if new.entity_type is null and new.parent_company_id is not null then
    new.entity_type := 'societe';
  end if;

  -- Qualifier ou requalifier une entreprise : serveur ou Talvex Administrateur uniquement.
  if tg_op = 'UPDATE'
     and new.entity_type is distinct from old.entity_type
     and not (v_server or v_talvex)
     and not (old.entity_type is null and new.entity_type = 'societe' and new.parent_company_id is not null)
  then
    raise exception 'companies : le type d entite est reserve au serveur et a Talvex Administrateur'
      using errcode = '42501';
  end if;

  if new.parent_company_id is not null then
    if new.parent_company_id = new.id then
      raise exception 'companies : une entreprise ne peut pas etre son propre parent' using errcode = '23514';
    end if;
    if new.entity_type in ('groupe', 'platform') then
      raise exception 'companies : un Groupe ou la plateforme ne peut pas avoir de parent' using errcode = '23514';
    end if;
    if not public.company_can_be_parent(new.parent_company_id) then
      raise exception 'companies : le parent doit etre un Groupe' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'UPDATE'
     and new.entity_type in ('societe', 'platform')
     and new.entity_type is distinct from old.entity_type
     and public.company_has_children(new.id)
  then
    raise exception 'companies : une entreprise qui a des Societes rattachees doit rester un Groupe' using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace trigger trg_companies_guard_hierarchy
  before insert or update of parent_company_id, entity_type on public.companies
  for each row
  execute function public.guard_companies_hierarchy();
