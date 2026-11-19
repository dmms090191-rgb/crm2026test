/*
 * CRM LEADS — ONGLETS DE COLONNES : CORRECTIFS DE LA RELECTURE (19/11/2026)
 *
 * Suite de 20261119073610_crm_onglets_colonnes_leads.sql, apres relecture independante.
 *
 *  1. FUSION : un lead peut n'avoir son contact QUE dans data (lead cree par Inscription :
 *     colonnes plates vides, data.Email / data.Telephone remplis). La fusion ne regardait que
 *     les colonnes plates : un import « Completer » trouvait ce lead par le telephone, voyait
 *     un email vide, et posait l'email du FICHIER dans la colonne plate — le client ne
 *     retrouvait plus son lead (ClientDashboard cherche email = <compte>, puis data.Email
 *     quand email est vide). Desormais la valeur EXISTANTE d'un champ de contact est la
 *     colonne plate, sinon data ; un champ deja renseigne quelque part n'est jamais
 *     « complete » par le fichier, et la cle data de l'email du fichier (r.cle_email) n'est
 *     jamais ecrite dans un lead qui a deja un email.
 *  2. Un nom d'onglet ARCHIVE redevient disponible (index unique partiel).
 *  3. Une colonne STANDARD masquee (Email vide au premier import) est reaffichee quand un
 *     import suivant la remplit, comme les colonnes du fichier.
 *  4. Supprimer une entree d'historique d'import reste possible : la cle etrangere met
 *     import_id a NULL dans lead_onglet_leads, ce que le declencheur de champs figes
 *     refusait.
 *  5. Les quatre fonctions PURES (aucune lecture de table) retrouvent le droit d'execution
 *     public : elles servent dans un index de leads, une colonne generee et une contrainte,
 *     et un role sans ce droit qui ecrirait dans ces tables echouerait (« permission denied
 *     for function », mesure en base le 19/11).
 */

-- ============================================================ 5. FONCTIONS PURES

grant execute on function public.lead_cle_canonique(text) to public;
grant execute on function public.lead_tel_canonique(text) to public;
grant execute on function public.lead_cle_reservee(text) to public;
grant execute on function public.lead_data_filtree(jsonb) to public;

-- ============================================================ 2. NOM D'ONGLET ARCHIVE

drop index if exists public.lead_onglets_nom_unique;
create unique index if not exists lead_onglets_nom_actif_unique
  on public.lead_onglets (company_id, public.lead_cle_canonique(nom))
  where archive_le is null;

-- ============================================================ 4. HISTORIQUE SUPPRIMABLE

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
    /* import_id peut seulement DEVENIR nul : c'est ce que fait la cle etrangere quand une
       entree d'historique est supprimee. Il ne change jamais vers un autre import. */
    if new.onglet_id <> old.onglet_id or new.lead_id <> old.lead_id or new.company_id <> old.company_id
       or new.origine <> old.origine
       or (new.import_id is distinct from old.import_id and new.import_id is not null)
       or new.ajoute_par is distinct from old.ajoute_par then
      raise exception using errcode = '42501', message = 'lead_onglet_leads : seul le retrait change';
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================ 3. IMPORT : PREPARER

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
      /* Une colonne standard vide dans tout le fichier est rattachee masquee ; deja
         rattachee et masquee, elle est REAFFICHEE si ce fichier la remplit. */
      v_ex_id := null;
      v_ex_visible := null;
      select c.id, c.visible into v_ex_id, v_ex_visible
        from public.lead_onglet_colonnes c
       where c.onglet_id = v_onglet and c.cle_systeme = v_sys;
      if v_ex_id is null then
        insert into public.lead_onglet_colonnes (onglet_id, company_id, cle_systeme, position, visible)
        values (v_onglet, p_company_id, v_sys, v_pos, not v_vide);
        v_pos := v_pos + 1;
      elsif not v_ex_visible and not v_vide then
        update public.lead_onglet_colonnes set visible = true where id = v_ex_id;
        v_reaffichees := v_reaffichees || to_jsonb(v_sys);
      end if;
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

-- ============================================================ 1. IMPORT : UN LOT

/*
 * Ligne : {i, prenom, nom, email, telephone, data, pin, cle_email}. `cle_email` est la cle de
 * data sous laquelle le FICHIER range l'email (son en-tete) : elle n'est jamais ecrite dans
 * un lead qui a deja un email, quel que soit le mode.
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
      v_cle_email := nullif(r->>'cle_email', '');

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
        v_merge := case when jsonb_typeof(v_ex_data) = 'object' then v_ex_data else '{}'::jsonb end;

        /* LA VALEUR EXISTANTE d'un champ de contact : la colonne plate, sinon data (un lead
           cree par Inscription ou a la main n'a souvent que data). */
        v_eff_email := coalesce(nullif(lower(btrim(v_ex_email)), ''),
                                nullif(lower(btrim(v_merge->>'Email')), ''),
                                nullif(lower(btrim(v_merge->>'email')), ''));
        v_eff_tel := coalesce(nullif(v_ex_tel, ''),
                              public.lead_tel_canonique(v_merge->>'Telephone'),
                              public.lead_tel_canonique(v_merge->>'telephone'));
        v_eff_prenom := coalesce(nullif(btrim(v_ex_prenom), ''), nullif(btrim(v_merge->>'Prenom'), ''),
                                 nullif(btrim(v_merge->>'prenom'), ''));
        v_eff_nom := coalesce(nullif(btrim(v_ex_nom), ''), nullif(btrim(v_merge->>'Nom'), ''),
                              nullif(btrim(v_merge->>'nom'), ''));

        if v_email is not null and v_eff_email is not null and v_eff_email <> v_email then
          v_conflits := v_conflits || jsonb_build_array(jsonb_build_object('i', v_i, 'champ', 'email'));
        end if;

        if p_mode = 'ignorer' then
          v_inchanges := v_inchanges + 1;
        else
          v_change := false;
          for v_k, v_v in select e.key, e.value from jsonb_each(v_data) as e loop
            /* L'email du fichier n'entre jamais dans un lead qui a deja un email. */
            if v_k = v_cle_email and v_eff_email is not null then
              continue;
            end if;
            if p_mode = 'mettre_a_jour' or coalesce(btrim(v_merge->>v_k), '') = '' then
              if (v_merge->v_k) is distinct from v_v then
                v_merge := jsonb_set(v_merge, array[v_k], v_v, true);
                v_change := true;
              end if;
            end if;
          end loop;

          /* Colonnes plates. Mettre a jour : une valeur non vide du fichier remplace.
             Completer : on ne remplit QUE ce que le lead n'a nulle part — sinon la colonne
             plate, lue en premier a l'affichage, masquerait la valeur deja dans data. */
          if p_mode = 'mettre_a_jour' then
            v_new_prenom := coalesce(v_prenom, v_ex_prenom);
            v_new_nom := coalesce(v_nom, v_ex_nom);
            v_new_tel := coalesce(v_tel, v_ex_tel);
          else
            v_new_prenom := case when v_eff_prenom is null then v_prenom else v_ex_prenom end;
            v_new_nom := case when v_eff_nom is null then v_nom else v_ex_nom end;
            v_new_tel := case when v_eff_tel is null then v_tel else v_ex_tel end;
          end if;
          /* L'email n'est JAMAIS remplace : il n'est pose que si le lead n'en a aucun. */
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
