alter table public.crm_immo_dossiers
  add column if not exists mode_paiement text;

alter table public.crm_immo_dossiers
  drop constraint if exists crm_immo_dossiers_mode_paiement_connu;

alter table public.crm_immo_dossiers
  add constraint crm_immo_dossiers_mode_paiement_connu
  check (mode_paiement is null or mode_paiement in ('cheque', 'especes', 'virement'));

comment on column public.crm_immo_dossiers.mode_paiement is
  'cheque | especes | virement, ou NULL si non renseigne. Representation TECHNIQUE sans accent : les libelles affiches (Cheque, Especes, Virement) vivent dans l''interface.';

do $$
declare
  deplaces int := 0;
  bloquants int := 0;
  exemple text;
begin
  create temporary table _colonnes_mode on commit drop as
  select id, company_id, nom
  from public.crm_immo_colonnes
  where translate(lower(btrim(nom)), 'éèêëàâçùûîï', 'eeeeaacuuii')
        in ('mode de paiement', 'mode paiement', 'paiement');

  select count(*), min(d.valeurs ->> c.id::text)
    into bloquants, exemple
  from public.crm_immo_dossiers d
  join _colonnes_mode c on c.company_id = d.company_id
  where d.valeurs ? c.id::text
    and btrim(coalesce(d.valeurs ->> c.id::text, '')) <> ''
    and translate(lower(btrim(d.valeurs ->> c.id::text)), 'éèêëàâçùûîï', 'eeeeaacuuii')
        not in ('cheque', 'cheques', 'chq',
                'especes', 'espece', 'cash', 'liquide',
                'virement', 'virements', 'vir');

  if bloquants > 0 then
    raise exception
      'MIGRATION ARRETEE : % dossier(s) portent un mode de paiement que je ne sais pas rattacher aux trois valeurs connues (exemple : %). Rien n''a ete deplace ni supprime.',
      bloquants, coalesce(exemple, '(vide)');
  end if;

  with reprise as (
    update public.crm_immo_dossiers d
    set mode_paiement =
          case translate(lower(btrim(d.valeurs ->> c.id::text)), 'éèêëàâçùûîï', 'eeeeaacuuii')
            when 'cheque'    then 'cheque'
            when 'cheques'   then 'cheque'
            when 'chq'       then 'cheque'
            when 'especes'   then 'especes'
            when 'espece'    then 'especes'
            when 'cash'      then 'especes'
            when 'liquide'   then 'especes'
            when 'virement'  then 'virement'
            when 'virements' then 'virement'
            when 'vir'       then 'virement'
          end,
        valeurs = d.valeurs - c.id::text
    from _colonnes_mode c
    where d.company_id = c.company_id
      and d.valeurs ? c.id::text
      and btrim(coalesce(d.valeurs ->> c.id::text, '')) <> ''
    returning 1
  )
  select count(*) into deplaces from reprise;

  update public.crm_immo_dossiers d
  set valeurs = d.valeurs - c.id::text
  from _colonnes_mode c
  where d.company_id = c.company_id
    and d.valeurs ? c.id::text;

  delete from public.crm_immo_colonnes c
  using _colonnes_mode m
  where c.id = m.id;

  raise notice 'mode de paiement : % valeur(s) reprise(s).', deplaces;
end $$;