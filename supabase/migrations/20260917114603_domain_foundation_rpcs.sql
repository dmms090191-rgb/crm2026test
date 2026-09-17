-- Fondations Domaine (phase 1) 3/3 : acces metier, idempotence, resolution publique.

-- ---------------------------------------------------------------------------
-- Lecture metier pour l'entreprise ciblee (droit verifie par can_manage_company, JWT reel).
-- Jamais : prix d'achat, prix facture, identifiants fournisseur, notes techniques, erreurs internes.
-- ---------------------------------------------------------------------------
create or replace function public.get_site_domains(p_company_id uuid)
returns table (
  id uuid,
  domain_name text,
  is_primary boolean,
  provider text,
  registration_status text,
  connection_status text,
  auto_renew boolean,
  registered_at timestamptz,
  expires_at timestamptz,
  verified_at timestamptz,
  activated_at timestamptz,
  renewal_due boolean,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.can_manage_company(p_company_id) is not true then
    return;
  end if;
  return query
    select d.id, d.domain_name, d.is_primary, d.provider, d.registration_status, d.connection_status, d.auto_renew,
           d.registered_at, d.expires_at, d.verified_at, d.activated_at,
           coalesce(d.registration_status = 'registered' and d.expires_at is not null
                    and d.expires_at <= now() + interval '30 days', false),
           d.updated_at
    from public.site_domains d
    where d.company_id = p_company_id
      and d.registration_status not in ('failed', 'released')
    order by d.is_primary desc, d.created_at;
end;
$$;

create or replace function public.get_domain_purchase_intents(p_company_id uuid)
returns table (
  id uuid,
  domain_name text,
  status text,
  years smallint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.can_manage_company(p_company_id) is not true then
    return;
  end if;
  return query
    select i.id, i.domain_name, i.status, i.years, i.created_at, i.updated_at
    from public.domain_purchase_intents i
    where i.company_id = p_company_id
    order by i.created_at desc
    limit 20;
end;
$$;

-- Droit de gestion d'un domaine = droit de gestion du site de son entreprise (jamais un droit CRM).
create or replace function public.can_manage_site_domain(p_domain_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_company uuid;
begin
  if p_domain_id is null then return false; end if;
  select d.company_id into v_company from public.site_domains d where d.id = p_domain_id;
  if v_company is null then return false; end if;
  return coalesce(public.can_manage_company(v_company), false);
end;
$$;

revoke all on function public.get_site_domains(uuid) from public, anon;
revoke all on function public.get_domain_purchase_intents(uuid) from public, anon;
revoke all on function public.can_manage_site_domain(uuid) from public, anon;
grant execute on function public.get_site_domains(uuid) to authenticated, service_role;
grant execute on function public.get_domain_purchase_intents(uuid) to authenticated, service_role;
grant execute on function public.can_manage_site_domain(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Idempotence : creation d'une intention d'achat (SERVEUR uniquement).
-- Le futur service serveur verifie d'abord le droit de l'acteur (can_manage_company avec son JWT),
-- puis appelle cette fonction. Le site est DEDUIT de l'entreprise, jamais fourni par le navigateur.
--   meme cle + meme demande      -> renvoie l'intention existante (created = false), aucun doublon
--   meme cle + demande differente -> erreur idempotency_key_reused
--   autre cle, meme domaine ouvert -> erreur domain_purchase_in_progress
-- ---------------------------------------------------------------------------
create or replace function public.create_domain_purchase_intent(
  p_idempotency_key uuid,
  p_company_id uuid,
  p_domain_name text,
  p_years integer default 1,
  p_requested_by uuid default null
)
returns table (intent_id uuid, status text, created boolean)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_domain text := public.normalize_domain_name(p_domain_name);
  v_years integer := coalesce(p_years, 1);
  v_site uuid;
  v_existing public.domain_purchase_intents%rowtype;
  v_new_id uuid;
  v_message text;
begin
  if p_idempotency_key is null then
    raise exception 'idempotency_key_required' using errcode = '22023';
  end if;
  if not public.is_valid_domain_name(v_domain) then
    raise exception 'invalid_domain_name' using errcode = '22023';
  end if;

  select * into v_existing from public.domain_purchase_intents i where i.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.company_id <> p_company_id or v_existing.domain_name <> v_domain or v_existing.years <> v_years then
      raise exception 'idempotency_key_reused' using errcode = '22023';
    end if;
    return query select v_existing.id, v_existing.status, false;
    return;
  end if;

  select hp.id into v_site from public.company_home_pages hp
  where hp.company_id = p_company_id and hp.site_scope = 'company';
  if v_site is null then
    raise exception 'company_site_not_found' using errcode = '22023';
  end if;

  begin
    insert into public.domain_purchase_intents (idempotency_key, company_id, home_page_id, domain_name, years, requested_by)
    values (p_idempotency_key, p_company_id, v_site, v_domain, v_years, p_requested_by)
    on conflict (idempotency_key) do nothing
    returning id into v_new_id;
  exception when unique_violation then
    get stacked diagnostics v_message = message_text;
    if v_message = 'domain_already_attached' then
      raise exception 'domain_already_attached' using errcode = '23505';
    end if;
    raise exception 'domain_purchase_in_progress' using errcode = '23505';
  end;

  if v_new_id is null then
    -- Course : la meme cle vient d'etre inseree par une requete concurrente.
    select * into v_existing from public.domain_purchase_intents i where i.idempotency_key = p_idempotency_key;
    if v_existing.company_id <> p_company_id or v_existing.domain_name <> v_domain or v_existing.years <> v_years then
      raise exception 'idempotency_key_reused' using errcode = '22023';
    end if;
    return query select v_existing.id, v_existing.status, false;
    return;
  end if;

  return query select v_new_id, 'pending'::text, true;
end;
$$;

-- Transition atomique (compare-and-set) : un seul travailleur peut faire passer pending -> submitting,
-- donc une seule soumission au fournisseur. Retourne false si l'etat attendu n'est plus le bon.
create or replace function public.transition_domain_purchase_intent(
  p_intent_id uuid,
  p_expected_status text,
  p_new_status text,
  p_patch jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.domain_purchase_intents i
  set status = p_new_status,
      provider_http_status = coalesce((p_patch ->> 'provider_http_status')::smallint, i.provider_http_status),
      provider_order_id = coalesce((p_patch ->> 'provider_order_id')::bigint, i.provider_order_id),
      provider_order_status = coalesce(p_patch ->> 'provider_order_status', i.provider_order_status),
      provider_subscription_id = coalesce(p_patch ->> 'provider_subscription_id', i.provider_subscription_id),
      provider_correlation_id = coalesce(p_patch ->> 'provider_correlation_id', i.provider_correlation_id),
      provider_response = coalesce(p_patch -> 'provider_response', i.provider_response),
      last_error_code = coalesce(p_patch ->> 'last_error_code', i.last_error_code),
      last_error_message = coalesce(p_patch ->> 'last_error_message', i.last_error_message)
  where i.id = p_intent_id and i.status = p_expected_status;
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

revoke all on function public.create_domain_purchase_intent(uuid, uuid, text, integer, uuid) from public, anon, authenticated;
revoke all on function public.transition_domain_purchase_intent(uuid, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_domain_purchase_intent(uuid, uuid, text, integer, uuid) to service_role;
grant execute on function public.transition_domain_purchase_intent(uuid, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Resolution publique UNIQUE (meme signature, colonnes publiques uniquement).
--   1. hote -> site_domains actif (enregistre ou existant, mise en service active) -> site de CETTE entreprise ;
--   2. repli historique : company_home_pages.custom_domain verifie, SEULEMENT si aucun domaine vivant
--      de site_domains ne revendique cet hote (un domaine repris par une autre entreprise ne sert jamais l'ancien site) ;
--   3. sans hote : slug d'un site actif.
-- ---------------------------------------------------------------------------
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
    select public.normalize_domain_name(p_host) as host,
           nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_slug, ''))), '') as slug
  ),
  by_domain as (
    select hp.id, hp.company_id, hp.site_scope, hp.slug, hp.custom_domain, hp.domain_verified, hp.is_active,
           hp.is_published, hp.active_template_id, hp.title, hp.subtitle, hp.welcome_message, hp.logo_url,
           hp.main_color, hp.secondary_color, hp.hero_image_url, hp.app_icon_url, 1 as rank
    from norm
    join public.site_domains d on d.domain_name = norm.host
      and d.connection_status = 'active' and d.registration_status in ('registered', 'external')
    join public.company_home_pages hp on hp.id = d.home_page_id and hp.company_id = d.company_id and hp.is_active
    where norm.host is not null
  ),
  legacy_domain as (
    select hp.id, hp.company_id, hp.site_scope, hp.slug, hp.custom_domain, hp.domain_verified, hp.is_active,
           hp.is_published, hp.active_template_id, hp.title, hp.subtitle, hp.welcome_message, hp.logo_url,
           hp.main_color, hp.secondary_color, hp.hero_image_url, hp.app_icon_url, 2 as rank
    from norm
    join public.company_home_pages hp on hp.is_active and hp.domain_verified
      and public.normalize_domain_name(hp.custom_domain) = norm.host
    where norm.host is not null
      and not exists (select 1 from public.site_domains d
                      where d.domain_name = norm.host and d.registration_status not in ('failed', 'released'))
  ),
  by_slug as (
    select hp.id, hp.company_id, hp.site_scope, hp.slug, hp.custom_domain, hp.domain_verified, hp.is_active,
           hp.is_published, hp.active_template_id, hp.title, hp.subtitle, hp.welcome_message, hp.logo_url,
           hp.main_color, hp.secondary_color, hp.hero_image_url, hp.app_icon_url, 3 as rank
    from norm
    join public.company_home_pages hp on hp.is_active and pg_catalog.lower(hp.slug) = norm.slug
    where norm.host is null and norm.slug is not null
  )
  select r.id, r.company_id, r.site_scope, r.slug, r.custom_domain, r.domain_verified, r.is_active,
         r.is_published, r.active_template_id, r.title, r.subtitle, r.welcome_message, r.logo_url,
         r.main_color, r.secondary_color, r.hero_image_url, r.app_icon_url
  from (select * from by_domain union all select * from legacy_domain union all select * from by_slug) r
  order by r.rank
  limit 1;
$$;

revoke all on function public.resolve_public_site(text, text) from public;
grant execute on function public.resolve_public_site(text, text) to anon, authenticated, service_role;

comment on function public.resolve_public_site(text, text) is
  'Resolution publique unique : domaine actif de site_domains, sinon domaine historique verifie, sinon slug. Colonnes publiques uniquement.';
