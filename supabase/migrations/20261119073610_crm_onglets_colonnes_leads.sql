/*
 * CRM LEADS — ONGLETS DE COLONNES (19/11/2026)
 *
 * Demande de David : un import CSV garde TOUTES ses colonnes, et le CRM les montre dans un
 * ONGLET DE COLONNES choisi a l'import (existant ou nouveau). Un onglet = un jeu de colonnes
 * + un groupe de leads. Les leads restent UNE ligne de `leads` ; un lead peut appartenir a
 * plusieurs onglets sans etre duplique. « Principal » n'est pas une ligne : c'est l'onglet
 * virtuel de tous les leads, avec les colonnes standards du CRM.
 *
 * Les VALEURS restent dans `leads.data` (aucune colonne SQL par en-tete CSV). Ce fichier
 * ajoute seulement :
 *   - lead_colonnes          le registre des colonnes d'une societe (identite d'une colonne :
 *                            la cle exacte dans leads.data, figee) ;
 *   - lead_onglets           les onglets ;
 *   - lead_onglet_colonnes   quelles colonnes, dans quel ordre, visibles ou non, quel libelle ;
 *   - lead_onglet_leads      la relation lead <-> onglet (retrait = date, jamais suppression) ;
 *   - deux fonctions de forme canonique (colonnes, telephones), immuables ;
 *   - les procedures d'import par LOTS : insertion sans perte de lot, fusion sans perte de
 *     donnees (Compléter / Mettre a jour), rattachement a l'onglet, sans aucun aller-retour
 *     par ligne (le N+1 de l'ancien mode « mettre a jour » disparait).
 *
 * SECURITE : toutes les procedures sont SECURITY INVOKER — la RLS de l'appelant s'applique
 * a chaque lecture et ecriture, rien n'est contourne. search_path vide partout. Aucune
 * politique DELETE sur les nouvelles tables : on masque, on archive, on retire, on ne
 * supprime jamais (les suppressions ne viennent que des cascades : societe, lead, onglet).
 * Le Groupe (company_super_admin) n'a aucune politique, comme sur `leads`.
 */

-- ============================================================ 1. FORMES CANONIQUES

/* La cle de rapprochement d'un en-tete : NFC, apostrophes unifiees, espaces insecables en
   espaces, espaces reduits, minuscules. Les ACCENTS SONT CONSERVES (decision de David :
   « Catégorie » et « Categorie » ne sont rapprochees que sur proposition, a l'apercu). Le
   client en a une copie exacte (src/lib/entetesImport.ts) verifiee par releve. */
