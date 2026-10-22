/**
 * Tests de L'ECHEANCIER DES LOYERS — la seule source de calcul.
 * Lancer :  npx tsx scripts/crm-immo/echeancier.test.ts
 *
 * ---------- CE QUI EST EN JEU ----------
 *
 * Trois endroits lisent cet echeancier : l'onglet Echeancier, l'apercu du formulaire, et
 * la numerotation des notifications (<< 4e loyer sur 12 >>). David a pose la regle :
 * une seule logique de calcul, pas trois. Ces tests tiennent donc le calcul lui-meme, et
 * un autre fichier verifie que personne n'en a recrit une seconde ailleurs.
 *
 * Le nombre total de loyers n'est JAMAIS saisi : il tombe de la periode. Et il doit etre
 * le nombre REEL d'echeances comprises entre les deux dates — pas un nombre de mois
 * theorique, qui se tromperait des qu'une borne tombe au milieu d'un mois.
 */
import {
  construireEcheancier, compterLoyers, statutDe, loyerActuel, loyerAAlerter,
  rangDuLoyer, compterParStatut, LIBELLE_STATUT, dernierJourDuMois,
  type StatutLoyer,
} from '../../src/lib/crmImmoEcheancier.ts';
import { enDateFrancaise, jourRabattu } from '../../src/lib/crmImmoAlertes.ts';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

const ech = (debut: string | null, fin: string | null, jour: number | null) =>
  construireEcheancier({ debut, fin, jour });
const dates = (e: ReturnType<typeof construireEcheancier>) => e.map(x => x.date);
const jamais = () => false;
const toujours = () => true;

console.log('\n=== 1. LA DUREE DU BAIL DONNE LE NOMBRE DE LOYERS ===');
{
  /* Les quatre durees nommees par David, plus celle de son dossier reel. */
  t('6 mois : 6 loyers',   compterLoyers({ debut: '2026-01-09', fin: '2026-06-09', jour: 9 }) === 6);
  t('1 an : 12 loyers',    compterLoyers({ debut: '2026-01-09', fin: '2026-12-09', jour: 9 }) === 12);
  t('18 mois : 18 loyers', compterLoyers({ debut: '2026-01-09', fin: '2027-06-09', jour: 9 }) === 18);
  t('2 ans : 24 loyers',   compterLoyers({ debut: '2026-01-09', fin: '2027-12-09', jour: 9 }) === 24);

  /* Le dossier reel du module : du 06/10 au 20/10, loyer le 20. Un seul loyer. */
  t('un bail de quinze jours : 1 loyer',
    compterLoyers({ debut: '2026-10-06', fin: '2026-10-20', jour: 20 }) === 1);

  /*
   * LE TOTAL EST LE NOMBRE REEL, PAS UN NOMBRE DE MOIS.
   *
   * Du 10/01 au 10/07 il y a six mois pleins, mais si le loyer tombe le 5, la premiere
   * echeance dans la periode est celle de fevrier et la derniere celle de juillet : six
   * loyers quand meme, mais pas les memes. Et du 10/01 au 09/07, le loyer du 5 juillet
   * compte alors que le mois de juillet n'est pas entier.
   */
  t('la borne du debut ecarte le loyer deja passe',
    dates(ech('2026-01-10', '2026-07-10', 5)).join() ===
    '2026-02-05,2026-03-05,2026-04-05,2026-05-05,2026-06-05,2026-07-05');
  t('un mois incomplet compte si son loyer y tombe',
    compterLoyers({ debut: '2026-01-10', fin: '2026-07-09', jour: 5 }) === 6);
  t('un mois incomplet ne compte PAS si son loyer n y tombe pas',
    compterLoyers({ debut: '2026-01-10', fin: '2026-07-04', jour: 5 }) === 5);
}

