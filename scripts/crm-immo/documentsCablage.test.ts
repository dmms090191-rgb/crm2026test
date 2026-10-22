/**
 * Tests du CABLAGE du module Documents — sauvegarde, migrations, interface.
 * Lancer :  npx tsx scripts/crm-immo/documentsCablage.test.ts
 *
 * ---------- CE QUE CE FICHIER GARDE, ET POURQUOI IL LIT DU TEXTE ----------
 *
 * Les proprietes verifiees ici ne sont pas calculables : ce sont des DECISIONS inscrites
 * a plusieurs endroits qui doivent rester d'accord. Une table sauvegardee mais absente de
 * l'ordre de restauration est SAUVEGARDEE PUIS JAMAIS RESTAUREE, et le rapport annonce
 * une reussite. Une colonne d'identite oubliee dans le RPC fait attribuer tous les
 * documents a celui qui restaure, en affichant << 0 sans auteur >>. Aucun type, aucun
 * test de comportement ne rattrape ces deux-la : seule la lecture croisee des sources le
 * fait.
 *
 * ---------- LA REGLE QUE CE FICHIER S'IMPOSE ----------
 *
 * Chercher un motif sans son CONTEXTE ARMANT ne prouve rien : une liste blanche presente
 * mais neutralisee par un `IF false`, un `.rpc(...)` sous un `if (false)`. Chaque
 * assertion vise donc la garde jusqu'a son effet, et non le simple nom.
 */
import { readFileSync, readdirSync } from 'node:fs';
import {
  CRM_BACKUP_TABLES, CRM_TABLE_NAMES, RESTORE_ORDER, TABLE_PRIMARY_KEYS, FK_RULES,
} from '../../src/pages/admin/views/sauvegarde/restoreConstants.ts';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

const lire = (p: string) => readFileSync(p, 'utf8');
/** Le code sans ses commentaires : une assertion NEGATIVE tombe sinon sur la prose qui
 *  explique precisement pourquoi le motif est interdit. Piege deja rencontre ici. */
const sansCommentaires = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

/** La balise OUVRANTE d'un element JSX, a partir de son `<`. Un `[^>]*` ne suffit pas :
 *  une balise contient des fleches `=>` (onClick={() => ...}), et la recherche
 *  s'arreterait au premier chevron de la fleche. On coupe donc au premier `>` qui ne
 *  suit pas un `=`. */
const baliseOuvrante = (src: string, depuis: number) => {
  for (let i = depuis; i < src.length; i++) {
    if (src[i] === '>' && src[i - 1] !== '=') return src.slice(depuis, i + 1);
  }
  return '';
};
/** Toutes les balises ouvrantes `<nom ...>` de la source qui portent le motif donne.
 *  On cherche ainsi un element par son ROLE et non par un prefixe de ses classes : un
 *  prefixe de classes change avec le style, et son echec rendait une chaine vide. */
const balisesAvec = (src: string, nom: string, motif: RegExp) => {
  const trouvees: string[] = [];
  for (let p = src.indexOf('<' + nom); p !== -1; p = src.indexOf('<' + nom, p + 1)) {
    const balise = baliseOuvrante(src, p);
    if (motif.test(balise)) trouvees.push(balise);
  }
  return trouvees;
};

const D = 'src/pages/admin/views/crm-immo/';
const COMPOSANT = lire(D + 'CrmImmoDocuments.tsx');
const HOOK = lire(D + 'useCrmImmoDocuments.ts');
const CODE_HOOK = sansCommentaires(HOOK);
const CODE_COMPOSANT = sansCommentaires(COMPOSANT);
const MODALE = lire(D + 'CrmImmoDetailsModal.tsx');
/** La modale SANS ses commentaires, comme CODE_HOOK et CODE_COMPOSANT. Ses commentaires
 *  citent les classes qu'ils expliquent — `max-md:min-h-[44px]`, `md:border-b-2`,
 *  `role="tablist"` — et une assertion qui lirait la prose trouverait ce qu'elle cherche
 *  sans que le code le porte. Piege deja rencontre ici une fois, sur role="tablist". */
const CODE_MODALE = sansCommentaires(MODALE);
const CONVERSION = sansCommentaires(lire('src/lib/crmImmoConversion.ts'));

/** Les migrations du chantier, retrouvees par leur nom et non par une version figee :
 *  epingler un horodatage laisserait une vingtaine d'assertions vertes sur une fonction
 *  morte le jour ou une migration suivante la remplace. */
const MIGRATIONS = readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort();
const derniere = (motif: string) => {
  const trouvees = MIGRATIONS.filter(f => f.includes(motif));
  if (trouvees.length === 0) return '';
  return lire('supabase/migrations/' + trouvees[trouvees.length - 1]);
};
const MIG_TABLES = derniere('crm_immo_documents_tables');
const MIG_BUCKET = derniere('crm_immo_documents_bucket_prive');
const MIG_RESTORE = derniere('restauration_admet_les_documents');
const MIG_SOCIETE = derniere('refuser_suppression_societe_avec_documents');

