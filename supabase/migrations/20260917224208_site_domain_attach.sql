-- Parcours Site « Domaine -> Template -> Site » : connecter un domaine DEJA achete.
-- Tout est cote serveur : ces deux fonctions ne sont executables que par service_role (edge function
-- hostinger-domains). Le navigateur ne recoit jamais le portefeuille Hostinger central et n'apprend
-- jamais a quelle autre entite appartient un domaine.
-- AUCUNE action chez Hostinger ici : aucun achat, aucun DNS, aucun WHOIS, aucun renouvellement.

-- 0) Le journal doit pouvoir enregistrer l'association d'un domaine deja achete.
--    Elargissement strict (aucune valeur retiree), table vide a ce jour.
alter table public.site_domain_events drop constraint if exists site_domain_events_event_type_check;
alter table public.site_domain_events add constraint site_domain_events_event_type_check
  check (event_type in ('intent_created', 'intent_status', 'domain_created', 'registration_status', 'connection_status', 'domain_attached'));

-- 1) Etat d'un domaine vis-a-vis d'une entreprise : libre, deja a elle, ou pris ailleurs.
--    C'est l'EXISTENCE d'une ligne qui decide, jamais un proprietaire non nul : le site officiel Talvex
--    (company_id nul) et une intention d'achat en cours bloquent donc aussi la prise du domaine.
--    Couvre les trois sources : site_domains, colonne historique custom_domain, intentions d'achat.
create or replace function public.domain_attachment_state(p_domain text, p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_domain text := public.normalize_domain_name(p_domain);
  v_owner uuid;
begin
  if v_domain is null or p_company_id is null or not public.is_valid_domain_name(v_domain) then
    return 'free';
  end if;

  select d.company_id into v_owner
    from public.site_domains d
   where d.domain_name = v_domain
     and d.registration_status not in ('failed', 'released')
   limit 1;

  if not found then
    select hp.company_id into v_owner
      from public.company_home_pages hp
     where public.normalize_domain_name(hp.custom_domain) = v_domain
     limit 1;
  end if;

  if not found then
    select i.company_id into v_owner
      from public.domain_purchase_intents i
     where i.domain_name = v_domain
       and i.status in ('pending', 'submitting', 'accepted', 'unknown', 'completed')
     limit 1;
  end if;

  if not found then
    return 'free';
  end if;
  -- Proprietaire nul (site officiel Talvex) : jamais « libre » pour une entreprise.
  return case when v_owner is not distinct from p_company_id then 'mine' else 'other' end;
end;
$$;

revoke all on function public.domain_attachment_state(text, uuid) from public;
revoke all on function public.domain_attachment_state(text, uuid) from anon;
revoke all on function public.domain_attachment_state(text, uuid) from authenticated;
grant execute on function public.domain_attachment_state(text, uuid) to service_role;

comment on function public.domain_attachment_state(text, uuid) is
  'Etat d''association d''un domaine pour une entreprise (free/mine/other). service_role uniquement.';

-- 2) Association du domaine a l'entreprise ciblee.
--    Le site (company_home_pages) est cree seulement s'il n'existe pas encore : coquille sans template,
--    l'etape suivante du parcours est justement le choix du template. Idempotent : reappeler ne cree rien.
create or replace function public.attach_provider_domain(
  p_company_id uuid,
  p_domain text,
  p_provider_domain_id bigint,
  p_expires_at timestamptz,
  p_registered_at timestamptz,
  p_actor uuid,
  p_actor_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_domain text := public.normalize_domain_name(p_domain);
  v_state text;
  v_page uuid;
  v_id uuid;
  v_primary boolean;
begin
  if v_domain is null or not public.is_valid_domain_name(v_domain) then
    return jsonb_build_object('status', 'invalid');
  end if;
  if p_company_id is null or not exists (select 1 from public.companies c where c.id = p_company_id) then
    return jsonb_build_object('status', 'failed');
  end if;

  v_state := public.domain_attachment_state(v_domain, p_company_id);
  if v_state = 'other' then
    return jsonb_build_object('status', 'taken');
  end if;

  select d.id into v_id
    from public.site_domains d
   where d.domain_name = v_domain
     and d.company_id = p_company_id
     and d.registration_status not in ('failed', 'released')
   limit 1;
  if v_id is not null then
    return jsonb_build_object('status', 'attached', 'site_domain_id', v_id);
  end if;

  select hp.id into v_page
    from public.company_home_pages hp
   where hp.company_id = p_company_id
     and hp.site_scope = 'company'
   order by hp.created_at asc
   limit 1;

  if v_page is null then
    insert into public.company_home_pages (company_id, site_scope, title, is_active)
    values (p_company_id, 'company',
            coalesce((select c.name from public.companies c where c.id = p_company_id), ''), true)
    returning id into v_page;
  end if;

  -- Domaine principal du site seulement si le site n'en a pas deja un (index unique partiel).
  select not exists (
    select 1 from public.site_domains d
     where d.home_page_id = v_page
       and d.is_primary
       and d.registration_status not in ('failed', 'released')
  ) into v_primary;

  begin
    insert into public.site_domains (
      company_id, home_page_id, domain_name, is_primary, provider,
      registration_status, connection_status,
      provider_domain_id, registered_at, expires_at, provider_synced_at, created_by
    )
    values (
      p_company_id, v_page, v_domain, v_primary, 'hostinger',
      'registered', 'not_started',
      p_provider_domain_id, p_registered_at, p_expires_at, now(), p_actor
    )
    returning id into v_id;
  exception
    when unique_violation then
      -- Course entre deux entites sur le meme domaine : la premiere ecriture gagne. Tout autre conflit
      -- d'unicite (domaine principal deja present sur ce site) n'est PAS presente comme « deja pris ».
      if public.domain_attachment_state(v_domain, p_company_id) = 'other' then
        return jsonb_build_object('status', 'taken');
      end if;
      return jsonb_build_object('status', 'failed');
  end;

  insert into public.site_domain_events (
    company_id, site_domain_id, event_type, to_status, actor_user_id, actor_role, details
  )
  values (
    p_company_id, v_id, 'domain_attached', 'registered', p_actor, p_actor_role,
    jsonb_build_object('domain', v_domain, 'provider', 'hostinger', 'source', 'portfolio_lookup')
  );

  return jsonb_build_object('status', 'attached', 'site_domain_id', v_id, 'home_page_id', v_page);
end;
$$;

revoke all on function public.attach_provider_domain(uuid, text, bigint, timestamptz, timestamptz, uuid, text) from public;
revoke all on function public.attach_provider_domain(uuid, text, bigint, timestamptz, timestamptz, uuid, text) from anon;
revoke all on function public.attach_provider_domain(uuid, text, bigint, timestamptz, timestamptz, uuid, text) from authenticated;
grant execute on function public.attach_provider_domain(uuid, text, bigint, timestamptz, timestamptz, uuid, text) to service_role;

comment on function public.attach_provider_domain(uuid, text, bigint, timestamptz, timestamptz, uuid, text) is
  'Associe un domaine du portefeuille central a une entreprise (site_domains + evenement). service_role uniquement.';
