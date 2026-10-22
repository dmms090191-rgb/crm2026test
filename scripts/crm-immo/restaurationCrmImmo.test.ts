/**
 * Tests de garde : LA RESTAURATION CRM IMMO, ET LE RENOUVELLEMENT ATOMIQUE.
 * Lancer :  npx tsx scripts/crm-immo/restaurationCrmImmo.test.ts
 *
 * ---------- LES DEUX DEFAUTS FERMES ----------
 *
 * 1. LA RESTAURATION SE SABOTAIT. L'ordre impose les dossiers avant les contrats — la
 *    cle etrangere composee l'exige. Or restaurer un dossier complet declenche la
 *    creation automatique d'une periode AVEC UN ID NEUF ; la periode du fichier arrive
 *    ensuite et heurte l'index partiel unique en 23505, emportant son lot de 500.
 *
 *    Et ce n'etait pas la seule : QUATRE unicites metier ne sont pas la cle primaire,
 *    et deux d'entre elles sont des index PARTIELS, que le parametre `on_conflict` de
 *    PostgREST ne sait pas designer. Ces deux tables etaient donc inupsertables sur
 *    leur cle metier depuis le navigateur.
 *
 * 2. LE RENOUVELLEMENT ETAIT EN DEUX REQUETES, donc deux transactions. Entre elles,
 *    aucune periode en cours n'existait.
 *
 * ---------- CE QUE CE FICHIER TIENT, ET CE QU'IL NE PEUT PAS TENIR ----------
 *
 * Il tient ce qui SE LIT : la forme des fonctions, leurs privileges, le regime de
 * securite, le branchement du client. Le COMPORTEMENT se mesure en base — c'est la
 * convention du module, posee par contratsEtLoyers.test.ts : << Les releves RLS, eux,
 * se font en base : ils ne peuvent pas vivre ici. >>
 *
 * Les deux sondes sont versionnees a cote, et ce fichier verifie qu'elles couvrent
 * bien les scenarios, pour qu'un refactor ne les laisse pas derriere.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

const MIGRATIONS = 'supabase/migrations';
const parNom = (suffixe: string) => {
  const f = readdirSync(MIGRATIONS).find(n => n.endsWith(suffixe));
  return f ? readFileSync(MIGRATIONS + '/' + f, 'utf8') : '';
};
/* Le SQL sans ses commentaires : une assertion << ce motif ne doit pas apparaitre >>
   tomberait sinon sur la prose qui explique precisement pourquoi il ne faut pas. */
const nu = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*--.*$/gm, '');
const lire = (p: string) => readFileSync(p, 'utf8');

const POSE = parNom('_crm_immo_restauration_sans_conflit.sql');
/*
 * LA VERSION VIVANTE DE LA FONCTION, et elle seule.
 *
 * `crm_immo_restaurer_lot` a ete remplacee deux fois depuis sa creation. Viser une
 * migration anterieure ferait passer des assertions sur du code que plus personne
 * n'execute — un test vert sur du mort. On lit donc TOUJOURS la derniere.
 */
const FONCTION = parNom('_restauration_croisee_sans_identite_source.sql');
const RENOUV = parNom('_crm_immo_renouveler_atomique.sql');
const HOOK_RESTORE = lire('src/pages/admin/views/sauvegarde/useRestoreCrm.ts');
const HOOK_ECHEANCIER = lire('src/pages/admin/views/crm-immo/useCrmImmoEcheancier.ts');

