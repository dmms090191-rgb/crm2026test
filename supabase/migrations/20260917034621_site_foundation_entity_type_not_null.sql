-- Fondations Site : companies.entity_type devient obligatoire.
-- Prerequis verifies avant application :
--   - les 3 edge functions de creation (create-company-super-admin, create-user, create-admin-for-super-admin)
--     sont deployees et renseignent entity_type explicitement ;
--   - aucun autre parcours legitime ne cree d'entreprise sans type (recensement live + local) ;
--   - aucune ligne existante n'a de type NULL.
-- Pas de valeur par defaut : le type n'est jamais devine silencieusement.

do $$
begin
  if exists (select 1 from public.companies where entity_type is null) then
    raise exception 'companies : des entreprises sans type existent encore, NOT NULL impossible';
  end if;
end $$;

alter table public.companies alter column entity_type set not null;

comment on column public.companies.entity_type is
  'Type Talvex de l entreprise : platform (Talvex), groupe, societe. Obligatoire, jamais deduit de company_tier. Modifiable uniquement par le serveur ou Talvex Administrateur.';

-- Un parent est forcement un Groupe (le cas "type NULL" n'existe plus).
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
      and c.entity_type = 'groupe'
  );
$$;
