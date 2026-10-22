/*
 * LE BUCKET PRIVE DES DOCUMENTS CRM IMMO — le premier bucket prive du projet.
 *
 * ---------- POURQUOI NE RIEN COPIER DE L'EXISTANT ----------
 *
 * Les sept buckets du projet sont TOUS publics, et leur SELECT est ouvert au role
 * `public` : une URL devinee ou fuitee suffit a lire le fichier, pour toujours. Un seul,
 * company-logos, cloisonne par Societe, et seulement en ECRITURE. Pour des pieces
 * d'identite et des baux, aucun de ces patrons n'est acceptable. Celui-ci est donc
 * `public = false`, sans aucune policy pour le role `public`, et les lectures passent par
 * des URL SIGNEES de courte duree, creees a la demande.
 *
 * Mesure rassurante faite avant d'ecrire : les 27 policies existantes de storage.objects
 * portent toutes un `bucket_id` litteral en conjonction de premier niveau, et aucune
 * n'est RESTRICTIVE. Un bucket neuf part donc d'une ardoise vierge — aucune policy
 * existante ne l'ouvrirait par ricochet. Les policies etant PERMISSIVES et s'additionnant
 * en OR, cette verification n'etait pas facultative.
 *
 * ---------- LE CHEMIN EST LE JETON D'AUTORISATION ----------
 *
 * {company_id}/{dossier_id}/{document_id}.{ext}
 *
 * storage.foldername(name)[1] rend le company_id. C'est sur lui que portent les quatre
 * policies. Le premier segment doit etre le company_id DES LE PREMIER ENVOI : aucune
 * migration ne peut recloisonner apres coup des objets deposes a plat, et c'est
 * exactement l'impasse de chat-files (`chat/${Date.now()}-...`).
 *
 * Le nom technique est l'id du document, donc deux fichiers nommes << Contrat.pdf >>
 * coexistent sans s'ecraser, par construction et non par precaution.
 *
 * ---------- UNE FONCTION PLUTOT QUE DOUZE PREDICATS RECOPIES ----------
 *
 * Mirer le patron des tables demanderait trois policies par commande, soit douze
 * predicats a maintenir en phase. Une seule fonction les remplace. Elle est SECURITY
 * DEFINER parce qu'elle lit crm_immo_acces, et c'est sans danger ici : elle ne repond
 * qu'a << ai-je acces a cette Societe >>, ce que l'appelant sait deja. Elle ne dit jamais
 * si un fichier existe, donc elle n'est pas un oracle.
 *
 * Elle ne CASTE JAMAIS une entree libre : un chemin dont le premier segment n'est pas un
 * UUID est refuse par une expression reguliere AVANT le cast, sans quoi un 22P02
 * remonterait en erreur de base au lieu d'un refus propre.
 *
 * ---------- LE MIME EST UN GARDE-FOU, PAS UNE FRONTIERE ----------
 *
 * Supabase compare le Content-Type ANNONCE par le client, jamais les octets du fichier.
 * `allowed_mime_types` empeche donc les envois distraits, pas un envoi malveillant. La
 * vraie protection est ailleurs : le bucket est prive, et SVG est volontairement ABSENT
 * de la liste — un SVG ouvert par URL signee executerait ses scripts.
 */

-- ============================================================================
-- 1. LE BUCKET
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'crm-immo-documents',
  'crm-immo-documents',
  false,
  15728640,                        -- 15 Mo, la meme borne que le CHECK de la table
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================================
-- 2. LA FONCTION D'ACCES
-- ============================================================================

create or replace function public.crm_immo_chemin_autorise(p_chemin text)
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_segment text;
begin
  v_segment := (storage.foldername(p_chemin))[1];

  /* Pas d'UUID en tete, pas d'acces. Le controle precede le cast : sans lui, un chemin
     bricole leverait 22P02 au lieu d'etre refuse. */
  if v_segment is null
     or v_segment !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  then
    return false;
  end if;

  /* L'ASYMETRIE DU MODULE, REPRODUITE TELLE QUELLE. Sur les six tables existantes, la
     policy super_admin ne verifie PAS has_crm_immo_access : Talvex passe meme si la
     Societe n'a pas le module. David a demande les memes principes d'acces que le CRM
     Immo actuel ; cette asymetrie est donc conservee, pas corrigee en douce. */
  if (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin' then
    return true;
  end if;

  /* Pour l'Admin comme pour le Groupe, has_crm_immo_access tranche deja les trois cas :
     la Societe elle-meme, son Groupe parent via is_child_company_of_caller, et
     l'exigence que crm_immo_acces soit actif. Rien a dupliquer ici. */
  return public.has_crm_immo_access(v_segment::uuid);
end;
$$;

/*
 * Supabase accorde EXECUTE a anon, authenticated et service_role par privileges par
 * defaut : un REVOKE FROM PUBLIC seul ne suffit pas. Une SECURITY DEFINER appelable par
 * anon est une surface d'attaque, et le module a deja du corriger exactement cela apres
 * coup (migration 20261021230240).
 */
revoke all on function public.crm_immo_chemin_autorise(text) from public;
revoke all on function public.crm_immo_chemin_autorise(text) from anon;
grant execute on function public.crm_immo_chemin_autorise(text) to authenticated;

comment on function public.crm_immo_chemin_autorise(text) is
  'Vrai si l''appelant a acces a la Societe portee par le premier segment du chemin Storage. Reproduit le patron RLS du CRM Immo, asymetrie super_admin comprise.';

-- ============================================================================
-- 3. LES QUATRE POLICIES
-- ============================================================================
/*
 * Aucune policy pour le role `public` : c'est la difference de fond avec les sept
 * buckets existants. Et UPDATE porte USING *et* WITH CHECK, ce qui interdit de DEPLACER
 * un objet hors de son dossier de Societe — sans le WITH CHECK, un renommage d'objet
 * pourrait le faire sortir du perimetre.
 */

drop policy if exists "crm immo documents lire" on storage.objects;
create policy "crm immo documents lire"
  on storage.objects for select to authenticated
  using (bucket_id = 'crm-immo-documents' and public.crm_immo_chemin_autorise(name));

drop policy if exists "crm immo documents deposer" on storage.objects;
create policy "crm immo documents deposer"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'crm-immo-documents' and public.crm_immo_chemin_autorise(name));

drop policy if exists "crm immo documents remplacer" on storage.objects;
create policy "crm immo documents remplacer"
  on storage.objects for update to authenticated
  using (bucket_id = 'crm-immo-documents' and public.crm_immo_chemin_autorise(name))
  with check (bucket_id = 'crm-immo-documents' and public.crm_immo_chemin_autorise(name));

drop policy if exists "crm immo documents supprimer" on storage.objects;
create policy "crm immo documents supprimer"
  on storage.objects for delete to authenticated
  using (bucket_id = 'crm-immo-documents' and public.crm_immo_chemin_autorise(name));
