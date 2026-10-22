/**
 * Tests de garde : LE DOSSIER NE PEUT PLUS CONTREDIRE SON CONTRAT.
 * Lancer :  npx tsx scripts/crm-immo/alignementDossierContrat.test.ts
 *
 * ---------- LA DIVERGENCE QU ON FERME ----------
 *
 * Mesure du 22 octobre 2026, declencheurs mis au travail puis transaction annulee :
 *
 *   A) un dossier complet cree bien UNE periode, aux memes dates ;
 *   B) modifier la periode fait suivre le dossier ;
 *   C) modifier le dossier fait suivre la periode ;
 *   D) VIDER date_fin_contrat sur le dossier laissait la periode INTACTE.
 *
 * Apres D, le dossier disait << pas de date de fin >> pendant que crm_immo_contrats
 * tenait toujours 2026-03-10..2027-03-09. Deux sources, deux verites.
 *
 * ---------- CE QUE CE FICHIER TIENT, ET CE QU IL NE PEUT PAS TENIR ----------
 *
 * Il tient ce qui SE LIT dans le code : la forme du declencheur, ses privileges, la
 * condition exacte qui le declenche, et les deux CHECK sur lesquels il s appuie.
 *
 * Le COMPORTEMENT, lui, se mesure en base — comme pour les releves RLS du module. La
 * sonde est versionnee a cote, dans alignementDossierContrat.sql : elle rejoue les
 * quatre scenarios et s annule elle-meme. Ce fichier verifie d ailleurs qu elle existe
 * et qu elle couvre bien les cas, pour qu on ne la perde pas de vue.
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

const POSE = parNom('_aligner_dossier_sur_contrat_actif.sql');
const RESSERRE = parNom('_resserrer_alignement_dossier_aux_valeurs_vides.sql');
const SOCLE = parNom('_create_crm_immo.sql');
/* Les regex de la sonde ignorent la casse : le SQL s'ecrit indifferemment en
   majuscules ou en minuscules, et un test qui en impose une ne mesure que le style. */
const CONTRATS = parNom('_create_crm_immo_contrats_et_loyers.sql');

console.log('\n=== 1. LES DEUX MIGRATIONS EXISTENT ===');
{
  t('la migration qui pose le declencheur existe', POSE !== '');
  t('celle qui le resserre aux valeurs vides existe', RESSERRE !== '');
  t('le socle CRM Immo est toujours la', SOCLE !== '');
  t('la migration des periodes aussi', CONTRATS !== '');
}

console.log('\n=== 2. UN DECLENCHEUR « BEFORE », ET SUR LES DEUX EVENEMENTS ===');
{
  const sql = nu(POSE);
  /*
   * BEFORE, pas AFTER. Un AFTER devrait corriger par un SECOND UPDATE, qui se
   * redeclencherait ; un BEFORE corrige NEW sur place, donc n ecrit rien et n enclenche
   * rien. C est ce qui garantit l absence de recursion, sans compter sur une garde.
   */
  t('le declencheur est BEFORE INSERT OR UPDATE',
    /CREATE TRIGGER trg_garder_dossier_aligne_sur_contrat\s+BEFORE INSERT OR UPDATE ON public\.crm_immo_dossiers/.test(sql));
  t('il porte sur chaque ligne', /FOR EACH ROW/.test(sql));
  t('il n est pas un AFTER deguise', !/AFTER (INSERT|UPDATE) ON public\.crm_immo_dossiers/.test(sql));

  /* Un BEFORE doit rendre NEW : un RETURN NULL annulerait l ecriture entiere. */
  t('la fonction rend NEW, jamais NULL',
    /RETURN NEW;/.test(sql) && !/RETURN NULL;/.test(sql));
}

console.log('\n=== 3. ELLE NE RATTRAPE QUE LE VIDE ===');
{
  const sql = nu(RESSERRE);
  /*
   * LE POINT LE PLUS SUBTIL DE CE CHANTIER.
   *
   * La premiere version rattrapait aussi les valeurs INVALIDES. Mais un declencheur
   * BEFORE s execute AVANT la verification des contraintes : en corrigeant NEW, il
   * empechait les CHECK de voir quoi que ce soit. Une date inversee envoyee par l API
   * REST n etait plus refusee en 23514, elle etait silencieusement remplacee.
   *
   * Et c etait inutile : une saisie invalide NE DIVERGE PAS, puisqu elle est refusee.
   */
  t('la sortie anticipee ne teste QUE les trois NULL',
    /IF NEW\.date_entree IS NOT NULL\s+AND NEW\.date_fin_contrat IS NOT NULL\s+AND NEW\.jour_encaissement IS NOT NULL THEN\s+RETURN NEW;/.test(sql));
  t('plus aucune comparaison de dates dans la condition',
    !/NEW\.date_fin_contrat >= NEW\.date_entree/.test(sql));
  t('plus aucune borne sur le jour d encaissement',
    !/NEW\.jour_encaissement >= 1/.test(sql));
}

