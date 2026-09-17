-- Fondations Site 2 bis : can_manage_company doit renvoyer un booleen STRICT (jamais NULL).
-- Defaut constate en test : pour un Groupe visant une Societe sans parent, la comparaison
-- parent_company_id = company_id valait NULL. En RLS, NULL vaut refus (aucun acces ouvert),
-- mais dans get_site_context « IF NOT NULL » ne bloquait pas : le contexte (nom, type) d'une
-- Societe d'un autre perimetre pouvait etre renvoye. Correctif : coalesce partout + garde stricte.

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
    return coalesce(
      p_company_id = v_caller_company
      and v_target_type is distinct from 'groupe'
      and v_target_type is distinct from 'platform',
      false);
  end if;

  if v_role = 'company_super_admin' then
    select c.entity_type into v_caller_type from public.companies c where c.id = v_caller_company;
    if not found or coalesce(v_caller_type in ('societe', 'platform'), false) then
      return false;
    end if;
    if p_company_id = v_caller_company then
      return true;
    end if;
    return coalesce(
      v_target_parent is not null
      and v_target_parent = v_caller_company
      and v_target_type is distinct from 'groupe'
      and v_target_type is distinct from 'platform',
      false);
  end if;

  return false;
end;
$$;

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
  if public.can_manage_company(p_company_id) is not true then
    return;
  end if;
  if v_raw_company ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_caller_company := v_raw_company::uuid;
  end if;

  return query
    select c.id, c.name, c.entity_type, c.parent_company_id, p.name, p.entity_type,
      case
        when v_caller_company is not null and c.id = v_caller_company then 'self'
        when v_role = 'company_super_admin' and c.parent_company_id is not null
             and c.parent_company_id = v_caller_company then 'group_child'
        when v_role = 'super_admin' then 'platform_admin'
        else 'other'
      end
    from public.companies c
    left join public.companies p on p.id = c.parent_company_id
    where c.id = p_company_id;
end;
$$;