create or replace function public.lead_cle_canonique(p_texte text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select nullif(
    lower(regexp_replace(btrim(translate(
      normalize(coalesce(p_texte, ''), NFC),
      chr(8217) || chr(8216) || chr(700) || '`' || chr(180) || chr(160) || chr(8239),
      repeat('''', 5) || '  '
    )), '\s+', ' ', 'g')),
    '')
$$;

comment on function public.lead_cle_canonique(text) is
  'Forme canonique d''un en-tete de colonne de lead (accents conserves). Copie client : src/lib/entetesImport.ts.';

/* Le telephone canonique, miroir exact de normalizePhone (src/lib/phoneNormalizer.ts) :
   00 -> +, 0 + 9 chiffres -> +33, 10 a 15 chiffres sans + -> +, 7 a 15 chiffres apres le +.
   Sert a reconnaitre un doublon saisi a la main (le JSONB garde la saisie d'origine). */
create or replace function public.lead_tel_canonique(p_texte text)
returns text
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  v text;
begin
  if p_texte is null or btrim(p_texte) = '' then return null; end if;
  v := regexp_replace(btrim(p_texte), '[\s\-.()/' || chr(160) || chr(8239) || ']', '', 'g');
  if v like '00%' then v := '+' || substr(v, 3); end if;
  if v ~ '^0[0-9]{9}$' then v := '+33' || substr(v, 2); end if;
  if v !~ '^\+' then
    if v ~ '^[0-9]{10,15}$' then v := '+' || v; else return null; end if;
  end if;
  if substr(v, 2) !~ '^[0-9]{7,15}$' then return null; end if;
  return v;
end;
$$;

/* Les cles de leads.data qui ne sont JAMAIS des colonnes : le PIN client, le mot de passe
   de demonstration, les commentaires (un TABLEAU), et les cles neutralisees par L0. */
create or replace function public.lead_cle_reservee(p_cle text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(public.lead_cle_canonique(p_cle), '') in (
    '', 'motdepasse', 'mot_de_passe_demo', 'commentaires', 'commentaire',
    'authid', 'auth_id', 'csv · authid', 'csv · auth_id'
  )
$$;

/* Ce qu'un import a le droit d'ecrire dans data : des chaines non vides, hors cles reservees. */
create or replace function public.lead_data_filtree(p_data jsonb)
returns jsonb
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(e.key, to_jsonb(btrim(e.value #>> '{}'))), '{}'::jsonb)
  from jsonb_each(case when jsonb_typeof(p_data) = 'object' then p_data else '{}'::jsonb end) as e
  where jsonb_typeof(e.value) = 'string'
    and btrim(e.value #>> '{}') <> ''
    and not public.lead_cle_reservee(e.key)
$$;

revoke all on function public.lead_cle_canonique(text) from public, anon;
revoke all on function public.lead_tel_canonique(text) from public, anon;
revoke all on function public.lead_cle_reservee(text) from public, anon;
revoke all on function public.lead_data_filtree(jsonb) from public, anon;
grant execute on function public.lead_cle_canonique(text) to authenticated;
grant execute on function public.lead_tel_canonique(text) to authenticated;
grant execute on function public.lead_cle_reservee(text) to authenticated;
grant execute on function public.lead_data_filtree(jsonb) to authenticated;

-- ============================================================ 2. LEADS : CLE COMPOSEE + INDEX DE DOUBLONS

/* La relation lead <-> onglet reference (id, company_id) : un rattachement entre deux
   societes est alors IMPOSSIBLE par construction, pas seulement par la RLS. */
create unique index if not exists leads_id_company_unique on public.leads (id, company_id);

/* Un lead saisi a la main n'a que data (Email, Telephone) : ces deux index permettent a
   l'import de le reconnaitre comme doublon sans parcourir toute la societe. */
create index if not exists leads_data_email_idx
  on public.leads (company_id, lower(btrim(data->>'Email')));
create index if not exists leads_data_tel_idx
  on public.leads (company_id, public.lead_tel_canonique(data->>'Telephone'));
/* Les index uniques existants sur email et telephone sont PARTIELS : une requete preparee
   (parametre inconnu a la planification) ne peut pas s'en servir. Ces deux-la le peuvent. */
create index if not exists leads_company_email_idx on public.leads (company_id, email);
create index if not exists leads_company_tel_idx on public.leads (company_id, telephone);

-- ============================================================ 3. TABLES

create table if not exists public.lead_colonnes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cle_data text not null check (btrim(cle_data) <> '' and length(cle_data) <= 200),
  cle_canonique text generated always as (public.lead_cle_canonique(cle_data)) stored,
  libelle text not null check (btrim(libelle) <> '' and length(libelle) <= 200),
  type text not null default 'texte'
    check (type in ('texte', 'lien', 'telephone', 'email', 'nombre', 'entreprise', 'date')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  constraint lead_colonnes_cle_non_reservee check (not public.lead_cle_reservee(cle_data)),
  constraint lead_colonnes_cle_unique unique (company_id, cle_data),
  constraint lead_colonnes_canonique_unique unique (company_id, cle_canonique),
  constraint lead_colonnes_id_company unique (id, company_id)
);

create table if not exists public.lead_onglets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  nom text not null check (btrim(nom) <> '' and length(nom) <= 80),
  origine text not null default 'manuel' check (origine in ('manuel', 'import')),
  position integer not null default 0,
  archive_le timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  constraint lead_onglets_principal_reserve check (public.lead_cle_canonique(nom) <> 'principal'),
  constraint lead_onglets_id_company unique (id, company_id)
);
create unique index if not exists lead_onglets_nom_unique
  on public.lead_onglets (company_id, public.lead_cle_canonique(nom));

create table if not exists public.lead_onglet_colonnes (
  id uuid primary key default gen_random_uuid(),
  onglet_id uuid not null,
  company_id uuid not null,
  colonne_id uuid,
  cle_systeme text check (cle_systeme in (
    'hash', 'nom', 'prenom', 'email', 'telephone', 'date_ajout', 'statut', 'actions', 'acces', 'ia', 'vendeur'
  )),
  position integer not null default 0,
  visible boolean not null default true,
  libelle text check (libelle is null or (btrim(libelle) <> '' and length(libelle) <= 200)),
  created_at timestamptz not null default now(),
  constraint lead_onglet_colonnes_une_source check (num_nonnulls(colonne_id, cle_systeme) = 1),
  constraint lead_onglet_colonnes_travail_visible
    check (visible or cle_systeme is null or cle_systeme not in ('statut', 'actions')),
  constraint lead_onglet_colonnes_onglet_fk foreign key (onglet_id, company_id)
    references public.lead_onglets (id, company_id) on delete cascade,
  constraint lead_onglet_colonnes_colonne_fk foreign key (colonne_id, company_id)
    references public.lead_colonnes (id, company_id) on delete cascade,
  constraint lead_onglet_colonnes_colonne_unique unique (onglet_id, colonne_id),
  constraint lead_onglet_colonnes_systeme_unique unique (onglet_id, cle_systeme)
);
create index if not exists lead_onglet_colonnes_company_idx on public.lead_onglet_colonnes (company_id);

create table if not exists public.lead_onglet_leads (
  onglet_id uuid not null,
  lead_id uuid not null,
  company_id uuid not null,
  origine text not null default 'manuel' check (origine in ('import', 'manuel')),
  import_id uuid references public.import_history(id) on delete set null,
  ajoute_le timestamptz not null default now(),
  ajoute_par uuid default auth.uid(),
  retire_le timestamptz,
  constraint lead_onglet_leads_pk primary key (onglet_id, lead_id),
  constraint lead_onglet_leads_onglet_fk foreign key (onglet_id, company_id)
    references public.lead_onglets (id, company_id) on delete cascade,
  constraint lead_onglet_leads_lead_fk foreign key (lead_id, company_id)
    references public.leads (id, company_id) on delete cascade
);
create index if not exists lead_onglet_leads_company_idx on public.lead_onglet_leads (company_id, lead_id);
create index if not exists lead_onglet_leads_import_idx on public.lead_onglet_leads (import_id) where import_id is not null;

-- ============================================================ 4. CHAMPS FIGES

/* Ce qui fait l'IDENTITE d'une ligne ne change jamais : sinon une colonne pourrait changer
   de cle (et pointer d'autres valeurs), ou un rattachement changer de societe. L'auteur est
   toujours le compte connecte. */
create or replace function public.lead_onglets_figer()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if tg_table_name in ('lead_colonnes', 'lead_onglets') then
      new.created_by := auth.uid();
      new.created_at := now();
    elsif tg_table_name = 'lead_onglet_leads' then
      new.ajoute_par := auth.uid();
    end if;
    return new;
  end if;

  if tg_table_name = 'lead_colonnes' then
    if new.id <> old.id or new.company_id <> old.company_id or new.cle_data <> old.cle_data
       or new.created_by is distinct from old.created_by or new.created_at <> old.created_at then
      raise exception using errcode = '42501', message = 'lead_colonnes : l''identite d''une colonne est figee';
    end if;
  elsif tg_table_name = 'lead_onglets' then
    if new.id <> old.id or new.company_id <> old.company_id or new.origine <> old.origine
       or new.created_by is distinct from old.created_by or new.created_at <> old.created_at then
      raise exception using errcode = '42501', message = 'lead_onglets : l''identite d''un onglet est figee';
    end if;
  elsif tg_table_name = 'lead_onglet_colonnes' then
    if new.id <> old.id or new.onglet_id <> old.onglet_id or new.company_id <> old.company_id
       or new.colonne_id is distinct from old.colonne_id or new.cle_systeme is distinct from old.cle_systeme then
      raise exception using errcode = '42501', message = 'lead_onglet_colonnes : seuls ordre, visibilite et libelle changent';
    end if;
  elsif tg_table_name = 'lead_onglet_leads' then
    if new.onglet_id <> old.onglet_id or new.lead_id <> old.lead_id or new.company_id <> old.company_id
       or new.origine <> old.origine or new.import_id is distinct from old.import_id
       or new.ajoute_par is distinct from old.ajoute_par then
      raise exception using errcode = '42501', message = 'lead_onglet_leads : seul le retrait change';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.lead_onglets_figer() from public, anon, authenticated;

drop trigger if exists trg_lead_colonnes_figer on public.lead_colonnes;
create trigger trg_lead_colonnes_figer before insert or update on public.lead_colonnes
  for each row execute function public.lead_onglets_figer();
drop trigger if exists trg_lead_onglets_figer on public.lead_onglets;
create trigger trg_lead_onglets_figer before insert or update on public.lead_onglets
  for each row execute function public.lead_onglets_figer();
drop trigger if exists trg_lead_onglet_colonnes_figer on public.lead_onglet_colonnes;
create trigger trg_lead_onglet_colonnes_figer before insert or update on public.lead_onglet_colonnes
  for each row execute function public.lead_onglets_figer();
drop trigger if exists trg_lead_onglet_leads_figer on public.lead_onglet_leads;
create trigger trg_lead_onglet_leads_figer before insert or update on public.lead_onglet_leads
  for each row execute function public.lead_onglets_figer();

-- ============================================================ 5. RLS

alter table public.lead_colonnes enable row level security;
alter table public.lead_onglets enable row level security;
alter table public.lead_onglet_colonnes enable row level security;
alter table public.lead_onglet_leads enable row level security;

revoke all on table public.lead_colonnes, public.lead_onglets, public.lead_onglet_colonnes, public.lead_onglet_leads from anon;
revoke delete, truncate on table public.lead_colonnes, public.lead_onglets, public.lead_onglet_colonnes, public.lead_onglet_leads from authenticated;
grant select, insert, update on table public.lead_colonnes, public.lead_onglets, public.lead_onglet_colonnes, public.lead_onglet_leads to authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['lead_colonnes', 'lead_onglets', 'lead_onglet_colonnes', 'lead_onglet_leads'] loop
    execute format('drop policy if exists "Admin lit %1$s" on public.%1$I', t);
    execute format('create policy "Admin lit %1$s" on public.%1$I for select to authenticated
      using (public.get_my_role() = ''admin'' and company_id = public.get_my_company_id())', t);
    execute format('drop policy if exists "Commercial lit %1$s" on public.%1$I', t);
    execute format('create policy "Commercial lit %1$s" on public.%1$I for select to authenticated
      using (public.get_my_role() = ''vendor'' and company_id = public.get_my_company_id())', t);
    execute format('drop policy if exists "SA lit %1$s" on public.%1$I', t);
    execute format('create policy "SA lit %1$s" on public.%1$I for select to authenticated
      using (public.get_my_role() = ''super_admin'')', t);
    execute format('drop policy if exists "Admin ajoute %1$s" on public.%1$I', t);
    execute format('create policy "Admin ajoute %1$s" on public.%1$I for insert to authenticated
      with check (public.get_my_role() = ''admin'' and company_id = public.get_my_company_id())', t);
    execute format('drop policy if exists "SA ajoute %1$s" on public.%1$I', t);
    execute format('create policy "SA ajoute %1$s" on public.%1$I for insert to authenticated
      with check (public.get_my_role() = ''super_admin'')', t);
    execute format('drop policy if exists "Admin modifie %1$s" on public.%1$I', t);
    execute format('create policy "Admin modifie %1$s" on public.%1$I for update to authenticated
      using (public.get_my_role() = ''admin'' and company_id = public.get_my_company_id())
      with check (public.get_my_role() = ''admin'' and company_id = public.get_my_company_id())', t);
    execute format('drop policy if exists "SA modifie %1$s" on public.%1$I', t);
    execute format('create policy "SA modifie %1$s" on public.%1$I for update to authenticated
      using (public.get_my_role() = ''super_admin'') with check (public.get_my_role() = ''super_admin'')', t);
  end loop;
end;
$$;

-- ============================================================ 6. CREER UN ONGLET (a la main)

/* p_colonnes : tableau ordonne de {cle_systeme} ou {colonne_id}. Statut et Actions sont
   toujours presents (colonnes de travail) ; on les ajoute a la fin s'ils manquent. */
create or replace function public.crm_onglet_creer(p_company_id uuid, p_nom text, p_colonnes jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_onglet uuid;
  v_pos integer := 0;
  v_col jsonb;
  v_sys text;
begin
  if p_company_id is null then
    raise exception using errcode = '22023', message = 'Societe manquante';
  end if;
  begin
    insert into public.lead_onglets (company_id, nom, origine, position)
    values (p_company_id, btrim(p_nom), 'manuel',
            coalesce((select max(o.position) + 1 from public.lead_onglets o where o.company_id = p_company_id), 0))
    returning id into v_onglet;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'Un onglet porte deja ce nom';
  end;

  for v_col in select value from jsonb_array_elements(coalesce(p_colonnes, '[]'::jsonb)) loop
    if nullif(v_col->>'cle_systeme', '') is not null then
      insert into public.lead_onglet_colonnes (onglet_id, company_id, cle_systeme, position)
      values (v_onglet, p_company_id, v_col->>'cle_systeme', v_pos)
      on conflict (onglet_id, cle_systeme) do nothing;
    elsif nullif(v_col->>'colonne_id', '') is not null then
      insert into public.lead_onglet_colonnes (onglet_id, company_id, colonne_id, position)
      values (v_onglet, p_company_id, (v_col->>'colonne_id')::uuid, v_pos)
      on conflict (onglet_id, colonne_id) do nothing;
    end if;
    if found then v_pos := v_pos + 1; end if;
  end loop;

  foreach v_sys in array array['statut', 'actions'] loop
    insert into public.lead_onglet_colonnes (onglet_id, company_id, cle_systeme, position)
    values (v_onglet, p_company_id, v_sys, v_pos)
    on conflict (onglet_id, cle_systeme) do nothing;
    if found then v_pos := v_pos + 1; end if;
  end loop;

  return v_onglet;
end;
$$;

-- ============================================================ 7. ENREGISTRER LES COLONNES D'UN ONGLET

/* p_colonnes : [{id, position, visible, libelle}] pour les lignes existantes ;
   p_ajouts   : [{colonne_id} | {cle_systeme}] a rattacher a la fin. Rien n'est supprime. */
create or replace function public.crm_onglet_colonnes_enregistrer(p_onglet_id uuid, p_colonnes jsonb, p_ajouts jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_company uuid;
  v_col jsonb;
  v_pos integer;
begin
  select o.company_id into v_company from public.lead_onglets o where o.id = p_onglet_id;
  if v_company is null then
    raise exception using errcode = '22023', message = 'Onglet introuvable';
  end if;

  for v_col in select value from jsonb_array_elements(coalesce(p_colonnes, '[]'::jsonb)) loop
    update public.lead_onglet_colonnes c
       set position = coalesce((v_col->>'position')::integer, c.position),
           visible = coalesce((v_col->>'visible')::boolean, c.visible),
           libelle = nullif(btrim(coalesce(v_col->>'libelle', '')), '')
     where c.id = (v_col->>'id')::uuid and c.onglet_id = p_onglet_id;
  end loop;

  select coalesce(max(c.position), -1) + 1 into v_pos
    from public.lead_onglet_colonnes c where c.onglet_id = p_onglet_id;
  for v_col in select value from jsonb_array_elements(coalesce(p_ajouts, '[]'::jsonb)) loop
    if nullif(v_col->>'cle_systeme', '') is not null then
      insert into public.lead_onglet_colonnes (onglet_id, company_id, cle_systeme, position)
      values (p_onglet_id, v_company, v_col->>'cle_systeme', v_pos)
      on conflict (onglet_id, cle_systeme) do update set visible = true;
    elsif nullif(v_col->>'colonne_id', '') is not null then
      insert into public.lead_onglet_colonnes (onglet_id, company_id, colonne_id, position)
      values (p_onglet_id, v_company, (v_col->>'colonne_id')::uuid, v_pos)
      on conflict (onglet_id, colonne_id) do update set visible = true;
    end if;
    v_pos := v_pos + 1;
  end loop;
end;
$$;

-- ============================================================ 8. IMPORT : PREPARER

/*
 * Cree (ou verifie) l'onglet, enregistre les colonnes du fichier dans le registre, les
 * rattache a l'onglet DANS L'ORDRE DU FICHIER, et cree l'entree d'historique.
 *
 * p_colonnes : [{entete, cle_systeme?, colonne_id?, type?, vide?}] dans l'ordre du fichier.
 *   - cle_systeme : l'en-tete alimente une colonne standard (prenom, nom, email, telephone) ;
 *   - colonne_id  : rattachement CHOISI a l'apercu (accents seuls differents) ;
 *   - sinon : rapprochement par forme canonique, ou creation dans le registre.
 * Une colonne entierement vide est rattachee MASQUEE. Une colonne deja rattachee mais
 * masquee, qui revient avec des valeurs, est REAFFICHEE (et signalee).
 * Retour : {onglet_id, import_id, colonnes: [{entete, cle_systeme | colonne_id + cle_data}], reaffichees}
 */
create or replace function public.crm_import_preparer(
  p_company_id uuid, p_onglet_id uuid, p_onglet_nom text, p_colonnes jsonb, p_import jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_onglet uuid := p_onglet_id;
  v_nouveau boolean := p_onglet_id is null;
  v_import uuid;
  v_pos integer;
  v_col jsonb;
  v_sys text;
  v_colonne uuid;
  v_cle text;
  v_vide boolean;
  v_ex_id uuid;
  v_ex_visible boolean;
  v_res jsonb := '[]'::jsonb;
  v_reaffichees jsonb := '[]'::jsonb;
begin
  if p_company_id is null then
    raise exception using errcode = '22023', message = 'Societe manquante';
  end if;

  if v_nouveau then
    if coalesce(btrim(p_onglet_nom), '') = '' then
      raise exception using errcode = '22023', message = 'Le nom du nouvel onglet est obligatoire';
    end if;
    begin
      insert into public.lead_onglets (company_id, nom, origine, position)
      values (p_company_id, btrim(p_onglet_nom), 'import',
              coalesce((select max(o.position) + 1 from public.lead_onglets o where o.company_id = p_company_id), 0))
      returning id into v_onglet;
    exception when unique_violation then
      raise exception using errcode = '23505', message = 'Un onglet porte deja ce nom';
    end;
    insert into public.lead_onglet_colonnes (onglet_id, company_id, cle_systeme, position)
    values (v_onglet, p_company_id, 'hash', 0);
  else
    perform 1 from public.lead_onglets o
     where o.id = v_onglet and o.company_id = p_company_id and o.archive_le is null;
    if not found then
      raise exception using errcode = '22023', message = 'Onglet introuvable ou archive';
    end if;
  end if;

  select coalesce(max(c.position), -1) + 1 into v_pos
    from public.lead_onglet_colonnes c where c.onglet_id = v_onglet;

  for v_col in select value from jsonb_array_elements(coalesce(p_colonnes, '[]'::jsonb)) loop
    v_vide := coalesce((v_col->>'vide')::boolean, false);
    v_sys := nullif(v_col->>'cle_systeme', '');

    if v_sys is not null then
      /* Une colonne standard vide dans tout le fichier (l'Email d'un fichier de prospects)
         est rattachee masquee, comme une colonne dynamique vide. */
      insert into public.lead_onglet_colonnes (onglet_id, company_id, cle_systeme, position, visible)
      values (v_onglet, p_company_id, v_sys, v_pos, not v_vide)
      on conflict (onglet_id, cle_systeme) do nothing;
      if found then v_pos := v_pos + 1; end if;
      v_res := v_res || jsonb_build_array(jsonb_build_object('entete', v_col->>'entete', 'cle_systeme', v_sys));
      continue;
    end if;

    if public.lead_cle_reservee(v_col->>'entete') then
      continue;
    end if;

    v_colonne := null;
    v_cle := null;
    if nullif(v_col->>'colonne_id', '') is not null then
      select lc.id, lc.cle_data into v_colonne, v_cle
        from public.lead_colonnes lc
       where lc.id = (v_col->>'colonne_id')::uuid and lc.company_id = p_company_id;
    end if;
    if v_colonne is null then
      select lc.id, lc.cle_data into v_colonne, v_cle
        from public.lead_colonnes lc
       where lc.company_id = p_company_id
         and lc.cle_canonique = public.lead_cle_canonique(v_col->>'entete');
    end if;
    if v_colonne is null then
      insert into public.lead_colonnes (company_id, cle_data, libelle, type)
      values (p_company_id, btrim(v_col->>'entete'), btrim(v_col->>'entete'),
              coalesce(nullif(v_col->>'type', ''), 'texte'))
      on conflict (company_id, cle_canonique) do nothing
      returning id, cle_data into v_colonne, v_cle;
      if v_colonne is null then
        select lc.id, lc.cle_data into v_colonne, v_cle
          from public.lead_colonnes lc
         where lc.company_id = p_company_id
           and lc.cle_canonique = public.lead_cle_canonique(v_col->>'entete');
      end if;
    end if;

    v_ex_id := null;
    v_ex_visible := null;
    select c.id, c.visible into v_ex_id, v_ex_visible
      from public.lead_onglet_colonnes c
     where c.onglet_id = v_onglet and c.colonne_id = v_colonne;
    if v_ex_id is null then
      insert into public.lead_onglet_colonnes (onglet_id, company_id, colonne_id, position, visible)
      values (v_onglet, p_company_id, v_colonne, v_pos, not v_vide);
      v_pos := v_pos + 1;
    elsif not v_ex_visible and not v_vide then
      update public.lead_onglet_colonnes set visible = true where id = v_ex_id;
      v_reaffichees := v_reaffichees || to_jsonb(v_cle);
    end if;

    v_res := v_res || jsonb_build_array(jsonb_build_object(
      'entete', v_col->>'entete', 'colonne_id', v_colonne, 'cle_data', v_cle));
  end loop;

  if v_nouveau then
    foreach v_sys in array array['statut', 'vendeur', 'date_ajout', 'actions', 'acces', 'ia'] loop
      insert into public.lead_onglet_colonnes (onglet_id, company_id, cle_systeme, position)
      values (v_onglet, p_company_id, v_sys, v_pos)
      on conflict (onglet_id, cle_systeme) do nothing;
      if found then v_pos := v_pos + 1; end if;
    end loop;
  end if;

  insert into public.import_history (
    file_name, lead_count, columns, new_leads_count, duplicates_count, errors_count,
    import_mode, source_file, imported_by, company_id
  ) values (
    coalesce(p_import->>'file_name', 'import'),
    coalesce((p_import->>'lead_count')::integer, 0),
    coalesce(p_import->'columns', '[]'::jsonb),
    0, 0, coalesce((p_import->>'errors_count')::integer, 0),
    coalesce(p_import->>'import_mode', 'ignorer'),
    coalesce(p_import->>'file_name', 'import'),
    auth.uid(), p_company_id
  )
  returning id into v_import;

  return jsonb_build_object('onglet_id', v_onglet, 'import_id', v_import,
                            'colonnes', v_res, 'reaffichees', v_reaffichees);
end;
$$;

-- ============================================================ 9. IMPORT : UN LOT

/*
 * Un lot de lignes : [{i, prenom, nom, email, telephone, data, pin}] — data a deja pour
 * cles les cle_data du registre (le client les a recues de crm_import_preparer).
 *
 * Pour CHAQUE ligne, dans une sous-transaction (une ligne en erreur n'emporte jamais le lot) :
 *   1. doublon ? par email puis telephone, colonnes plates OU saisie a la main dans data ;
 *   2. nouveau lead -> insertion (PIN genere si absent) ;
 *      doublon -> selon le mode :
 *        ignorer        : rien n'est modifie ;
 *        completer      : seules les valeurs ABSENTES ou VIDES sont remplies ;
 *        mettre_a_jour  : les valeurs non vides du fichier remplacent, les absentes et vides
 *                         sont CONSERVEES (jamais d'effacement) ;
 *      dans tous les cas, un email existant n'est jamais remplace (conflit signale), et
 *      PIN, commentaires et cles reservees ne sont jamais touches ;
 *   3. rattachement a l'onglet (re-rattache un lead retire).
 */
create or replace function public.crm_import_lot(
  p_company_id uuid, p_import_id uuid, p_onglet_id uuid, p_mode text, p_lignes jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r jsonb;
  v_i integer;
  v_email text;
  v_tel text;
  v_prenom text;
  v_nom text;
  v_data jsonb;
  v_pin text;
  v_fichier text;
  v_lead uuid;
  v_ex_id uuid;
  v_ex_email text;
  v_ex_tel text;
  v_ex_prenom text;
  v_ex_nom text;
  v_ex_data jsonb;
  v_merge jsonb;
  v_k text;
  v_v jsonb;
  v_change boolean;
  v_new_prenom text;
  v_new_nom text;
  v_new_email text;
  v_new_tel text;
  v_crees integer := 0;
  v_inchanges integer := 0;
  v_completes integer := 0;
  v_lies integer := 0;
  v_erreurs jsonb := '[]'::jsonb;
  v_conflits jsonb := '[]'::jsonb;
begin
  if p_mode not in ('ignorer', 'completer', 'mettre_a_jour') then
    raise exception using errcode = '22023', message = 'Mode d''import inconnu';
  end if;
  perform 1 from public.lead_onglets o
   where o.id = p_onglet_id and o.company_id = p_company_id and o.archive_le is null;
  if not found then
    raise exception using errcode = '22023', message = 'Onglet introuvable ou archive';
  end if;
  select ih.file_name into v_fichier from public.import_history ih
   where ih.id = p_import_id and ih.company_id = p_company_id;
  if not found then
    raise exception using errcode = '22023', message = 'Import introuvable';
  end if;

  for r in select value from jsonb_array_elements(coalesce(p_lignes, '[]'::jsonb)) loop
    v_i := (r->>'i')::integer;
    begin
      v_email := nullif(lower(btrim(coalesce(r->>'email', ''))), '');
      v_tel := public.lead_tel_canonique(r->>'telephone');
      v_prenom := nullif(btrim(coalesce(r->>'prenom', '')), '');
      v_nom := nullif(btrim(coalesce(r->>'nom', '')), '');
      v_data := public.lead_data_filtree(r->'data');

      if v_email is null and v_tel is null then
        raise exception using errcode = '22023', message = 'Email et telephone absents ou invalides';
      end if;

      /* L'email d'abord, puis le telephone : deux recherches indexees plutot qu'un OU a
         quatre branches que le planificateur ne saurait pas toujours decouper. */
      v_ex_id := null; v_ex_email := null; v_ex_tel := null;
      v_ex_prenom := null; v_ex_nom := null; v_ex_data := null;
      if v_email is not null then
        select l.id, l.email, l.telephone, l.prenom, l.nom, l.data
          into v_ex_id, v_ex_email, v_ex_tel, v_ex_prenom, v_ex_nom, v_ex_data
          from public.leads l
         where l.company_id = p_company_id
           and (l.email = v_email or lower(btrim(l.data->>'Email')) = v_email)
         order by l.imported_at asc, l.id asc
         limit 1;
      end if;
      if v_ex_id is null and v_tel is not null then
        select l.id, l.email, l.telephone, l.prenom, l.nom, l.data
          into v_ex_id, v_ex_email, v_ex_tel, v_ex_prenom, v_ex_nom, v_ex_data
          from public.leads l
         where l.company_id = p_company_id
           and (l.telephone = v_tel or public.lead_tel_canonique(l.data->>'Telephone') = v_tel)
         order by l.imported_at asc, l.id asc
         limit 1;
      end if;

      if v_ex_id is null then
        v_pin := case when coalesce(r->>'pin', '') ~ '^[0-9]{6}$' then r->>'pin'
                      else (100000 + floor(random() * 900000))::integer::text end;
        insert into public.leads (import_id, prenom, nom, email, telephone, statut, source, source_file, data, company_id)
        values (p_import_id, v_prenom, v_nom, v_email, v_tel, 'Nouveau', 'csv_import', v_fichier,
                v_data || jsonb_build_object('MotDePasse', v_pin), p_company_id)
        returning id into v_lead;
        v_crees := v_crees + 1;
      else
        v_lead := v_ex_id;
        if v_email is not null and coalesce(v_ex_email, '') <> '' and v_ex_email <> v_email then
          v_conflits := v_conflits || jsonb_build_array(jsonb_build_object('i', v_i, 'champ', 'email'));
        end if;

        if p_mode = 'ignorer' then
          v_inchanges := v_inchanges + 1;
        else
          v_merge := case when jsonb_typeof(v_ex_data) = 'object' then v_ex_data else '{}'::jsonb end;
          v_change := false;
          for v_k, v_v in select e.key, e.value from jsonb_each(v_data) as e loop
            if p_mode = 'mettre_a_jour' or coalesce(btrim(v_merge->>v_k), '') = '' then
              if (v_merge->v_k) is distinct from v_v then
                v_merge := jsonb_set(v_merge, array[v_k], v_v, true);
                v_change := true;
              end if;
            end if;
          end loop;

          if p_mode = 'mettre_a_jour' then
            v_new_prenom := coalesce(v_prenom, v_ex_prenom);
            v_new_nom := coalesce(v_nom, v_ex_nom);
            v_new_tel := coalesce(v_tel, v_ex_tel);
          else
            v_new_prenom := coalesce(nullif(v_ex_prenom, ''), v_prenom);
            v_new_nom := coalesce(nullif(v_ex_nom, ''), v_nom);
            v_new_tel := coalesce(nullif(v_ex_tel, ''), v_tel);
          end if;
          v_new_email := coalesce(nullif(v_ex_email, ''), v_email);

          if v_change
             or v_new_prenom is distinct from v_ex_prenom or v_new_nom is distinct from v_ex_nom
             or v_new_email is distinct from v_ex_email or v_new_tel is distinct from v_ex_tel then
            update public.leads
               set data = v_merge, prenom = v_new_prenom, nom = v_new_nom,
                   email = v_new_email, telephone = v_new_tel
             where id = v_lead;
            v_completes := v_completes + 1;
          else
            v_inchanges := v_inchanges + 1;
          end if;
        end if;
      end if;

      insert into public.lead_onglet_leads as lol (onglet_id, lead_id, company_id, origine, import_id)
      values (p_onglet_id, v_lead, p_company_id, 'import', p_import_id)
      on conflict (onglet_id, lead_id) do update set retire_le = null
        where lol.retire_le is not null;
      v_lies := v_lies + 1;
    exception when others then
      v_erreurs := v_erreurs || jsonb_build_array(jsonb_build_object(
        'i', v_i, 'code', sqlstate,
        'message', case sqlstate
          when '23505' then 'Email ou telephone deja utilise par un autre lead'
          when '42501' then 'Droits insuffisants'
          else sqlerrm end));
    end;
  end loop;

  /* L'historique compte ce que le serveur a vraiment fait, lot apres lot. */
  update public.import_history ih
     set new_leads_count = ih.new_leads_count + v_crees,
         duplicates_count = ih.duplicates_count + v_inchanges + v_completes,
         errors_count = ih.errors_count + jsonb_array_length(v_erreurs)
   where ih.id = p_import_id;

  return jsonb_build_object(
    'crees', v_crees, 'inchanges', v_inchanges, 'completes', v_completes,
    'lies', v_lies, 'erreurs', v_erreurs, 'conflits', v_conflits);
end;
$$;

revoke all on function public.crm_onglet_creer(uuid, text, jsonb) from public, anon;
revoke all on function public.crm_onglet_colonnes_enregistrer(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.crm_import_preparer(uuid, uuid, text, jsonb, jsonb) from public, anon;
revoke all on function public.crm_import_lot(uuid, uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.crm_onglet_creer(uuid, text, jsonb) to authenticated;
grant execute on function public.crm_onglet_colonnes_enregistrer(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.crm_import_preparer(uuid, uuid, text, jsonb, jsonb) to authenticated;
grant execute on function public.crm_import_lot(uuid, uuid, uuid, text, jsonb) to authenticated;

comment on table public.lead_onglets is 'Onglets de colonnes du CRM Leads (Principal = virtuel, aucune ligne). Archiver, jamais supprimer.';
comment on table public.lead_onglet_leads is 'Relation lead <-> onglet. Retirer = retire_le, jamais DELETE.';
comment on table public.lead_colonnes is 'Registre des colonnes dynamiques d''une societe : cle_data = cle exacte dans leads.data (figee).';
