/*
 * LES DOCUMENTS D'UN DOSSIER CRM IMMO — deux tables, et pas une de plus.
 *
 * ---------- POURQUOI << CLASSEUR >> ET NON << DOSSIER DOCUMENTAIRE >> ----------
 *
 * Dans ce module, << dossier >> designe deja la fiche d'un client : crm_immo_dossiers.
 * Une table crm_immo_dossiers_documentaires rendrait chaque jointure et chaque nom de
 * contrainte ambigus a la lecture. Le code dit donc << classeur >>, l'interface dit
 * << dossier >> comme l'a demande David. Le prefixe `crm_immo_` est obligatoire, et ce
 * n'est pas une convention de style : useRestoreCrm derive TABLES_CRM_IMMO par
 * startsWith('crm_immo_'), et c'est ce prefixe qui aiguille la restauration vers le RPC
 * qui anonymise les identites. Une table mal nommee prendrait l'upsert direct.
 *
 * ---------- LE GABARIT EST crm_immo_commentaires, PAS crm_immo_dossiers ----------
 *
 * Mesure faite avant d'ecrire : crm_immo_dossiers.created_by n'a AUCUN defaut, aucun
 * declencheur ne le remplit, et le client ne l'envoie jamais. Resultat : ses deux lignes
 * portent created_by NULL. Copier `dossiers` aurait produit des documents sans auteur,
 * sans la moindre erreur. Seules commentaires, contrats et loyers portent le defaut
 * auth.uid() ; c'est leur forme qui est reprise ici.
 *
 * ---------- TOUT UNIQUE COMMENCE PAR company_id ----------
 *
 * Un index UNIQUE qui ne commence pas par company_id est verifie HORS RLS et AVANT la
 * cle etrangere : il rend 23505 quand la valeur est deja prise chez la Societe voisine,
 * et 23503 quand elle est libre. La difference entre les deux codes est un ORACLE DE
 * CONTENU entre Societes. Le defaut est reellement survenu sur crm_immo_etats, et son
 * correctif n'a pas touche la cle etrangere : il a ajoute company_id a l'index.
 *
 * ---------- AUCUN INDEX PARTIEL, DONC AUCUN SOFT-DELETE ----------
 *
 * Un `supprime_le` aurait force un UNIQUE partiel sur le nom (WHERE supprime_le IS NULL)
 * pour autoriser la recreation d'un classeur du meme nom. Or PostgREST emet
 * ON CONFLICT (colonnes) sans predicat, qui n'infere aucun index partiel : 42P10 des la
 * planification. Et le module n'a aucune convention de soft-delete a imiter — en
 * introduire une ici creerait une seconde logique parallele. La suppression est donc
 * physique, et la tracabilite passe par `statut` et `updated_at`.
 *
 * ---------- LE STATUT EXISTE POUR QU'AUCUN ECHEC NE SOIT SILENCIEUX ----------
 *
 * Une ligne de base et un objet Storage ne peuvent pas etre ecrits dans la meme
 * transaction : ce sont deux systemes. On ecrit donc la LIGNE d'abord, les octets
 * ensuite, et `statut` porte l'etat intermediaire pour qu'il soit VISIBLE :
 *
 *   en_cours     la ligne existe, les octets ne sont pas (encore) confirmes
 *   pret         les deux existent
 *   suppression  l'intention de supprimer est enregistree, la reprise est idempotente
 *
 * Un `en_cours` qui traine s'affiche << Envoi incomplet >> avec Reessayer et Supprimer ;
 * un `suppression` qui traine s'affiche << Suppression incomplete >> avec Reessayer. Rien
 * ne reste jamais incoherent sans le dire.
 */

-- ============================================================================
-- 1. LES CLASSEURS
-- ============================================================================

create table if not exists public.crm_immo_classeurs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  dossier_id  uuid not null,
  nom         text not null,
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at  timestamptz not null default now(),

  /* La cle etrangere COMPOSEE. C'est elle qui rend impossible d'ECRIRE un classeur
     portant le company_id d'une Societe sur le dossier d'une autre — pas seulement
     impossible de le lire. */
  constraint crm_immo_classeurs_dossier_fk
    foreign key (dossier_id, company_id)
    references public.crm_immo_dossiers (id, company_id)
    on delete cascade on update cascade,

  constraint crm_immo_classeurs_nom_non_vide
    check (btrim(nom) <> '' and length(nom) <= 80),

  /* Cible de la cle etrangere composee des documents. */
  constraint crm_immo_classeurs_id_company_unique unique (id, company_id)
);

