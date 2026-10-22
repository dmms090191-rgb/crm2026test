/*
 * UNE SOCIETE QUI PORTE ENCORE DES DOCUMENTS NE SE SUPPRIME PAS.
 *
 * ---------- LE PROBLEME QU'ON FERME ----------
 *
 * Toutes les cles etrangeres company_id du module sont ON DELETE CASCADE, et aucune
 * fonction du schema public ne reference storage.objects. Supprimer une Societe efface
 * donc les LIGNES et abandonne les OCTETS : des fichiers resteraient dans le bucket, sans
 * plus aucune trace en base de leur existence — donc hors de portee de toute suppression
 * ulterieure, et impossibles meme a inventorier depuis l'application.
 *
 * ---------- POURQUOI UN DECLENCHEUR, ET NON UN CONTROLE DANS L'INTERFACE ----------
 *
 * La suppression d'une Societe vit dans le panel Talvex, qui est un autre chantier.
 * David a tranche : ne pas l'elargir maintenant, et refuser plutot que de risquer de
 * perdre la trace des binaires. Un declencheur en base satisfait les deux : il ne touche
 * pas une ligne du panel Talvex, et il est incontournable — y compris pour un appel API
 * direct ou une requete SQL manuelle, qu'un controle d'interface ne verrait jamais.
 *
 * Il se declenche BEFORE DELETE, donc AVANT que la cascade n'efface les lignes qu'il
 * compte. Un AFTER n'aurait rien vu.
 *
 * ---------- SECURITY DEFINER, ET C'EST VOULU ----------
 *
 * Un garde-fou que la RLS peut aveugler n'est pas un garde-fou. En SECURITY INVOKER, un
 * appelant dont la policy ne couvre pas la Societe visee compterait ZERO document et
 * passerait. La fonction ne prend aucun parametre — la Societe vient de la ligne
 * supprimee — donc elle ne peut pas servir d'oracle : il n'y a rien a lui demander.
 *
 * Elle NE respecte PAS le drapeau talvex.restauration, volontairement : une restauration
 * ne supprime jamais de Societe, et un garde-fou doit rester arme.
 */

create or replace function public.refuser_suppression_societe_avec_documents()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_documents integer;
begin
  /* Toutes les lignes, quel que soit leur statut : une ligne en 'suppression' peut encore
     avoir ses octets, et on prefere bloquer a tort que perdre une trace. */
  select count(*) into v_documents
    from public.crm_immo_documents d
   where d.company_id = old.id;

  if v_documents > 0 then
    raise exception 'Cette société possède encore des documents CRM Immo. Supprimez ou archivez d''abord les documents avant de supprimer la société.'
      using errcode = 'TLV06',
            detail  = format('%s document(s) encore rattache(s) a cette Societe, et autant d''objets possibles dans le bucket prive crm-immo-documents.', v_documents),
            hint    = 'Ouvrez chaque dossier client, onglet Documents, et supprimez les documents ; leur suppression retire aussi le fichier du stockage.';
  end if;

  return old;
end;
$$;

/*
 * Supabase accorde EXECUTE a anon, authenticated et service_role par privileges par
 * defaut. PostgreSQL ne verifie EXECUTE qu'a la CREATION du declencheur, jamais a son
 * declenchement : retirer les droits ici n'empeche donc pas le garde-fou de fonctionner,
 * et supprime une fonction SECURITY DEFINER appelable directement par anon.
 */
revoke all on function public.refuser_suppression_societe_avec_documents() from public;
revoke all on function public.refuser_suppression_societe_avec_documents() from anon;
revoke all on function public.refuser_suppression_societe_avec_documents() from authenticated;
revoke all on function public.refuser_suppression_societe_avec_documents() from service_role;

drop trigger if exists refuser_suppression_societe_avec_documents on public.companies;
create trigger refuser_suppression_societe_avec_documents
  before delete on public.companies
  for each row execute function public.refuser_suppression_societe_avec_documents();

comment on function public.refuser_suppression_societe_avec_documents() is
  'Refuse la suppression d''une Societe qui porte encore des lignes crm_immo_documents, pour ne jamais abandonner d''objets dans le bucket prive. Regle provisoire : un chantier Talvex dedie fera plus tard une suppression complete controlee (nettoyage Storage, verification, puis suppression).';