console.log('\n=== 1. LE DRAPEAU DE RESTAURATION ===');
{
  const sql = nu(FONCTION);

  /*
   * POURQUOI UNE FONCTION, ET PAS DEUX REQUETES.
   *
   * PostgREST ouvre une transaction par requete HTTP. Un `set_config` pose dans une
   * requete ne survit pas a la suivante — et s'il survivait (is_local = false), il
   * fuirait dans une session mutualisee vers les requetes d'autres Societes. Le seul
   * montage ou le drapeau et l'ecriture partagent une transaction est une fonction.
   */
  t('le drapeau est TRANSACTION-local, pas session-global',
    /set_config\('talvex\.restauration', 'on', true\)/.test(sql));
  t('et il est baisse avant de rendre',
    /set_config\('talvex\.restauration', 'off', true\)/.test(sql));
  t('il est pose APRES les verifications, pas au debut',
    sql.indexOf("set_config('talvex.restauration', 'on'") > sql.indexOf('NOT IN ('));

  /*
   * `current_setting(nom, true)` — la forme a DEUX arguments est obligatoire : sans
   * elle, un GUC jamais pose leve 42704 au lieu de rendre NULL. Un declencheur qui
   * planterait sur une base ou la restauration n'a jamais tourne serait pire que le
   * defaut qu'on corrige.
   */
  const declencheurs = nu(POSE);
  t('les declencheurs lisent le drapeau avec la forme a deux arguments',
    (declencheurs.match(/current_setting\('talvex\.restauration', true\)/g) ?? []).length === 2);
  t('et ils comparent sur une valeur par defaut, jamais sur NULL',
    (declencheurs.match(/coalesce\(current_setting\('talvex\.restauration', true\), ''\) = 'on'/g) ?? []).length === 2);

  /* Les DEUX declencheurs concernes, nommement, et eux seuls. */
  t('sync_contrat_depuis_dossier se tait pendant une restauration',
    /CREATE OR REPLACE FUNCTION public\.sync_contrat_depuis_dossier[\s\S]{0,600}?talvex\.restauration/.test(declencheurs));
  t('garder_dossier_aligne_sur_contrat aussi',
    /CREATE OR REPLACE FUNCTION public\.garder_dossier_aligne_sur_contrat[\s\S]{0,600}?talvex\.restauration/.test(declencheurs));
  t('le garde des encaissements, lui, N EST PAS touche',
    !/garde_crm_immo_loyers/.test(declencheurs));
}

