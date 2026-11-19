-- RDV DIRECT : un rendez-vous fixe par le commercial lui-meme (« rappelez-moi demain a 15 h »),
-- sans proposition ni validation du client.
--
-- UNE SEULE SOURCE DE VERITE : une ligne de rdv_proposals marquee rdv_kind = 'direct', au
-- statut 'confirmed' (ou 'cancelled' une fois annulee). Les agendas du commercial, de la
-- Societe et de l'equipe lisent deja les RDV confirmes de cette table : ils l'affichent sans
-- autre changement. L'historique du lead le LIT (aucune copie dans leads.data).
--
-- Les lignes existantes prennent 'proposition' : le systeme de proposition au client ne change pas.
--
-- GARDE-FOUS EN BASE. La RLS existante de rdv_proposals est a l'echelle de la SOCIETE (un client
-- lit et modifie toutes les lignes de sa societe, un commercial ecrit sur tout lead de sa
-- societe). On AJOUTE des politiques RESTRICTIVES, sans toucher aux politiques existantes :
--   1. un RDV direct n'est JAMAIS lisible ni modifiable par un client (API et temps reel) ;
--   2. un commercial ne cree ou ne modifie un RDV direct que sur un lead qui lui est attribue,
--      et en son propre nom.

alter table public.rdv_proposals
  add column rdv_kind text not null default 'proposition';

alter table public.rdv_proposals
  add constraint rdv_proposals_rdv_kind_check check (rdv_kind in ('proposition', 'direct'));

-- Le lead est-il attribue au commercial connecte, et la ligne est-elle a son nom ?
-- SECURITY DEFINER : la reponse ne depend pas de ce que la RLS laisse lire de vendors et leads.
create or replace function public.rdv_direct_du_commercial(p_lead_id uuid, p_vendor_id uuid, p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.vendors v
    join public.leads l on l.vendor_id = v.id
    where v.id = p_vendor_id
      and v.auth_user_id = (select auth.uid())
      and v.company_id = p_company_id
      and l.id = p_lead_id
      and l.company_id = p_company_id
  );
$$;

revoke all on function public.rdv_direct_du_commercial(uuid, uuid, uuid) from public, anon;
grant execute on function public.rdv_direct_du_commercial(uuid, uuid, uuid) to authenticated;

create policy "RDV direct : jamais pour le client"
  on public.rdv_proposals
  as restrictive
  for all
  to authenticated
  using (rdv_kind <> 'direct' or public.get_my_role() is distinct from 'client')
  with check (rdv_kind <> 'direct' or public.get_my_role() is distinct from 'client');

create policy "RDV direct : le commercial, sur ses leads (ajout)"
  on public.rdv_proposals
  as restrictive
  for insert
  to authenticated
  with check (
    rdv_kind <> 'direct'
    or public.get_my_role() is distinct from 'vendor'
    or public.rdv_direct_du_commercial(lead_id, vendor_id, company_id)
  );

-- Le TYPE d'un rendez-vous ne change jamais (une proposition ne devient pas un RDV direct
-- cache au client, un RDV direct ne devient pas une proposition exposee au client), et un RDV
-- direct reste attache a son lead. La RLS ne peut pas comparer l'avant et l'apres : un
-- declencheur le fait, pour tout le monde.
create or replace function public.rdv_proposals_garde_type()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.rdv_kind is distinct from old.rdv_kind then
    raise exception 'Le type d''un rendez-vous (proposition ou RDV direct) ne se change pas' using errcode = '23514';
  end if;
  if old.rdv_kind = 'direct' and new.lead_id is distinct from old.lead_id then
    raise exception 'Un RDV direct reste attache a son lead' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.rdv_proposals_garde_type() from public, anon, authenticated;

create trigger rdv_proposals_garde_type
  before update on public.rdv_proposals
  for each row execute function public.rdv_proposals_garde_type();

-- Le lead change de commercial : ses RDV directs A VENIR le suivent (le nouveau commercial
-- les voit dans son agenda et sur la ligne, et peut les modifier ou les annuler). Les RDV
-- passes ou annules gardent le commercial d'origine : c'est leur historique.
create or replace function public.rdv_direct_suit_le_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.rdv_proposals r
     set vendor_id = new.vendor_id
   where r.lead_id = new.id
     and r.rdv_kind = 'direct'
     and r.status = 'confirmed'
     and (r.appointment_utc is null or r.appointment_utc >= now());
  return null;
end;
$$;

revoke all on function public.rdv_direct_suit_le_lead() from public, anon, authenticated;

create trigger leads_rdv_direct_suit_le_lead
  after update of vendor_id on public.leads
  for each row
  when (old.vendor_id is distinct from new.vendor_id)
  execute function public.rdv_direct_suit_le_lead();

create policy "RDV direct : le commercial, sur ses leads (modification)"
  on public.rdv_proposals
  as restrictive
  for update
  to authenticated
  using (
    rdv_kind <> 'direct'
    or public.get_my_role() is distinct from 'vendor'
    or public.rdv_direct_du_commercial(lead_id, vendor_id, company_id)
  )
  with check (
    rdv_kind <> 'direct'
    or public.get_my_role() is distinct from 'vendor'
    or public.rdv_direct_du_commercial(lead_id, vendor_id, company_id)
  );
