-- Domaine (phase 2) : quota Hostinger en fenetre GLISSANTE, par branche, avec reserve Talvex.
-- Additif uniquement : remplace l'usage de consume_domain_provider_quota (fenetre calee sur la minute,
-- qui pouvait laisser passer deux rafales a cheval sur deux minutes). L'ancienne fonction et sa table
-- sont conservees, inutilisees ; aucune suppression.
--
-- Garanties (sur toute periode glissante de 60 s, fenetre comptee de facon conservatrice) :
--   global  <= p_global_limit   (compte Hostinger central : 90/min cote Hostinger)
--   tenants <= p_tenants_limit  (tous les Groupes/Societes ensemble : le reste est reserve a Talvex)
--   branche <= p_branch_limit   (un Groupe + ses Societes filles, ou une Societe independante)
--   utilisateur <= p_user_limit
-- La branche est calculee ici, depuis la base : jamais transmise par le navigateur.

create table public.domain_provider_call_counts (
  provider text not null check (provider = 'hostinger'),
  bucket text not null check (
    bucket in ('global', 'tenants')
    or bucket ~ '^(branch|user):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  second_start timestamptz not null,
  request_count integer not null check (request_count between 1 and 1000),
  primary key (provider, bucket, second_start)
);

create index domain_provider_call_counts_second_idx
  on public.domain_provider_call_counts (second_start);

comment on table public.domain_provider_call_counts is
  'Compteurs techniques par seconde des appels a l''API Hostinger (quota glissant). Serveur uniquement.';

alter table public.domain_provider_call_counts enable row level security;
revoke all on table public.domain_provider_call_counts from public, anon, authenticated;
grant all on table public.domain_provider_call_counts to service_role;

create or replace function public.reserve_domain_provider_call(
  p_user_id uuid,
  p_company_id uuid,
  p_is_talvex boolean,
  p_user_limit integer,
  p_branch_limit integer,
  p_tenants_limit integer,
  p_global_limit integer)
returns table (allowed boolean, refusal text, retry_after_seconds integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz;
  v_second timestamptz;
  v_since timestamptz;
  v_blocked timestamptz;
  v_type text;
  v_parent uuid;
  v_branch uuid;
  v_buckets text[];
  v_limits integer[];
  v_refusals text[];
  v_count integer;
  v_oldest timestamptz;
  i integer;
begin
  if p_user_id is null or p_is_talvex is null
     or p_user_limit is null or p_branch_limit is null or p_tenants_limit is null or p_global_limit is null
     or p_user_limit not between 1 and 90 or p_branch_limit not between 1 and 90
     or p_tenants_limit not between 1 and 90 or p_global_limit not between 1 and 90
     or p_tenants_limit > p_global_limit then
    raise exception 'invalid_quota_arguments' using errcode = '22023';
  end if;

  if not p_is_talvex then
    if p_company_id is null then
      raise exception 'company_required' using errcode = '22023';
    end if;
    select c.entity_type, c.parent_company_id into v_type, v_parent
      from public.companies c
     where c.id = p_company_id;
    if not found then
      raise exception 'company_not_found' using errcode = '22023';
    end if;
    v_branch := case when v_type = 'societe' and v_parent is not null then v_parent else p_company_id end;
  end if;

  -- Toutes les reservations passent l'une apres l'autre : le quota ne peut pas etre depasse en concurrence.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('talvex:domain_provider_quota'));

  v_now := pg_catalog.clock_timestamp();
  v_second := pg_catalog.date_trunc('second', v_now);
  -- 61 compteurs d'une seconde : fenetre legerement plus large que 60 s (prudente).
  v_since := v_second - interval '60 seconds';

  select b.blocked_until into v_blocked
    from public.domain_provider_backoff b
   where b.provider = 'hostinger';
  if v_blocked is not null and v_blocked > v_now then
    return query select false, 'provider_backoff'::text,
      least(3600, greatest(1, ceil(extract(epoch from (v_blocked - v_now)))::integer));
    return;
  end if;

  delete from public.domain_provider_call_counts k
   where k.second_start < v_now - interval '5 minutes';

  if p_is_talvex then
    v_buckets := array['global', 'user:' || p_user_id::text];
    v_limits := array[p_global_limit, p_user_limit];
    v_refusals := array['global_limit', 'user_limit'];
  else
    v_buckets := array['global', 'tenants', 'branch:' || v_branch::text, 'user:' || p_user_id::text];
    v_limits := array[p_global_limit, p_tenants_limit, p_branch_limit, p_user_limit];
    v_refusals := array['global_limit', 'tenants_limit', 'branch_limit', 'user_limit'];
  end if;

  -- Verification de TOUS les compteurs avant la moindre increment : un refus ne consomme rien.
  for i in 1 .. pg_catalog.array_length(v_buckets, 1) loop
    select coalesce(sum(k.request_count), 0)::integer, min(k.second_start)
      into v_count, v_oldest
      from public.domain_provider_call_counts k
     where k.provider = 'hostinger'
       and k.bucket = v_buckets[i]
       and k.second_start >= v_since;
    if v_count >= v_limits[i] then
      return query select false, v_refusals[i],
        least(61, greatest(1, ceil(extract(epoch from (v_oldest + interval '61 seconds' - v_now)))::integer));
      return;
    end if;
  end loop;

  for i in 1 .. pg_catalog.array_length(v_buckets, 1) loop
    insert into public.domain_provider_call_counts as k (provider, bucket, second_start, request_count)
    values ('hostinger', v_buckets[i], v_second, 1)
    on conflict (provider, bucket, second_start)
    do update set request_count = k.request_count + 1;
  end loop;

  return query select true, null::text, 0;
end;
$$;

comment on function public.reserve_domain_provider_call(uuid, uuid, boolean, integer, integer, integer, integer) is
  'Reserve un appel Hostinger (fenetre glissante 60 s : global, tenants, branche, utilisateur). Serveur uniquement.';

comment on function public.consume_domain_provider_quota(uuid, integer, integer) is
  'REMPLACEE par reserve_domain_provider_call (fenetre glissante). Conservee, non utilisee.';

revoke all on function public.reserve_domain_provider_call(uuid, uuid, boolean, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_domain_provider_call(uuid, uuid, boolean, integer, integer, integer, integer) to service_role;