console.log('\n=== 1. LES CINQ POINTS DE CABLAGE DE LA SAUVEGARDE ===');
{
  const iDossiers = (RESTORE_ORDER as readonly string[]).indexOf('crm_immo_dossiers');
  t('crm_immo_dossiers est dans l ordre de restauration', iDossiers >= 0);

  for (const table of ['crm_immo_classeurs', 'crm_immo_documents']) {
    t(`${table} : 1/5 sauvegardee`, CRM_TABLE_NAMES.includes(table));
    /* Une table dans CRM_BACKUP_TABLES mais absente de RESTORE_ORDER est sauvegardee
       puis JAMAIS restauree, et le rapport ne la mentionne meme pas. */
    const i = (RESTORE_ORDER as readonly string[]).indexOf(table);
    t(`${table} : 2/5 dans l ordre de restauration, APRES les dossiers`, i > iDossiers && iDossiers >= 0);
    t(`${table} : 3/5 cle primaire declaree`, TABLE_PRIMARY_KEYS[table] === 'id');
    const regles = FK_RULES[table];
    const versDossier = regles?.find(r => r.referencedTable === 'crm_immo_dossiers');
    t(`${table} : 4/5 regle FK vers le dossier, non optionnelle`,
      versDossier !== undefined && versDossier.column === 'dossier_id' && !versDossier.optional);
    /* Le prefixe crm_immo_ est ce qui aiguille vers le RPC qui anonymise : la presence
       dans TABLES_WITH_COMPANY_ID fait entrer la table dans TABLES_CRM_IMMO. */
    t(`${table} : 5/5 company_id reecrit a la restauration`,
      lire('src/pages/admin/views/sauvegarde/useRestoreCrm.ts').includes(`'${table}'`));
    t(`${table} : son nom commence par crm_immo_ (interrupteur de securite)`, table.startsWith('crm_immo_'));
  }

  /* L ORDRE ENTRE LES DEUX : un document reference un classeur. Inverser ferait ecarter
     tout document range dans un classeur, en ne gardant que ceux de la racine — une
     perte PARTIELLE, donc plus difficile a remarquer qu une perte totale. */
  const iClasseurs = (RESTORE_ORDER as readonly string[]).indexOf('crm_immo_classeurs');
  const iDocuments = (RESTORE_ORDER as readonly string[]).indexOf('crm_immo_documents');
  t('les classeurs sont restaures AVANT les documents', iClasseurs >= 0 && iDocuments > iClasseurs);

  /* classeur_id est NULLABLE : NULL veut dire << racine >>. Sans `optional`, tous les
     documents de la racine seraient ecartes comme orphelins. */
  const versClasseur = FK_RULES['crm_immo_documents']?.find(r => r.referencedTable === 'crm_immo_classeurs');
  t('la regle vers le classeur est optionnelle (NULL = racine)',
    versClasseur !== undefined && versClasseur.optional === true);
}

console.log('\n=== 2. LE LIBELLE NE PROMET PAS LES FICHIERS ===');
{
  const doc = CRM_BACKUP_TABLES.find(x => x.name === 'crm_immo_documents');
  t('la table des documents a un libelle', doc !== undefined);
  /* LE POINT QUE DAVID A DEMANDE : << Je ne veux surtout pas afficher une fausse promesse
     disant que les documents sont sauvegardes si les binaires ne le sont pas. >> */
  t('et il dit que les FICHIERS ne sont pas inclus',
    doc !== undefined && /NON inclus|non inclus/.test(doc.label));
  t('et qu il ne s agit que des metadonnees',
    doc !== undefined && /metadonnees|métadonnées/i.test(doc.label));
  t('l onglet Documents le redit la ou on voit les documents',
    /pas les fichiers eux-mêmes/.test(COMPOSANT));
  t('et il porte un repere pour cette note', COMPOSANT.includes('crm-immo-documents-note-sauvegarde'));
  /* crm_immo_acces reste hors de tout : le droit appartient a Talvex. */
  t('TEMOIN : crm_immo_acces reste hors sauvegarde', !CRM_TABLE_NAMES.includes('crm_immo_acces'));
}

console.log('\n=== 3. LA MIGRATION DES TABLES ===');
{
  t('la migration existe', MIG_TABLES !== '');
  /* anon detient INSERT/UPDATE/DELETE/TRUNCATE sur tout le schema : une table sans RLS
     est OUVERTE AU PUBLIC, et rien dans l interface ne le montrerait. */
  t('la RLS est armee sur les classeurs',
    /alter table public\.crm_immo_classeurs enable row level security/.test(MIG_TABLES));
  t('la RLS est armee sur les documents',
    /alter table public\.crm_immo_documents enable row level security/.test(MIG_TABLES));
  t('les deux RLS sont dans la MEME migration que les tables',
    /create table if not exists public\.crm_immo_documents/.test(MIG_TABLES)
    && /enable row level security/.test(MIG_TABLES));

  t('six policies, trois par table', (MIG_TABLES.match(/create policy/g) ?? []).length === 6);
  for (const role of ['admin', 'company_super_admin', 'super_admin']) {
    t(`le role ${role} a sa policy`, MIG_TABLES.includes(`'${role}'`));
  }
  t('les policies Admin et Groupe exigent has_crm_immo_access',
    (MIG_TABLES.match(/has_crm_immo_access/g) ?? []).length >= 4);

  /* created_by DOIT avoir son defaut : crm_immo_dossiers n en a pas, et ses deux lignes
     portent created_by NULL. Copier `dossiers` aurait produit des documents sans auteur. */
  t('created_by porte DEFAULT auth.uid() sur les deux tables',
    (MIG_TABLES.match(/created_by\s+uuid default auth\.uid\(\)/g) ?? []).length === 2);

  t('la cle etrangere vers le dossier est COMPOSEE sur les classeurs',
    /foreign key \(dossier_id, company_id\)[\s\S]{0,120}?crm_immo_dossiers \(id, company_id\)/.test(MIG_TABLES));
  t('et sur les documents aussi',
    (MIG_TABLES.match(/foreign key \(dossier_id, company_id\)/g) ?? []).length === 2);
  t('la cle vers le classeur est composee elle aussi',
    /foreign key \(classeur_id, company_id\)/.test(MIG_TABLES));

  /* Un UNIQUE qui ne commence pas par company_id est un ORACLE DE CONTENU entre
     Societes : verifie hors RLS et avant la FK, il rend 23505 si la valeur est prise
     chez la voisine et 23503 sinon. Defaut reellement survenu sur crm_immo_etats. */
  const uniques = [...MIG_TABLES.matchAll(/unique(?: index[^(]*)? \(([^)]+)\)/g)].map(m => m[1].trim());
  t('des index uniques sont declares', uniques.length >= 3);
  t('AUCUN unique ne commence par autre chose que company_id ou id',
    uniques.every(u => u.startsWith('company_id') || u.startsWith('id, company_id')));

  /* Un index PARTIEL n est pas utilisable en on_conflict depuis supabase-js : PostgREST
     emet ON CONFLICT (colonnes) sans predicat, qui n infere aucun index partiel. */
  t('AUCUN index partiel', !/create unique index[\s\S]{0,200}?\bwhere\b/i.test(MIG_TABLES));

  t('la limite de 15 Mo est posee en base aussi', MIG_TABLES.includes('15728640'));
  t('le statut est borne a trois valeurs',
    /statut in \('en_cours', 'pret', 'suppression'\)/.test(MIG_TABLES));
  /* set_updated_at() existe deja et est durcie : on la REUTILISE plutot que d ajouter
     deux fonctions quasi identiques. */
  t('updated_at reutilise la fonction existante',
    (MIG_TABLES.match(/execute function public\.set_updated_at\(\)/g) ?? []).length === 2);
}