console.log('\n=== 4. LES DEUX CHECK SUR LESQUELS ELLE S APPUIE ===');
{
  /*
   * Le declencheur laisse les valeurs invalides aux contraintes de la table. Si l une
   * disparaissait, le trou se rouvrirait EN SILENCE : une date inversee serait ecrite,
   * sync_contrat_depuis_dossier sortirait sans toucher la periode, et les deux sources
   * se contrediraient a nouveau.
   *
   * La migration qui resserre le declencheur promet nommement que ce test existe.
   */
  const socle = nu(SOCLE);
  t('le CHECK sur l ordre des dates existe toujours',
    /CONSTRAINT crm_immo_dossiers_dates_coherentes[\s\S]{0,200}?date_fin_contrat >= date_entree/i.test(socle));
  t('le CHECK sur le jour d encaissement existe toujours',
    /CONSTRAINT crm_immo_dossiers_jour_encaissement_valide[\s\S]{0,160}?jour_encaissement BETWEEN 1 AND 31/i.test(socle));
  t('les deux acceptent NULL — c est pourquoi le declencheur est necessaire',
    /date_entree IS NULL[\s\S]{0,40}?OR date_fin_contrat IS NULL/i.test(socle)
    && /jour_encaissement IS NULL OR/i.test(socle));
  t('la migration qui resserre renvoie bien a ce fichier de test',
    /alignementDossierContrat\.test\.ts/.test(RESSERRE));
}

console.log('\n=== 5. LE CLOISONNEMENT TIENT MALGRE SECURITY DEFINER ===');
{
  const sql = nu(RESSERRE);
  /*
   * La fonction lit crm_immo_contrats depuis une ecriture sur crm_immo_dossiers, en
   * SECURITY DEFINER — donc hors RLS. Le cloisonnement ne tient que par UNE chose : la
   * lecture porte sur le COUPLE (dossier_id, company_id).
   *
   * NEW.company_id ne peut pas mentir : l ecriture vient de passer le WITH CHECK des
   * policies. NEW.id, lui, est choisissable par le client. Une lecture sur dossier_id
   * SEUL, en DEFINER, ramenerait donc la periode d une Societe voisine. La cle etrangere
   * composee (dossier_id, company_id) rend le couple infalsifiable.
   */
  t('la lecture filtre sur dossier_id ET company_id',
    /WHERE c\.dossier_id = NEW\.id\s+AND c\.company_id = NEW\.company_id/.test(sql));
  t('elle ne lit que la periode EN COURS',
    /AND c\.cloture_le IS NULL;/.test(sql));
  t('search_path est vide et les noms sont qualifies',
    /SET search_path TO ''/.test(sql) && /FROM public\.crm_immo_contrats/.test(sql));

  /*
   * Les privileges par defaut de Supabase accordent EXECUTE a anon, authenticated et
   * service_role sur TOUTE fonction nouvellement creee. Un REVOKE FROM PUBLIC seul ne
   * suffit pas — c est tout l objet de la migration restreindre_execute_triggers.
   * PostgreSQL verifie ce droit a la CREATION du declencheur, jamais a son
   * declenchement : la fonction tourne donc avec zero privilege accorde.
   */
  for (const role of ['PUBLIC', 'anon', 'authenticated', 'service_role']) {
    t(`EXECUTE est retire a ${role}`,
      new RegExp(`REVOKE ALL ON FUNCTION public\\.garder_dossier_aligne_sur_contrat\\(\\) FROM ${role};`).test(sql));
  }
}

