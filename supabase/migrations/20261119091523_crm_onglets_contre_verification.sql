/*
 * CRM LEADS — ONGLETS DE COLONNES : CORRECTIFS DE LA CONTRE-VERIFICATION (19/11/2026)
 *
 * Suite de 20261119084010_crm_onglets_correctifs_relecture.sql, apres contre-verification
 * multi-agents (10 agents, chaque defaut confirme par un sceptique).
 *
 *  1. TELEPHONE « +33 (0)6 12 34 56 78 » : la forme canonique gardait le zero national
 *     (+330612345678) et l'import creait un DOUBLON du lead +33612345678. Le zero est retire.
 *     Aucune valeur en base n'avait cette forme le 19/11 (0 en colonne plate, 0 dans data,
 *     role postgres) ; l'index qui utilise la fonction est reconstruit par principe.
 *  2. LOT REJOUE : si la reponse d'un lot se perd, le client le renvoie. Le second passage
 *     comptait les leads crees comme « inchanges » et doublait l'historique. Chaque lot porte
 *     desormais un identifiant (p_lot) ; un lot deja traite rend SON resultat d'origine, sans
 *     rien refaire. Les lots d'un meme import sont serialises (verrou transactionnel).
 *  3. TAILLE : au-dela de 100 lignes par appel, refus (au-dela de 64 sous-transactions qui
 *     ecrivent, Postgres ralentit toute la base). Le client envoie 50.
 *  4. EMAIL EXISTANT : une valeur de data.Email qui n'a pas la forme d'un email (« n/a », « - »,
 *     deux adresses) n'est plus prise pour l'email du lead — elle bloquait a vie le vrai email.
 *     Et TOUTE cle de data qui designe un email (« Email », « Mail », « E-mail », « Courriel »...)
 *     est protegee dans un lead qui a deja un email, pas seulement celle de la colonne email
 *     standard du fichier.
 *  5. CONFLIT D'EMAIL : un doublon trouve par le TELEPHONE dont l'email differe n'est plus
 *     fusionne (ce peut etre une autre personne au meme standard) : il est rattache a l'onglet,
 *     signale en conflit, et rien de sa fiche n'est modifie.
 */

-- ============================================================ 1. TELEPHONE CANONIQUE

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
  /* « +33 (0)6 ... » : le zero national garde derriere l'indicatif. */
  if v ~ '^\+330[0-9]{9}$' then v := '+33' || substr(v, 5); end if;
  if v !~ '^\+' then
    if v ~ '^[0-9]{10,15}$' then v := '+' || v; else return null; end if;
  end if;
  if substr(v, 2) !~ '^[0-9]{7,15}$' then return null; end if;
  return v;
end;
$$;

reindex index public.leads_data_tel_idx;

-- ============================================================ 2. LOTS TRAITES

alter table public.import_history add column if not exists lots_traites jsonb not null default '{}'::jsonb;
comment on column public.import_history.lots_traites is
  'Resultat de chaque lot d''import deja traite, par identifiant de lot : un lot renvoye apres une coupure rend ce resultat sans rien refaire.';

-- ============================================================ 3-5. IMPORT : UN LOT

/* L'ancienne signature (sans p_lot) est retiree : la garder creerait deux fonctions
   candidates pour un meme appel. Elle n'a existe que le 19/11, sans autre appelant. */
drop function if exists public.crm_import_lot(uuid, uuid, uuid, text, jsonb);

