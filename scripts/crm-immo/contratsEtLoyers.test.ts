/**
 * Tests de garde : LES PERIODES DE CONTRAT ET LES ENCAISSEMENTS.
 * Lancer :  npx tsx scripts/crm-immo/contratsEtLoyers.test.ts
 *
 * ---------- CE QUE CES GARDES TIENNENT ----------
 *
 * Deux tables sont nees le 22 octobre 2026, et presque tout leur comportement repose sur
 * des details de schema qu'un refactor peut effacer sans rien casser de visible :
 *
 *   - deux INDEX PARTIELS, qui portent << une seule periode active >> et << un seul
 *     encaissement actif >>. Retirer leur clause WHERE ne casse aucun test d'interface,
 *     et pourtant la premiere annulation devient impossible ;
 *   - `company_id` EN TETE de ces index, sans quoi leur 23505 repond a travers les
 *     cloisons et dit a une Societe voisine qu'une ligne existe ;
 *   - le REVOKE sur trois fonctions, dont deux en SECURITY DEFINER ;
 *   - la regle stricte des alertes de loyer, et la colonne qu'elle exige.
 *
 * Les relevés RLS, eux, se font en base — ils ne peuvent pas vivre ici. Ce fichier tient
 * ce qui se lit dans le code.
 */
import { readFileSync, readdirSync } from 'node:fs';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

const lire = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const code = (p: string) => lire(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*(--|\/\/).*$/gm, '');

/* La migration est retrouvee par son NOM, pas par sa date : le registre Supabase impose
   son propre horodatage, et le fichier est renomme pour coller. */
const MIGRATIONS = 'supabase/migrations';
const nomMigration = readdirSync(MIGRATIONS).find(f => f.endsWith('_create_crm_immo_contrats_et_loyers.sql'));
const sql = nomMigration ? readFileSync(MIGRATIONS + '/' + nomMigration, 'utf8') : '';
const sqlNu = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*--.*$/gm, '');

console.log('\n=== 1. LA MIGRATION EXISTE ET POSE LES DEUX TABLES ===');
{
  t('la migration est trouvable', nomMigration !== undefined);
  t('crm_immo_contrats est creee', /CREATE TABLE public\.crm_immo_contrats/.test(sqlNu));
  t('crm_immo_loyers est creee', /CREATE TABLE public\.crm_immo_loyers/.test(sqlNu));

  /*
   * L ECHEANCIER N EST PAS UNE TABLE. C est le principe du chantier : il se derive des
   * dates, comme les alertes. Une table d echeances serait une donnee derivee stockee,
   * donc une donnee qui finira par contredire sa source.
   */
  const tablesCreees = [...sqlNu.matchAll(/CREATE TABLE public\.(\w+)/g)].map(m => m[1]);
  t('deux tables, et deux seulement', tablesCreees.length === 2);
  t('aucune table d ECHEANCES n est creee',
    !tablesCreees.some(n => /echeanc/i.test(n)));
}

console.log('\n=== 2. LES DEUX INDEX PARTIELS, QUI PORTENT TOUT ===');
{
  const unique = [...sqlNu.matchAll(/CREATE UNIQUE INDEX\s+(\w+)\s+ON\s+public\.(\w+)\s*\(([^)]*)\)\s*(WHERE[^;]*)?;/g)]
    .map(m => ({ nom: m[1], table: m[2], colonnes: m[3].replace(/\s+/g, ' ').trim(), filtre: (m[4] ?? '').trim() }));

  t('deux index uniques sont declares', unique.length === 2);

  const periode = unique.find(i => i.table === 'crm_immo_contrats');
  t('crm_immo_contrats a son index unique', periode !== undefined);
  t('il est PARTIEL sur la periode en cours',
    /WHERE\s+cloture_le\s+IS\s+NULL/i.test(periode?.filtre ?? ''));
  t('il commence par company_id — sinon son 23505 traverse les cloisons',
    (periode?.colonnes ?? '').startsWith('company_id'));

  const encaissement = unique.find(i => i.table === 'crm_immo_loyers');
  t('crm_immo_loyers a son index unique', encaissement !== undefined);
  /* Sans cette clause, un loyer encaisse puis annule puis re-encaisse heurterait
     l unicite, et il faudrait reecrire la ligne annulee — donc effacer la correction. */
  t('il est PARTIEL sur les encaissements NON annules',
    /WHERE\s+annule_le\s+IS\s+NULL/i.test(encaissement?.filtre ?? ''));
  t('il commence par company_id',
    (encaissement?.colonnes ?? '').startsWith('company_id'));
  /* La cle est l echeance REELLE : apres un renouvellement, un mois peut appartenir a
     deux periodes, mais une DATE n appartient qu a une seule. */
  t('il porte l echeance, pas un mois',
    (encaissement?.colonnes ?? '').includes('echeance'));
}