console.log('\n=== 6. CE QUI N EST VOLONTAIREMENT PAS IMPOSE ===');
{
  /*
   * L implication inverse — << aucune periode en cours DONC dossier vide >> — n est PAS
   * imposee, et c est delibere.
   *
   * Le renouvellement se fait en DEUX requetes : cloturer, puis inserer. Entre les deux,
   * l etat commite ne contient AUCUNE periode en cours. Vider le dossier a cet instant
   * effacerait ses dates — et les perdrait si la seconde requete echouait.
   *
   * Ce test fige l ordre des deux requetes : il est impose par l index partiel unique
   * (inserer avant de cloturer leve un 23505), et c est lui qui rend la fenetre courte.
   */
  const hook = readFileSync('src/pages/admin/views/crm-immo/useCrmImmoEcheancier.ts', 'utf8');
  /*
   * LE RENOUVELLEMENT A DEMENAGE EN BASE LE 22 OCTOBRE 2026.
   *
   * Il etait fait de DEUX requetes HTTP, donc deux transactions : entre elles, aucune
   * periode en cours n'existait. C'est devenu une seule fonction, crm_immo_renouveler,
   * et l'ordre « cloturer puis inserer » se verifie desormais dans son SQL.
   */
  const renouveler = hook.match(/const renouveler = useCallback\([\s\S]*?\n {2}\}, \[/)?.[0] ?? '';
  t('le renouvellement est trouvable', renouveler !== '');
  t('il passe par la fonction atomique', /\.rpc\('crm_immo_renouveler'/.test(renouveler));
  t('et il annonce la periode qu il croit en cours',
    /p_periode_attendue: periodeActive\?\.id \?\? null/.test(renouveler));
  t('il ne cloture plus lui-meme en deux temps',
    !/cloture_le:/.test(renouveler) && !/\.insert\(\{/.test(renouveler));

  const rpc = parNom('_crm_immo_renouveler_atomique.sql');
  const corps = nu(rpc);
  t('la fonction atomique existe', rpc !== '');
  const iCloture = corps.indexOf('SET cloture_le = now()');
  const iInsert = corps.indexOf('INSERT INTO public.crm_immo_contrats');
  t('elle CLOTURE avant d INSERER', iCloture > 0 && iInsert > iCloture);
  t('et elle ne supprime jamais l ancienne periode',
    !/DELETE FROM public\.crm_immo_contrats/i.test(corps));

  /* Le repli de sync_dossier_depuis_contrat sur la periode la plus recente est ce qui
     protege cette fenetre. Il doit rester. */
  t('sync_dossier_depuis_contrat garde son repli sur la plus recente',
    /ORDER BY \(cloture_le IS NULL\) DESC, debut DESC/.test(nu(CONTRATS)));
}

console.log('\n=== 7. LA RESTAURATION N EST PAS TOUCHEE ===');
{
  /*
   * Le declencheur ne lit une periode que si une periode existe. Or la cle etrangere
   * composee (dossier_id, company_id) impose de restaurer les DOSSIERS AVANT les
   * CONTRATS : quand les dossiers arrivent, aucune periode ne peut les referencer, donc
   * le declencheur sort par NOT FOUND.
   *
   * Si cet ordre etait inverse, la restauration cesserait de restaurer ce que contient
   * le fichier : les dates vides du fichier seraient remplacees par les periodes.
   */
  const ordre = readFileSync('src/pages/admin/views/sauvegarde/restoreConstants.ts', 'utf8');
  const iDossiers = ordre.indexOf("'crm_immo_dossiers'");
  const iContrats = ordre.indexOf("'crm_immo_contrats'");
  t('crm_immo_dossiers est restaure AVANT crm_immo_contrats',
    iDossiers > 0 && iContrats > iDossiers);
  t('la cle etrangere composee impose cet ordre',
    /FOREIGN KEY \(dossier_id, company_id\)\s*\n?\s*REFERENCES public\.crm_immo_dossiers\(id, company_id\)/.test(nu(CONTRATS)));
}

console.log('\n=== 8. LA SONDE QUI MESURE LE COMPORTEMENT EST VERSIONNEE ===');
{
  /*
   * Ce fichier ne peut pas ecrire en base. Le comportement — vider une date, modifier,
   * renouveler — se mesure par une sonde SQL qui s annule elle-meme, a cote.
   * On verifie qu elle existe et qu elle couvre les quatre scenarios, pour qu un
   * refactor ne la laisse pas derriere.
   */
  const chemin = 'scripts/crm-immo/alignementDossierContrat.sql';
  t('la sonde existe', existsSync(chemin));
  const sonde = existsSync(chemin) ? readFileSync(chemin, 'utf8') : '';
  t('elle s annule elle-meme', /ROLLBACK|raise exception/i.test(sonde));
  t('elle mesure sous un role REEL, pas en postgres',
    /set local role authenticated/i.test(sonde) && /request\.jwt\.claims/i.test(sonde));
  t('elle vide une date', /set date_fin_contrat = null/i.test(sonde));
  t('elle vide les trois a la fois', /date_entree = null, date_fin_contrat = null/i.test(sonde));
  t('elle verifie qu une saisie INVALIDE reste refusee', /23514|SQLSTATE/.test(sonde));
  t('elle rejoue un renouvellement complet',
    /set cloture_le = now\(\)/i.test(sonde) && /insert into crm_immo_contrats/i.test(sonde));
  t('elle compte les divergences restantes', /divergences/.test(sonde));
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
