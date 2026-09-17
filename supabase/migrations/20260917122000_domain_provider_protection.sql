-- Domaine (phase 2) : protections serveur de l'API Hostinger centrale, en LECTURE SEULE.
-- Additif uniquement : aucune donnee existante modifiee, aucune suppression de structure.
-- Ces tables ne contiennent AUCUNE donnee de domaine client ni aucun secret :
-- compteurs de quota, recul apres refus du fournisseur, cache technique (reserve au serveur).

-- 1. Droit de rechercher un domaine pour une entreprise, evalue avec le JWT reel de l'appelant.
--    Talvex : toute entreprise existante. Groupe : lui-meme + Societes filles directes.
--    Societe : elle-meme. Commercial, Client, anonyme : jamais.
create or replace function public.can_search_domains(p_company_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text := coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
  v_type text;
begin
  if p_company_id is null then
    return false;
  end if;

  select c.entity_type into v_type from public.companies c where c.id = p_company_id;
  if not found then
    return false;
  end if;

  if v_role = 'super_admin' then
    return true;
  end if;

  if v_role not in ('company_super_admin', 'admin') then
    return false;
  end if;

  return coalesce(v_type in ('groupe', 'societe') and public.can_manage_company(p_company_id), false);
end;
$$;

comment on function public.can_search_domains(uuid) is
  'Droit de rechercher un domaine (lecture seule) pour une entreprise ; evalue cote serveur avec le JWT de l''appelant.';

revoke all on function public.can_search_domains(uuid) from public, anon;
grant execute on function public.can_search_domains(uuid) to authenticated, service_role;

-- 2. Quotas partages par fenetre d'une minute (toutes les instances de la fonction serveur).
create table public.domain_provider_quota_windows (
  provider text not null check (provider = 'hostinger'),
  bucket text not null check (
    bucket = 'global'
    or bucket ~ '^user:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  window_start timestamptz not null,
  request_count integer not null check (request_count between 0 and 10000),
  primary key (provider, bucket, window_start)
);

create index domain_provider_quota_windows_start_idx
  on public.domain_provider_quota_windows (window_start);

comment on table public.domain_provider_quota_windows is
  'Compteurs techniques d''appels a l''API Hostinger par minute (global et par utilisateur). Serveur uniquement.';

-- 3. Recul global : apres un 429 (Retry-After) ou un refus d'authentification du fournisseur.
create table public.domain_provider_backoff (
  provider text primary key check (provider = 'hostinger'),
  blocked_until timestamptz not null,
  reason text not null check (reason in ('rate_limited', 'unauthorized')),
  updated_at timestamptz not null default now()
);

comment on table public.domain_provider_backoff is
  'Pause globale des appels Hostinger apres un refus du fournisseur. Serveur uniquement.';

-- 4. Cache technique court (disponibilite) et plus long (catalogue de prix du fournisseur).
--    Les prix du catalogue sont un COUT Talvex : jamais lisibles hors serveur.
create table public.domain_provider_cache (
  cache_key text primary key check (cache_key ~ '^(availability|catalog):[a-z0-9.-]{1,253}$'),
  provider text not null default 'hostinger' check (provider = 'hostinger'),
  kind text not null check (kind in ('availability', 'catalog')),
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint domain_provider_cache_kind_matches_key check (pg_catalog.split_part(cache_key, ':', 1) = kind),
  constraint domain_provider_cache_expiry_after_fetch check (expires_at > fetched_at)
);

create index domain_provider_cache_expires_idx on public.domain_provider_cache (expires_at);

comment on table public.domain_provider_cache is
  'Cache technique des lectures Hostinger (disponibilite, catalogue). Contient des couts Talvex : serveur uniquement.';

alter table public.domain_provider_quota_windows enable row level security;
alter table public.domain_provider_backoff enable row level security;
alter table public.domain_provider_cache enable row level security;

revoke all on table public.domain_provider_quota_windows from public, anon, authenticated;
revoke all on table public.domain_provider_backoff from public, anon, authenticated;
revoke all on table public.domain_provider_cache from public, anon, authenticated;
grant all on table public.domain_provider_quota_windows to service_role;
grant all on table public.domain_provider_backoff to service_role;
grant all on table public.domain_provider_cache to service_role;

-- 5. Consommation atomique d'un appel : pause globale, puis quota utilisateur, puis quota global.
create or replace function public.consume_domain_provider_quota(
  p_user_id uuid,
  p_user_limit integer,
  p_global_limit integer)
returns table (allowed boolean, refusal text, retry_after_seconds integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_window timestamptz := pg_catalog.date_trunc('minute', v_now);
  v_reset integer := greatest(1, ceil(extract(epoch from (v_window + interval '1 minute' - v_now)))::integer);
  v_blocked timestamptz;
  v_count integer;
begin
  if p_user_id is null or p_user_limit is null or p_global_limit is null
     or p_user_limit not between 1 and 90 or p_global_limit not between 1 and 90 then
    raise exception 'invalid_quota_arguments' using errcode = '22023';
  end if;

  select b.blocked_until into v_blocked
    from public.domain_provider_backoff b
   where b.provider = 'hostinger';
  if v_blocked is not null and v_blocked > v_now then
    return query select false, 'provider_backoff'::text,
      greatest(1, ceil(extract(epoch from (v_blocked - v_now)))::integer);
    return;
  end if;

  delete from public.domain_provider_quota_windows w
   where w.window_start < v_window - interval '10 minutes';

  insert into public.domain_provider_quota_windows as w (provider, bucket, window_start, request_count)
  values ('hostinger', 'user:' || p_user_id::text, v_window, 1)
  on conflict (provider, bucket, window_start)
  do update set request_count = w.request_count + 1
   where w.request_count < p_user_limit
  returning w.request_count into v_count;
  if v_count is null then
    return query select false, 'user_limit'::text, v_reset;
    return;
  end if;

  v_count := null;
  insert into public.domain_provider_quota_windows as w (provider, bucket, window_start, request_count)
  values ('hostinger', 'global', v_window, 1)
  on conflict (provider, bucket, window_start)
  do update set request_count = w.request_count + 1
   where w.request_count < p_global_limit
  returning w.request_count into v_count;
  if v_count is null then
    return query select false, 'global_limit'::text, v_reset;
    return;
  end if;

  return query select true, null::text, 0;
end;
$$;

-- 6. Pause globale (jamais raccourcie par un appel concurrent).
create or replace function public.set_domain_provider_backoff(p_seconds integer, p_reason text)
returns timestamptz
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_until timestamptz;
begin
  if p_reason is null or p_reason not in ('rate_limited', 'unauthorized') then
    raise exception 'invalid_backoff_reason' using errcode = '22023';
  end if;

  v_until := pg_catalog.clock_timestamp()
    + pg_catalog.make_interval(secs => least(greatest(coalesce(p_seconds, 60), 1), 3600));

  insert into public.domain_provider_backoff as b (provider, blocked_until, reason, updated_at)
  values ('hostinger', v_until, p_reason, pg_catalog.now())
  on conflict (provider) do update
    set blocked_until = greatest(b.blocked_until, excluded.blocked_until),
        reason = excluded.reason,
        updated_at = excluded.updated_at
  returning b.blocked_until into v_until;

  return v_until;
end;
$$;

-- 7. Cache : lecture d'une entree encore valide, ecriture avec purge des entrees expirees.
create or replace function public.get_domain_provider_cache(p_cache_key text)
returns table (payload jsonb, fetched_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.payload, c.fetched_at
    from public.domain_provider_cache c
   where c.cache_key = p_cache_key
     and c.expires_at > pg_catalog.now();
$$;

create or replace function public.put_domain_provider_cache(
  p_cache_key text,
  p_kind text,
  p_payload jsonb,
  p_ttl_seconds integer)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.now();
begin
  if p_payload is null or p_ttl_seconds is null or p_ttl_seconds not between 1 and 86400 then
    raise exception 'invalid_cache_arguments' using errcode = '22023';
  end if;

  delete from public.domain_provider_cache c
   where c.expires_at < v_now - interval '1 hour';

  insert into public.domain_provider_cache as c (cache_key, provider, kind, payload, fetched_at, expires_at)
  values (p_cache_key, 'hostinger', p_kind, p_payload, v_now, v_now + pg_catalog.make_interval(secs => p_ttl_seconds))
  on conflict (cache_key) do update
    set payload = excluded.payload,
        kind = excluded.kind,
        fetched_at = excluded.fetched_at,
        expires_at = excluded.expires_at;
end;
$$;

revoke all on function public.consume_domain_provider_quota(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.set_domain_provider_backoff(integer, text) from public, anon, authenticated;
revoke all on function public.get_domain_provider_cache(text) from public, anon, authenticated;
revoke all on function public.put_domain_provider_cache(text, text, jsonb, integer) from public, anon, authenticated;
grant execute on function public.consume_domain_provider_quota(uuid, integer, integer) to service_role;
grant execute on function public.set_domain_provider_backoff(integer, text) to service_role;
grant execute on function public.get_domain_provider_cache(text) to service_role;
grant execute on function public.put_domain_provider_cache(text, text, jsonb, integer) to service_role;