console.log('\n=== 2. LES MOIS COURTS ET LES ANNEES BISSEXTILES ===');
{
  const annee2026 = ech('2026-01-01', '2026-12-31', 31);
  t('jour 31 sur une annee pleine : 12 loyers', annee2026.length === 12);
  t('jour 31 en fevrier 2026 donne le 28', dates(annee2026)[1] === '2026-02-28');
  t('jour 31 en avril donne le 30', dates(annee2026)[3] === '2026-04-30');
  t('jour 31 en janvier reste le 31', dates(annee2026)[0] === '2026-01-31');

  const bissextile = ech('2028-01-01', '2028-12-31', 31);
  t('jour 31 en fevrier BISSEXTIL donne le 29', dates(bissextile)[1] === '2028-02-29');

  /* La regle des siecles, que porte deja dernierJourDuMois. */
  t('2100 n est pas bissextile', dernierJourDuMois(2100, 2) === 28);
  t('2000 est bissextile', dernierJourDuMois(2000, 2) === 29);
  t('jour 31 en fevrier 2100 donne le 28',
    dates(ech('2100-01-01', '2100-03-31', 31))[1] === '2100-02-28');

  /* Aucune echeance ne deborde jamais sur le mois suivant. */
  const long = ech('2026-01-01', '2029-12-31', 31);
  t('quatre ans au 31 : 48 loyers', long.length === 48);
  t('aucune echeance ne deborde de son mois',
    dates(long).every(d => {
      const [a, m, j] = d.split('-').map(Number);
      return j <= dernierJourDuMois(a, m);
    }));
  t('l echeancier REUTILISE jourRabattu',
    dates(long)[1] === `2026-02-${jourRabattu(31, 2026, 2)}`);
}

console.log('\n=== 3. CE QUI NE PRODUIT AUCUNE ECHEANCE ===');
{
  t('sans date de debut', ech(null, '2026-12-31', 5).length === 0);
  t('sans date de fin', ech('2026-01-01', null, 5).length === 0);
  t('sans jour', ech('2026-01-01', '2026-12-31', null).length === 0);
  t('fin AVANT debut', ech('2026-12-31', '2026-01-01', 5).length === 0);
  t('jour 0', ech('2026-01-01', '2026-12-31', 0).length === 0);
  t('jour 32', ech('2026-01-01', '2026-12-31', 32).length === 0);
  t('date abimee', ech('pas-une-date', '2026-12-31', 5).length === 0);
  t('mois impossible', ech('2026-13-01', '2026-12-31', 5).length === 0);

  /* Une periode a cheval qui ne contient aucune echeance : 0, et ce n est pas une erreur. */
  t('periode a cheval sans echeance dedans', ech('2026-01-25', '2026-02-05', 20).length === 0);
  /* Debut et fin le meme jour, qui EST le jour du loyer. */
  t('un seul jour, qui est le jour du loyer', ech('2026-03-15', '2026-03-15', 15).length === 1);
  t('un seul jour, qui ne l est pas', ech('2026-03-14', '2026-03-14', 15).length === 0);
}

console.log('\n=== 4. LA NUMEROTATION ===');
{
  const an = ech('2026-01-09', '2026-12-09', 9);
  t('le premier porte le numero 1', an[0].numero === 1);
  t('le dernier porte le numero 12', an[11].numero === 12);
  t('tous portent le MEME total', an.every(e => e.total === 12));
  t('les numeros se suivent sans trou', an.every((e, i) => e.numero === i + 1));

  t('le rang s ecrit « 1er loyer sur 12 »', rangDuLoyer(an[0]) === '1er loyer sur 12');
  t('puis « 4e loyer sur 12 »', rangDuLoyer(an[3]) === '4e loyer sur 12');
  t('et « 12e loyer sur 12 »', rangDuLoyer(an[11]) === '12e loyer sur 12');

  /* Les trois exemples de David. */
  t('6 mois : le dernier est « 6e loyer sur 6 »',
    rangDuLoyer(ech('2026-01-09', '2026-06-09', 9)[5]) === '6e loyer sur 6');
  t('18 mois : le dernier est « 18e loyer sur 18 »',
    rangDuLoyer(ech('2026-01-09', '2027-06-09', 9)[17]) === '18e loyer sur 18');
}

