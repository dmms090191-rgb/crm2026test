/**
 * Tests de LA LECTURE INTEGRALE — plus de troncature silencieuse.
 * Lancer :  npx tsx scripts/crm-immo/lectureIntegrale.test.ts
 *
 * ---------- CE QUI EST EN JEU ----------
 *
 * PostgREST tronque les reponses au-dela de `db-max-rows`, et il le fait SANS erreur :
 * la requete reussit, `error` vaut null, il manque simplement des lignes.
 *
 * David : << Je ne veux pas decouvrir dans 2 ans que les anciens loyers ne sont plus
 * pris en compte parce qu'on a depasse 1000 lignes. >>
 *
 * `crm_immo_loyers` gagne une ligne par mois et par dossier. Cent dossiers, et la table
 * passe le millier en moins d'un an : les compteurs se mettraient alors a oublier les
 * plus anciens loyers, en silence.
 *
 * ---------- POURQUOI CE FICHIER EST UN VRAI TEST, PAS UNE LECTURE DE SOURCE ----------
 *
 * lireToutesLesLignes ne connait pas supabase : elle recoit une fonction qui rend une
 * page. On peut donc lui en donner une fausse, et mesurer son comportement — y compris
 * les cas qu'on ne saurait pas provoquer en base, comme un serveur qui coupe plus court
 * que la taille demandee.
 */
import { lireToutesLesLignes, TAILLE_PAGE } from '../../src/lib/lectureIntegrale.ts';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

interface Ligne { id: number }
const lignes = (n: number): Ligne[] => Array.from({ length: n }, (_, i) => ({ id: i }));

/**
 * Un faux serveur.
 *
 * @param total    combien de lignes il possede
 * @param plafond  combien il en rend AU PLUS par requete — le `db-max-rows` qu'on ne
 *                 connait pas de l'exterieur
 * @param compte   ce qu'il annonce dans `count`, ou null s'il n'annonce rien
 */
function serveur(total: number, plafond = Infinity, compte: number | null = total) {
  const appels: { de: number; a: number }[] = [];
  const toutes = lignes(total);
  const page = (de: number, a: number) => {
    appels.push({ de, a });
    const demandees = a - de + 1;
    const rendues = Math.min(demandees, plafond);
    return Promise.resolve({
      data: toutes.slice(de, de + rendues),
      error: null,
      count: compte,
    });
  };
  return { page, appels };
}

console.log('\n=== 1. ELLE RAMENE TOUT, QUEL QUE SOIT LE NOMBRE DE PAGES ===');
{
  const petit = serveur(3);
  const r1 = await lireToutesLesLignes<Ligne>(petit.page, 10);
  t('moins d une page : une seule requete', petit.appels.length === 1);
  t('et toutes les lignes', r1.data?.length === 3 && r1.error === null);

  const pile = serveur(20);
  const r2 = await lireToutesLesLignes<Ligne>(pile.page, 10);
  /*
   * PILE deux pages pleines. La deuxieme fait exactement 10, donc on ne peut pas savoir
   * si c'est la derniere : il FAUT une troisieme requete, qui revient vide.
   * Une boucle qui s'arreterait a la deuxieme perdrait tout ce qui suit.
   */
  t('un multiple exact demande une page de plus, pour savoir', pile.appels.length === 3);
  t('et ne rend pas une ligne de trop', r2.data?.length === 20);

  const grand = serveur(2500);
  const r3 = await lireToutesLesLignes<Ligne>(grand.page, 1000);
  t('2500 lignes en trois pages', grand.appels.length === 3);
  t('les 2500 sont la', r3.data?.length === 2500);
  t('et dans l ordre', r3.data?.[0].id === 0 && r3.data?.[2499].id === 2499);

  t('les intervalles demandes ne se chevauchent pas',
    grand.appels.every((p, i) => i === 0 || p.de === grand.appels[i - 1].a + 1));
}