/*
 * Deux classeurs du meme nom dans le meme dossier n'ont aucun sens, et la casse ne doit
 * pas suffire a les distinguer : << Contrat >> et << contrat >> sont le meme classeur
 * pour l'utilisateur. C'est un INDEX et non une CONSTRAINT, parce que lower() n'est pas
 * accepte dans une contrainte d'unicite. Il commence par company_id, et il n'est PAS
 * partiel — donc aucune des deux chausse-trappes du module.
 */
create unique index if not exists crm_immo_classeurs_nom_unique
  on public.crm_immo_classeurs (company_id, dossier_id, lower(nom));

create index if not exists crm_immo_classeurs_dossier_idx
  on public.crm_immo_classeurs (company_id, dossier_id, nom);

-- ============================================================================
-- 2. LES DOCUMENTS
-- ============================================================================

create table if not exists public.crm_immo_documents (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  dossier_id    uuid not null,

  /* NULL = a la racine du dossier client. Un seul niveau de classeurs, volontairement :
     un parent_id auto-referent ferait compter l'ordre des lignes A L'INTERIEUR d'une
     table lors de la restauration, qui insere dans l'ordre du fichier sans tri
     topologique. Un enfant restaure avant son parent violerait la cle etrangere. */
  classeur_id   uuid,

  /* Le nom que l'utilisateur lit et renomme. Le chemin Storage, lui, ne bouge jamais :
     renommer n'est donc qu'un UPDATE, et deux documents nommes << Contrat.pdf >>
     coexistent sans risque d'ecrasement. */
  nom_affiche   text not null,

  /* {company_id}/{dossier_id}/{document_id}.{ext}. Le premier segment DOIT etre le
     company_id : les policies de storage.objects lisent storage.foldername(name)[1], et
     aucune migration ne peut recloisonner apres coup des objets deposes a plat. */
  chemin        text not null,

  mime          text not null,
  taille        bigint not null,

  statut        text not null default 'en_cours',

  /* Renseigne UNIQUEMENT si le fichier a ete converti avant l'envoi (une photo HEIC
     d'iPhone reencodee en JPEG). NULL veut dire << tel que l'utilisateur l'a fourni >>.
     C'est ce qui permet de le DIRE a l'utilisateur au lieu de convertir en douce. */
  mime_origine  text,

  created_at    timestamptz not null default now(),
  created_by    uuid default auth.uid() references auth.users (id) on delete set null,

  /* Ecart assume avec le gabarit : crm_immo_commentaires n'a pas d'updated_at. Ici le
     renommage et le deplacement doivent laisser une trace. */
  updated_at    timestamptz not null default now(),

  constraint crm_immo_documents_dossier_fk
    foreign key (dossier_id, company_id)
    references public.crm_immo_dossiers (id, company_id)
    on delete cascade on update cascade,

  /* Composee elle aussi : un document ne peut pas pointer le classeur d'une autre
     Societe. SET NULL et non RESTRICT — deux cascades concurrentes depuis le meme
     dossier n'ont pas d'ordre garanti, et un RESTRICT pourrait echouer a tort. Le refus
     de supprimer un classeur non vide est porte par l'application, qui compte d'abord. */
  constraint crm_immo_documents_classeur_fk
    foreign key (classeur_id, company_id)
    references public.crm_immo_classeurs (id, company_id)
    on delete set null on update cascade,

  constraint crm_immo_documents_nom_non_vide
    check (btrim(nom_affiche) <> '' and length(nom_affiche) <= 200),

  constraint crm_immo_documents_chemin_non_vide
    check (btrim(chemin) <> '' and length(chemin) <= 500),

  /* 15 Mo. Justification : couvre un PDF scanne d'une vingtaine de pages et une photo de
     telephone non convertie, tout en restant envoyable sur un reseau mobile. Apres
     conversion, une photo de document pese environ 700 Ko. */
  constraint crm_immo_documents_taille check (taille > 0 and taille <= 15728640),

  constraint crm_immo_documents_statut
    check (statut in ('en_cours', 'pret', 'suppression')),

  /* Un chemin ne peut designer qu'un document. Commence par company_id. */
  constraint crm_immo_documents_chemin_unique unique (company_id, chemin)
);

/* La lecture de la modale : les documents d'UN dossier, du plus recent au plus ancien. */
create index if not exists crm_immo_documents_dossier_idx
  on public.crm_immo_documents (company_id, dossier_id, created_at desc);

/* Le filtrage par classeur, et le comptage qui refuse de supprimer un classeur plein. */
create index if not exists crm_immo_documents_classeur_idx
  on public.crm_immo_documents (company_id, classeur_id);