create or replace function public.crm_import_lot(
  p_company_id uuid, p_import_id uuid, p_onglet_id uuid, p_mode text, p_lignes jsonb, p_lot uuid default null
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
  v_deja jsonb;
  v_resultat jsonb;
  v_cle_email text;
  v_lead uuid;
  v_ex_id uuid;
  v_ex_email text;
  v_ex_tel text;
  v_ex_prenom text;
  v_ex_nom text;
  v_ex_data jsonb;
  v_eff_email text;
  v_eff_tel text;
  v_eff_prenom text;
  v_eff_nom text;
  v_conflit boolean;
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
  if jsonb_typeof(coalesce(p_lignes, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_lignes, '[]'::jsonb)) > 100 then
    raise exception using errcode = '22023', message = 'Lot invalide : 100 lignes au plus par appel';
  end if;
  perform 1 from public.lead_onglets o
   where o.id = p_onglet_id and o.company_id = p_company_id and o.archive_le is null;
  if not found then
    raise exception using errcode = '22023', message = 'Onglet introuvable ou archive';
  end if;

  /* Les lots d'un meme import passent l'un apres l'autre : un lot renvoye pendant que le
     premier envoi est encore en cours attend sa fin, puis trouve son resultat. */
  perform pg_advisory_xact_lock(hashtextextended(p_import_id::text, 0));

  select ih.file_name, ih.lots_traites -> p_lot::text into v_fichier, v_deja from public.import_history ih
   where ih.id = p_import_id and ih.company_id = p_company_id;
  if not found then
    raise exception using errcode = '22023', message = 'Import introuvable';
  end if;
  if p_lot is not null and v_deja is not null then
    return v_deja || jsonb_build_object('rejoue', true);
  end if;

  for r in select value from jsonb_array_elements(coalesce(p_lignes, '[]'::jsonb)) loop
    v_i := (r->>'i')::integer;
    begin
      v_email := nullif(lower(btrim(coalesce(r->>'email', ''))), '');
      v_tel := public.lead_tel_canonique(r->>'telephone');
      v_prenom := nullif(btrim(coalesce(r->>'prenom', '')), '');
      v_nom := nullif(btrim(coalesce(r->>'nom', '')), '');
      v_data := public.lead_data_filtree(r->'data');
      v_cle_email := nullif(r->>'cle_email', '');

      if v_email is null and v_tel is null then
        raise exception using errcode = '22023', message = 'Email et telephone absents ou invalides';
      end if;

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
        v_merge := case when jsonb_typeof(v_ex_data) = 'object' then v_ex_data else '{}'::jsonb end;

        /* LA VALEUR EXISTANTE d'un champ de contact : la colonne plate, sinon data (lead cree
           par Inscription ou a la main). Un « email » de data qui n'en a pas la forme n'en est
           pas un : il ne bloque pas le vrai. */
        v_eff_email := coalesce(
          nullif(lower(btrim(v_ex_email)), ''),
          (select lower(btrim(x)) from unnest(array[v_merge->>'Email', v_merge->>'email']) as x
            where btrim(x) ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' limit 1));
        v_eff_tel := coalesce(nullif(v_ex_tel, ''),
                              public.lead_tel_canonique(v_merge->>'Telephone'),
                              public.lead_tel_canonique(v_merge->>'telephone'));
        v_eff_prenom := coalesce(nullif(btrim(v_ex_prenom), ''), nullif(btrim(v_merge->>'Prenom'), ''),
                                 nullif(btrim(v_merge->>'prenom'), ''));
        v_eff_nom := coalesce(nullif(btrim(v_ex_nom), ''), nullif(btrim(v_merge->>'Nom'), ''),
                              nullif(btrim(v_merge->>'nom'), ''));

        v_conflit := v_email is not null and v_eff_email is not null and v_eff_email <> v_email;
        if v_conflit then
          v_conflits := v_conflits || jsonb_build_array(jsonb_build_object('i', v_i, 'champ', 'email'));
        end if;

        /* Un conflit d'email n'est JAMAIS fusionne : la fiche trouvee par le telephone peut
           etre celle d'une autre personne. Le lead est seulement rattache a l'onglet. */
        if p_mode = 'ignorer' or v_conflit then
          v_inchanges := v_inchanges + 1;
        else
          v_change := false;
          for v_k, v_v in select e.key, e.value from jsonb_each(v_data) as e loop
            /* Aucune cle d'email (« Email », « Mail », « E-mail », « Courriel »...) n'entre
               dans un lead qui a deja un email. */
            if v_eff_email is not null and (
                 v_k = v_cle_email
                 or regexp_replace(lower(v_k), '[^a-z]', '', 'g') in
                    ('email', 'mail', 'emails', 'courriel', 'adresseemail', 'adressemail', 'emailadresse', 'adressecourriel')) then
              continue;
            end if;
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
            v_new_prenom := case when v_eff_prenom is null then v_prenom else v_ex_prenom end;
            v_new_nom := case when v_eff_nom is null then v_nom else v_ex_nom end;
            v_new_tel := case when v_eff_tel is null then v_tel else v_ex_tel end;
          end if;
          v_new_email := case when v_eff_email is null then v_email else v_ex_email end;

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

  v_resultat := jsonb_build_object(
    'crees', v_crees, 'inchanges', v_inchanges, 'completes', v_completes,
    'lies', v_lies, 'erreurs', v_erreurs, 'conflits', v_conflits);

  /* L'historique compte ce que le serveur a vraiment fait, et garde le resultat du lot. */
  update public.import_history ih
     set new_leads_count = ih.new_leads_count + v_crees,
         duplicates_count = ih.duplicates_count + v_inchanges + v_completes,
         errors_count = ih.errors_count + jsonb_array_length(v_erreurs),
         lots_traites = case when p_lot is null then ih.lots_traites
                             else ih.lots_traites || jsonb_build_object(p_lot::text, v_resultat) end
   where ih.id = p_import_id;

  return v_resultat;
end;
$$;

revoke all on function public.crm_import_lot(uuid, uuid, uuid, text, jsonb, uuid) from public, anon;
grant execute on function public.crm_import_lot(uuid, uuid, uuid, text, jsonb, uuid) to authenticated;