console.log('\n=== 2. UNE TRONCATURE DEVIENT UNE ERREUR, JAMAIS UN SILENCE ===');
{
  /*
   * LE CAS QU'ON NE PEUT PAS PROVOQUER EN BASE.
   *
   * Si le plafond du serveur est PLUS BAS que la taille de page demandee, la premiere
   * page revient deja incomplete : la boucle croit avoir fini, et rend 500 lignes sur
   * 2500 sans la moindre erreur. C'est exactement le defaut qu'on corrige, et aucune
   * pagination naive ne le voit.
   *
   * C'est pourquoi on compare ce qu'on a recu a ce que le serveur ANNONCE.
   */
  const bride = serveur(2500, 500);
  const r = await lireToutesLesLignes<Ligne>(bride.page, 1000);
  t('un serveur plus bride que prevu ne rend PAS un succes partiel', r.data === null);
  t('il rend une erreur', r.error !== null);
  t('qui dit combien manque', /500 lignes reçues sur 2500/.test(r.error?.message ?? ''));
  t('avec un code reperable', r.error?.code === 'PGRST_TRONQUE');

  /* Et si la taille demandee tient sous le plafond, tout va bien. */
  const ok500 = await lireToutesLesLignes<Ligne>(serveur(2500, 500).page, 500);
  t('la meme bride, avec une taille de page compatible, rend tout',
    ok500.data?.length === 2500 && ok500.error === null);
}

console.log('\n=== 3. CE QU ELLE FAIT DES CAS LIMITES ===');
{
  const vide = await lireToutesLesLignes<Ligne>(serveur(0).page, 10);
  t('zero ligne : un tableau vide, pas une erreur', vide.data?.length === 0 && vide.error === null);

  /* Un serveur qui n annonce rien : on ne peut plus verifier, on ne bloque pas. */
  const muet = await lireToutesLesLignes<Ligne>(serveur(25, Infinity, null).page, 10);
  t('sans compte annonce, elle rend quand meme ce qu elle a', muet.data?.length === 25);
  t('et ne fabrique pas une erreur qu elle ne peut pas prouver', muet.error === null);

  /* Une erreur de la premiere page s arrete net : pas de page 2 dans le vide. */
  let appels = 0;
  const casse = await lireToutesLesLignes<Ligne>(() => {
    appels++;
    return Promise.resolve({ data: null, error: { name: 'x', message: 'refus', details: '', hint: '', code: '42501' }, count: null });
  }, 10);
  t('une erreur remonte telle quelle', casse.error?.code === '42501' && casse.data === null);
  t('et on n insiste pas', appels === 1);
}

console.log('\n=== 4. LE GARDE-FOU CONTRE LA BOUCLE INFINIE ===');
{
  /*
   * Un serveur qui rendrait toujours une page pleine — un ordre non deterministe, par
   * exemple — ferait tourner la boucle sans fin. Dans un navigateur, ca gele l'onglet,
   * et ca ne se diagnostique pas. On s'arrete donc, et le controle de completude
   * transforme l'arret en erreur lisible.
   */
  let appels = 0;
  const sansFin = await lireToutesLesLignes<Ligne>((de, a) => {
    appels++;
    return Promise.resolve({ data: lignes(a - de + 1), error: null, count: 10_000_000 });
  }, 1000);
  t('la boucle s arrete', appels <= 200);
  t('et le dit', sansFin.error?.code === 'PGRST_TRONQUE');
}

console.log('\n=== 5. LA TAILLE DE PAGE PAR DEFAUT ===');
{
  /*
   * 1000 est la valeur historique de db-max-rows chez Supabase. On ne la LIT pas — elle
   * n'est pas exposee a l'application — et c'est tout l'interet du controle de
   * completude : si le serveur coupe plus bas, la lecture le dit au lieu de mentir.
   */
  t('la taille par defaut est 1000', TAILLE_PAGE === 1000);
  const defaut = serveur(1500);
  await lireToutesLesLignes<Ligne>(defaut.page);
  t('et elle est bien utilisee sans argument',
    defaut.appels[0].a - defaut.appels[0].de + 1 === 1000);
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
