-- « Mes domaines enregistres » : liste des domaines deja enregistres par une entite, avec masquage.
--
-- La liste est CALCULEE depuis public.site_domains (une ligne par cycle d'enregistrement, lignes liberees
-- comprises) : un domaine enregistre apparait tout seul, sans aucune ecriture supplementaire.
-- « Supprimer » ne supprime RIEN : il masque le domaine de la liste de cette entite, dans une table dediee.
--
-- Garanties :
--   - public.site_domains et public.site_domain_events ne sont JAMAIS modifiees (lecture seule ici) ;
--   - aucune action DNS, Hostinger ni Vercel ;
--   - un domaine en service (rattache, non libere) n'est jamais masquable et reste toujours affiche ;
--   - un domaine masque puis enregistre a nouveau plus tard reapparait automatiquement ;
--   - isolation : meme controle que tout le module Site (public.can_manage_company) ;
--   - aucune regle d'acces existante n'est modifiee ; la nouvelle table n'est accessible que par les
--     trois fonctions ci-dessous.

-- 1) Masquages par entite. Jamais de suppression par l'application : un nouveau masquage met a jour la ligne.
--    hidden_through = date du dernier cycle d'enregistrement VU au moment du masquage. Tout cycle plus
--    recent fait reapparaitre le domaine, meme s'il a ete cree pendant le masquage (acces simultanes).
create table public.site_domain_list_hidden (
  company_id uuid not null references public.companies(id) on delete restrict,
  domain_name text not null,
  hidden_through timestamptz not null,
  hidden_at timestamptz not null default now(),
  hidden_by uuid,
  primary key (company_id, domain_name)
);

alter table public.site_domain_list_hidden enable row level security;
revoke all on table public.site_domain_list_hidden from public;
revoke all on table public.site_domain_list_hidden from anon;
revoke all on table public.site_domain_list_hidden from authenticated;

comment on table public.site_domain_list_hidden is
  'Masquages de « Mes domaines enregistres » par entite. Preference d''affichage uniquement : ne deconnecte rien et ne touche jamais site_domains. Acces uniquement via get_site_domain_list / hide_site_domain_from_list / hide_all_site_domains_from_list.';

-- 2) Lecture de la liste d'une entite (lecture seule).
--    Les etats renvoyes sont ceux du cycle en service s'il existe, sinon du cycle le plus recent.
create or replace function public.get_site_domain_list(p_company_id uuid)
returns table(domain_name text, is_active boolean, is_live boolean, connection_status text, registration_status text,
              last_registered_at timestamptz)
language plpgsql
stable
security definer
set search_path to ''
as $function$
#variable_conflict use_column
begin
  if public.can_manage_company(p_company_id) is not true then
    return;
  end if;
  return query
    with registered as (
      select d.domain_name as name,
             max(d.created_at) as last_at,
             coalesce(bool_or(d.registration_status <> 'released' and d.connection_status = 'active'), false) as active,
             coalesce(bool_or(d.registration_status <> 'released'), false) as live,
             (array_agg(d.connection_status order by (d.registration_status <> 'released') desc, d.created_at desc))[1] as conn,
             (array_agg(d.registration_status order by (d.registration_status <> 'released') desc, d.created_at desc))[1] as reg
        from public.site_domains d
       where d.company_id = p_company_id
         and d.registration_status <> 'failed'
       group by d.domain_name
    )
    select r.name, r.active, r.live, r.conn, r.reg, r.last_at
      from registered r
      left join public.site_domain_list_hidden h
        on h.company_id = p_company_id and h.domain_name = r.name
     where h.domain_name is null
        or r.live                        -- un domaine en service reste toujours affiche
        or r.last_at > h.hidden_through  -- enregistre a nouveau apres le cycle masque : il revient
     order by r.active desc, r.live desc, r.last_at desc, r.name;
end;
$function$;

