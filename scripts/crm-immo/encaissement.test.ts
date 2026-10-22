/**
 * Tests du JOUR D'ENCAISSEMENT : la liste de 1 a 31, et l'apercu des prochaines echeances.
 * Lancer :  npx tsx scripts/crm-immo/encaissement.test.ts
 *
 * ---------- CE QUI EST EN JEU ----------
 *
 * Un loyer n'a pas une date, il a un JOUR DU MOIS qui revient. Ce jour ne tombe pas
 * toujours : il n'y a pas de 31 fevrier, ni de 31 avril. La regle du module — rabattre
 * sur le dernier jour du mois — est juste depuis l'origine, mais elle etait INVISIBLE a
 * la saisie : on tapait « 31 » sans savoir ce qui se passerait en fevrier.
 *
 * Deux changements, aucun sur les donnees :
 *   - un champ libre devient une liste de 1 a 31, qui explique les trois jours delicats ;
 *   - un apercu montre les trois prochaines echeances reelles.
 *
 * La valeur stockee reste un entier de 1 a 31 dans `jour_encaissement`, et `jourRabattu`
 * n'est pas touche. Ces tests le verrouillent dans les deux sens.
 */
import { readFileSync, readdirSync } from 'node:fs';
import {
  prochainsEncaissements, formatJourMoisCourt, jourRabattu, dernierJourDuMois,
} from '../../src/lib/crmImmoAlertes.ts';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

