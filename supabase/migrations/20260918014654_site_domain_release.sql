-- Gestion complete du domaine d'un site : CHANGER de domaine et DECONNECTER un domaine.
--
-- Tout est cote serveur : ces fonctions ne sont executables que par service_role (edge function
-- hostinger-domains). Elles ne touchent AUCUN fournisseur : ni Hostinger, ni l'hebergement.
-- « Deconnecter » cote Talvex ne supprime jamais le domaine du portefeuille Hostinger, ne resilie rien,
-- ne change aucun renouvellement : la ligne est conservee pour l'historique et simplement detachee.

-- 0) Le journal doit pouvoir enregistrer la promotion et le detachement d'un domaine.
--    Elargissement strict : aucune valeur retiree.
alter table public.site_domain_events drop constraint if exists site_domain_events_event_type_check;
alter table public.site_domain_events add constraint site_domain_events_event_type_check
  check (event_type in ('intent_created', 'intent_status', 'domain_created', 'registration_status',
                        'connection_status', 'domain_attached', 'domain_promoted', 'domain_detached'));

-- 0 bis) Machine d'etat du raccordement : trois transitions legitimes manquaient, et le declencheur
--    guard_site_domains leve une exception quand une transition n'est pas prevue. Consequences reelles
--    constatees en relecture :
--      - un domaine associe mais jamais raccorde (etat 'not_started') ne pouvait JAMAIS etre deconnecte :
--        release_site_domain echouait, donc « Deconnecter le domaine » restait impossible a vie ;
--      - un echec survenu avant la premiere ecriture DNS ('not_started' -> 'dns_failed') ou pendant le
--        rattachement a l'hebergement ('dns_configuring' -> 'verification_failed') ne pouvait pas etre
--        enregistre : l'erreur etait perdue et l'ecran restait muet.
--    Elargissement strict : aucune transition retiree.
create or replace function public.domain_connection_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select p_from = p_to or (p_from, p_to) in (
    ('not_started', 'dns_configuring'), ('not_started', 'dns_failed'), ('not_started', 'disconnected'),
    ('dns_configuring', 'verifying'), ('dns_configuring', 'dns_failed'), ('dns_configuring', 'verification_failed'), ('dns_configuring', 'disconnected'),
    ('dns_failed', 'dns_configuring'), ('dns_failed', 'disconnected'),
    ('verifying', 'active'), ('verifying', 'verification_failed'), ('verifying', 'dns_configuring'), ('verifying', 'dns_failed'), ('verifying', 'disconnected'),
    ('verification_failed', 'verifying'), ('verification_failed', 'dns_configuring'), ('verification_failed', 'dns_failed'), ('verification_failed', 'disconnected'),
    ('active', 'verifying'), ('active', 'disconnected'),
    ('disconnected', 'dns_configuring')
  );
$$;

comment on function public.domain_connection_transition_allowed(text, text) is
  'Transitions autorisees de connection_status. Elargie le 18/09 : detachement et echecs depuis not_started.';