console.log('\n=== 4. LE BUCKET EST PRIVE, ET IL N Y A PAS D URL PUBLIQUE ===');
{
  t('la migration du bucket existe', MIG_BUCKET !== '');
  t('le bucket est cree avec public = false',
    /values \(\s*'crm-immo-documents',\s*'crm-immo-documents',\s*false,/.test(MIG_BUCKET));
  /* La migration est rejouable : un bucket deja present doit etre REMIS a false, sinon
     une execution sur un bucket rendu public par megarde le laisserait public. */
  t('et un conflit le remet a false', /on conflict \(id\) do update[\s\S]{0,120}?public\s*= false/.test(MIG_BUCKET));
  t('la limite du bucket est la meme que celle de la table', MIG_BUCKET.includes('15728640'));

  /* Un SVG ouvert par URL signee executerait ses scripts, dans une origine qui porte la
     session de l utilisateur. */
  t('SVG est ABSENT de la liste de types', !MIG_BUCKET.includes('svg'));
  t('PDF, JPEG, PNG, HEIC et DOCX sont acceptes',
    ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'wordprocessingml']
      .every(m => MIG_BUCKET.includes(m)));

  t('quatre policies, une par commande', (MIG_BUCKET.match(/create policy/g) ?? []).length === 4);
  for (const cmd of ['for select', 'for insert', 'for update', 'for delete']) {
    t(`une policy ${cmd}`, MIG_BUCKET.includes(cmd));
  }
  /* AUCUNE policy pour le role `public` : c est LA difference avec les sept buckets
     existants, dont le SELECT est ouvert a tous. */
  t('AUCUNE policy n est accordee au role public',
    !/create policy[\s\S]{0,200}?to public/.test(MIG_BUCKET));
  /* Je compte les POLICIES, et non les occurrences de la chaine : la migration porte
     aussi un `grant execute ... to authenticated` sur la fonction d acces, qui n'est pas
     une policy. Compter brut donnait 5, et faisait echouer une assertion juste. */
  t('les quatre sont reservees a authenticated',
    (MIG_BUCKET.match(/on storage\.objects for \w+ to authenticated/g) ?? []).length === 4);
  /* Sans WITH CHECK sur l UPDATE, un renommage d objet pourrait le faire SORTIR du
     dossier de sa Societe. */
  t('l UPDATE porte USING et WITH CHECK',
    /for update to authenticated\s*\n\s*using[\s\S]{0,200}?with check/.test(MIG_BUCKET));

  t('la fonction d acces ne caste jamais une entree libre avant de la valider',
    /!~ '\^\[0-9a-fA-F\]\{8\}/.test(MIG_BUCKET));
  t('elle lit bien le PREMIER segment du chemin',
    /\(storage\.foldername\(p_chemin\)\)\[1\]/.test(MIG_BUCKET));
  /* Supabase accorde EXECUTE a anon par privileges par defaut : un REVOKE FROM PUBLIC
     seul ne suffit pas. */
  t('EXECUTE est retire a anon', /revoke all on function public\.crm_immo_chemin_autorise\(text\) from anon/.test(MIG_BUCKET));
  t('et accorde a authenticated', /grant execute on function public\.crm_immo_chemin_autorise\(text\) to authenticated/.test(MIG_BUCKET));
}

console.log('\n=== 5. LA RESTAURATION ADMET LES DEUX TABLES ===');
{
  t('la migration existe', MIG_RESTORE !== '');
  /* La liste blanche est ECRITE EN DUR dans le corps de la fonction, et un nom hors
     liste leve TLV05 AVANT toute ecriture. */
  const listeBlanche = /p_table not in \(([\s\S]*?)\) then/i.exec(MIG_RESTORE);
  t('la liste blanche existe', listeBlanche !== null);
  t('et elle contient les deux nouvelles tables',
    listeBlanche !== null
    && listeBlanche[1].includes("'crm_immo_classeurs'")
    && listeBlanche[1].includes("'crm_immo_documents'"));
  t('et elle garde les six anciennes',
    listeBlanche !== null
    && ['dossiers', 'colonnes', 'etats', 'commentaires', 'contrats', 'loyers']
      .every(n => listeBlanche![1].includes(`'crm_immo_${n}'`)));
  /* LE CONTEXTE ARMANT : la liste ne sert a rien si le RAISE a disparu. */
  t('un nom hors liste leve bien TLV05', /raise exception 'Table hors du périmètre[\s\S]{0,80}?TLV05/i.test(MIG_RESTORE));

  /* Sans entree dans v_identites, la branche ELSE ne leve AUCUNE erreur : le defaut
     auth.uid() s applique et attribue tous les documents a celui qui restaure. */
  const identites = /v_identites := case p_table([\s\S]*?)end;/i.exec(MIG_RESTORE);
  t('le CASE des identites existe', identites !== null);
  t('les classeurs y declarent created_by',
    identites !== null && /when 'crm_immo_classeurs'\s*then array\['created_by'\]/i.test(identites[1]));
  t('les documents aussi',
    identites !== null && /when 'crm_immo_documents'\s*then array\['created_by'\]/i.test(identites[1]));
  t('la fonction reste SECURITY INVOKER (la RLS s applique)', /security invoker/i.test(MIG_RESTORE));
}

console.log('\n=== 6. UNE SOCIETE AVEC DES DOCUMENTS NE SE SUPPRIME PAS ===');
{
  t('la migration existe', MIG_SOCIETE !== '');
  t('le declencheur est BEFORE DELETE (la cascade n a pas encore efface)',
    /before delete on public\.companies/.test(MIG_SOCIETE));
  t('il compte les documents de la Societe',
    /from public\.crm_immo_documents[\s\S]{0,80}?company_id = old\.id/.test(MIG_SOCIETE));
  t('et il refuse avec le message exact demande',
    MIG_SOCIETE.includes('Cette société possède encore des documents CRM Immo.')
    && MIG_SOCIETE.includes('Supprimez ou archivez d'));
  t('le code d erreur est nomme', /errcode = 'TLV06'/.test(MIG_SOCIETE));
  /* SECURITY DEFINER volontaire : un garde-fou que la RLS peut aveugler n en est pas un.
     La fonction ne prend aucun parametre, donc elle ne peut pas servir d oracle. */
  t('la fonction est SECURITY DEFINER', /security definer/.test(MIG_SOCIETE));
  t('et ses droits sont retires a anon', /revoke all on function[\s\S]{0,120}?from anon/.test(MIG_SOCIETE));
}

console.log('\n=== 7. L ONGLET EST BRANCHE DANS LA MODALE EXISTANTE ===');
{
  const declaration = /export type OngletDetails =([^;]+);/.exec(MODALE);
  t("'documents' est une valeur d onglet", declaration !== null && /'documents'/.test(declaration[1]));
  t('il figure dans la barre d onglets', /\{ cle: 'documents', libelle: 'Documents'/.test(MODALE));
  t('il a son panneau', /onglet === 'documents' &&[\s\S]{0,60}?<CrmImmoDocuments/.test(MODALE));
  t('le panneau recoit l etat du hook', /<CrmImmoDocuments etat=\{documents\}/.test(MODALE));
  /* David : << Ne crée pas un deuxième modal Détails. >> */
  t('il n y a toujours qu UNE modale Details',
    (lire('src/pages/admin/views/CrmImmo.tsx').match(/<CrmImmoDetailsModal/g) ?? []).length === 1);

  /*
   * ---------- LA BARRE D ONGLETS : UNE GRILLE SOUS md, UNE RANGEE AU-DESSUS ----------
   *
   * Mesure AVANT correctif, a 360 px : les quatre onglets faisaient 564 px de contenu
   * dans 358 px de barre. << Échéancier loyers >> finissait a 442 px et << Documents >>
   * a 564 — tous deux hors ecran. Le defilement existait mais rien ne l'annoncait : un
   * onglet qu'on ne sait pas atteindre n'existe pas.
   *
   * ---------- COMMENT CE BLOC EST ANCRE, ET POURQUOI AINSI ----------
   *
   * On trouve les elements par leur ROLE — role="tablist", role="tab" — et jamais par un
   * prefixe de leurs classes. La version precedente de ce bloc s'ancrait sur
   * `inline-flex items-center justify-center...` : quand ce prefixe changeait, l'ancre
   * rendait la chaine VIDE, et l'assertion qui gardait la propriete centrale du
   * correctif — << rien n'empeche le libelle de s'enrouler >> — devenait une negation
   * sur chaine vide, donc VERTE. Elle ne gardait plus rien en annoncant le contraire.
   *
   * D'ou la regle que ce bloc s'impose : TOUTE assertion NEGATIVE est conjointe a
   * `mesurable`.
   *
   * ET VOICI CE QUE `mesurable` COUVRE EXACTEMENT, parce qu'une garantie survendue est
   * elle-meme un mensonge : une premiere version ne verifiait que << la capture n'est pas
   * VIDE >>, ce qui laissait passer une capture TRONQUEE. baliseOuvrante s'arrete au
   * premier `>` qui ne suit pas un `=` ; un attribut contenant un chevron — par exemple
   * title={nombre > 0 ? 'a' : 'b'} — coupe donc la balise en plein milieu, la capture
   * reste non vide, et une negation posee dessus repasse au vert. Mesure : capture tombee
   * de 591 a 546 caracteres, `mesurable` encore VRAI.
   *
   * `mesurable` exige donc la COMPLETUDE et non la seule presence : la balise doit se
   * terminer par `>` et porter les cinq attributs qu'on sait qu'elle a. Une capture
   * tronquee en perd au moins un, et le bloc rougit.
   */
  const barres = balisesAvec(CODE_MODALE, 'div', /role="tablist"/);
  t('exactement une balise porte role="tablist"', barres.length === 1);
  const barre = barres[0] ?? '';

  const onglets = balisesAvec(CODE_MODALE, 'button', /role="tab"/);
  t('exactement un gabarit de bouton porte role="tab"', onglets.length === 1);
  const onglet = onglets[0] ?? '';
  t('ce bouton annonce son etat au lecteur d ecran', /aria-selected=\{actif\}/.test(onglet));

  /* Le gabarit de classes est lu SUR le bouton role="tab" lui-meme : la propriete testee
     et l'element teste ne peuvent donc pas se desolidariser. */
  const gabarit = /className=\{`([^`]*)\$\{actif \? ONGLET_ACTIF : ONGLET_INACTIF\}`\}/.exec(onglet);
  t('ses classes sortent du gabarit et des deux constantes d indicateur', gabarit !== null);
  const base = gabarit?.[1] ?? '';

  /** Une balise est exploitable si elle est COMPLETE, pas seulement non vide. */
  const complete = (b: string, attendus: RegExp[]) =>
    b.endsWith('>') && attendus.every(a => a.test(b));

  const mesurable =
    complete(barre, [/role="tablist"/, /className="/, /style=\{\{/, /borderBottom/, /--onglet-trait/])
    && complete(onglet, [/role="tab"/, /aria-selected=\{actif\}/, /data-testid=/, /className=\{`/, /style=\{\{/])
    && base !== '';
  t('TEMOIN : les deux balises sont COMPLETES, pas seulement non vides', mesurable);

  /* ---------- LA BARRE ---------- */
  /* `/\bgrid\b/` ne vaut RIEN ici : la frontiere de mot tombe sur le tiret de
     `grid-cols-2` et sur le deux-points de `md:grid`, donc elle est deja impliquee par
     l'assertion de colonnes, et elle laissait passer un `grid` prefixe. Mutant mesure :
     `grid` -> `md:grid` rendait 36 OK / 0 ECHEC alors que la grille mobile disparaissait
     et que les quatre boutons s'enroulaient en lignes irregulieres — exactement le choix
     produit detruit, sous une assertion qui s'intitule << sous md >>.
     `/["\s]grid\s/` exige le display NU, premier de la chaine de classes. */
  t('sous md la barre porte le display grid, SANS prefixe', /["\s]grid\s/.test(barre));
  t('et il n est pas reporte a un palier', mesurable && !/\b(sm|md|lg|xl):grid\b/.test(barre));
  t('la grille a DEUX colonnes', /grid-cols-2/.test(barre));
  t('et elle redevient une rangee a partir de md', /md:flex/.test(barre));
  t('la rangee de md peut defiler si besoin', /md:overflow-x-auto/.test(barre));
  t('sans barre de defilement visible', /no-scrollbar/.test(barre));
  /* La frontiere du module est md, pas sm : theme.test.ts exige `hidden md:block` sur le
     tableau et `md:hidden` sur les fiches. Un `sm:` ici remettrait les fiches mobiles
     sous une barre deja en rangee bureau, dans une bande que rien ne mesure. */
  t('aucun prefixe sm: ne subsiste sur la barre', mesurable && !/\bsm:/.test(barre));

  /* ---------- LE BOUTON ---------- */
  t('un onglet fait au moins 44 px au doigt, meme enroule', /max-md:min-h-\[44px\]/.test(base));
  /* La cible tactile est prefixee partout ailleurs dans le module : sans prefixe, elle
     epaissirait aussi la rangee de bureau, et le garde cibleTactile ne la voit pas. */
  t('et cette cible ne vaut QUE sous md', mesurable && !/(^|\s)min-h-\[44px\]/.test(base));
  t('les quatre cases reservent leur bordure, donc rien ne saute', /max-md:border(\s|$)/.test(base));
  t('le bord bas de 2 px n existe qu a partir de md', /md:border-b-2/.test(base));
  t('son libelle est centre dans sa case sous md', /justify-center/.test(base) && /text-center/.test(base));
  /* LE POINT : sous md le libelle doit pouvoir s'enrouler. Un whitespace-nowrap sans
     prefixe le ferait sortir de sa case au lieu de passer a la ligne. */
  t('rien n empeche le libelle de s enrouler sous md',
    mesurable && !/(^|\s)whitespace-nowrap/.test(base));
  t('mais il garde sa largeur naturelle en rangee',
    /md:whitespace-nowrap/.test(base) && /md:shrink-0/.test(base));
  t('aucun prefixe sm: ne subsiste sur l onglet', mesurable && !/\bsm:/.test(base));

  /* ---------- L INDICATEUR D ONGLET ACTIF ---------- */
  /* En grille, un bord bas ne touche pas le panneau pour les onglets de la PREMIERE
     ligne : il flotte au milieu de la barre et se lit comme un soulignement de l'onglet
     du dessous. Mesure a 360 px avant correction : y=54 dans une barre de 105 px. Sous
     md l'onglet actif est donc marque comme une CASE, et par un bord bas au-dessus. */
  const defActif = /const ONGLET_ACTIF =\s*'([^']*)';/.exec(CODE_MODALE);
  const defInactif = /const ONGLET_INACTIF =\s*'([^']*)';/.exec(CODE_MODALE);
  t('les deux constantes d indicateur sont trouvees', defActif !== null && defInactif !== null);
  const actifCls = defActif?.[1] ?? '';
  const inactifCls = defInactif?.[1] ?? '';
  const indicateurMesurable = actifCls !== '' && inactifCls !== '';
  t('TEMOIN : les deux constantes ont rendu du texte', indicateurMesurable);

  t('sous md, l onglet actif porte une teinte de fond',
    /max-md:bg-\[color:var\(--onglet-fond\)\]/.test(actifCls));
  /* La bordure porte --onglet-trait, donc accent.solid, et NON tab.activeBorder : mesure
     du contraste de la bordure contre le fond de modale sur les seize themes, plancher
     maison 3:1 — tab.activeBorder descend a 1,10 sur talixy (invisible, contre 6,85 pour
     le lisere d'avant) et a 2,10 sur highlevel_emerald ; accent.solid ne passe sous le
     plancher que sur highlevel_emerald, ou c'etait DEJA le cas. */
  t('et une bordure complete, non un simple bord bas',
    /max-md:border-\[color:var\(--onglet-trait\)\]/.test(actifCls));
  t('LE POINT : la bordure n emprunte pas tab.activeBorder, invisible sur talixy',
    indicateurMesurable && !/--onglet-bord/.test(actifCls) && !/activeBorder/.test(CODE_MODALE));
  t('LE POINT : sous md, aucun bord bas ne sert d indicateur',
    indicateurMesurable && !/(^|\s)border-b/.test(actifCls) && !/max-md:border-b/.test(actifCls));
  t('a partir de md, le lisere revient', /md:border-b-\[color:var\(--onglet-trait\)\]/.test(actifCls));
  t('un onglet inactif ne montre ni teinte ni bordure',
    /max-md:border-transparent/.test(inactifCls) && /md:border-b-transparent/.test(inactifCls));
  t('et il ne porte aucun fond', indicateurMesurable && !/\bbg-/.test(inactifCls));

  /* Les deux couleurs passent par des variables CSS parce qu'un style inline gagnerait
     contre le `md:` : si quelqu'un remet borderBottom dans le style du bouton, aucune
     classe ne pourra plus le reprendre, et le defaut revient en silence. */
  t('les deux variables sont posees sur la barre',
    /--onglet-fond': t\.tab\.activeBg/.test(CODE_MODALE)
    && /--onglet-trait': t\.accent\.solid/.test(CODE_MODALE));
  t('LE POINT : le style du bouton ne pose plus de borderBottom',
    mesurable && !/borderBottom/.test(onglet));
  t('il n y porte plus que la couleur du texte',
    /style=\{\{ color: actif \? t\.accent\.text : t\.text\.secondary \}\}/.test(onglet));

  /* Dans une case etroite, une icone ou une pastille sans shrink-0 se fait ecraser. */
  t('l icone ne se fait pas ecraser', /<Icone className="w-4 h-4 shrink-0" \/>/.test(CODE_MODALE));
  t('la pastille de compteur non plus',
    /min-w-\[18px\] h-\[18px\][^"]*shrink-0/.test(CODE_MODALE));
}

console.log('\n=== 8. L INTERFACE MOBILE ET BUREAU ===');
{
  /*
   * capture rend le champ CAMERA-SEULE : un bouton unique empecherait d envoyer une
   * photo deja prise. Il en faut donc deux, et c est aussi ce que David a demande.
   *
   * MIS A L EPREUVE LE 23 OCTOBRE 2026, et confirme. David voulait retirer le second
   * bouton sur telephone. Or c est le SEUL chemin, depuis un telephone, pour envoyer un
   * PDF recu par courriel, un DOC, ou une photo DEJA rangee dans la galerie : le champ
   * photo, lui, n ouvre que l appareil. Le bouton a donc ete RENOMME << Choisir un
   * fichier >> et mis au meme rang que la photo, au lieu d etre supprime.
   *
   * L assertion ci-dessous ne garde pas un libelle par gout : elle garde la CAPACITE.
   * Si le second champ disparait, le telephone perd l envoi de PDF.
   */
  t('un champ de capture camera existe', /capture="environment"/.test(COMPOSANT));
  t('et un champ de fichier separe', COMPOSANT.includes('crm-immo-documents-champ-fichier'));
  t('les deux boutons sont distincts',
    COMPOSANT.includes('crm-immo-documents-photo') && COMPOSANT.includes('crm-immo-documents-fichier'));
  t('le bouton photo est libelle en clair', /Prendre une photo/.test(COMPOSANT));
  t('le bouton fichier aussi', /Choisir un fichier/.test(COMPOSANT));
  /* LE POINT : le champ qui n a PAS de capture doit accepter autre chose que des
     images, sinon le PDF reste impossible malgre le bouton. */
  t('le champ sans capture accepte le PDF et le DOC',
    /ACCEPT_DOCUMENT = 'image\/\*,application\/pdf,\.doc,\.docx'/.test(lire('src/lib/crmImmoDocuments.ts')));

  /* ---- L EQUILIBRE DES DEUX ENTREES DE FICHIER ---- */
  const defBoutonFichier = /const boutonFichier = '([^']*)';/.exec(CODE_COMPOSANT);
  const defBoutonRanger = /const boutonRanger = '([^']*)';/.exec(CODE_COMPOSANT);
  t('les deux gabarits de bouton sont trouves', defBoutonFichier !== null && defBoutonRanger !== null);
  const clsFichier = defBoutonFichier?.[1] ?? '';
  const clsRanger = defBoutonRanger?.[1] ?? '';
  const gabaritsMesurables = clsFichier !== '' && clsRanger !== '';
  t('TEMOIN : les deux gabarits ont rendu du texte', gabaritsMesurables);

  t('les deux entrees de fichier partagent la ligne a parts egales sous md',
    /max-md:flex-1/.test(clsFichier) && /max-md:basis-0/.test(clsFichier));
  t('elles font 44 px au doigt', /max-md:min-h-\[44px\]/.test(clsFichier));
  /* Dans une demi-largeur a 320 px, le libelle doit pouvoir s enrouler et AGRANDIR le
     bouton. Un whitespace-nowrap sans prefixe le ferait deborder de sa case. */
  t('leur libelle peut s enrouler sous md',
    gabaritsMesurables && !/(^|\s)whitespace-nowrap/.test(clsFichier));
  t('mais garde sa largeur naturelle a partir de md', /md:whitespace-nowrap/.test(clsFichier));
  t('et les deux boutons emploient le MEME gabarit',
    (CODE_COMPOSANT.match(/className=\{boutonFichier\}/g) ?? []).length === 2);

  t('<< Nouveau dossier >> est au second rang', /text-xs/.test(clsRanger) && /px-3 py-2/.test(clsRanger));
  t('il prend sa propre ligne sous md', /max-md:basis-full/.test(clsRanger));
  t('et reste touchable malgre tout', /max-md:min-h-\[44px\]/.test(clsRanger));
  t('les deux champs acceptent plusieurs fichiers',
    (COMPOSANT.match(/multiple/g) ?? []).length === 2);
  /* Le glisser-deposer de FICHIERS est nouveau dans le projet : le seul existant sert a
     reordonner des elements. */
  t('le glisser-deposer est servi sur bureau', /dataTransfer\.files/.test(CODE_COMPOSANT));

  /* PAS DE POURCENTAGE : supabase-js televerse par fetch, sans onUploadProgress. */
  t('la progression est un compteur d etapes', /fichier \{etat\.envoi\.fait \+ 1\} sur \{etat\.envoi\.total\}/.test(COMPOSANT));
  t('TEMOIN : aucun pourcentage de progression n est affiche',
    !/progress|pourcent|%\}/i.test(CODE_COMPOSANT.replace(/etat\.envoi/g, '')));
  t('le bouton est desactive pendant l envoi', /disabled=\{etat\.envoi\.enCours\}/.test(COMPOSANT));
}

