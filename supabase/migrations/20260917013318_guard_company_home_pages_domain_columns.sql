-- Etape 0.5 (partie base) : colonnes de domaine de public.company_home_pages reservees au serveur.
-- Compatible avec le frontend deploye (aucune ecriture client de ces colonnes) et avec
-- manage-domain / domain-registrar (ecritures via client service_role).
-- Aucun DROP. Aucune donnee modifiee. Rejouable (create or replace).
-- ATTENTION : toute nouvelle colonne liee au domaine devra etre ajoutee aux deux listes ci-dessous.
-- ATTENTION : ne PAS ajouter d'exception basee sur un claim JWT (super_admin ou autre) :
--             la decision repose uniquement sur current_user.

create or replace function public.guard_company_home_pages_domain_columns()
returns trigger
language plpgsql
security invoker            -- OBLIGATOIRE : current_user = role reel de l'appelant (anon / authenticated / service_role)
set search_path = ''
as $$
begin
  -- Ecrivains serveur autorises (decision sur current_user, jamais sur un claim JWT) :
  --   service_role   : edge functions manage-domain et domain-registrar
  --   postgres       : migrations, SQL editor, fonctions SECURITY DEFINER possedees par postgres
  --   supabase_admin : operations internes Supabase
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.custom_domain is not null
       or new.domain_status is distinct from 'not_configured'
       or new.domain_verified is distinct from false
       or new.domain_provider is not null
       or new.domain_type is not null
       or new.domain_notes is not null
       or new.last_domain_check_at is not null
       or new.domain_purchase_price is not null
       or new.domain_sell_price is not null
       or new.domain_payment_status is not null
       or new.domain_order_id is not null
       or new.domain_expires_at is not null
       or new.domain_auto_renew is not null
    then
      raise exception 'company_home_pages : les champs de domaine sont reserves au serveur'
        using errcode = '42501',
              hint = 'Passer par les edge functions manage-domain ou domain-registrar.';
    end if;
    return new;
  end if;

  -- UPDATE : comparaison des valeurs (un SET qui renvoie les memes valeurs reste autorise).
  if new.custom_domain            is distinct from old.custom_domain
     or new.domain_status         is distinct from old.domain_status
     or new.domain_verified       is distinct from old.domain_verified
     or new.domain_provider       is distinct from old.domain_provider
     or new.domain_type           is distinct from old.domain_type
     or new.domain_notes          is distinct from old.domain_notes
     or new.last_domain_check_at  is distinct from old.last_domain_check_at
     or new.domain_purchase_price is distinct from old.domain_purchase_price
     or new.domain_sell_price     is distinct from old.domain_sell_price
     or new.domain_payment_status is distinct from old.domain_payment_status
     or new.domain_order_id       is distinct from old.domain_order_id
     or new.domain_expires_at     is distinct from old.domain_expires_at
     or new.domain_auto_renew     is distinct from old.domain_auto_renew
  then
    raise exception 'company_home_pages : les champs de domaine sont reserves au serveur'
      using errcode = '42501',
            hint = 'Passer par les edge functions manage-domain ou domain-registrar.';
  end if;

  return new;
end;
$$;

comment on function public.guard_company_home_pages_domain_columns() is
  'Etape 0.5 : interdit a anon/authenticated (y compris JWT super_admin) de modifier les 13 colonnes de domaine de company_home_pages. Seuls service_role, postgres et supabase_admin passent (test sur current_user). Toute nouvelle colonne de domaine doit etre ajoutee ici.';

create or replace trigger trg_guard_home_page_domain_columns
  before insert or update on public.company_home_pages
  for each row
  execute function public.guard_company_home_pages_domain_columns();