console.log('\n=== 2. LA FONCTION DE RESTAURATION NE DONNE AUCUN POUVOIR NOUVEAU ===');
{
  const sql = nu(FONCTION);

  /*
   * SECURITY INVOKER, et c'est tout le modele de securite : la RLS des six tables
   * s'applique a chaque ecriture, donc le company_id porte par les lignes est verifie
   * par le WITH CHECK des policies.
   *
   * En DEFINER, cette fonction deviendrait un moyen d'ecrire chez n'importe qui — elle
   * prend des lignes en parametre, donc rien ne bornerait la Societe visee.
   */
  t('la fonction est SECURITY INVOKER', /SECURITY INVOKER/.test(sql));
  t('et surtout pas DEFINER', !/SECURITY DEFINER/.test(sql));
  t('search_path est vide', /SET search_path TO ''/.test(sql));

  /*
   * LE SQL DYNAMIQUE EST BORNE DES DEUX COTES : le nom de table vient d'une liste
   * close, les noms de colonnes viennent du CATALOGUE. Rien de ce que l'appelant ecrit
   * n'entre dans le texte de la requete — et `%I` l'echapperait de toute facon.
   */
  /*
   * La garde est verifiee EN ENTIER, du `IF` jusqu'au `RAISE`.
   *
   * Chercher seulement la liste laisserait passer un `IF false AND p_table NOT IN (…)`
   * — la liste serait toujours la, et la garde desarmee. C'est un piege rencontre
   * plusieurs fois dans ce projet : une assertion qui cherche un motif SANS son
   * contexte reste verte sur du code neutralise.
   */
  t('le nom de table passe par une liste blanche close, et elle est ARMEE',
    /IF p_table NOT IN \('crm_immo_dossiers', 'crm_immo_colonnes', 'crm_immo_etats',\s*\n?\s*'crm_immo_commentaires', 'crm_immo_contrats', 'crm_immo_loyers'\) THEN\s*\n?\s*RAISE EXCEPTION/.test(sql));
  t('les colonnes viennent du catalogue, pas du lot',
    /FROM information_schema\.columns/.test(sql));
  t('et elles sont echappees', /format\('%I', c\.column_name\)/.test(sql));
  t('le nom de table aussi', /format\(\s*\n?\s*'INSERT INTO public\.%I/.test(sql));

  for (const role of ['PUBLIC', 'anon', 'service_role']) {
    t(`EXECUTE est retire a ${role}`,
      new RegExp(`REVOKE ALL ON FUNCTION public\\.crm_immo_restaurer_lot\\(text, jsonb, uuid\\) FROM ${role};`).test(sql));
  }

  /*
   * L'ANCIENNE SIGNATURE A DEUX ARGUMENTS DOIT AVOIR DISPARU.
   *
   * PostgreSQL permet la surcharge : laisser vivre `crm_immo_restaurer_lot(text, jsonb)`
   * laisserait un chemin par lequel une restauration croisee transporterait encore les
   * identites de la Societe source — l'ancienne version n'avait aucun moyen de savoir
   * que la restauration etait croisee.
   */
  t('l ancienne signature a deux arguments est supprimee',
    /DROP FUNCTION IF EXISTS public\.crm_immo_restaurer_lot\(text, jsonb\);/.test(sql));
  t('et accorde au seul role authenticated',
    /GRANT EXECUTE ON FUNCTION public\.crm_immo_restaurer_lot\(text, jsonb, uuid\) TO authenticated;/.test(sql));
}

console.log('\n=== 3. UNE LIGNE FAUTIVE NE TUE PLUS SES VOISINES ===');
{
  const sql = nu(FONCTION);
  /*
   * Un lot de 500 qui rencontrait un conflit perdait les 500 : le rapport affichait une
   * erreur de lot, et 500 lignes valides n'etaient jamais ecrites.
   *
   * Chaque ligne a desormais son propre bloc EXCEPTION, donc sa propre
   * sous-transaction : une ligne refusee est annulee seule et RAPPORTEE avec son code.
   */
  t('l ecriture se fait ligne a ligne', /FOR v_ligne IN SELECT \* FROM jsonb_array_elements\(p_lignes\)/.test(sql));
  t('chaque ligne a son bloc d exception', /EXCEPTION WHEN others THEN/.test(sql));
  t('un refus est enregistre avec son code SQLSTATE',
    /'code', SQLSTATE/.test(sql) && /'message', left\(SQLERRM/.test(sql));
  t('et la fonction rend le compte, les identites retirees ET les refus',
    /jsonb_build_object\([\s\S]{0,120}?'ecrites', v_ecrites,[\s\S]{0,60}?'anonymisees', v_anonymisees,[\s\S]{0,60}?'refusees', v_refusees\)/.test(sql));

  /* Cote client : les refus doivent etre NOMMES, pas noyes dans un total. */
  t('le client remonte chaque refus a l utilisateur',
    /Ligne \$\{r\.id \?\? '\?'\} refusée/.test(HOOK_RESTORE));
  t('et compte les lignes reellement ecrites', /result\.inserted \+= bilan\?\.ecrites \?\? 0/.test(HOOK_RESTORE));
}

console.log('\n=== 4. LES SIX TABLES DU MODULE PASSENT PAR LA FONCTION ===');
{
  /*
   * La CONDITION, pas seulement l'appel : un `if (false)` laisserait le `.rpc(` dans le
   * fichier, bien visible, et la restauration repasserait en silence par l'upsert
   * direct — celui qui perd des lots entiers.
   */
  t('le client appelle la fonction pour elles, et la condition est ARMEE',
    /if \(TABLES_CRM_IMMO\.has\(table\)\) \{[\s\S]{0,400}?\.rpc\('crm_immo_restaurer_lot'/.test(HOOK_RESTORE));
  t('la liste est DERIVEE, pas recopiee',
    /\[\.\.\.TABLES_WITH_COMPANY_ID\]\.filter\(t => t\.startsWith\('crm_immo_'\)\)/.test(HOOK_RESTORE));
  t('et les autres tables gardent l upsert direct',
    /\.upsert\(chunk as never\[\], \{ onConflict: pk/.test(HOOK_RESTORE));

  /*
   * L'ORDRE RESTE CELUI-LA, et il est impose par la cle etrangere composee : une
   * periode ne peut referencer qu'un dossier deja present.
   */
  const ordre = lire('src/pages/admin/views/sauvegarde/restoreConstants.ts');
  t('les dossiers sont toujours restaures avant les contrats',
    ordre.indexOf("'crm_immo_dossiers'") < ordre.indexOf("'crm_immo_contrats'"));
}

console.log('\n=== 4 bis. AUCUNE IDENTITE NE TRAVERSE LES CLOISONS ===');
{
  const sql = nu(FONCTION);

  /*
   * LE DEFAUT : `auth.users` est GLOBAL. Restaurer la sauvegarde d'une Societe A dans
   * une Societe B reecrivait company_id, mais laissait created_by, cloture_par,
   * encaisse_par et annule_par pointer sur des salaries de A. La cle etrangere passait
   * sans broncher, et B se retrouvait avec des dossiers attribues a des gens qui ne lui
   * appartiennent pas.
   *
   * David : << Je ne veux pas transporter silencieusement l'identite d'un utilisateur
   * d'une Societe vers une autre. Mais ne fabrique pas une fausse attribution
   * historique. >>
   */

  /* Les SIX colonnes, relevées sur les six tables restaurables. Toutes nullables —
     c'est ce qui permet de les vider sans inventer d'auteur. */
  for (const [table, colonnes] of [
    ['crm_immo_dossiers', "ARRAY['created_by']"],
    ['crm_immo_commentaires', "ARRAY['created_by']"],
    ['crm_immo_contrats', "ARRAY['created_by', 'cloture_par']"],
    ['crm_immo_loyers', "ARRAY['encaisse_par', 'annule_par']"],
  ] as const) {
    t(`${table} : ses colonnes d identite sont nommees`,
      new RegExp(`WHEN '${table}'\\s+THEN ${colonnes.replace(/[[\]']/g, m => '\\' + m)}`).test(sql));
  }

  /*
   * LA FONCTION DOIT POUVOIR SAVOIR que la restauration est croisee. Elle ne le peut
   * que si le client lui envoie le company_id DU FICHIER et la destination a part.
   * Reecrire company_id cote client lui retirerait le seul moyen de le distinguer.
   */
  t('la Societe de destination est un parametre obligatoire',
    /p_company_cible uuid/.test(sql) && /IF p_company_cible IS NULL THEN/.test(sql));
  t('la Societe d origine est lue AVANT d etre reecrite',
    /v_origine := v_ligne ->> 'company_id';\s*\n\s*v_ligne := jsonb_set\(v_ligne, '\{company_id\}'/.test(sql));
  t('et la comparaison se fait LIGNE PAR LIGNE',
    /IF v_origine IS DISTINCT FROM p_company_cible::text THEN/.test(sql));
  t('le client n ecrase plus company_id pour ces tables',
    /TABLES_WITH_COMPANY_ID\.has\(table\) && !TABLES_CRM_IMMO\.has\(table\)/.test(HOOK_RESTORE));
  t('et il transmet la destination',
    /p_company_cible: companyId/.test(HOOK_RESTORE));

  /* Sur une restauration CROISEE, les colonnes deviennent NULL — pas `auth.uid()`. */
  t('une restauration croisee VIDE les identites',
    /FOREACH v_col IN ARRAY v_identites LOOP\s*\n\s*v_ligne := jsonb_set\(v_ligne, ARRAY\[v_col\], 'null'::jsonb, true\);/.test(sql));
  t('et ne les remplace par PERSONNE',
    !/auth\.uid\(\)/.test(sql));

  /*
   * LES IDENTITES DOIVENT ENTRER DANS L'INSTRUCTION quand le lot est croise.
   *
   * Trois de ces colonnes ont `auth.uid()` pour DEFAUT. Si elles n'etaient pas dans la
   * liste des colonnes, le defaut s'appliquerait et attribuerait la ligne a CELUI QUI
   * RESTAURE — exactement la fausse attribution qu'on refuse. Les vider ne suffit donc
   * pas : il faut les ecrire.
   */
  t('le lot croise force les identites dans la liste des colonnes',
    /UNION SELECT unnest\(v_identites\) WHERE v_lot_croise/.test(sql));
  t('et le lot est declare croise des qu UNE ligne vient d ailleurs',
    /v_lot_croise := EXISTS \([\s\S]{0,200}?IS DISTINCT FROM p_company_cible::text/.test(sql));

  /* Le rapport le DIT : une attribution retiree est une information. */
  t('le nombre d identites retirees est compte', /v_anonymisees := v_anonymisees \+ 1;/.test(sql));
  t('il remonte au client', /result\.anonymized = \(result\.anonymized \?\? 0\)/.test(HOOK_RESTORE));
  t('et il est affiche', /data-testid="restore-anonymisees"/.test(lire('src/pages/admin/views/sauvegarde/RestoreReport.tsx')));

  /*
   * ET LES FAITS SURVIVENT. Vider `annule_par` en gardant `annule_le` et le motif reste
   * valide par la seconde branche du CHECK crm_immo_loyers_annulation. La trace de
   * l'annulation demeure — seul son auteur disparait. C'est la regle que David a
   * maintenue : l'historique d'annulation est prioritaire.
   */
  const socle = nu(parNom('_create_crm_immo_contrats_et_loyers.sql'));
  t('le CHECK accepte une annulation sans auteur',
    /annule_par IS NULL AND motif_annulation IS NULL\)\s*OR annule_le IS NOT NULL/.test(socle));
  t('aucune identite n est listee pour les tables qui n en ont pas',
    /ELSE ARRAY\[\]::text\[\]/.test(sql));
}

console.log('\n=== 4 ter. UNE SOCIETE SANS LE MODULE EST ARRETEE AVANT ===');
{
  /*
   * David : << Je ne veux pas que l'utilisateur decouvre seulement une liste de
   * 42501. >>
   *
   * Les douze policies des six tables exigent has_crm_immo_access. Sans le module,
   * chaque ligne part en 42501 : correct cote securite, illisible cote ecran — et
   * decouvert seulement apres avoir attendu la fin d'une restauration qui n'a rien
   * ecrit.
   *
   * Mesure du 22 octobre 2026 : has_crm_immo_access rend `true` pour la Societe qui a
   * le module et `false` pour celle qui ne l'a pas ; une ecriture vers la seconde est
   * refusee en 42501.
   */
  t('la verification interroge la MEME fonction que les policies',
    /\.rpc\('has_crm_immo_access', \{ p_company_id: companyId \}\)/.test(HOOK_RESTORE));
  t('elle a lieu AVANT la boucle d ecriture',
    HOOK_RESTORE.indexOf("rpc('has_crm_immo_access'") < HOOK_RESTORE.indexOf('for (let batch = 0'));
  t('et on ne lance pas', /setStatus\('error'\);\s*\n\s*return arret;/.test(HOOK_RESTORE));

  /* Seulement si le fichier contient vraiment des lignes CRM Immo. */
  t('une sauvegarde sans CRM Immo n est pas bloquee',
    /const immoARestaurer = tablesToRestore\.filter\(\(t\) => TABLES_CRM_IMMO\.has\(t\)\);/.test(HOOK_RESTORE)
    && /if \(immoARestaurer\.length > 0\) \{/.test(HOOK_RESTORE));

  /*
   * LE MESSAGE DOIT ETRE LISIBLE ET ACTIONNABLE. Un rapport a zero ligne se lit comme
   * << il n'y avait rien a faire >> : il faut dire qu'on a refuse, pourquoi, et quoi
   * faire ensuite.
   */
  t('le message nomme le module', /n'a pas accès au module CRM Immo/.test(HOOK_RESTORE));
  t('il dit COMBIEN de tables seraient refusees',
    /\$\{immoARestaurer\.length\} table\$\{immoARestaurer\.length > 1 \? 's' : ''\} CRM Immo/.test(HOOK_RESTORE));
  t('et LESQUELLES', /\(\$\{immoARestaurer\.join\(', '\)\}\)/.test(HOOK_RESTORE));
  t('et il dit quoi faire', /Activez le module pour cette société/.test(HOOK_RESTORE));

  const rapport = lire('src/pages/admin/views/sauvegarde/RestoreReport.tsx');
  t('le rapport porte le blocage', /blocage\?: string;/.test(HOOK_RESTORE));

  /*
   * Le `-1` d'indexOf est un piege : comparer deux positions sans verifier d'abord
   * qu'elles EXISTENT laisse passer la disparition pure et simple du bloc — -1 est
   * inferieur a tout. Mesure a l'appui : cette assertion survivait a la suppression du
   * data-testid.
   */
  const iBlocage = rapport.indexOf('data-testid="restore-blocage"');
  const iStats = rapport.indexOf('Tables dans le fichier');
  t('le bloc de blocage existe', iBlocage > 0);
  t('les statistiques aussi', iStats > 0);
  t('et le blocage est affiche AVANT elles', iBlocage > 0 && iStats > 0 && iBlocage < iStats);
  t('et l en-tete ne dit plus « terminee »',
    /report\.blocage \? 'Restauration non lancée'/.test(rapport));
}

console.log('\n=== 5. LE RENOUVELLEMENT EST ATOMIQUE ===');
{
  const sql = nu(RENOUV);

  t('la fonction existe', RENOUV !== '');
  t('elle est SECURITY INVOKER', /SECURITY INVOKER/.test(sql) && !/SECURITY DEFINER/.test(sql));

  /*
   * LE VERROU PORTE SUR LE DOSSIER, PAS SUR LA PERIODE.
   *
   * Verrouiller la periode en cours ne serialise RIEN : en READ COMMITTED, quand la
   * premiere transaction valide, la seconde reevalue la clause WHERE sur la version la
   * plus recente — `cloture_le` n'est plus NULL, la ligne ne qualifie plus, et la
   * seconde obtient ZERO ligne. Elle croit alors qu'aucune periode n'est en cours et
   * insere, pour heurter l'index partiel unique en 23505.
   *
   * Mesure du 22 octobre 2026 : apres l'appel, la ligne du dossier porte bien le xmax
   * de la transaction appelante — le verrou existe.
   */
  t('le verrou porte sur la ligne du DOSSIER',
    /FROM public\.crm_immo_dossiers d\s*\n\s*WHERE d\.id = p_dossier_id\s*\n\s*FOR UPDATE/.test(sql));
  t('et pas sur la periode, qui cesserait de qualifier',
    !/FROM public\.crm_immo_contrats[\s\S]{0,200}?FOR UPDATE/.test(sql));

  /*
   * L'ACCORD SUR CE QU'ON RENOUVELLE. Sans lui, deux renouvellements successifs
   * reussissent tous les deux et le premier est enterre une seconde apres.
   * `IS DISTINCT FROM` et non `<>` : les deux cotes peuvent etre NULL.
   */
  t('la periode attendue est exigee', /p_periode_attendue uuid/.test(sql));
  t('et comparee avec IS DISTINCT FROM', /v_active IS DISTINCT FROM p_periode_attendue/.test(sql));
  t('le client annonce la periode qu il croit en cours',
    /p_periode_attendue: periodeActive\?\.id \?\? null/.test(HOOK_ECHEANCIER));

  /* Le silence de la RLS, rendu bruyant — c'est ce qui rend INVOKER acceptable. */
  t('l UPDATE compte ses lignes', /GET DIAGNOSTICS v_lignes = ROW_COUNT/.test(sql));
  t('et zero ligne leve une exception', /IF v_lignes = 0 THEN[\s\S]{0,160}?RAISE EXCEPTION/.test(sql));

  /* L'ordre, impose par l'index partiel unique. */
  t('on cloture AVANT d inserer',
    sql.indexOf('SET cloture_le = now()') < sql.indexOf('INSERT INTO public.crm_immo_contrats'));
  t('et l ancienne periode est conservee', !/DELETE FROM public\.crm_immo_contrats/i.test(sql));

  /* Les quatre codes, pour que l'appelant distingue les cas. */
  for (const [code, quoi] of [['TLV01', 'dossier introuvable'], ['TLV02', 'dates invalides'],
    ['TLV03', 'periode deja changee'], ['TLV04', 'refus de droits']] as const) {
    t(`${code} : ${quoi}`, new RegExp(`ERRCODE = '${code}'`).test(sql));
  }

  t('et le client ne fait plus les deux requetes lui-meme',
    !/cloture_le: new Date\(\)/.test(HOOK_ECHEANCIER));
}

console.log('\n=== 6. LES SONDES QUI MESURENT LE COMPORTEMENT SONT VERSIONNEES ===');
{
  /*
   * Ce fichier ne peut pas ecrire en base. Le comportement — restaurer, renouveler,
   * concurrence — se mesure par des sondes SQL qui s'annulent elles-memes.
   */
  for (const [chemin, attendus] of [
    ['scripts/crm-immo/restaurationCrmImmo.sql',
      [/crm_immo_restaurer_lot\('crm_immo_dossiers'/, /crm_immo_restaurer_lot\('crm_immo_contrats'/,
        /periodes fantomes/, /hors perimetre/, /lot mixte/, /divergences/,
        /* Les trois blocs, nommement : le conflit 23505, l'identite, et l'absence de
           module. Une sonde amputee d'un bloc passerait sans qu'on le voie. */
        /SONDE A \(annulee\)/, /SONDE B \(annulee\)/, /SONDE C \(annulee\)/,
        /* Le bloc B doit comparer les DEUX cas, et poser la question directe. */
        /MEME Societe/i, /AUTRE Societe/i, /lignes portant encore/,
        /* Et verifier que les FAITS survivent : dates et motif conserves. */
        /cloture_le gardee/, /annule_le gardee/, /motif garde/,
        /* Le bloc C mesure la base, pas l'interface. */
        /has_crm_immo_access/, /sans module/]],
    ['scripts/crm-immo/alignementDossierContrat.sql',
      [/set date_fin_contrat = null/i, /23514|SQLSTATE/, /set cloture_le = now\(\)/i]],
  ] as const) {
    t(`${chemin} existe`, existsSync(chemin));
    const sonde = existsSync(chemin) ? lire(chemin) : '';
    t(`  elle s annule elle-meme`, /ROLLBACK/i.test(sonde) && /RAISE EXCEPTION/i.test(sonde));
    t(`  elle mesure sous un role REEL`, /SET LOCAL ROLE authenticated/i.test(sonde));
    for (const motif of attendus) {
      t(`  elle couvre ${motif}`, motif.test(sonde));
    }
  }
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