const lire = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const code = (p: string) => lire(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

/** L'apercu tel que l'ecran l'affiche : trois echeances, en abrege. */
const apercu = (jour: number, aujourdhui: string) =>
  prochainsEncaissements(jour, aujourdhui, 3).map(formatJourMoisCourt).join(', ');

console.log('\n=== 1. LES MOIS COURTS, CAS PAR CAS ===');
{
  /* Les cinq cas nommes par David, verifies sur la regle elle-meme. */
  t('31 en fevrier normal donne le 28', jourRabattu(31, 2026, 2) === 28);
  t('31 en fevrier bissextil donne le 29', jourRabattu(31, 2028, 2) === 29);
  t('31 en avril donne le 30', jourRabattu(31, 2026, 4) === 30);
  t('30 en fevrier normal donne le 28', jourRabattu(30, 2026, 2) === 28);
  t('30 en fevrier bissextil donne le 29', jourRabattu(30, 2028, 2) === 29);

  /* Et la regle des siecles, qui est le vrai piege des annees bissextiles. */
  t('2100 n est PAS bissextile : 31 fevrier donne le 28', jourRabattu(31, 2100, 2) === 28);
  t('2000 EST bissextile : 31 fevrier donne le 29', jourRabattu(31, 2000, 2) === 29);

  /* Un mois long ne rabat rien. */
  t('31 en janvier reste le 31', jourRabattu(31, 2026, 1) === 31);
  t('un jour ordinaire n est jamais touche', jourRabattu(5, 2026, 2) === 5);
}

console.log('\n=== 2. L APERCU DES PROCHAINES ECHEANCES ===');
{
  /* L'exemple exact donne par David. */
  t('le 31, consulte le 1er fevrier 2026 : « 28 févr., 31 mars, 30 avr. »',
    apercu(31, '2026-02-01') === '28 févr., 31 mars, 30 avr.');

  t('le 31, consulte en janvier : janvier compte encore',
    apercu(31, '2026-01-15') === '31 janv., 28 févr., 31 mars');

  t('le 31 en annee bissextile montre bien le 29',
    apercu(31, '2028-02-10') === '29 févr., 31 mars, 30 avr.');

  t('le 30 en fevrier bissextil montre le 29',
    apercu(30, '2028-02-01') === '29 févr., 30 mars, 30 avr.');

  t('le 30 en fevrier normal montre le 28',
    apercu(30, '2026-02-01') === '28 févr., 30 mars, 30 avr.');

  /* Le mois en cours ne compte QUE si son echeance est encore devant. */
  t('consulte AVANT l echeance : le mois en cours est inclus',
    apercu(20, '2026-10-10').startsWith('20 oct.'));
  t('consulte LE JOUR MEME : le mois en cours est encore inclus',
    apercu(20, '2026-10-20').startsWith('20 oct.'));
  t('consulte APRES : on passe au mois suivant',
    apercu(20, '2026-10-25').startsWith('20 nov.'));

  /*
   * Le piege fin : un loyer au 31, consulte un 30 avril. L echeance d avril EST le
   * 30 — c est aujourd hui — donc elle doit figurer. Une comparaison faite sur le jour
   * BRUT (31 > 30) la ferait sauter.
   */
  t('le 31, consulte le 30 avril : avril compte, c est son echeance',
    apercu(31, '2026-04-30').startsWith('30 avr.'));
  t('le 31, consulte le 1er mai : avril est passe',
    apercu(31, '2026-05-01').startsWith('31 mai'));

  /* Le passage d annee. */
  t('decembre passe bien a janvier de l annee suivante',
    prochainsEncaissements(15, '2026-12-20', 2).join() === '2027-01-15,2027-02-15');

  /* Le nombre demande est respecte. */
  t('on rend exactement le nombre demande',
    prochainsEncaissements(10, '2026-01-01', 6).length === 6);
  t('six mois d affilee ne sautent aucun mois',
    prochainsEncaissements(10, '2026-01-01', 6).join()
    === '2026-01-10,2026-02-10,2026-03-10,2026-04-10,2026-05-10,2026-06-10');

  /* Chaque echeance rendue est une date qui EXISTE vraiment. */
  const douze = prochainsEncaissements(31, '2028-01-01', 14);
  t('aucune echeance ne deborde sur le mois suivant',
    douze.every(d => {
      const [a, m, j] = d.split('-').map(Number);
      return j <= dernierJourDuMois(a, m);
    }));
  t('quatorze mois couvrent bien deux fevriers',
    douze.filter(d => d.slice(5, 7) === '02').length === 2);
}

console.log('\n=== 3. CE QUI N EST PAS UNE SAISIE VALABLE NE REND RIEN ===');
{
  t('jour 0', prochainsEncaissements(0, '2026-02-01').length === 0);
  t('jour 32', prochainsEncaissements(32, '2026-02-01').length === 0);
  t('jour negatif', prochainsEncaissements(-5, '2026-02-01').length === 0);
  t('jour NaN', prochainsEncaissements(Number.NaN, '2026-02-01').length === 0);
  t('date illisible', prochainsEncaissements(10, 'pas-une-date').length === 0);
  t('date vide', prochainsEncaissements(10, '').length === 0);
  t('mois impossible', prochainsEncaissements(10, '2026-13-01').length === 0);
  t('nombre d echeances nul', prochainsEncaissements(10, '2026-02-01', 0).length === 0);
  /* Un decimal est tronque, pas refuse : la liste ne peut en produire, mais une
     ancienne valeur en base le pourrait. */
  t('un decimal est tronque', prochainsEncaissements(10.9, '2026-01-01', 1).join() === '2026-01-10');
}

console.log('\n=== 4. LES MOIS ABREGES ===');
{
  const attendus = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
                    'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  let tous = true;
  for (let m = 1; m <= 12; m++) {
    const iso = `2026-${String(m).padStart(2, '0')}-05`;
    if (formatJourMoisCourt(iso) !== `5 ${attendus[m - 1]}`) {
      tous = false;
      console.log(`        -> mois ${m} : « ${formatJourMoisCourt(iso)} »`);
    }
  }
  t('les douze mois s abregent comme attendu', tous);
  t('le jour n est pas complete a deux chiffres', formatJourMoisCourt('2026-03-05') === '5 mars');
  t('une date illisible rend une chaine vide', formatJourMoisCourt('n importe quoi') === '');

  /*
   * Ces abreviations sont ecrites a la main, pas tirees d Intl : une Date obligerait a
   * choisir un fuseau pour une date calendaire qui n en a pas, et les abreviations
   * d Intl dependent de la version d ICU du navigateur.
   */
  t('aucun appel a Intl pour abreger un mois',
    !/Intl[^\n]*month/.test(code('../../src/lib/crmImmoAlertes.ts')));
}

console.log('\n=== 5. LE CHAMP EST UNE LISTE, ET IL MONTRE L APERCU ===');
{
  const src = code('../../src/pages/admin/views/crm-immo/CrmImmoChampsDossier.tsx');

  /*
   * On capture la balise REELLEMENT rendue pour ce champ, pas une balise quelconque dans
   * les parages : ce formulaire contient deja un <select> pour les colonnes « oui / non »,
   * et une assertion de voisinage passerait meme si le champ redevenait un <input>.
   */
  const balise = /cle === 'jour_encaissement'\s*\?\s*<(\w+)/.exec(src);
  t('la branche du jour d encaissement est trouvable', balise !== null);
  t('elle rend une LISTE DEROULANTE, et pas autre chose', balise?.[1] === 'select');
  t('ce n est plus un champ de saisie libre',
    !/min: 1, max: 31, step: 1/.test(src) && !/jour_encaissement[\s\S]{0,200}?<input/.test(src));
  t('la liste propose les 31 jours',
    /Array\.from\(\s*\{ length: 31 \}/.test(src));
  t('les trois jours delicats sont expliques dans la liste',
    /n === 29/.test(src) && /n === 30/.test(src) && /n === 31/.test(src));
  t('un choix vide reste possible', /<option value="">—<\/option>/.test(src));

  t('l apercu est calcule par la fonction pure, pas refait sur place',
    /prochainsEncaissements\(/.test(src) && /formatJourMoisCourt/.test(src));
  t('l apercu porte un libelle explicite',
    /Prochains encaissements/.test(src));
  t('l apercu est repérable pour les relevés',
    /data-testid="crm-immo-apercu-encaissements"/.test(src));

  /*
   * Le MEME composant dessine « Ajouter un client » et « Détails / Modifier » : la liste
   * et l apercu arrivent donc dans les deux sans qu on ait a les y poser deux fois.
   */
  for (const f of ['CrmImmoDossierModal.tsx', 'CrmImmoDetailsModal.tsx']) {
    t(`${f} passe par le composant de champs partage`,
      /CrmImmoChampsDossier/.test(code('../../src/pages/admin/views/crm-immo/' + f)));
  }

  /* La regle mobile des 16 px, sans quoi iOS Safari agrandit la page au premier toucher. */
  t('la liste respecte la regle des 16 px sur mobile',
    /max-md:text-base/.test(src));
}

console.log('\n=== 6. NI LA BASE NI LA REGLE N ONT BOUGE ===');
{
  const alertes = code('../../src/lib/crmImmoAlertes.ts');
  const echeancier = code('../../src/lib/crmImmoEcheancier.ts');

  /*
   * jourRabattu a demenage dans crmImmoEcheancier le 22 octobre 2026 : l echeancier en
   * a besoin, et les alertes ont besoin de l echeancier pour numeroter leurs loyers —
   * la laisser dans les alertes creait un cycle d imports.
   *
   * Ce qui compte n est pas OU elle vit, c est qu il n en existe QU UNE. Deux
   * implementations du 31 fevrier finiraient par differer, et c est exactement ce que
   * David a interdit.
   */
  t('jourRabattu existe toujours et rabat toujours',
    /export function jourRabattu/.test(echeancier) && /Math\.min\(Math\.max\(1/.test(echeancier));
  t('les alertes la RE-EXPORTENT au lieu de la recopier',
    /export \{ jourRabattu, lireJour, dernierJourDuMois \}/.test(alertes)
    && !/export function jourRabattu/.test(alertes));
  t('il n existe qu UNE implementation du rabattement dans tout src/',
    (code('../../src/lib/crmImmoAlertes.ts') + echeancier).match(/function jourRabattu/g)?.length === 1);
  t('l apercu REUTILISE jourRabattu au lieu de refaire le calcul',
    /prochainsEncaissements[\s\S]{0,900}?jourRabattu\(/.test(alertes));

  const types = code('../../src/pages/admin/views/crm-immo/crmImmoTypes.ts');
  t('la colonne jour_encaissement est toujours un nombre',
    /cle: 'jour_encaissement'[^}]*type: 'nombre'/.test(types));

  /* Aucune migration ne touche cette colonne. */
  const migrations = readdirSync('supabase/migrations').filter(f => f.endsWith('.sql'));
  t('des migrations sont bien lues', migrations.length > 0);
  t('aucune migration ne renomme ni ne retype jour_encaissement',
    migrations.every(f => {
      const sql = readFileSync('supabase/migrations/' + f, 'utf8');
      return !/(RENAME COLUMN\s+jour_encaissement|ALTER COLUMN\s+jour_encaissement\s+TYPE)/i.test(sql);
    }));
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
