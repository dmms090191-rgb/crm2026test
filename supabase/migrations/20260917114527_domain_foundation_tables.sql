-- Fondations Domaine (phase 1) 2/3 : tables privees du systeme Domaine.
-- Source de verite : site_domains (un domaine = une entreprise Groupe/Societe = son site).
-- Aucune ecriture depuis le navigateur : seules les fonctions serveur (service_role) ecrivent.
-- Lecture directe des tables : Talvex Administrateur uniquement. Les entreprises passent par des RPC
-- qui ne renvoient que les informations metier (jamais prix d'achat, identifiants fournisseur, notes).
-- Aucune suppression : les lignes passent a released / cancelled et l'historique est conserve.

-- ---------------------------------------------------------------------------
-- 1. Profils du titulaire (registrant) : correspondance vers un profil WHOIS du registrar.
--    Aucune donnee personnelle stockee ici (elles restent chez le registrar, ou plus tard dans un coffre dedie).
-- ---------------------------------------------------------------------------
create table public.domain_registrant_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  provider text not null default 'hostinger' check (provider in ('hostinger')),
  provider_profile_id bigint,
  tld text not null check (tld ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$'),
  entity_type text not null check (entity_type in ('individual', 'organization')),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint domain_registrant_profiles_active_has_provider_id check (status <> 'active' or provider_profile_id is not null)
);
create unique index domain_registrant_profiles_provider_profile_key
  on public.domain_registrant_profiles (provider, provider_profile_id) where provider_profile_id is not null;
create index domain_registrant_profiles_company_idx on public.domain_registrant_profiles (company_id);

-- ---------------------------------------------------------------------------
-- 2. Intentions d'achat : identite unique (idempotency_key) + suivi de commande fournisseur.
-- ---------------------------------------------------------------------------
create table public.domain_purchase_intents (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null,
  company_id uuid not null references public.companies(id) on delete restrict,
  home_page_id uuid not null,
  domain_name text not null,
  provider text not null default 'hostinger' check (provider in ('hostinger')),
  status text not null default 'pending'
    check (status in ('pending', 'submitting', 'accepted', 'unknown', 'completed', 'failed', 'rejected', 'cancelled')),
  years smallint not null default 1 check (years between 1 and 10),
  registrant_profile_id uuid references public.domain_registrant_profiles(id) on delete restrict,
  -- Commercial interne (jamais expose aux entreprises ni au public)
  provider_item_id text,
  provider_payment_method_id bigint,
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  purchase_price_cents bigint check (purchase_price_cents is null or purchase_price_cents >= 0),
  billed_price_cents bigint check (billed_price_cents is null or billed_price_cents >= 0),
  price_quoted_at timestamptz,
  client_billing_status text not null default 'not_applicable'
    check (client_billing_status in ('not_applicable', 'to_invoice', 'invoiced', 'paid', 'waived')),
  -- Reponse fournisseur (interne)
  provider_http_status smallint,
  provider_order_id bigint,
  provider_order_status text,
  provider_subscription_id text,
  provider_correlation_id text,
  provider_response jsonb not null default '{}'::jsonb,
  attempt_count smallint not null default 0 check (attempt_count between 0 and 1),
  last_error_code text,
  last_error_message text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  constraint domain_purchase_intents_idempotency_key_key unique (idempotency_key),
  constraint domain_purchase_intents_domain_valid check (public.is_valid_domain_name(domain_name)),
  constraint domain_purchase_intents_site_fk foreign key (home_page_id, company_id)
    references public.company_home_pages (id, company_id) on delete restrict on update restrict,
  constraint domain_purchase_intents_prices_have_currency
    check ((purchase_price_cents is null and billed_price_cents is null) or currency is not null),
  -- Au plus UNE soumission au fournisseur par intention, et seulement si elle a quitte "pending".
  constraint domain_purchase_intents_single_submission
    check ((status in ('pending', 'rejected', 'cancelled')) = (attempt_count = 0))
);
-- Une seule intention ouverte par nom de domaine, toutes entreprises confondues (anti double achat).
create unique index domain_purchase_intents_open_domain_key
  on public.domain_purchase_intents (domain_name) where status in ('pending', 'submitting', 'accepted', 'unknown');
create index domain_purchase_intents_company_idx on public.domain_purchase_intents (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Domaines : source de verite (proprietaire fonctionnel + site servi + etats).
-- ---------------------------------------------------------------------------
create table public.site_domains (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  home_page_id uuid not null,
  domain_name text not null,
  is_primary boolean not null default true,
  provider text not null check (provider in ('hostinger', 'external')),
  registration_status text not null
    check (registration_status in ('pending', 'registered', 'failed', 'expired', 'suspended', 'transfer_out', 'released', 'external')),
  connection_status text not null default 'not_started'
    check (connection_status in ('not_started', 'dns_configuring', 'dns_failed', 'verifying', 'verification_failed', 'active', 'disconnected')),
  purchase_intent_id uuid references public.domain_purchase_intents(id) on delete restrict,
  registrant_profile_id uuid references public.domain_registrant_profiles(id) on delete restrict,
  -- Fournisseur (interne)
  provider_domain_id bigint,
  provider_subscription_id text,
  provider_status text,
  auto_renew boolean,
  registered_at timestamptz,
  expires_at timestamptz,
  provider_synced_at timestamptz,
  -- Etapes de mise en service
  dns_configured_at timestamptz,
  vercel_attached_at timestamptz,
  verified_at timestamptz,
  https_ready_at timestamptz,
  activated_at timestamptz,
  last_checked_at timestamptz,
  released_at timestamptz,
  last_error_code text,
  last_error_message text,
  technical_details jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_domains_domain_valid check (public.is_valid_domain_name(domain_name)),
  -- Le site rattache appartient forcement a la meme entreprise que le domaine.
  constraint site_domains_site_fk foreign key (home_page_id, company_id)
    references public.company_home_pages (id, company_id) on delete restrict on update restrict,
  constraint site_domains_provider_registration check (
    (provider = 'external' and registration_status in ('external', 'released'))
    or (provider = 'hostinger' and registration_status <> 'external')),
  -- Pas de mise en service tant que le domaine n'est pas enregistre (ou existant).
  constraint site_domains_connection_requires_registration check (
    registration_status in ('registered', 'external') or connection_status in ('not_started', 'disconnected')),
  constraint site_domains_active_is_verified check (
    connection_status <> 'active' or (verified_at is not null and activated_at is not null)),
  constraint site_domains_released_has_date check (registration_status <> 'released' or released_at is not null)
);
-- Un nom de domaine vivant n'appartient qu'a une seule entreprise Talvex.
create unique index site_domains_live_domain_key
  on public.site_domains (domain_name) where registration_status not in ('failed', 'released');
-- Un seul domaine principal vivant par site.
create unique index site_domains_primary_per_site_key
  on public.site_domains (home_page_id) where is_primary and registration_status not in ('failed', 'released');
create index site_domains_company_idx on public.site_domains (company_id);

-- ---------------------------------------------------------------------------
-- 4. Historique (append-only), alimente automatiquement par triggers.
-- ---------------------------------------------------------------------------
create table public.site_domain_events (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete restrict,
  site_domain_id uuid references public.site_domains(id) on delete restrict,
  purchase_intent_id uuid references public.domain_purchase_intents(id) on delete restrict,
  event_type text not null
    check (event_type in ('intent_created', 'intent_status', 'domain_created', 'registration_status', 'connection_status')),
  from_status text,
  to_status text,
  actor_user_id uuid,
  actor_role text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint site_domain_events_has_subject check (site_domain_id is not null or purchase_intent_id is not null)
);
create index site_domain_events_domain_idx on public.site_domain_events (site_domain_id, created_at);
create index site_domain_events_intent_idx on public.site_domain_events (purchase_intent_id, created_at);

-- ---------------------------------------------------------------------------
-- Gardes (SECURITY INVOKER : current_user = role reel de l'appelant)
-- ---------------------------------------------------------------------------
create or replace function public.domain_assert_server_write()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('service_role', 'postgres', 'supabase_admin');
$$;

create or replace function public.guard_domain_company_type(p_company_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_type text;
begin
  select c.entity_type into v_type from public.companies c where c.id = p_company_id;
  if coalesce(v_type in ('groupe', 'societe'), false) is not true then
    raise exception 'domaines : un domaine appartient uniquement a un Groupe ou a une Societe' using errcode = '23514';
  end if;
end;
$$;
revoke all on function public.guard_domain_company_type(uuid) from public, anon, authenticated;
grant execute on function public.guard_domain_company_type(uuid) to service_role;

create or replace function public.guard_domain_registrant_profiles()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.domain_assert_server_write() then
    raise exception 'domain_registrant_profiles : ecriture reservee au serveur Talvex' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    if current_user not in ('postgres', 'supabase_admin') then
      raise exception 'domain_registrant_profiles : suppression interdite (archiver)' using errcode = '42501';
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    perform public.guard_domain_company_type(new.company_id);
  else
    if new.company_id is distinct from old.company_id or new.provider is distinct from old.provider
       or new.tld is distinct from old.tld or new.entity_type is distinct from old.entity_type
       or (old.provider_profile_id is not null and new.provider_profile_id is distinct from old.provider_profile_id) then
      raise exception 'domain_registrant_profiles : identite du profil immuable' using errcode = '23514';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_domain_purchase_intents()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.domain_assert_server_write() then
    raise exception 'domain_purchase_intents : ecriture reservee au serveur Talvex' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    if current_user not in ('postgres', 'supabase_admin') then
      raise exception 'domain_purchase_intents : suppression interdite (annuler)' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    new.domain_name := public.normalize_domain_name(new.domain_name);
    perform public.guard_domain_company_type(new.company_id);
    if new.status <> 'pending' or new.attempt_count <> 0 then
      raise exception 'domain_purchase_intents : une intention commence toujours en pending' using errcode = '23514';
    end if;
    if exists (select 1 from public.site_domains d
               where d.domain_name = new.domain_name and d.registration_status not in ('failed', 'released')) then
      raise exception 'domain_already_attached' using errcode = '23505',
        detail = 'Ce nom de domaine est deja rattache a une entreprise Talvex.';
    end if;
  else
    if new.idempotency_key is distinct from old.idempotency_key or new.company_id is distinct from old.company_id
       or new.home_page_id is distinct from old.home_page_id or new.domain_name is distinct from old.domain_name
       or new.provider is distinct from old.provider then
      raise exception 'domain_purchase_intents : identite de l intention immuable' using errcode = '23514';
    end if;
    if old.status <> 'pending' and (new.years is distinct from old.years
       or new.provider_item_id is distinct from old.provider_item_id
       or new.purchase_price_cents is distinct from old.purchase_price_cents
       or new.registrant_profile_id is distinct from old.registrant_profile_id
       or new.provider_payment_method_id is distinct from old.provider_payment_method_id) then
      raise exception 'domain_purchase_intents : conditions figees apres soumission' using errcode = '23514';
    end if;
    if not public.domain_intent_transition_allowed(old.status, new.status) then
      raise exception 'domain_purchase_intents : transition interdite % -> %', old.status, new.status using errcode = '23514';
    end if;
    if old.status = 'pending' and new.status = 'submitting' then
      new.attempt_count := old.attempt_count + 1;
      new.submitted_at := now();
    end if;
    if new.status is distinct from old.status then
      if new.status = 'accepted' then new.accepted_at := coalesce(new.accepted_at, now()); end if;
      if new.status = 'completed' then new.completed_at := coalesce(new.completed_at, now()); end if;
      if new.status in ('failed', 'rejected') then new.failed_at := coalesce(new.failed_at, now()); end if;
      if new.status = 'cancelled' then new.cancelled_at := coalesce(new.cancelled_at, now()); end if;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_site_domains()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_intent record;
begin
  if not public.domain_assert_server_write() then
    raise exception 'site_domains : ecriture reservee au serveur Talvex' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    if current_user not in ('postgres', 'supabase_admin') then
      raise exception 'site_domains : suppression interdite (liberer le domaine)' using errcode = '42501';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    new.domain_name := public.normalize_domain_name(new.domain_name);
    perform public.guard_domain_company_type(new.company_id);
  else
    if new.company_id is distinct from old.company_id or new.home_page_id is distinct from old.home_page_id
       or new.domain_name is distinct from old.domain_name or new.provider is distinct from old.provider
       or (old.purchase_intent_id is not null and new.purchase_intent_id is distinct from old.purchase_intent_id) then
      raise exception 'site_domains : proprietaire, site et nom du domaine immuables' using errcode = '23514';
    end if;
    if not public.domain_registration_transition_allowed(old.registration_status, new.registration_status) then
      raise exception 'site_domains : transition d enregistrement interdite % -> %', old.registration_status, new.registration_status
        using errcode = '23514';
    end if;
    if not public.domain_connection_transition_allowed(old.connection_status, new.connection_status) then
      raise exception 'site_domains : transition de mise en service interdite % -> %', old.connection_status, new.connection_status
        using errcode = '23514';
    end if;
  end if;

  if new.purchase_intent_id is not null then
    select i.company_id, i.home_page_id, i.domain_name into v_intent
    from public.domain_purchase_intents i where i.id = new.purchase_intent_id;
    if v_intent.company_id is distinct from new.company_id or v_intent.home_page_id is distinct from new.home_page_id
       or v_intent.domain_name is distinct from new.domain_name then
      raise exception 'site_domains : l intention d achat ne correspond pas a ce domaine' using errcode = '23514';
    end if;
  end if;

  if new.registration_status = 'released' then new.released_at := coalesce(new.released_at, now()); end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.guard_site_domain_events()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not public.domain_assert_server_write() then
      raise exception 'site_domain_events : ecriture reservee au serveur Talvex' using errcode = '42501';
    end if;
    return new;
  end if;
  if current_user not in ('postgres', 'supabase_admin') then
    raise exception 'site_domain_events : historique non modifiable' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

-- Journal automatique (SECURITY DEFINER : ecrit l'historique quel que soit l'appelant serveur).
create or replace function public.log_domain_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text := coalesce(nullif(auth.jwt() -> 'app_metadata' ->> 'role', ''), nullif(auth.jwt() ->> 'role', ''), 'server');
begin
  if tg_table_name = 'domain_purchase_intents' then
    if tg_op = 'INSERT' then
      insert into public.site_domain_events (company_id, purchase_intent_id, event_type, to_status, actor_user_id, actor_role)
      values (new.company_id, new.id, 'intent_created', new.status, v_actor, v_role);
    elsif new.status is distinct from old.status then
      insert into public.site_domain_events (company_id, purchase_intent_id, event_type, from_status, to_status, actor_user_id, actor_role, details)
      values (new.company_id, new.id, 'intent_status', old.status, new.status, v_actor, v_role,
              jsonb_strip_nulls(jsonb_build_object('error_code', new.last_error_code, 'http_status', new.provider_http_status)));
    end if;
  elsif tg_table_name = 'site_domains' then
    if tg_op = 'INSERT' then
      insert into public.site_domain_events (company_id, site_domain_id, purchase_intent_id, event_type, to_status, actor_user_id, actor_role, details)
      values (new.company_id, new.id, new.purchase_intent_id, 'domain_created', new.registration_status, v_actor, v_role,
              jsonb_build_object('connection_status', new.connection_status));
    else
      if new.registration_status is distinct from old.registration_status then
        insert into public.site_domain_events (company_id, site_domain_id, event_type, from_status, to_status, actor_user_id, actor_role)
        values (new.company_id, new.id, 'registration_status', old.registration_status, new.registration_status, v_actor, v_role);
      end if;
      if new.connection_status is distinct from old.connection_status then
        insert into public.site_domain_events (company_id, site_domain_id, event_type, from_status, to_status, actor_user_id, actor_role, details)
        values (new.company_id, new.id, 'connection_status', old.connection_status, new.connection_status, v_actor, v_role,
                jsonb_strip_nulls(jsonb_build_object('error_code', new.last_error_code)));
      end if;
    end if;
  end if;
  return null;
end;
$$;
revoke all on function public.log_domain_event() from public, anon, authenticated;

create trigger trg_guard_domain_registrant_profiles
  before insert or update or delete on public.domain_registrant_profiles
  for each row execute function public.guard_domain_registrant_profiles();
create trigger trg_guard_domain_purchase_intents
  before insert or update or delete on public.domain_purchase_intents
  for each row execute function public.guard_domain_purchase_intents();
create trigger trg_guard_site_domains
  before insert or update or delete on public.site_domains
  for each row execute function public.guard_site_domains();
create trigger trg_guard_site_domain_events
  before insert or update or delete on public.site_domain_events
  for each row execute function public.guard_site_domain_events();
create trigger trg_log_domain_purchase_intents
  after insert or update on public.domain_purchase_intents
  for each row execute function public.log_domain_event();
create trigger trg_log_site_domains
  after insert or update on public.site_domains
  for each row execute function public.log_domain_event();

-- ---------------------------------------------------------------------------
-- Acces : aucun acces anon ; lecture directe Talvex uniquement ; ecriture serveur uniquement.
-- ---------------------------------------------------------------------------
alter table public.domain_registrant_profiles enable row level security;
alter table public.domain_purchase_intents enable row level security;
alter table public.site_domains enable row level security;
alter table public.site_domain_events enable row level security;

revoke all on table public.domain_registrant_profiles, public.domain_purchase_intents, public.site_domains, public.site_domain_events
  from public, anon, authenticated;
grant select on table public.domain_registrant_profiles, public.domain_purchase_intents, public.site_domains, public.site_domain_events
  to authenticated;
grant all on table public.domain_registrant_profiles, public.domain_purchase_intents, public.site_domains, public.site_domain_events
  to service_role;

create policy "Talvex can read domain registrant profiles" on public.domain_registrant_profiles
  for select to authenticated using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin');
create policy "Talvex can read domain purchase intents" on public.domain_purchase_intents
  for select to authenticated using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin');
create policy "Talvex can read site domains" on public.site_domains
  for select to authenticated using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin');
create policy "Talvex can read site domain events" on public.site_domain_events
  for select to authenticated using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin');

comment on table public.site_domains is
  'Source de verite des domaines : proprietaire fonctionnel (Groupe ou Societe), site servi, etats d enregistrement et de mise en service. Prive.';
comment on table public.domain_purchase_intents is
  'Intentions d achat idempotentes (idempotency_key unique, une seule intention ouverte par domaine, une seule soumission). Prive.';
comment on table public.domain_registrant_profiles is
  'Correspondance entreprise -> profil WHOIS du registrar (par TLD). Aucune donnee personnelle stockee. Prive.';
comment on table public.site_domain_events is
  'Historique append-only des intentions et domaines (alimente par triggers). Prive.';
