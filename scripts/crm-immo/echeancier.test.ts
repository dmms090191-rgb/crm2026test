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
  compterTableauDeBord, classerTableauDeBord, echeancierDuDossier,
  CATEGORIES_CONTRAT, COMPTEUR_DE_CATEGORIE,
  PREAVIS_RENOUVELLEMENT, ajouterJours,
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

console.log('\n=== 8 bis. LES SEPT COMPTEURS DU TABLEAU DE BORD ===');
{
  const AUJ = '2026-10-22';
  /* « cloturee: false » est ECRIT EXPRES : les tests de scripts/ ne sont pas
     typecheckes (tsconfig.app.json n'inclut que src), donc un champ manquant y
     passerait en silence comme « undefined » — faux, mais vert. */
  const periode = (dossier_id: string, debut: string, fin: string, jour = 5) =>
    ({ dossier_id, debut, fin, jour_encaissement: jour, cloturee: false });

  /*
   * LA PARTITION. Quatre categories de contrat, et un bail n'entre que dans UNE.
   * L'ordre des tests est celui de la certitude : fini d'abord, pas commence ensuite,
   * en cours par elimination.
   */
  const lot = [
    periode('expire', '2025-01-01', '2026-10-21'),        // fini hier
    periode('finAujourdhui', '2025-01-01', '2026-10-22'), // finit aujourd hui -> a renouveler
    periode('finProche', '2026-01-01', '2026-11-10'),     // dans 19 jours -> a renouveler
    periode('finLoin', '2026-01-01', '2027-12-31'),       // bien au-dela du preavis
    periode('futur', '2026-10-23', '2027-10-22'),         // commence demain
    periode('debutAujourdhui', '2026-10-22', '2027-10-21'),
  ];
  const classe = classerTableauDeBord({ periodes: lot, encaissements: [], aujourdhui: AUJ });
  const c = classe.compteurs;

  /*
   * LA PARTITION STRICTE, exigee par David le 22 octobre 2026 :
   * << Un contrat ne doit apparaitre que dans UNE seule de ces quatre categories. >>
   *
   * On verifie les deux faces : la somme couvre tout (aucun trou) ET l'union des
   * quatre ensembles a exactement la taille de la somme (aucun recouvrement). Une
   * somme juste avec un recouvrement serait invisible sans la seconde mesure.
   */
  const sommeContrats = c.bauxExpires + c.bauxAVenir + c.contratsARenouveler + c.dossiersEnCours;
  const union = new Set(CATEGORIES_CONTRAT.flatMap(k => [...classe.dossiers[k]]));
  t('les QUATRE categories couvrent TOUS les baux', sommeContrats === lot.length);
  t('et aucun bail n est compte deux fois', union.size === lot.length);
  t('1 bail expire', c.bauxExpires === 1);
  t('1 bail a venir', c.bauxAVenir === 1);
  t('2 contrats a renouveler', c.contratsARenouveler === 2);
  t('2 dossiers en cours', c.dossiersEnCours === 2);

  /* Et nommement : les deux baux a fin proche ne sont PLUS dans << en cours >>. */
  t('finProche n est pas dans « dossiers en cours »',
    !classe.dossiers['dossiers-en-cours'].has('finProche')
    && classe.dossiers['contrats-a-renouveler'].has('finProche'));
  t('finAujourdhui non plus',
    !classe.dossiers['dossiers-en-cours'].has('finAujourdhui')
    && classe.dossiers['contrats-a-renouveler'].has('finAujourdhui'));

  /* Les deux bornes du jour meme, qui decident de la categorie. */
  const finAuj = compterTableauDeBord({ periodes: [periode('x', '2025-01-01', AUJ)], encaissements: [], aujourdhui: AUJ });
  t('un bail qui finit AUJOURD HUI n est pas expire : il est a renouveler',
    finAuj.bauxExpires === 0 && finAuj.contratsARenouveler === 1 && finAuj.dossiersEnCours === 0);
  t('un bail qui commence AUJOURD HUI est en cours, pas a venir',
    compterTableauDeBord({ periodes: [periode('x', AUJ, '2027-01-01')], encaissements: [], aujourdhui: AUJ })
      .dossiersEnCours === 1);
  t('un bail fini HIER est expire',
    compterTableauDeBord({ periodes: [periode('x', '2025-01-01', '2026-10-21')], encaissements: [], aujourdhui: AUJ })
      .bauxExpires === 1);

  /*
   * LE DOUBLE COMPTAGE QUE DAVID A NOMME : un bail dont la fin est passee ne doit PAS
   * apparaitre aussi dans << a renouveler >>, meme si cette fin tombe dans la fenetre
   * de trente jours — ce qui est le cas d'un bail fini il y a deux jours.
   */
  const finiRecemment = compterTableauDeBord({
    periodes: [periode('x', '2025-01-01', '2026-10-20')], encaissements: [], aujourdhui: AUJ,
  });
  t('un bail fini il y a deux jours : expire, et PAS a renouveler',
    finiRecemment.bauxExpires === 1 && finiRecemment.contratsARenouveler === 0);

  /* La borne des trente jours : de part et d'autre, et sur le jour meme. */
  const finLoin = compterTableauDeBord({ periodes: [periode('x', '2026-01-01', '2026-11-22')], encaissements: [], aujourdhui: AUJ });
  t('le bail qui finit dans 31 jours est EN COURS, pas a renouveler',
    finLoin.contratsARenouveler === 0 && finLoin.dossiersEnCours === 1);
  const finPile = compterTableauDeBord({ periodes: [periode('x', '2026-01-01', '2026-11-21')], encaissements: [], aujourdhui: AUJ });
  t('celui qui finit le 30e jour PILE est a renouveler, et PAS en cours',
    finPile.contratsARenouveler === 1 && finPile.dossiersEnCours === 0);

  /*
   * L'UNITE : le compteur et la liste ne mesurent pas la meme chose, et l'interface
   * doit pouvoir le dire. Pour les CONTRATS, l'index partiel unique de la base garantit
   * une periode en cours au plus par dossier, donc compteur = nombre de dossiers.
   */
  for (const k of CATEGORIES_CONTRAT) {
    t(`« ${k} » : autant de dossiers que le compteur`,
      classe.dossiers[k].size === c[COMPTEUR_DE_CATEGORIE[k]]);
  }

  /* Pour les LOYERS, l'unite est l'echeance : neuf retards peuvent n'etre qu'un dossier. */
  const neufRetards = classerTableauDeBord({
    periodes: [periode('solo', '2026-01-05', '2026-12-05', 5)], encaissements: [], aujourdhui: AUJ,
  });
  t('neuf loyers en retard pour UN SEUL dossier',
    neufRetards.compteurs.loyersEnRetard === 9 && neufRetards.dossiers['loyers-en-retard'].size === 1);

  /*
   * CE QUI N'EST PAS UNE DATE NE SE RANGE NULLE PART.
   *
   * La comparaison des periodes est lexicographique : une chaine vide serait
   * `< aujourdhui` et atterrirait sans bruit dans << Baux expires >>. Les colonnes sont
   * `date NOT NULL` en base, donc ce cas ne vient pas de la — mais un chiffre faux et
   * muet est pire qu'un chiffre manquant.
   */
  const illisible = classerTableauDeBord({
    periodes: [periode('vide', '', ''), periode('texte', 'hier', 'demain'), periode('bon', '2026-01-01', '2027-12-31')],
    encaissements: [], aujourdhui: AUJ,
  });
  t('une periode illisible n est rangee dans AUCUNE categorie',
    CATEGORIES_CONTRAT.every(k => !illisible.dossiers[k].has('vide') && !illisible.dossiers[k].has('texte')));
  t('et elle ne gonfle pas « baux expires »', illisible.compteurs.bauxExpires === 0);
  t('la periode valide du meme lot est bien classee', illisible.compteurs.dossiersEnCours === 1);

  /*
   * UNE PERIODE A L'ENVERS (fin < debut) satisfait a la fois << fin < aujourd'hui >> et
   * << debut > aujourd'hui >>. La chaine tranche pour << expiree >>, par l'ordre des
   * branches. Le CHECK crm_immo_contrats_ordre la rend inatteignable depuis la base ;
   * la decision est figee ici pour qu'elle ne depende pas de l'ordre d'ecriture.
   */
  const envers = classerTableauDeBord({
    periodes: [periode('envers', '2027-12-01', '2026-01-01')], encaissements: [], aujourdhui: AUJ,
  });
  t('une periode a l envers est classee EXPIREE, et une seule fois',
    envers.compteurs.bauxExpires === 1 && envers.compteurs.bauxAVenir === 0
    && envers.compteurs.contratsARenouveler === 0 && envers.compteurs.dossiersEnCours === 0);

  /*
   * << ENCAISSES CE MOIS >> compte l'ARGENT RENTRE, pas les echeances du mois.
   * David : un loyer de janvier regle en octobre compte en octobre.
   */
  const unAn = [periode('d', '2026-01-05', '2026-12-05', 5)];
  const regles = compterTableauDeBord({
    periodes: unAn, aujourdhui: AUJ,
    encaissements: [
      { dossier_id: 'd', echeance: '2026-01-05', encaisseLeJour: '2026-10-15' }, // vieux loyer, paye ce mois
      { dossier_id: 'd', echeance: '2026-10-05', encaisseLeJour: '2026-10-05' }, // loyer du mois, paye
      { dossier_id: 'd', echeance: '2026-02-05', encaisseLeJour: '2026-02-05' }, // paye en fevrier
    ],
  });
  t('un loyer de janvier regle en octobre compte en OCTOBRE', regles.encaissesCeMois === 2);
  t('un loyer regle en fevrier ne compte pas en octobre', regles.encaissesCeMois !== 3);
  t('le loyer du mois regle n est plus « a encaisser »', regles.loyersAEncaisser === 0);
  t('les loyers regles ne sont plus « en retard »', regles.loyersEnRetard === 7);

  /* Une annulation n'arrive jamais ici : le hook ne charge que les encaissements
     actifs. Sans encaissement du tout, les neuf echeances echues sont dues. */
  const sansRien = compterTableauDeBord({ periodes: unAn, encaissements: [], aujourdhui: AUJ });
  t('sans encaissement, tout l echu est du',
    sansRien.loyersEnRetard === 9 && sansRien.loyersAEncaisser === 1);
  t('et rien n est compte comme encaisse', sansRien.encaissesCeMois === 0);

  /* Ce qui n'est pas calculable ne produit pas un chiffre invente. */
  const vide = compterTableauDeBord({ periodes: [], encaissements: [], aujourdhui: AUJ });
  t('aucune periode : tout a zero', Object.values(vide).every(v => v === 0));
  t('une date illisible ne fabrique rien',
    Object.values(compterTableauDeBord({ periodes: lot, encaissements: [], aujourdhui: 'n importe quoi' }))
      .every(v => v === 0));

  /* Le preavis est de 30 jours, et il est injectable pour les relevés. */
  t('le preavis par defaut est de 30 jours', PREAVIS_RENOUVELLEMENT === 30);
  t('ajouterJours ne change pas de jour selon le fuseau',
    ajouterJours('2026-10-22', 30) === '2026-11-21' && ajouterJours('2026-12-31', 1) === '2027-01-01');
  t('ajouterJours traverse un 29 fevrier', ajouterJours('2028-02-28', 1) === '2028-02-29');
}

