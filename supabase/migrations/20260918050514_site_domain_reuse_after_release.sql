-- Un domaine proprement DECONNECTE redevient reutilisable, par n'importe quelle entite.
--
-- Avant : une ligne 'released' gardait le domaine verrouille sur l'entreprise d'origine, pour toujours.
-- Un domaine jamais rattache etait libre pour tout le monde, mais un domaine rattache puis libere ne
-- l'etait que pour sa premiere entreprise. Incoherent, et cela empechait un Groupe de reprendre un
-- domaine libere par sa Societe.
--
-- Apres : seul un rattachement VIVANT reserve un domaine. Une ligne 'released' reste en base pour
-- l'historique et ne bloque plus personne. Cette migration ne supprime ni ne modifie aucune ligne.
--
-- Exception : talvex.fr (et ses sous-domaines) est l'adresse officielle de la plateforme. Il n'est
-- jamais attribuable a un Groupe, une Societe, un Commercial ou un Client, meme si une ligne passait
-- un jour en 'released'. La protection est ici, cote base, et non dans l'interface.

-- 1) Adresses reservees a la plateforme.
create or replace function public.is_reserved_platform_domain(p_domain text)
returns boolean
language sql
immutable
parallel safe
set search_path to ''
as $function$
  select coalesce(
    public.normalize_domain_name(p_domain) = 'talvex.fr'
    or public.normalize_domain_name(p_domain) like '%.talvex.fr',
    false);
$function$;

revoke all on function public.is_reserved_platform_domain(text) from public;
revoke all on function public.is_reserved_platform_domain(text) from anon;
revoke all on function public.is_reserved_platform_domain(text) from authenticated;
grant execute on function public.is_reserved_platform_domain(text) to service_role;

comment on function public.is_reserved_platform_domain(text) is
  'Adresses reservees a la plateforme Talvex : jamais attribuables a une entite, meme apres liberation. Ajouter ici toute nouvelle adresse officielle.';

-- 2) Etat d'un domaine vu par une entreprise donnee.
create or replace function public.domain_attachment_state(p_domain text, p_company_id uuid)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_domain text := public.normalize_domain_name(p_domain);
  v_owner uuid;
begin
  if v_domain is null or p_company_id is null or not public.is_valid_domain_name(v_domain) then
    return 'free';
  end if;

  -- Adresse officielle de la plateforme : jamais libre pour une entite, quel que soit l'historique.
  if public.is_reserved_platform_domain(v_domain) then
    return 'other';
  end if;

  -- 1. Un rattachement VIVANT prime sur tout le reste, et l'index unique partiel garantit qu'il n'y
  --    en a qu'un. 'failed' (association jamais aboutie) et 'released' (domaine deconnecte
  --    proprement) ne sont pas des rattachements vivants.
  select d.company_id into v_owner
    from public.site_domains d
   where d.domain_name = v_domain
     and d.registration_status not in ('failed', 'released')
   limit 1;
  if found then
    -- Proprietaire nul (site officiel Talvex) : jamais « a elle » pour une entreprise.
    return case when v_owner is not distinct from p_company_id then 'mine' else 'other' end;
  end if;

  -- 2. Pas de ligne vivante : l'ancien champ du site compte toujours. Une ligne 'released' ne doit
  --    pas empecher cette verification, sinon un rattachement herite passerait inapercu.
  select hp.company_id into v_owner
    from public.company_home_pages hp
   where public.normalize_domain_name(hp.custom_domain) = v_domain
   limit 1;
  if found then
    return case when v_owner is not distinct from p_company_id then 'mine' else 'other' end;
  end if;

  -- 3. Ni ligne vivante ni champ herite : une intention d'achat encore en cours reserve le domaine.
  select i.company_id into v_owner
    from public.domain_purchase_intents i
   where i.domain_name = v_domain
     and i.status in ('pending', 'submitting', 'accepted', 'unknown', 'completed')
   limit 1;
  if found then
    return case when v_owner is not distinct from p_company_id then 'mine' else 'other' end;
  end if;

  -- Plus aucun rattachement vivant : le domaine est libre pour toute entite. Les lignes 'released'
  -- restent en base pour l'historique, et une nouvelle utilisation cree une NOUVELLE ligne
  -- (attach_provider_domain) sans jamais les toucher : aucun melange d'ancien et de nouveau.
  return 'free';
end;
$function$;

comment on function public.domain_attachment_state(text, uuid) is
  'Etat d un domaine pour une entreprise : mine (rattachement vivant a elle), other (rattachement vivant ailleurs, ou adresse reservee a la plateforme), free (aucun rattachement vivant : les lignes released ne bloquent pas, elles restent pour l historique).';