console.log('\n=== 9. AUCUNE URL PUBLIQUE, JAMAIS ===');
{
  /* Sur un bucket prive, getPublicUrl ne leve AUCUNE erreur et rend une URL bien formee
     qui echoue seulement au rendu : le defaut paraitrait venir de l envoi. */
  t('getPublicUrl n apparait PAS dans le hook', !/getPublicUrl/.test(CODE_HOOK));
  t('ni dans le composant', !/getPublicUrl/.test(CODE_COMPOSANT));
  t('les lectures passent par createSignedUrl', /createSignedUrl\(/.test(CODE_HOOK));
  t('et les miniatures par un appel groupe', /createSignedUrls\(/.test(CODE_HOOK));
  t('la duree de validite est courte', /SECONDES_URL_SIGNEE = 120/.test(HOOK));
  t('aucune URL n est enregistree en base', !/url.*:.*signedUrl/i.test(CODE_HOOK.replace(/signedUrl \?\? null/, '')));
}

console.log('\n=== 10. L ORDRE DES ECRITURES ===');
{
  /* A LA CREATION : la ligne d abord. L autorisation est ainsi tranchee AVANT que les
     octets ne bougent, et la compensation — supprimer une ligne qu on vient de creer —
     est bien plus fiable que supprimer un objet sur un reseau mobile defaillant. */
  const iInsert = CODE_HOOK.indexOf(".from('crm_immo_documents')\n          .insert(");
  const iUpload = CODE_HOOK.indexOf('.upload(chemin');
  t('la ligne est creee AVANT l envoi des octets', iInsert > 0 && iUpload > iInsert);
  t('la ligne nait en statut en_cours', /statut: 'en_cours'/.test(CODE_HOOK));
  t('puis passe a pret', /statut: 'pret'/.test(CODE_HOOK));
  /* COMPENSATION : si l envoi echoue, la ligne repart. */
  t('un envoi echoue retire la ligne creee',
    /erreurEnvoi[\s\S]{0,400}?\.delete\(\)\s*\.eq\('id', id\)/.test(CODE_HOOK));

  /* A LA SUPPRESSION : intention, octets, ligne. Seul ordre dont l etat residuel soit
     visible ET convergent. L inverse laisserait un fichier orphelin invisible. */
  /*
   * On ancre sur l'ECRITURE, et non sur la chaine : une premiere version cherchait
   * `statut: 'suppression'` n'importe ou dans le fichier, et la mise a jour OPTIMISTE de
   * l'etat local la contient aussi. Remplacer le statut ecrit en base par 'pret' laissait
   * donc l'assertion verte — mutation survivante, trouvee en la provoquant.
   */
  const iMarque = CODE_HOOK.indexOf(".update({ statut: 'suppression' })");
  const iRemove = CODE_HOOK.indexOf('.remove([vise.chemin])');
  const iDelete = CODE_HOOK.indexOf(".delete()\n      .eq('id', id)");
  t('l intention de suppression est ECRITE EN BASE d abord', iMarque > 0);
  t('les octets partent ensuite', iRemove > iMarque && iMarque > 0);
  t('la ligne part en dernier', iDelete > iRemove && iRemove > 0);
  /*
   * Les quatre appels a remove() deja presents dans le projet IGNORENT leur resultat :
   * c'est la facon de fabriquer un orphelin sans le savoir.
   *
   * On COMPTE les deux cotes au lieu de chercher une paire : une premiere version visait
   * << un destructuring suivi d'un if >> sans ancrer la fonction, et elle trouvait la
   * paire de retirerDocumentsAvantSuppression meme apres avoir neutralise celle de
   * supprimer. Mutation survivante, trouvee en la provoquant. Il y a deux retraits dans
   * ce fichier — la suppression d'un document et le nettoyage avant suppression d'un
   * dossier — et les DEUX doivent lire leur resultat.
   */
  const retraits = (CODE_HOOK.match(/error: erreurStorage \}/g) ?? []).length;
  const gardes = (CODE_HOOK.match(/if \(erreurStorage\)/g) ?? []).length;
  t('le retrait d un document nomme son erreur', retraits >= 1);
  t('et CHAQUE retrait nomme lit son resultat', gardes === retraits && retraits > 0);
  /* Le second retrait du module — le nettoyage avant suppression d'un dossier — vit
     desormais dans l'adaptateur, sous une autre forme. Il est verifie en section 11, et
     on s'assure ici qu'il n'en reste pas un troisieme, muet, dans ce fichier. */
  t('aucun appel a remove() ne reste sans lecture de son resultat',
    (CODE_HOOK.match(/\.remove\(/g) ?? []).length
      === (CODE_HOOK.match(/\.remove\([\s\S]{0,180}?error/g) ?? []).length);

  /* Une ecriture refusee par la RLS rend { error: null } et ZERO ligne. */
  t('chaque ecriture finit par un .select()',
    (CODE_HOOK.match(/\.select\(/g) ?? []).length >= 8);
  t('et zero ligne est traite comme un refus',
    (CODE_HOOK.match(/droits insuffisants/g) ?? []).length >= 4);
}

console.log('\n=== 11. LA SUPPRESSION D UN DOSSIER PASSE PAR LA SEQUENCE MESURABLE ===');
{
  const DOSSIERS = sansCommentaires(lire(D + 'useCrmImmoDossiers.ts'));
  const SEQ = sansCommentaires(lire('src/lib/crmImmoSuppressionDossier.ts'));

  t('le hook des dossiers delegue a la sequence',
    /supprimerDossiersEtLeursDocuments\(ids, operationsSuppressionDossier\(\)\)/.test(DOSSIERS));
  /* LE POINT : le hook ne supprime PLUS lui-meme. S il le faisait en plus, il y aurait
     deux chemins, et un seul serait mesure. */
  t('et il ne supprime plus les dossiers lui-meme',
    !/from\('crm_immo_dossiers'\)[\s\S]{0,40}?\.delete\(\)/.test(DOSSIERS));

  /* La sequence vit dans src/lib pour etre testable : dans le dossier du hook elle
     tirerait src/lib/supabase, qui lit import.meta.env. */
  t('la sequence ne connait pas Supabase', !/supabase/i.test(SEQ));
  t('ses quatre operations sont injectees',
    ['lister', 'marquer', 'demarquer', 'retirerDuStockage', 'supprimerDossiers']
      .every(o => new RegExp(o + ':').test(SEQ)));

  /* L ORDRE, et c est tout le sujet : marquer AVANT de detruire. */
  const iMarquer = SEQ.indexOf('await ops.marquer(');
  const iRetirer = SEQ.indexOf('await ops.retirerDuStockage(');
  const iSupprimer = SEQ.indexOf('await ops.supprimerDossiers(dossierIds);\n  if (fin.error');
  t('le marquage precede le retrait des octets', iMarquer > 0 && iRetirer > iMarquer);
  t('et le retrait precede la suppression du dossier', iSupprimer > iRetirer && iRetirer > 0);
  /* Un retrait echoue remet les fiches comme elles etaient. */
  t('un retrait echoue declenche un retour en arriere',
    /retrait\.error !== null\) \{[\s\S]{0,200}?ops\.demarquer\(/.test(SEQ));
  /* Et l etat residuel du scenario de David est ANNONCE. */
  t('une base qui echoue apres Storage annonce une reprise',
    /supprimees: fin\.supprimees, reprisePossible: true/.test(SEQ));
  t('et le message invite a relancer', /Relancez la suppression/.test(SEQ));

  const ADAPT = sansCommentaires(CODE_HOOK);
  t('l adaptateur lit le resultat de remove()', /retirerDuStockage:[\s\S]{0,260}?error: error \? error\.message : null/.test(ADAPT));
  t('la lecture des documents a retirer est paginee', /lister:[\s\S]{0,200}?lireToutesLesLignes/.test(ADAPT));
  t('l adaptateur demarque uniquement ce qui etait marque',
    /demarquer:[\s\S]{0,300}?\.eq\('statut', 'suppression'\)/.test(ADAPT));
}

console.log('\n=== 12. LES OCTETS SONT VERIFIES AVANT L ENVOI ===');
{
  /* David : << Le Content-Type envoyé par le navigateur n'est pas une frontière de
     sécurité. >> Supabase ne compare que le type ANNONCE, jamais le contenu. */
  /*
   * CE SONT LES OCTETS QUI DISENT LE TYPE, et non le nom.
   *
   * Le cas qui l'impose : un iPhone peut livrer un JPEG en gardant le nom .HEIC avec un
   * file.type vide. Deduire le type de l'extension ferait REFUSER un fichier valide, et
   * un faux refus fait perdre un document — l'inverse exact de ce qu'on cherche.
   */
  t('le type est lu dans les octets', /typeDesOctets\(debut, fin\)/.test(CODE_HOOK));
  t('et c est lui qui est retenu', /const type = lu\.type;/.test(CODE_HOOK));
  const iLecture = CODE_HOOK.indexOf('typeDesOctets(');
  const iInsert = CODE_HOOK.indexOf(".from('crm_immo_documents')\n          .insert(");
  const iUpload = CODE_HOOK.indexOf('.upload(chemin');
  t('cette lecture precede la creation de la ligne', iLecture > 0 && iInsert > iLecture);
  t('donc, a plus forte raison, l envoi des octets', iUpload > iLecture);
  /* Des octets meconnaissables sont refuses, avec le mot du type ANNONCE pour que le
     message parle a l'utilisateur. */
  t('des octets meconnaissables sont refuses',
    /if \(lu\.type === ''\) \{[\s\S]{0,400}?continue;/.test(CODE_HOOK));
  t('et le refus est formule avec le type annonce',
    /problemeDeSignature\(annonce, lu\.debut, lu\.fin\)/.test(CODE_HOOK));
  /* Un desaccord entre le nom et le contenu n est pas corrige en douce : il est DIT. */
  t('un desaccord nom/contenu est signale, pas tu',
    /type !== annonce\) \{[\s\S]{0,200}?soucis\.push/.test(CODE_HOOK));
  t('un refus interrompt CE fichier et continue avec les suivants',
    (CODE_HOOK.match(/soucis\.push[\s\S]{0,120}?continue;/g) ?? []).length >= 3);

  /* Les deux bouts sont lus : la tete pour la signature, la fin pour le catalogue ZIP
     d un DOCX. Ne lire que la tete rendrait indetectable un ZIP quelconque renomme. */
  t('la tete du fichier est lue', /slice\(0, OCTETS_DEBUT\)/.test(CODE_HOOK));
  t('et la fin aussi, pour le catalogue d un DOCX', /slice\(fichier\.size - OCTETS_FIN\)/.test(CODE_HOOK));
  t('un fichier devenu illisible est refuse, pas avale',
    /n’a pas pu être lu/.test(HOOK));
  /* Ce n est PAS un antivirus, et le code doit le dire plutot que de le laisser croire. */
  t('le code dit que ce n est pas un antivirus', /antivirus/i.test(lire('src/lib/crmImmoDocuments.ts')));
}

console.log('\n=== 13. LA CONVERSION NE PERD JAMAIS UN FICHIER ===');
{
  t('l orientation EXIF est demandee explicitement', /imageOrientation: 'from-image'/.test(CONVERSION));
  t('le garde-fou verifie le resultat produit', /porteDuContenu\(jpeg\)/.test(CONVERSION));
  t('et il mesure l etendue sur une reduction 32x32', /32, 32/.test(CONVERSION));
  /* Dans les trois modes d echec — exception, toBlob nul, canvas blanc — on rend
     l ORIGINAL intact. */
  t('un decodage impossible rend l original', /catch \{[\s\S]{0,300}?return heif/.test(CONVERSION));
  t('un toBlob nul rend l original', /jpeg === null \|\| jpeg\.size === 0\) return intact/.test(CONVERSION));
  t('un canvas vide rend l original', /!\(await porteDuContenu\(jpeg\)\)\)[\s\S]{0,200}?intact/.test(CONVERSION));
  t('et l utilisateur en est AVERTI', (CONVERSION.match(/avertissement:/g) ?? []).length >= 3);
  t('le type d origine est conserve pour pouvoir le dire', /typeOrigine: type/.test(CONVERSION));
  t('aucune bibliotheque HEIC n est importee', !/heic2any|libheif/.test(CONVERSION));
  const pkg = lire('package.json');
  t('TEMOIN : et aucune n est installee', !/heic2any|libheif|heic-decode|wasm-heif/.test(pkg));
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