-- ============================================================================
-- 3. LA RLS, DANS LA MEME MIGRATION QUE LES TABLES
-- ============================================================================
/*
 * Ce n'est pas un detail d'hygiene : `anon` detient INSERT, UPDATE, DELETE et TRUNCATE
 * sur toutes les tables de ce schema par privileges par defaut. Une table creee sans
 * ENABLE ROW LEVEL SECURITY est OUVERTE AU PUBLIC, et rien dans l'interface ne le
 * montrerait. Les deux tables sont donc armees ici, pas dans une migration suivante.
 *
 * Les trois policies sont la copie exacte du patron des six tables du module, y compris
 * son ASYMETRIE : Talvex (super_admin) n'est pas soumis a has_crm_immo_access, les deux
 * autres roles le sont. David a demande << les memes principes d'acces que le CRM Immo
 * actuel >> : cette asymetrie est donc reproduite, pas corrigee en silence.
 *
 * vendor et client n'ont aucune policy, donc aucun acces — comme aujourd'hui.
 */

alter table public.crm_immo_classeurs enable row level security;
alter table public.crm_immo_documents enable row level security;

-- ---- classeurs ----

drop policy if exists "Admin manage own company crm immo classeurs" on public.crm_immo_classeurs;
create policy "Admin manage own company crm immo classeurs"
  on public.crm_immo_classeurs for all to authenticated
  using (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    and company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    and (select public.has_crm_immo_access(((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid))
  )
  with check (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    and company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    and (select public.has_crm_immo_access(((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid))
  );

drop policy if exists "CSA manage child company crm immo classeurs" on public.crm_immo_classeurs;
create policy "CSA manage child company crm immo classeurs"
  on public.crm_immo_classeurs for all to authenticated
  using (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin')
    and (company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
         or public.is_child_company_of_caller(company_id))
    and public.has_crm_immo_access(company_id)
  )
  with check (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin')
    and (company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
         or public.is_child_company_of_caller(company_id))
    and public.has_crm_immo_access(company_id)
  );

drop policy if exists "SA manage all crm immo classeurs" on public.crm_immo_classeurs;
create policy "SA manage all crm immo classeurs"
  on public.crm_immo_classeurs for all to authenticated
  using (((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'))
  with check (((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'));

-- ---- documents ----

drop policy if exists "Admin manage own company crm immo documents" on public.crm_immo_documents;
create policy "Admin manage own company crm immo documents"
  on public.crm_immo_documents for all to authenticated
  using (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    and company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    and (select public.has_crm_immo_access(((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid))
  )
  with check (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    and company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
    and (select public.has_crm_immo_access(((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid))
  );

drop policy if exists "CSA manage child company crm immo documents" on public.crm_immo_documents;
create policy "CSA manage child company crm immo documents"
  on public.crm_immo_documents for all to authenticated
  using (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin')
    and (company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
         or public.is_child_company_of_caller(company_id))
    and public.has_crm_immo_access(company_id)
  )
  with check (
    ((auth.jwt() -> 'app_metadata' ->> 'role') = 'company_super_admin')
    and (company_id = ((auth.jwt() -> 'app_metadata' ->> 'company_id'))::uuid
         or public.is_child_company_of_caller(company_id))
    and public.has_crm_immo_access(company_id)
  );

drop policy if exists "SA manage all crm immo documents" on public.crm_immo_documents;
create policy "SA manage all crm immo documents"
  on public.crm_immo_documents for all to authenticated
  using (((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'))
  with check (((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'));

-- ============================================================================
-- 4. updated_at
-- ============================================================================
/*
 * public.set_updated_at() existe deja, avec search_path vide, et sert company_home_pages.
 * On la REUTILISE plutot que d'ajouter deux fonctions quasi identiques — le module compte
 * deja six fonctions update_<table>_updated_at qui font toutes la meme chose. Rien a
 * REVOKE de ce cote : la fonction et ses droits sont inchanges.
 */

drop trigger if exists crm_immo_classeurs_updated_at on public.crm_immo_classeurs;
create trigger crm_immo_classeurs_updated_at
  before update on public.crm_immo_classeurs
  for each row execute function public.set_updated_at();

drop trigger if exists crm_immo_documents_updated_at on public.crm_immo_documents;
create trigger crm_immo_documents_updated_at
  before update on public.crm_immo_documents
  for each row execute function public.set_updated_at();

comment on table public.crm_immo_classeurs is
  'Classeurs documentaires d''un dossier CRM Immo. Un seul niveau, volontairement.';
comment on table public.crm_immo_documents is
  'Metadonnees des documents d''un dossier CRM Immo. Les octets vivent dans le bucket PRIVE crm-immo-documents ; ils ne sont PAS dans les sauvegardes JSON.';
comment on column public.crm_immo_documents.statut is
  'en_cours = octets non confirmes ; pret = ligne et objet presents ; suppression = intention enregistree, reprise idempotente.';
comment on column public.crm_immo_documents.mime_origine is
  'Type d''origine si le fichier a ete converti avant envoi (ex. image/heic). NULL = fourni tel quel.';