-- 3) Masquer UN domaine de la liste. Ne touche que la table des masquages.
create or replace function public.hide_site_domain_from_list(p_company_id uuid, p_domain text)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_domain text := public.normalize_domain_name(p_domain);
  v_known boolean;
  v_live boolean;
  v_through timestamptz;
begin
  if public.can_manage_company(p_company_id) is not true then
    return 'forbidden';
  end if;
  if v_domain is null or not public.is_valid_domain_name(v_domain) then
    return 'invalid';
  end if;
  select count(*) > 0, coalesce(bool_or(d.registration_status <> 'released'), false), max(d.created_at)
    into v_known, v_live, v_through
    from public.site_domains d
   where d.company_id = p_company_id
     and d.domain_name = v_domain
     and d.registration_status <> 'failed';
  if not v_known then
    return 'not_found';   -- jamais enregistre pour cette entite : rien a masquer
  end if;
  if v_live then
    return 'active';      -- en service : jamais masque
  end if;
  insert into public.site_domain_list_hidden as h (company_id, domain_name, hidden_through, hidden_at, hidden_by)
  values (p_company_id, v_domain, v_through, now(), auth.uid())
  on conflict (company_id, domain_name)
  do update set hidden_through = excluded.hidden_through, hidden_at = excluded.hidden_at, hidden_by = excluded.hidden_by;
  return 'hidden';
end;
$function$;

-- 4) « Tout supprimer » : masque les domaines VISIBLES et hors service ; epargne toujours le domaine en service.
--    Renvoie le nombre de domaines masques, ou NULL si l'acces est refuse (distinct de « rien a masquer »).
create or replace function public.hide_all_site_domains_from_list(p_company_id uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_count integer;
begin
  if public.can_manage_company(p_company_id) is not true then
    return null;
  end if;
  with registered as (
    select d.domain_name as name, max(d.created_at) as last_at,
           coalesce(bool_or(d.registration_status <> 'released'), false) as live
      from public.site_domains d
     where d.company_id = p_company_id
       and d.registration_status <> 'failed'
     group by d.domain_name
  ), visible as (
    select r.name, r.last_at
      from registered r
      left join public.site_domain_list_hidden h
        on h.company_id = p_company_id and h.domain_name = r.name
     where not r.live
       and (h.domain_name is null or r.last_at > h.hidden_through)
  ), written as (
    insert into public.site_domain_list_hidden as h (company_id, domain_name, hidden_through, hidden_at, hidden_by)
    select p_company_id, v.name, v.last_at, now(), auth.uid() from visible v
    on conflict (company_id, domain_name)
    do update set hidden_through = excluded.hidden_through, hidden_at = excluded.hidden_at, hidden_by = excluded.hidden_by
    returning 1
  )
  select count(*)::integer into v_count from written;
  return v_count;
end;
$function$;

revoke all on function public.get_site_domain_list(uuid) from public, anon;
revoke all on function public.hide_site_domain_from_list(uuid, text) from public, anon;
revoke all on function public.hide_all_site_domains_from_list(uuid) from public, anon;
grant execute on function public.get_site_domain_list(uuid) to authenticated, service_role;
grant execute on function public.hide_site_domain_from_list(uuid, text) to authenticated, service_role;
grant execute on function public.hide_all_site_domains_from_list(uuid) to authenticated, service_role;

comment on function public.get_site_domain_list(uuid) is
  'Mes domaines enregistres : domaines deja enregistres par l''entite (lignes liberees comprises), hors masques ; un domaine en service reste toujours affiche. Lecture seule.';
comment on function public.hide_site_domain_from_list(uuid, text) is
  'Masque un domaine de la liste de l''entite. Ne deconnecte rien, ne touche jamais site_domains. Refuse un domaine en service (active).';
comment on function public.hide_all_site_domains_from_list(uuid) is
  'Masque tous les domaines visibles et hors service de l''entite ; le domaine en service reste affiche. NULL si acces refuse. Ne touche jamais site_domains.';
