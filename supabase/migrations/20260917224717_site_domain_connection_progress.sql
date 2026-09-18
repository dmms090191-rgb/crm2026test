-- Progression du raccordement d'un domaine (DNS -> Vercel -> verification -> HTTPS -> actif).
-- Ecriture serveur uniquement (service_role, edge function hostinger-domains). Cette fonction ne
-- touche AUCUN fournisseur : elle enregistre seulement l'etat atteint, de facon reprenable.
-- Le declencheur existant log_domain_event journalise chaque changement de connection_status.

create or replace function public.set_site_domain_connection(
  p_site_domain_id uuid,
  p_company_id uuid,
  p_status text,
  p_marks text[] default '{}',
  p_details jsonb default '{}'::jsonb,
  p_error_code text default null,
  p_error_message text default null
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
  if p_site_domain_id is null or p_company_id is null then
    return jsonb_build_object('status', 'failed');
  end if;
  if p_status is not null and p_status not in ('not_started', 'dns_configuring', 'dns_failed', 'verifying', 'verification_failed', 'active', 'disconnected') then
    return jsonb_build_object('status', 'failed');
  end if;

  update public.site_domains d
     set connection_status  = coalesce(p_status, d.connection_status),
         dns_configured_at  = case when 'dns' = any(p_marks) then v_now else d.dns_configured_at end,
         vercel_attached_at = case when 'vercel' = any(p_marks) then v_now else d.vercel_attached_at end,
         verified_at        = case when 'verified' = any(p_marks) then v_now else d.verified_at end,
         https_ready_at     = case when 'https' = any(p_marks) then v_now else d.https_ready_at end,
         activated_at       = case when 'active' = any(p_marks) then v_now else d.activated_at end,
         last_checked_at    = v_now,
         last_error_code    = p_error_code,
         last_error_message = left(p_error_message, 500),
         technical_details  = coalesce(d.technical_details, '{}'::jsonb) || coalesce(p_details, '{}'::jsonb),
         updated_at         = v_now
   where d.id = p_site_domain_id
     and d.company_id = p_company_id
     and d.registration_status not in ('failed', 'released')
  returning * into v_row;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  return jsonb_build_object(
    'status', 'ok',
    'connection_status', v_row.connection_status,
    'dns_configured_at', v_row.dns_configured_at,
    'vercel_attached_at', v_row.vercel_attached_at,
    'verified_at', v_row.verified_at,
    'activated_at', v_row.activated_at
  );
end;
$$;

revoke all on function public.set_site_domain_connection(uuid, uuid, text, text[], jsonb, text, text) from public;
revoke all on function public.set_site_domain_connection(uuid, uuid, text, text[], jsonb, text, text) from anon;
revoke all on function public.set_site_domain_connection(uuid, uuid, text, text[], jsonb, text, text) from authenticated;
grant execute on function public.set_site_domain_connection(uuid, uuid, text, text[], jsonb, text, text) to service_role;

comment on function public.set_site_domain_connection(uuid, uuid, text, text[], jsonb, text, text) is
  'Avance l''etat de raccordement d''un domaine (service_role uniquement). Aucun appel fournisseur.';

-- Lecture serveur d'un domaine de l'entreprise ciblee (le navigateur passe toujours par get_site_domains).
create or replace function public.get_site_domain_for_connect(p_company_id uuid, p_domain text)
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
    and d.domain_name = public.normalize_domain_name(p_domain)
    and d.registration_status not in ('failed', 'released')
  limit 1;
$$;

revoke all on function public.get_site_domain_for_connect(uuid, text) from public;
revoke all on function public.get_site_domain_for_connect(uuid, text) from anon;
revoke all on function public.get_site_domain_for_connect(uuid, text) from authenticated;
grant execute on function public.get_site_domain_for_connect(uuid, text) to service_role;

comment on function public.get_site_domain_for_connect(uuid, text) is
  'Etat de raccordement d''un domaine pour le serveur (service_role uniquement).';