console.log('\n=== 5. LES QUATRE STATUTS ===');
{
  const AUJ = '2026-06-15';
  t('encaisse l emporte sur tout', statutDe('2026-01-05', true, AUJ) === 'encaisse');
  t('encaisse meme si a venir', statutDe('2026-12-05', true, AUJ) === 'encaisse');
  t('a venir : echeance future', statutDe('2026-06-20', false, AUJ) === 'a-venir');
  t('a encaisser : echue, mois COURANT', statutDe('2026-06-05', false, AUJ) === 'a-encaisser');
  t('a encaisser : echue AUJOURD HUI meme', statutDe('2026-06-15', false, AUJ) === 'a-encaisser');
  t('en retard : echue, mois ANTERIEUR', statutDe('2026-05-05', false, AUJ) === 'en-retard');
  t('en retard : annee anterieure', statutDe('2025-12-05', false, AUJ) === 'en-retard');

  /* La frontiere du mois, des deux cotes, au jour pres. */
  t('le dernier jour du mois precedent est EN RETARD',
    statutDe('2026-05-31', false, AUJ) === 'en-retard');
  t('le premier jour du mois courant est A ENCAISSER',
    statutDe('2026-06-01', false, AUJ) === 'a-encaisser');

  /*
   * AUCUN DELAI DE GRACE N EST INVENTE, et c est le point le plus facile a perdre.
   *
   * Un loyer du 31 mai, consulte le 2 juin, n est en retard que de DEUX jours. La
   * tentation serait de le laisser << a encaisser >> encore un peu. Ce serait inventer
   * un reglage que personne n a pose, et qu il faudrait ensuite defendre : cinq jours ?
   * dix ? La regle de David ne demande aucun arbitrage — mois passe, donc en retard.
   *
   * Ces deux relevés sont ce qui distingue sa regle d un delai de grace : sans eux,
   * ajouter << sauf si moins de cinq jours >> passerait inapercu.
   */
  t('un loyer du mois precedent, echu depuis DEUX jours, est deja en retard',
    statutDe('2026-05-31', false, '2026-06-02') === 'en-retard');
  t('un loyer du mois precedent, echu depuis UN jour, aussi',
    statutDe('2026-05-31', false, '2026-06-01') === 'en-retard');
  /* Et a l inverse : trente jours de retard DANS le mois restent « a encaisser ». */
  t('trente jours de retard dans le MEME mois restent « a encaisser »',
    statutDe('2026-06-01', false, '2026-06-30') === 'a-encaisser');

  t('les quatre statuts ont un libelle', (['encaisse', 'a-venir', 'a-encaisser', 'en-retard'] as StatutLoyer[])
    .every(s => (LIBELLE_STATUT[s] ?? '').length > 0));
}

console.log('\n=== 6. LE LOYER ACTUEL — ET SON ABSENCE ===');
{
  const an = ech('2026-01-09', '2026-12-09', 9);
  t('le loyer du mois courant est trouve',
    loyerActuel(an, '2026-04-20')?.date === '2026-04-09');
  t('il est trouve meme AVANT son echeance',
    loyerActuel(an, '2026-04-01')?.date === '2026-04-09');
  t('son numero est celui de l echeancier', loyerActuel(an, '2026-04-20')?.numero === 4);

  /*
   * L ABSENCE EST UNE REPONSE. Contrat pas commence, contrat fini, ou mois sans
   * echeance : rien n est surligne, et c est l information juste.
   */
  t('avant le debut du contrat : AUCUN loyer actuel', loyerActuel(an, '2025-11-20') === null);
  t('apres la fin du contrat : AUCUN loyer actuel', loyerActuel(an, '2027-03-20') === null);

  const troue = ech('2026-01-25', '2026-04-10', 20);
  t('un mois sans echeance : AUCUN loyer actuel', loyerActuel(troue, '2026-01-28') === null);
  t('et on ne surligne PAS la prochaine a la place',
    loyerActuel(troue, '2026-01-28') === null && troue.length > 0);

  t('un echeancier vide ne surligne rien', loyerActuel([], '2026-04-20') === null);
}

console.log('\n=== 7. LE LOYER QUI ALERTE ===');
{
  const an = ech('2026-01-09', '2026-12-09', 9);

  t('rien n est du encore : c est le loyer du mois',
    loyerAAlerter(an, jamais, '2026-01-02')?.date === '2026-01-09');
  t('le loyer du mois est echu : c est lui',
    loyerAAlerter(an, jamais, '2026-01-20')?.date === '2026-01-09');

  /* LE DEFAUT CORRIGE : un impaye de janvier ne disparait pas en fevrier. */
  t('un impaye ANCIEN passe devant celui du mois',
    loyerAAlerter(an, jamais, '2026-04-20')?.date === '2026-01-09');
  t('et il porte son propre numero',
    loyerAAlerter(an, jamais, '2026-04-20')?.numero === 1);

  /* Encaisse = ne reste plus actif. C est la regle posee par David. */
  const payesJusquEnMars = (d: string) => d < '2026-04-01';
  t('les loyers encaisses ne sont plus reclames',
    loyerAAlerter(an, payesJusquEnMars, '2026-04-20')?.date === '2026-04-09');
  t('tout est paye : plus rien a reclamer',
    loyerAAlerter(an, toujours, '2026-04-20') === null);

  t('contrat termine et tout paye : rien',
    loyerAAlerter(an, toujours, '2027-05-01') === null);
  t('contrat termine mais impaye : il reste reclame',
    loyerAAlerter(an, jamais, '2027-05-01')?.date === '2026-01-09');
  t('echeancier vide : rien', loyerAAlerter([], jamais, '2026-04-20') === null);
}

