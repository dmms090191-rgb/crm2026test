-- Reservation ATOMIQUE du budget d'appels au fournisseur de domaines.
--
-- Constat du 18/09/2026 (journaux reels) : « deconnecter puis reconnecter » le meme domaine dans la
-- minute echouait toujours a l'etape « Preparation du domaine » (connect_apply -> quota_user_limit).
-- Deux causes cote serveur :
--   1. l'edge function reservait une action lourde unite par unite (4 appels a la fonction ci-dessous) :
--      si une unite etait refusee, les precedentes restaient consommees pour rien ;
--   2. le budget par utilisateur (10) etait plus petit que le parcours legitime
--      deconnexion (4) + verification (1) + association (1) + raccordement (5) = 11.
-- Le point 2 se regle dans l'edge function (budget utilisateur porte a 15). Cette migration regle le 1.
--
-- Nouvelle surcharge a 8 parametres : p_cost unites reservees d'un seul coup, ou aucune.
-- Tous les compteurs sont verifies AVANT la moindre increment : un refus ne consomme rien.
-- L'ancienne signature (7 parametres, cout implicite de 1) est CONSERVEE telle quelle : la version
-- deployee de l'edge function continue de l'utiliser jusqu'au redeploiement, sans aucune coupure,
-- et un retour arriere vers cette version reste possible. Aucune donnee n'est modifiee ni supprimee.
--
-- Pas de valeur par defaut sur p_cost : avec un defaut, un appel a 7 arguments deviendrait ambigu
-- entre les deux surcharges.

create or replace function public.reserve_domain_provider_call(
  p_user_id uuid,
  p_company_id uuid,
  p_is_talvex boolean,
  p_user_limit integer,
  p_branch_limit integer,
  p_tenants_limit integer,
  p_global_limit integer,
  p_cost integer
)
returns table(allowed boolean, refusal text, retry_after_seconds integer)
language plpgsql
security definer
set search_path to ''
as $function$
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
  v_free_at timestamptz;
  i integer;
begin
  if p_user_id is null or p_is_talvex is null
     or p_user_limit is null or p_branch_limit is null or p_tenants_limit is null or p_global_limit is null
     or p_user_limit not between 1 and 90 or p_branch_limit not between 1 and 90
     or p_tenants_limit not between 1 and 90 or p_global_limit not between 1 and 90
     or p_tenants_limit > p_global_limit
     or p_cost is null or p_cost not between 1 and 20 then
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

  -- Verification de TOUS les compteurs pour le cout COMPLET avant la moindre increment :
  -- soit les p_cost unites tiennent partout, soit rien n'est consomme.
  for i in 1 .. pg_catalog.array_length(v_buckets, 1) loop
    select coalesce(sum(k.request_count), 0)::integer
      into v_count
      from public.domain_provider_call_counts k
     where k.provider = 'hostinger'
       and k.bucket = v_buckets[i]
       and k.second_start >= v_since;
    if v_count + p_cost > v_limits[i] then
      -- Delai reel : le moment ou assez d'unites anciennes sortent de la fenetre pour loger p_cost.
      select w.second_start into v_free_at
        from (
          select k.second_start,
                 sum(k.request_count) over (order by k.second_start) as cumul
            from public.domain_provider_call_counts k
           where k.provider = 'hostinger'
             and k.bucket = v_buckets[i]
             and k.second_start >= v_since
        ) w
       where w.cumul >= v_count + p_cost - v_limits[i]
       order by w.second_start
       limit 1;
      return query select false, v_refusals[i],
        case when v_free_at is null then 61
             else least(61, greatest(1, ceil(extract(epoch from (v_free_at + interval '61 seconds' - v_now)))::integer))
        end;
      return;
    end if;
  end loop;

  for i in 1 .. pg_catalog.array_length(v_buckets, 1) loop
    insert into public.domain_provider_call_counts as k (provider, bucket, second_start, request_count)
    values ('hostinger', v_buckets[i], v_second, p_cost)
    on conflict (provider, bucket, second_start)
    do update set request_count = k.request_count + p_cost;
  end loop;

  return query select true, null::text, 0;
end;
$function$;

revoke all on function public.reserve_domain_provider_call(uuid, uuid, boolean, integer, integer, integer, integer, integer) from public;
revoke all on function public.reserve_domain_provider_call(uuid, uuid, boolean, integer, integer, integer, integer, integer) from anon;
revoke all on function public.reserve_domain_provider_call(uuid, uuid, boolean, integer, integer, integer, integer, integer) from authenticated;
grant execute on function public.reserve_domain_provider_call(uuid, uuid, boolean, integer, integer, integer, integer, integer) to service_role;

comment on function public.reserve_domain_provider_call(uuid, uuid, boolean, integer, integer, integer, integer, integer) is
  'Reserve p_cost appels au fournisseur de domaines, tout ou rien : un refus ne consomme aucune unite. Delai de reprise calcule sur les unites qui doivent sortir de la fenetre.';