console.log('\n=== 8 ter. UNE DETTE NE DISPARAIT PAS AVEC LE RENOUVELLEMENT ===');
{
  const AUJ = '2026-10-22';
  const per = (debut: string, fin: string, jour: number, cloturee = false) =>
    ({ dossier_id: 'd', debut, fin, jour_encaissement: jour, cloturee });

  /*
   * LA REGLE, POSEE PAR DAVID LE 22 OCTOBRE 2026 :
   *
   *   << Une echeance reelle comprise dans un ancien contrat et toujours non encaissee
   *   doit continuer a apparaitre dans les loyers en retard / a encaisser selon sa
   *   date, meme si la periode a ete cloturee ou renouvelee. Le renouvellement ne doit
   *   jamais faire disparaitre une dette reelle. >>
   *
   * Avant, le tableau de bord ne chargeait que les periodes en cours : le jour du
   * renouvellement, tous les impayes de l'ancien bail sortaient des compteurs. La dette
   * restait en base, le chiffre l'oubliait.
   */
  const ancien = per('2026-01-05', '2026-12-05', 5, true);   // bail d'un an, renouvele en juillet
  const nouveau = per('2026-07-10', '2027-07-09', 5);        // le remplacant

  const avecHistorique = classerTableauDeBord({
    periodes: [ancien, nouveau], encaissements: [], aujourdhui: AUJ,
  });
  const sansHistorique = classerTableauDeBord({
    periodes: [nouveau], encaissements: [], aujourdhui: AUJ,
  });

  t('les impayes de l ancien bail sont encore comptes',
    avecHistorique.compteurs.loyersEnRetard > sansHistorique.compteurs.loyersEnRetard);
  t('le dossier apparait dans le filtre « loyers en retard »',
    avecHistorique.dossiers['loyers-en-retard'].has('d'));

  /*
   * LE CHEVAUCHEMENT. L'ancien bail couvre janvier a decembre, le nouveau juillet a
   * juillet : les echeances d'aout a octobre existent dans les DEUX. Un simple cumul
   * les compterait deux fois.
   *
   * La regle appliquee : chaque periode ne fournit ses echeances que JUSQU'AU DEBUT de
   * la suivante. L'ancien contrat etait en vigueur jusqu'a ce que le nouveau prenne le
   * relais, ni avant ni apres.
   */
  const dates = echeancierDuDossier([ancien, nouveau]).map(e => e.date);
  t('aucune date en double', new Set(dates).size === dates.length);
  t('les dates sont en ordre croissant',
    dates.every((d, i) => i === 0 || dates[i - 1] < d));
  t('l ancien bail s arrete au debut du nouveau',
    dates.includes('2026-07-05') && !dates.includes('2026-06-05') === false);
  t('et le nouveau prend le relais apres son debut',
    dates.includes('2026-08-05') && dates.includes('2027-07-05'));

  /* Janvier a juillet viennent de l'ancien, aout et au-dela du nouveau : 7 + 12 = 19. */
  t('19 echeances en tout, sans trou ni doublon', dates.length === 19);

  /*
   * LE PIEGE DU JOUR D'ENCAISSEMENT QUI CHANGE.
   *
   * Si le nouveau bail encaisse le 20 au lieu du 5, les echeances de septembre seraient
   * le 05 ET le 20 : deux DATES differentes pour un seul loyer du. La coupure au debut
   * de la periode suivante l'empeche, la ou un dedoublonnage par date ne verrait rien.
   */
  const jourChange = echeancierDuDossier([
    per('2026-01-05', '2026-12-05', 5, true),
    per('2026-07-10', '2027-07-09', 20),
  ]).map(e => e.date);
  t('un changement de jour ne fabrique pas deux loyers pour le meme mois',
    !(jourChange.includes('2026-09-05') && jourChange.includes('2026-09-20')));
  t('c est le NOUVEAU jour qui s applique apres le relais',
    jourChange.includes('2026-09-20') && !jourChange.includes('2026-09-05'));
  t('et l ANCIEN avant', jourChange.includes('2026-06-05'));

  /*
   * LE NUMERO RESTE CELUI DE SA PERIODE.
   *
   * David a valide que la numerotation reparte a 1 apres un renouvellement. Une
   * echeance de l'ancien bail garde donc son rang dans l'ancien contrat — et son total
   * aussi, meme si le contrat a ete interrompu avant son terme.
   */
  const complet = echeancierDuDossier([ancien, nouveau]);
  const juin = complet.find(e => e.date === '2026-06-05');
  const aout = complet.find(e => e.date === '2026-08-05');
  t('une echeance de l ancien bail garde son rang d origine',
    juin?.numero === 6 && juin?.total === 12 && juin?.ancienne === true);
  t('la nouvelle periode recommence a 1',
    complet.find(e => e.date === '2026-08-05')?.numero === 1 && aout?.ancienne === false);

  /*
   * LES CATEGORIES DE CONTRAT, ELLES, IGNORENT LES PERIODES CLOTUREES.
   *
   * Sinon un dossier renouvele serait a la fois << expire >> par son ancien bail et
   * << en cours >> par le nouveau : la partition tomberait.
   */
  const cat = CATEGORIES_CONTRAT.filter(k => avecHistorique.dossiers[k].has('d'));
  t('le dossier renouvele n est que dans UNE categorie de contrat', cat.length === 1);
  t('et c est celle du bail en cours', cat[0] === 'dossiers-en-cours');
  t('la somme des quatre vaut le nombre de periodes ACTIVES, pas total',
    avecHistorique.compteurs.bauxExpires + avecHistorique.compteurs.bauxAVenir
    + avecHistorique.compteurs.contratsARenouveler + avecHistorique.compteurs.dossiersEnCours === 1);

  /* Un loyer ancien ENCAISSE ne revient pas, evidemment. */
  const regleEnJuin = classerTableauDeBord({
    periodes: [ancien, nouveau], aujourdhui: AUJ,
    encaissements: [{ dossier_id: 'd', echeance: '2026-06-05', encaisseLeJour: '2026-06-06' }],
  });
  t('un ancien loyer encaisse sort des retards',
    regleEnJuin.compteurs.loyersEnRetard === avecHistorique.compteurs.loyersEnRetard - 1);

  /*
   * LE PAIEMENT ORPHELIN — un defaut que CE code a eu, et qui a ete mesure.
   *
   * Un encaissement est rattache au DOSSIER et a une DATE : l'index unique de
   * crm_immo_loyers porte sur (company_id, dossier_id, echeance), et la table n'a
   * aucune colonne contrat_id. Une ligne payee le 5 juillet survit donc au
   * renouvellement du 1er juillet.
   *
   * Premiere version de la coupure : cette echeance disparaissait de l'echeancier. Le
   * paiement restait en base, rattache a une date que plus rien ne reconnaissait.
   *
   * Ce que ce defaut ne faisait PAS, et il faut le dire : il ne faussait aucun
   * compteur. Une echeance payee n'est jamais comptee comme due, donc la supprimer ou
   * la marquer encaissee donne le meme chiffre — mesure au 20 aout 2026, les deux cas
   * rendent 7 en retard et 1 a encaisser.
   *
   * Ce qu'il faisait : effacer la trace d'un paiement reel. L'historique du dossier
   * perdait une ligne, et toute reconciliation future aurait cherche en vain a quel
   * loyer cet argent correspondait. Une echeance payee est un FAIT, pas une prevision :
   * elle ne se recoupe pas.
   */
  const relaye = [
    per('2026-01-05', '2026-12-05', 5, true),
    per('2026-07-01', '2027-06-30', 20),
  ];
  const paye5juillet = (d: string) => d === '2026-07-05';

  t('sans paiement, l echeance du 5 juillet est bien coupee',
    !echeancierDuDossier(relaye).some(e => e.date === '2026-07-05'));
  t('MAIS si elle a ete encaissee, elle survit a la coupure',
    echeancierDuDossier(relaye, paye5juillet).some(e => e.date === '2026-07-05'));
  t('et elle est comptee comme ENCAISSEE, pas comme due',
    statutDe('2026-07-05', true, '2026-08-20') === 'encaisse');

  const avecPaiement = classerTableauDeBord({
    periodes: relaye, aujourdhui: '2026-08-20',
    encaissements: [{ dossier_id: 'd', echeance: '2026-07-05', encaisseLeJour: '2026-07-05' }],
  });
  const sansPaiement = classerTableauDeBord({
    periodes: relaye, encaissements: [], aujourdhui: '2026-08-20',
  });
  /* Et le sauvetage ne GONFLE rien : une echeance payee n'est pas une dette. */
  t('garder l echeance payee ne change aucun compteur de dette',
    avecPaiement.compteurs.loyersEnRetard === sansPaiement.compteurs.loyersEnRetard
    && avecPaiement.compteurs.loyersAEncaisser === sansPaiement.compteurs.loyersAEncaisser);
  t('mesure du 20 aout : 7 en retard, 1 a encaisser',
    sansPaiement.compteurs.loyersEnRetard === 7 && sansPaiement.compteurs.loyersAEncaisser === 1);

  /* Un paiement situe APRES une impayee du meme ancien contrat survit aussi : la
     coupure saute l'impayee sans arreter le parcours. */
  const paye5septembre = (d: string) => d === '2026-09-05';
  t('un paiement plus tardif survit lui aussi a la coupure',
    echeancierDuDossier(relaye, paye5septembre).some(e => e.date === '2026-09-05'));
  t('et l impayee qui le precede reste bien coupee',
    !echeancierDuDossier(relaye, paye5septembre).some(e => e.date === '2026-08-05'));

  /*
   * L'ORDRE D'ARRIVEE NE DOIT RIEN CHANGER.
   *
   * La coupure se fait au debut de la periode SUIVANTE — « suivante » au sens
   * chronologique, pas au sens de l'ordre dans lequel la base a rendu les lignes. Une
   * requete sans `ORDER BY` peut tres bien rendre la nouvelle periode en premier ; sans
   * le tri, la coupure se ferait alors au debut de l'ANCIENNE, et tout l'historique
   * disparaitrait.
   *
   * On passe donc le meme lot a l'envers, et on exige le meme resultat.
   */
  const ordreNaturel = echeancierDuDossier([ancien, nouveau]).map(e => e.date).join();
  const ordreInverse = echeancierDuDossier([nouveau, ancien]).map(e => e.date).join();
  t('l echeancier ne depend pas de l ordre des periodes recues',
    ordreNaturel === ordreInverse && ordreNaturel !== '');

  /*
   * LE SEUL CHEMIN QUI REND LE DEDOUBLONNAGE NECESSAIRE.
   *
   * Apres la coupure, les dates gardees de chaque periode sont disjointes par
   * construction : celles d'avant le relais sont strictement anterieures au debut de la
   * suivante. Le `Set` serait donc inutile… s'il n'y avait pas l'exception du PAIEMENT.
   *
   * Une echeance payee est gardee MEME au-dela du relais. Si la periode suivante
   * produit une echeance a la meme date — deux contrats au meme jour d'encaissement,
   * qui se chevauchent — la date apparaitrait DEUX FOIS dans l'echeancier.
   *
   * On le mesure, au lieu de le supposer : sans le `Set`, cette liste a un doublon.
   */
  const memeJour = [
    per('2026-01-05', '2026-12-05', 5, true),
    per('2026-07-01', '2027-06-30', 5),
  ];
  const payeDansLeChevauchement = (d: string) => d === '2026-09-05';
  const chevauche = echeancierDuDossier(memeJour, payeDansLeChevauchement).map(e => e.date);
  t('les deux periodes produisent bien la meme date',
    echeancierDuDossier([memeJour[1]]).some(e => e.date === '2026-09-05'));
  t('une echeance payee au-dela du relais n apparait qu UNE fois',
    chevauche.filter(d => d === '2026-09-05').length === 1);
  t('et aucune date du lot n est en double',
    new Set(chevauche).size === chevauche.length);
  t('c est la version ANCIENNE qui est retenue — c est sous elle qu on a paye',
    echeancierDuDossier(memeJour, payeDansLeChevauchement)
      .find(e => e.date === '2026-09-05')?.ancienne === true);

  /* Et une periode cloturee SEULE — bail termine, jamais renouvele — reste due. */
  const seuleCloturee = classerTableauDeBord({
    periodes: [per('2026-01-05', '2026-06-05', 5, true)], encaissements: [], aujourdhui: AUJ,
  });
  t('un bail cloture sans remplacant laisse quand meme ses impayes',
    seuleCloturee.compteurs.loyersEnRetard === 6);
  t('mais il n entre dans aucune categorie de contrat',
    CATEGORIES_CONTRAT.every(k => seuleCloturee.dossiers[k].size === 0));
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
