-- Fondations Site 3/4 : templates attribuables.
-- Une attribution signifie uniquement : « cette entreprise a le droit d'utiliser ce template ».
-- Elle ne partage ni le CRM, ni les donnees du site : chaque entreprise garde SA propre instance
-- (company_home_pages). Seul Talvex Administrateur attribue ou retire.
-- Regles :
--   - une entreprise (Groupe ou Societe) ne peut appliquer a son site qu'un template qui lui est attribue ;
--   - quand Talvex applique un template a une entreprise, l'attribution est creee automatiquement ;
--   - les templates deja actifs sur des sites existants sont attribues a leur entreprise (reprise de l'existant).

create table if not exists public.site_template_assignments (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.site_templates(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  constraint site_template_assignments_unique unique (template_id, company_id)
);

create index if not exists site_template_assignments_company_idx
  on public.site_template_assignments (company_id);

comment on table public.site_template_assignments is
  'Droit d utiliser un template pour une entreprise. N implique aucun partage de donnees ni de CRM.';

alter table public.site_template_assignments enable row level security;

revoke all on table public.site_template_assignments from anon;

create policy "Site managers can view template assignments"
  on public.site_template_assignments
  as permissive for select to authenticated
  using (public.can_manage_company(company_id));

create policy "Talvex can insert template assignments"
  on public.site_template_assignments
  as permissive for insert to authenticated
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

create policy "Talvex can update template assignments"
  on public.site_template_assignments
  as permissive for update to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin')
  with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

create policy "Talvex can delete template assignments"
  on public.site_template_assignments
  as permissive for delete to authenticated
  using (((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'super_admin');

-- Reprise de l'existant : les templates actifs des sites d'entreprise deja crees.
insert into public.site_template_assignments (template_id, company_id, created_by)
select h.active_template_id, h.company_id, null
from public.company_home_pages h
where h.site_scope = 'company'
  and h.company_id is not null
  and h.active_template_id is not null
on conflict (template_id, company_id) do nothing;

-- Lecture sans RLS pour le declencheur (ne renvoie qu'un booleen).
create or replace function public.is_template_assigned(p_company_id uuid, p_template_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.site_template_assignments a
    where a.company_id = p_company_id and a.template_id = p_template_id
  );
$$;

revoke all on function public.is_template_assigned(uuid, uuid) from public, anon;
grant execute on function public.is_template_assigned(uuid, uuid) to authenticated, service_role;

-- Garde : hors serveur et Talvex, le template applique doit etre attribue a l'entreprise.
create or replace function public.guard_site_template_usage()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.site_scope is distinct from 'company' or new.company_id is null or new.active_template_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE'
     and new.active_template_id is not distinct from old.active_template_id
     and new.company_id is not distinct from old.company_id then
    return new;
  end if;
  if current_user in ('service_role', 'postgres', 'supabase_admin')
     or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin' then
    return new;
  end if;
  if not public.is_template_assigned(new.company_id, new.active_template_id) then
    raise exception 'company_home_pages : ce template n est pas attribue a cette entreprise'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace trigger trg_site_template_usage
  before insert or update of active_template_id, company_id on public.company_home_pages
  for each row
  execute function public.guard_site_template_usage();

-- Attribution automatique quand un template est applique (en pratique : par Talvex, les autres
-- ne pouvant appliquer qu'un template deja attribue).
create or replace function public.auto_assign_applied_template()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.site_scope = 'company' and new.company_id is not null and new.active_template_id is not null then
    insert into public.site_template_assignments (template_id, company_id, created_by)
    values (new.active_template_id, new.company_id, auth.uid())
    on conflict (template_id, company_id) do nothing;
  end if;
  return null;
end;
$$;


create or replace trigger trg_site_template_auto_assign
  after insert or update of active_template_id, company_id on public.company_home_pages
  for each row
  execute function public.auto_assign_applied_template();
