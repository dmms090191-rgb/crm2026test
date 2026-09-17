-- Fondations Domaine (phase 1) 1/3 : fonctions pures + cle composite (site, entreprise).
-- Additif uniquement : aucune donnee modifiee, aucune suppression.

-- Normalisation d'un nom de domaine ou d'un hote HTTP :
-- minuscules, sans schema, sans port/chemin/requete, sans point final, sans "www." en tete.
-- Les domaines internationalises doivent arriver en punycode (xn--) : la validation refuse le reste.
create or replace function public.normalize_domain_name(p_value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(
    pg_catalog.regexp_replace(
      pg_catalog.regexp_replace(
        pg_catalog.regexp_replace(
          pg_catalog.regexp_replace(pg_catalog.lower(pg_catalog.btrim(coalesce(p_value, ''))), '^[a-z][a-z0-9+.-]*://', ''),
          '[:/?#].*$', ''),
        '\.+$', ''),
      '^www\.', ''),
    '');
$$;

-- Nom de domaine enregistrable valide ET deja normalise (utilise dans les contraintes CHECK).
create or replace function public.is_valid_domain_name(p_value text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(
    p_value is not null
    and pg_catalog.length(p_value) between 4 and 253
    and p_value ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$'
    and p_value = public.normalize_domain_name(p_value),
    false);
$$;

-- Machine d'etat 1 : enregistrement du domaine chez le registrar.
--   pending (commande transmise, NON confirmee) -> registered | failed
--   registered -> expired | suspended | transfer_out | released
--   expired | suspended | transfer_out -> registered | released
--   external (domaine existant, non achete via Talvex) -> released
create or replace function public.domain_registration_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select p_from = p_to or (p_from, p_to) in (
    ('pending', 'registered'), ('pending', 'failed'),
    ('registered', 'expired'), ('registered', 'suspended'), ('registered', 'transfer_out'), ('registered', 'released'),
    ('expired', 'registered'), ('expired', 'released'),
    ('suspended', 'registered'), ('suspended', 'released'),
    ('transfer_out', 'registered'), ('transfer_out', 'released'),
    ('external', 'released')
  );
$$;

-- Machine d'etat 2 : mise en service (DNS -> Vercel -> verification -> HTTPS -> actif).
create or replace function public.domain_connection_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select p_from = p_to or (p_from, p_to) in (
    ('not_started', 'dns_configuring'),
    ('dns_configuring', 'verifying'), ('dns_configuring', 'dns_failed'), ('dns_configuring', 'disconnected'),
    ('dns_failed', 'dns_configuring'), ('dns_failed', 'disconnected'),
    ('verifying', 'active'), ('verifying', 'verification_failed'), ('verifying', 'dns_configuring'), ('verifying', 'disconnected'),
    ('verification_failed', 'verifying'), ('verification_failed', 'dns_configuring'), ('verification_failed', 'disconnected'),
    ('active', 'verifying'), ('active', 'disconnected'),
    ('disconnected', 'dns_configuring')
  );
$$;

-- Machine d'etat 3 : intention d'achat (idempotence).
--   pending -> submitting (une seule soumission possible) | rejected | cancelled
--   submitting -> accepted (ex. HTTP 202 : accepte, PAS achete) | completed | failed | unknown
--   accepted -> completed | failed | unknown
--   unknown (resultat inconnu, ex. timeout) -> accepted | completed | failed, APRES rapprochement ;
--   jamais de retour a submitting : aucun renvoi aveugle d'un achat.
create or replace function public.domain_intent_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select p_from = p_to or (p_from, p_to) in (
    ('pending', 'submitting'), ('pending', 'rejected'), ('pending', 'cancelled'),
    ('submitting', 'accepted'), ('submitting', 'completed'), ('submitting', 'failed'), ('submitting', 'unknown'),
    ('accepted', 'completed'), ('accepted', 'failed'), ('accepted', 'unknown'),
    ('unknown', 'accepted'), ('unknown', 'completed'), ('unknown', 'failed')
  );
$$;

-- Cle composite (id, company_id) : permet aux tables Domaine de garantir, par cle etrangere,
-- que le site rattache appartient bien a la meme entreprise que le domaine.
alter table public.company_home_pages
  add constraint company_home_pages_id_company_key unique (id, company_id);