console.log('\n=== 3. LE CLOISONNEMENT NE PEUT PAS MENTIR ===');
{
  const fk = [...sqlNu.matchAll(/FOREIGN KEY \(dossier_id, company_id\)\s*REFERENCES public\.crm_immo_dossiers\(id, company_id\)\s*ON DELETE CASCADE/g)];
  t('les deux tables portent la cle COMPOSEE vers (id, company_id)', fk.length === 2);
  t('aucune cle etrangere simple vers crm_immo_dossiers(id)',
    !/REFERENCES public\.crm_immo_dossiers\(id\)/.test(sqlNu));

  t('les deux tables ont la RLS activee',
    /ALTER TABLE public\.crm_immo_contrats ENABLE ROW LEVEL SECURITY/.test(sqlNu)
    && /ALTER TABLE public\.crm_immo_loyers\s+ENABLE ROW LEVEL SECURITY/.test(sqlNu));

  /* Trois politiques par table, comme crm_immo_commentaires : admin, Groupe, Talvex. */
  for (const table of ['contrats', 'loyers']) {
    const pol = [...sqlNu.matchAll(new RegExp('CREATE POLICY "[^"]*crm immo ' + table + '"', 'g'))];
    t(`crm_immo_${table} a ses trois politiques`, pol.length === 3);
  }
  /* Le droit du module est exige, pas seulement la Societe. */
  t('has_crm_immo_access est exige dans les politiques',
    (sqlNu.match(/has_crm_immo_access/g) ?? []).length >= 4);
}

console.log('\n=== 4. LE POUVOIR DES FONCTIONS EST BORNE ===');
{
  const fonctions = ['sync_dossier_depuis_contrat', 'sync_contrat_depuis_dossier', 'garde_crm_immo_loyers'];
  for (const f of fonctions) {
    t(`${f} fixe un search_path explicite`,
      new RegExp('FUNCTION public\\.' + f + '\\(\\)[\\s\\S]{0,200}?SET search_path = \'\'').test(sqlNu));
  }

  /*
   * CREATE FUNCTION accorde EXECUTE a PUBLIC par defaut, et Supabase y ajoute anon,
   * authenticated et service_role par privileges par defaut. Une fonction SECURITY
   * DEFINER appelable par anon est une surface d attaque gratuite — et un declencheur
   * s execute sans que l appelant ait ce droit.
   */
  const revoke = readdirSync(MIGRATIONS)
    .filter(f => f.endsWith('.sql'))
    .map(f => readFileSync(MIGRATIONS + '/' + f, 'utf8'))
    .join('\n');
  for (const f of fonctions) {
    /* Ancre SERREE : seuls des blancs separent la fonction de son FROM. Une fenetre
       large laissait passer la suppression du REVOKE durci, parce qu elle retombait
       sur le REVOKE a PUBLIC seul de la migration precedente. */
    t(`${f} : EXECUTE retire a anon, authenticated ET service_role`,
      new RegExp('REVOKE ALL ON FUNCTION public\\.' + f
        + '\\(\\)\\s*FROM PUBLIC, anon, authenticated, service_role;').test(revoke));
  }

  /* Les deux fonctions de synchronisation prennent leur Societe sur la LIGNE ECRITE.
     Un parametre permettrait a un appelant de designer une autre Societe. */
  t('aucune fonction de synchronisation ne prend de parametre',
    fonctions.every(f => new RegExp('FUNCTION public\\.' + f + '\\(\\)').test(sqlNu)));
  t('la synchronisation lit company_id sur la ligne, jamais ailleurs',
    /c_id uuid := COALESCE\(NEW\.company_id, OLD\.company_id\)/.test(sqlNu)
    && /company_id = NEW\.company_id/.test(sqlNu));
}

