-- Fondations Site : le rattachement d'une Societe a un Groupe est une decision serveur ou Talvex.
-- Constat (test en transaction annulee) : la policy "Admin can update own company" laissait une Societe
-- modifier sa propre ligne, donc se rattacher a un autre Groupe ou quitter le sien.
-- Correctif minimal : le trigger de hierarchie refuse tout changement de parent_company_id
-- qui ne vient ni du serveur (service_role / postgres / supabase_admin) ni d'un JWT Talvex Administrateur.
-- Le reste de la ligne (nom, theme, etc.) reste modifiable par la Societe comme avant.

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

  -- Rattacher, detacher ou changer de Groupe : serveur ou Talvex Administrateur uniquement.
  if ((tg_op = 'INSERT' and new.parent_company_id is not null)
      or (tg_op = 'UPDATE' and new.parent_company_id is distinct from old.parent_company_id))
     and not (v_server or v_talvex)
  then
    raise exception 'companies : le rattachement a un Groupe est reserve au serveur et a Talvex Administrateur'
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