console.log('\n=== 7 bis. LE CYCLE ENCAISSE -> ANNULE -> RE-ENCAISSE ===');
{
  /*
   * Le cycle complet, tel que David l'a ecrit :
   *
   *   Encaisse -> Annuler l'encaissement -> Non encaisse -> possibilite de re-encaisser
   *
   * Le point delicat est le RETOUR : une echeance annulee ne redevient pas << non
   * encaissee >> tout court, elle reprend le statut que sa DATE lui donne. Trois dates
   * differentes, trois retours differents — et c'est ce qui serait perdu si l'annulation
   * posait un statut fige au lieu de laisser le calcul reprendre la main.
   */
  const an = ech('2026-01-09', '2026-12-09', 9);
  const AUJ = '2026-06-15';

  for (const [date, attendu] of [
    ['2026-07-09', 'a-venir'],     // encore devant
    ['2026-06-09', 'a-encaisser'], // echue, mois courant
    ['2026-04-09', 'en-retard'],   // echue, mois passe
  ] as [string, StatutLoyer][]) {
    t(`${date} : encaisse`, statutDe(date, true, AUJ) === 'encaisse');
    t(`${date} : annule -> redevient « ${LIBELLE_STATUT[attendu]} »`,
      statutDe(date, false, AUJ) === attendu);
    t(`${date} : re-encaisse -> « Encaissé » a nouveau`, statutDe(date, true, AUJ) === 'encaisse');
  }

  /* Et l'alerte suit : une echeance annulee redevient reclamable. */
  const payeAvril = (d: string) => d === '2026-04-09';
  t('encaisse : avril n est plus reclame',
    loyerAAlerter(an, payeAvril, AUJ)?.date !== '2026-04-09');
  t('annule : avril redevient le plus ancien impaye',
    loyerAAlerter(an, jamais, AUJ)?.date === '2026-01-09');

  /*
   * LA REGLE DEFINITIVE DES CONTRATS TERMINES, tranchee par David :
   *   - jamais de NOUVELLE echeance apres la fin du bail ;
   *   - mais une VRAIE dette du bail reste visible jusqu'a encaissement.
   */
  const court = ech('2026-10-06', '2026-10-20', 20);
  t('un bail fini ne produit aucune echeance hors de ses bornes', court.length === 1);
  t('sa dette reste reclamee des annees apres',
    loyerAAlerter(court, jamais, '2030-01-10')?.date === '2026-10-20');
  t('une fois encaissee, plus rien n est reclame',
    loyerAAlerter(court, toujours, '2030-01-10') === null);
  t('et aucune echeance de 2030 n est inventee',
    court.every(e => e.date.startsWith('2026-10')));
}

console.log('\n=== 8. LES COMPTEURS ===');
{
  const an = ech('2026-01-09', '2026-12-09', 9);
  const payesAvantAvril = (d: string) => d < '2026-04-01';
  const c = compterParStatut(an, payesAvantAvril, '2026-05-20');

  t('3 encaisses (janvier a mars)', c.encaisse === 3);
  t('1 a encaisser (mai, echu dans le mois)', c['a-encaisser'] === 1);
  t('1 en retard (avril, mois passe)', c['en-retard'] === 1);
  t('7 a venir (juin a decembre)', c['a-venir'] === 7);
  t('le compte total retombe sur l echeancier',
    c.encaisse + c['a-encaisser'] + c['en-retard'] + c['a-venir'] === an.length);
}

console.log('\n=== 9. L AFFICHAGE REUTILISE enDateFrancaise ===');
{
  /* David : JJ/MM/AAAA, et pas une seconde fonction de formatage. */
  t('une echeance s affiche en JJ/MM/AAAA',
    enDateFrancaise('2026-01-09') === '09/01/2026');
  t('le jour et le mois sont sur deux chiffres',
    enDateFrancaise('2026-03-05') === '05/03/2026');
  t('toutes les echeances d une annee se formatent',
    ech('2026-01-31', '2026-12-31', 31).every(e => /^\d{2}\/\d{2}\/\d{4}$/.test(enDateFrancaise(e.date))));
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