console.log('\n=== 5. LES DECLENCHEURS, ET LEURS GARDES ===');
{
  t('contrats -> dossier, sur les trois evenements',
    /CREATE TRIGGER trg_sync_dossier_depuis_contrat\s+AFTER INSERT OR UPDATE OR DELETE ON public\.crm_immo_contrats/.test(sqlNu));
  t('dossier -> contrats, a l insertion et a la modification',
    /CREATE TRIGGER trg_sync_contrat_depuis_dossier\s+AFTER INSERT OR UPDATE ON public\.crm_immo_dossiers/.test(sqlNu));
  t('le garde des encaissements est AVANT l ecriture',
    /CREATE TRIGGER trg_garde_crm_immo_loyers\s+BEFORE UPDATE OR DELETE ON public\.crm_immo_loyers/.test(sqlNu));

  /*
   * LA GARDE QUI ARRETE LA RECURSION. Chaque declencheur n ecrit que si les valeurs
   * different reellement : un UPDATE dont le WHERE ne retient aucune ligne ne declenche
   * rien, donc la chaine s arrete au premier aller-retour. Retirer un IS DISTINCT FROM
   * ferait tourner les deux declencheurs l un sur l autre.
   */
  t('les deux sens comparent avant d ecrire',
    (sqlNu.match(/IS DISTINCT FROM/g) ?? []).length >= 6);

  /* Ancres sur le `IF` lui-meme : sans lui, un `IF FALSE AND ...` devant la condition
     desactivait le garde sans que l assertion ne bouge. */
  t('une annulation ne se defait pas',
    /IF TG_OP = 'UPDATE' AND OLD\.annule_le IS NOT NULL THEN[\s\S]{0,160}?RAISE EXCEPTION/.test(sqlNu));
  t('un encaissement ne se supprime pas',
    /IF TG_OP = 'DELETE' AND current_user NOT IN \('postgres', 'supabase_admin'\) THEN[\s\S]{0,160}?RAISE EXCEPTION/.test(sqlNu));
}

console.log('\n=== 6. LA REPRISE DE L EXISTANT NE MODIFIE RIEN ===');
{
  /* On ne fabrique pas de periode a partir d une saisie incomplete, et on ne touche
     aucune donnee : la reprise ne fait que REFLETER ce que le dossier dit deja. */
  const reprise = sqlNu.slice(sqlNu.lastIndexOf('INSERT INTO public.crm_immo_contrats'));
  t('la reprise exige les trois champs',
    /date_entree IS NOT NULL/.test(reprise) && /date_fin_contrat IS NOT NULL/.test(reprise)
    && /jour_encaissement IS NOT NULL/.test(reprise));
  t('elle ecarte les periodes a l envers', /date_fin_contrat >= date_entree/.test(reprise));
  t('elle ecarte les jours impossibles', /jour_encaissement BETWEEN 1 AND 31/.test(reprise));
  t('la migration ne modifie AUCUNE donnee de dossier',
    !/UPDATE public\.crm_immo_dossiers/.test(reprise));
}

