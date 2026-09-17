-- Nettoyage du Groupe Johanna (ancien environnement « Willness / Barbie Wellness »), demande par David le 17/09.
-- Donnees Talvex uniquement. AUCUNE operation chez Hostinger : le domaine reste dans le compte Hostinger central.
--   1. Retire l'ancienne association historique barbiewellness.com du site de CE Groupe (seul site concerne, verifie).
--   2. Renomme l'entreprise avec le nom de Groupe deja enregistre sur le profil de son compte Groupe (aucun nom invente).
-- Le template « Barbie Wellness » et le contenu du site (dont son titre) ne sont PAS modifies.
-- Sans effet si les conditions ne sont plus reunies ; annulation complete si une verification echoue.

do $$
declare
  v_company uuid;
  v_accounts integer;
  v_profile_name text;
  v_pages integer;
begin
  -- Groupe cible : l'entreprise de type groupe encore nommee « Willness » dont le site porte ce domaine.
  select c.id into v_company
    from public.companies c
    join public.company_home_pages hp on hp.company_id = c.id
   where c.entity_type = 'groupe'
     and c.name = 'Willness'
     and public.normalize_domain_name(hp.custom_domain) = 'barbiewellness.com';

  if v_company is null then
    raise notice 'Nettoyage Groupe Johanna : rien a faire.';
    return;
  end if;

  -- Le domaine ne doit etre associe a aucune autre entreprise ni a aucun autre site.
  if exists (
       select 1 from public.company_home_pages hp
        where public.normalize_domain_name(hp.custom_domain) = 'barbiewellness.com'
          and hp.company_id is distinct from v_company)
     or exists (select 1 from public.site_domains d where d.domain_name = 'barbiewellness.com')
     or exists (select 1 from public.domain_purchase_intents i where i.domain_name = 'barbiewellness.com') then
    raise exception 'barbiewellness.com est associe ailleurs : nettoyage annule';
  end if;

  -- Nom du Groupe tel qu'enregistre sur le profil de SON unique compte Groupe.
  select count(*), max(btrim(u.raw_user_meta_data ->> 'company'))
    into v_accounts, v_profile_name
    from auth.users u
   where u.raw_app_meta_data ->> 'role' = 'company_super_admin'
     and u.raw_app_meta_data ->> 'company_id' = v_company::text;

  if v_accounts <> 1 or coalesce(v_profile_name, '') = '' then
    raise exception 'nom du Groupe introuvable ou ambigu : nettoyage annule';
  end if;

  update public.company_home_pages hp
     set custom_domain = null,
         domain_status = 'not_configured',
         domain_verified = false,
         domain_provider = null,
         domain_type = null,
         domain_notes = null,
         last_domain_check_at = null,
         domain_purchase_price = null,
         domain_sell_price = null,
         domain_payment_status = null,
         domain_order_id = null,
         domain_expires_at = null,
         domain_auto_renew = null
   where hp.company_id = v_company
     and public.normalize_domain_name(hp.custom_domain) = 'barbiewellness.com';
  get diagnostics v_pages = row_count;

  if v_pages <> 1 then
    raise exception 'nettoyage inattendu (% site(s)) : annule', v_pages;
  end if;

  update public.companies
     set name = v_profile_name
   where id = v_company
     and name = 'Willness';
end $$;
