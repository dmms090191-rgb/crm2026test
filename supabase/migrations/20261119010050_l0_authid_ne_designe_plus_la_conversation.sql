/*
  # L0 — La cle AuthId ne designe plus jamais une conversation

  ## Le defaut corrige

  Le declencheur trg_propagate_lead_vendor_id (AFTER UPDATE ON leads) appelait
  propagate_lead_vendor_id_to_client_messages(), en SECURITY DEFINER, sans search_path.
  Quand le commercial d'un lead changeait, la fonction designait la conversation par
  data->>'AuthId', sinon data->>'auth_id', sinon l'id du lead, puis reecrivait le commercial
  de TOUS les messages de cette conversation, SANS FILTRE DE SOCIETE.

  `data` est rempli par l'import CSV (la ligne entiere du fichier) et modifiable par l'API.
  Une colonne « AuthId » dans un fichier suffisait donc a :
    - R1  reecrire les messages d'une conversation d'une AUTRE societe (la RLS ne s'applique
          pas a une fonction SECURITY DEFINER) ;
    - R1b meme effet sans passer par data : un admin peut modifier leads.id par l'API ;
    - R2  bloquer toute reaffectation du lead : une cellule vide ou non-UUID fait echouer la
          conversion en uuid (22P02), et un transfert groupe echoue en entier.
  L'interface lisait la meme cascade a 13 endroits (messagerie, notifications push, non-lus,
  nettoyage des orphelins, historique) : corrige dans le meme lot, src/lib/conversationLead.ts.

  Mesure du 19/11/2026 (role postgres, hors RLS) : 0 lead sur 110 porte AuthId ou auth_id ;
  25 messages, 0 company_id NULL, 9 rattaches a un lead, tous dans la societe de leur lead.

  ## Ce que fait cette migration

  1. propagate_lead_vendor_id_to_client_messages() ne lit plus leads.data. Elle n'ecrit que
     dans la conversation du lead (client_auth_id = id du lead) ET dans sa societe
     (company_id = celle du lead), et ne propage qu'un commercial de cette meme societe.
     Elle reste SECURITY DEFINER volontairement : en INVOKER, l'UPDATE ferait evaluer les
     politiques de client_messages, dont celle du client appelle client_company_ids(),
     SECURITY DEFINER sans search_path, susceptible d'echouer avec un search_path vide.
     La borne company_id = new.company_id est tenue par le WITH CHECK des politiques UPDATE
     de leads : un admin ou un commercial ne peut pas deplacer un lead vers une autre societe.
  2. leads_neutraliser_cle_authid() renomme, a l'ecriture, AuthId / auth_id en
     « CSV · AuthId » / « CSV · auth_id » : la valeur est conservee, mais ne designe plus
     rien, quel que soit le chemin (CSV, API, restauration) — y compris pour les applications
     Windows et Android deja installees, qui embarquent l'ancienne cascade.
  3. EXECUTE est retire a tous les roles sur les deux fonctions, comme dans
     20261021230240_restreindre_execute_triggers_crm_immo.sql : une fonction RETURNS trigger
     n'est pas appelable par l'API, et PostgreSQL ne verifie EXECUTE qu'a la CREATION du
     declencheur, jamais quand il se declenche.

  Aucune table, aucune politique RLS, aucune donnee existante n'est modifiee.

  ## Retour arriere (a n'executer que sur decision)

    drop trigger if exists trg_leads_neutraliser_cle_authid on public.leads;
    drop function if exists public.leads_neutraliser_cle_authid();
    CREATE OR REPLACE FUNCTION public.propagate_lead_vendor_id_to_client_messages()
     RETURNS trigger
     LANGUAGE plpgsql
     SECURITY DEFINER
    AS $function$
    DECLARE
    _client_auth_id uuid;
    BEGIN
    IF (OLD.vendor_id IS DISTINCT FROM NEW.vendor_id) THEN
    _client_auth_id := COALESCE(
    (NEW.data->>'AuthId')::uuid,
    (NEW.data->>'auth_id')::uuid,
    NEW.id
    );
    UPDATE client_messages
    SET vendor_id = NEW.vendor_id
    WHERE client_auth_id = _client_auth_id;
    END IF;
    RETURN NEW;
    END;
    $function$;
    GRANT EXECUTE ON FUNCTION public.propagate_lead_vendor_id_to_client_messages()
      TO PUBLIC, anon, authenticated, service_role;
*/

-- 1) La propagation du commercial ne lit plus leads.data, et reste dans la societe du lead.
create or replace function public.propagate_lead_vendor_id_to_client_messages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.vendor_id is distinct from new.vendor_id
     and (new.vendor_id is null
          or exists (select 1 from public.vendors v
                      where v.id = new.vendor_id
                        and v.company_id = new.company_id)) then
    update public.client_messages
       set vendor_id = new.vendor_id
     where client_auth_id = new.id
       and company_id = new.company_id;
  end if;
  return new;
end;
$$;

comment on function public.propagate_lead_vendor_id_to_client_messages() is
  'Propage le commercial d''un lead a SA conversation (client_auth_id = id du lead), dans SA societe, et seulement pour un commercial de cette societe. Ne lit jamais leads.data (lot L0, 19/11/2026).';

revoke all on function public.propagate_lead_vendor_id_to_client_messages()
  from public, anon, authenticated, service_role;

-- 2) Les cles AuthId et auth_id ne peuvent plus exister dans leads.data : renommees a l'ecriture.
create or replace function public.leads_neutraliser_cle_authid()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  k text;
begin
  if jsonb_typeof(new.data) = 'object' then
    foreach k in array array['AuthId', 'auth_id'] loop
      if new.data ? k then
        new.data := (new.data - k) || jsonb_build_object('CSV · ' || k, new.data -> k);
      end if;
    end loop;
  end if;
  return new;
end;
$$;

comment on function public.leads_neutraliser_cle_authid() is
  'Renomme AuthId / auth_id de leads.data en « CSV · AuthId » / « CSV · auth_id » a l''ecriture : la valeur est conservee et ne designe jamais une conversation, y compris pour les applications installees qui lisent encore l''ancienne cascade (lot L0, 19/11/2026).';

revoke all on function public.leads_neutraliser_cle_authid()
  from public, anon, authenticated, service_role;

create or replace trigger trg_leads_neutraliser_cle_authid
  before insert or update of data on public.leads
  for each row execute function public.leads_neutraliser_cle_authid();