console.log('\n=== 7. LA REGLE STRICTE DES ALERTES DE LOYER ===');
{
  const alertes = code('../../src/lib/crmImmoAlertes.ts');

  /*
   * LES BORNES NE SONT PLUS ECRITES ICI, ET C EST MIEUX.
   *
   * Jusqu au 22 octobre 2026, deriverAlertes comparait l echeance aux deux dates a la
   * main. C etait juste, mais c etait une SECONDE logique : l onglet Echeancier faisait
   * le meme calcul de son cote, et rien n empechait les deux de diverger.
   *
   * Desormais l alerte passe par construireEcheancier — la fonction que lisent aussi
   * l onglet et l apercu du formulaire. Les bornes, le contrat incomplet et le
   * rabattement sont donc appliques UNE fois, au meme endroit. C est la regle posee par
   * David : << Ne cree pas une deuxieme logique de calcul. >>
   */
  t('l alerte construit son echeancier par la fonction PARTAGEE',
    /construireEcheancier\(\{\s*debut: d\.date_entree, fin: d\.date_fin_contrat, jour: d\.jour_encaissement/.test(alertes));
  t('elle vient bien de crmImmoEcheancier',
    /from '\.\/crmImmoEcheancier'/.test(alertes));
  t('un echeancier vide ne produit aucune alerte',
    /if \(echeancier\.length > 0\) \{/.test(alertes));
  t('aucune comparaison de bornes refaite a la main',
    !/echeance >= \(debutBail/.test(alertes) && !/contratComplet/.test(alertes));
  t('le type porte date_entree', /date_entree\?: string \| null;/.test(alertes));

  /* Et le NUMERO vient du meme calcul : il ne peut pas contredire l onglet. */
  t('le rang du loyer vient de l echeancier',
    /rang: \{ numero: cible\.numero, total: cible\.total \}/.test(alertes));
  t('un loyer ENCAISSE ne reste pas reclame',
    /loyerAAlerter\(echeancier, estEncaisse, aujourdhui\)/.test(alertes));
  t('le titre dit le RETARD quand le loyer vient d un mois passe',
    /a\.statut === 'en-retard' \? 'Loyer en retard'/.test(alertes));

  /*
   * LE PIEGE SILENCIEUX : `date_entree` est OPTIONNEL dans DossierPourAlertes. Si la
   * requete du hook ne la charge pas, elle vaut undefined, la regle conclut << contrat
   * incomplet >>, et TOUTES les alertes de loyer disparaissent — sans qu aucun type ni
   * aucun test d interface ne proteste.
   */
  const hook = code('../../src/pages/admin/views/crm-immo/useCrmImmoAlertes.ts');
  const champs = /const CHAMPS_DOSSIER = '([^']+)'/.exec(hook);
  t('la requete du hook est trouvable', champs !== null);
  const liste = (champs?.[1] ?? '').split(',');
  for (const c of ['date_entree', 'date_fin_contrat', 'jour_encaissement']) {
    t(`la requete charge ${c}`, liste.includes(c));
  }
}

console.log('\n=== 8. SAUVEGARDE ET RESTAURATION : LES CINQ LISTES ===');
{
  /*
   * CINQ, et non quatre. La cinquieme — TABLES_WITH_COMPANY_ID — vit dans un AUTRE
   * fichier, et c est le fil-piege de sauvegarde.test.ts qui l a designee : sans elle,
   * les lignes restaurees garderaient le company_id d ORIGINE.
   */
  const c = lire('../../src/pages/admin/views/sauvegarde/restoreConstants.ts');
  const restore = lire('../../src/pages/admin/views/sauvegarde/useRestoreCrm.ts');
  const ordre = c.slice(c.indexOf('export const RESTORE_ORDER'));
  const iDossiers = ordre.indexOf("'crm_immo_dossiers'");

  for (const table of ['crm_immo_contrats', 'crm_immo_loyers']) {
    t(`${table} : 1/5 sauvegardee`, c.includes(`name: '${table}'`));
    t(`${table} : 2/5 dans l ordre de restauration, APRES les dossiers`,
      ordre.indexOf(`'${table}'`) > iDossiers && iDossiers >= 0);
    t(`${table} : 3/5 cle primaire declaree`, c.includes(`${table}: 'id'`));
    t(`${table} : 4/5 regle FK — une orpheline est ecartee, pas envoyee`,
      new RegExp(table + ':\\s*\\[\\s*\\{ column: \'dossier_id\'').test(c));
    t(`${table} : 5/5 company_id reecrit a la restauration`, restore.includes(`'${table}'`));
  }

  /* crm_immo_acces reste hors de tout : le droit appartient a Talvex, pas aux donnees. */
  t('crm_immo_acces reste hors de la sauvegarde',
    !c.includes("name: 'crm_immo_acces'") && !restore.includes("'crm_immo_acces'"));
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