-- 0 ter) Appartenance d'un domaine : elle NE DOIT PAS disparaitre quand le domaine est detache.
--    Sans cela, le domaine d'une entite deconnecte (ou remplace lors d'un changement) redevenait « libre »
--    et une AUTRE entite pouvait se l'attribuer, puis reecrire son DNS — alors qu'il reste enregistre,
--    renouvele et paye par l'entite d'origine. Desormais l'historique compte : seule l'entite d'origine
--    peut reprendre son domaine ; pour toute autre il reste « deja utilise ».
create or replace function public.domain_attachment_state(p_domain text, p_company_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_domain text := public.normalize_domain_name(p_domain);
  v_owner uuid;
  v_live boolean := true;
begin
  if v_domain is null or p_company_id is null or not public.is_valid_domain_name(v_domain) then
    return 'free';
  end if;

  -- Lignes vivantes ET detachees : une ligne 'released' garde le lien avec l'entreprise d'origine.
  -- Une ligne 'failed' (association jamais aboutie) ne bloque rien.
  select d.company_id, d.registration_status <> 'released' into v_owner, v_live
    from public.site_domains d
   where d.domain_name = v_domain
     and d.registration_status <> 'failed'
   order by (d.registration_status <> 'released') desc, d.created_at desc
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
  if v_owner is not distinct from p_company_id then
    -- Son propre domaine : « deja a elle » s'il est encore attache, sinon libre de le reprendre.
    return case when v_live then 'mine' else 'free' end;
  end if;
  -- Domaine d'une autre entite, meme detache : il reste le sien, on ne le laisse pas partir ailleurs.
  return 'other';
end;
$$;

comment on function public.domain_attachment_state(text, uuid) is
  'Etat d''association d''un domaine pour une entreprise (free/mine/other), historique compris. service_role uniquement.';

-- 1) Domaine actuellement principal d'une entreprise, pour le serveur (jamais lu par le navigateur).
--    Sert au changement de domaine : c'est le SERVEUR qui decide quel domaine est remplace, pas le client.
create or replace function public.get_primary_site_domain_for_connect(p_company_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select case when d.id is null then null else jsonb_build_object(
    'id', d.id,
    'company_id', d.company_id,
    'home_page_id', d.home_page_id,
    'domain_name', d.domain_name,
    'registration_status', d.registration_status,
    'connection_status', d.connection_status,
    'dns_configured_at', d.dns_configured_at,
    'vercel_attached_at', d.vercel_attached_at,
    'verified_at', d.verified_at,
    'https_ready_at', d.https_ready_at,
    'activated_at', d.activated_at,
    'technical_details', d.technical_details
  ) end
  from public.site_domains d
  where d.company_id = p_company_id
    and d.registration_status not in ('failed', 'released')
  order by d.is_primary desc, d.created_at asc
  limit 1;
$$;

revoke all on function public.get_primary_site_domain_for_connect(uuid) from public;
revoke all on function public.get_primary_site_domain_for_connect(uuid) from anon;
revoke all on function public.get_primary_site_domain_for_connect(uuid) from authenticated;
grant execute on function public.get_primary_site_domain_for_connect(uuid) to service_role;

comment on function public.get_primary_site_domain_for_connect(uuid) is
  'Domaine principal d''une entreprise pour le serveur (service_role uniquement).';

-- 2) Promotion : un domaine devient le domaine principal du site.
--    Exigence de securite du parcours « changer de domaine » : SEUL un domaine REELLEMENT actif peut
--    devenir principal. Tant que le nouveau domaine n'est pas actif, l'ancien reste en place.
create or replace function public.promote_site_domain(
  p_company_id uuid,
  p_site_domain_id uuid,
  p_actor uuid default null,
  p_actor_role text default 'server'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.site_domains;
  v_previous text;
begin
  if p_company_id is null or p_site_domain_id is null then
    return jsonb_build_object('status', 'failed');
  end if;

  select * into v_row
    from public.site_domains d
   where d.id = p_site_domain_id
     and d.company_id = p_company_id
     and d.registration_status not in ('failed', 'released')
   limit 1;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_row.connection_status <> 'active' then
    -- Jamais de bascule vers un domaine qui ne repond pas : le site resterait injoignable.
    return jsonb_build_object('status', 'not_active');
  end if;
  if v_row.is_primary then
    return jsonb_build_object('status', 'ok', 'already_primary', true);
  end if;

  select string_agg(d.domain_name, ', ') into v_previous
    from public.site_domains d
   where d.home_page_id = v_row.home_page_id
     and d.id <> v_row.id
     and d.is_primary
     and d.registration_status not in ('failed', 'released');

  -- L'index unique n'autorise qu'un seul domaine principal vivant par site : on libere avant de poser.
  update public.site_domains d
     set is_primary = false, updated_at = now()
   where d.home_page_id = v_row.home_page_id
     and d.id <> v_row.id
     and d.is_primary
     and d.registration_status not in ('failed', 'released');

  update public.site_domains d
     set is_primary = true, updated_at = now()
   where d.id = v_row.id;

  insert into public.site_domain_events (
    company_id, site_domain_id, event_type, to_status, actor_user_id, actor_role, details
  )
  values (
    p_company_id, v_row.id, 'domain_promoted', v_row.connection_status, p_actor, coalesce(p_actor_role, 'server'),
    jsonb_strip_nulls(jsonb_build_object('domain', v_row.domain_name, 'previous_primary', v_previous))
  );

  return jsonb_build_object('status', 'ok', 'domain', v_row.domain_name);
end;
$$;

revoke all on function public.promote_site_domain(uuid, uuid, uuid, text) from public;
revoke all on function public.promote_site_domain(uuid, uuid, uuid, text) from anon;
revoke all on function public.promote_site_domain(uuid, uuid, uuid, text) from authenticated;
grant execute on function public.promote_site_domain(uuid, uuid, uuid, text) to service_role;

comment on function public.promote_site_domain(uuid, uuid, uuid, text) is
  'Fait d''un domaine DEJA actif le domaine principal du site (service_role uniquement).';

-- 3) Detachement : le domaine n'est plus l'adresse du site.
--    La ligne est CONSERVEE (historique) : elle passe simplement en 'released' + 'disconnected', ce qui
--    la retire de get_site_domains et de resolve_public_site. L'entite d'origine peut le reprendre quand
--    elle veut ; pour toute AUTRE entite il reste « deja utilise » (voir domain_attachment_state).
--    Aucune action fournisseur ici : le domaine reste au portefeuille Hostinger, rien n'est resilie.
create or replace function public.release_site_domain(
  p_company_id uuid,
  p_site_domain_id uuid,
  p_actor uuid default null,
  p_actor_role text default 'server',
  p_details jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.site_domains;
  v_now timestamptz := now();
begin
  if p_company_id is null or p_site_domain_id is null then
    return jsonb_build_object('status', 'failed');
  end if;

  select * into v_row
    from public.site_domains d
   where d.id = p_site_domain_id
     and d.company_id = p_company_id
   limit 1;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_row.registration_status = 'released' then
    -- Deja detache : rejouer la deconnexion ne doit pas echouer.
    return jsonb_build_object('status', 'ok', 'already_released', true);
  end if;

  update public.site_domains d
     set is_primary          = false,
         -- Garde-fou : jamais une transition que la machine d'etat refuserait (le declencheur leverait
         -- une exception et la deconnexion echouerait pour toujours).
         connection_status   = case
                                 when public.domain_connection_transition_allowed(d.connection_status, 'disconnected')
                                   then 'disconnected'
                                 else d.connection_status
                               end,
         registration_status = 'released',
         released_at         = v_now,
         last_error_code     = null,
         last_error_message  = null,
         technical_details   = coalesce(d.technical_details, '{}'::jsonb) || coalesce(p_details, '{}'::jsonb),
         updated_at          = v_now
   where d.id = v_row.id;

  -- Ancienne colonne de domaine du site : si elle designe encore ce domaine, elle est neutralisee,
  -- sans quoi resolve_public_site pourrait le servir de nouveau par l'ancien chemin.
  update public.company_home_pages hp
     set custom_domain   = null,
         domain_verified = false,
         domain_status   = 'not_configured',
         updated_at      = v_now
   where hp.id = v_row.home_page_id
     and public.normalize_domain_name(hp.custom_domain) = v_row.domain_name;

  insert into public.site_domain_events (
    company_id, site_domain_id, event_type, from_status, to_status, actor_user_id, actor_role, details
  )
  values (
    p_company_id, v_row.id, 'domain_detached', v_row.registration_status, 'released', p_actor, coalesce(p_actor_role, 'server'),
    jsonb_strip_nulls(jsonb_build_object('domain', v_row.domain_name) || coalesce(p_details, '{}'::jsonb))
  );

  return jsonb_build_object('status', 'ok', 'domain', v_row.domain_name);
end;
$$;

revoke all on function public.release_site_domain(uuid, uuid, uuid, text, jsonb) from public;
revoke all on function public.release_site_domain(uuid, uuid, uuid, text, jsonb) from anon;
revoke all on function public.release_site_domain(uuid, uuid, uuid, text, jsonb) from authenticated;
grant execute on function public.release_site_domain(uuid, uuid, uuid, text, jsonb) to service_role;

comment on function public.release_site_domain(uuid, uuid, uuid, text, jsonb) is
  'Detache un domaine du site cote Talvex (ligne conservee). Ne supprime jamais le domaine chez le fournisseur.';
