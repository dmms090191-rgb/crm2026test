/**
 * Tests des FILTRES du tableau CRM Immo.
 * Lancer :  npx tsx scripts/crm-immo/filtres.test.ts
 *
 * ---------- CE QUE CE FICHIER TIENT ----------
 *
 * Le 22 octobre 2026, David a demande que CHAQUE carte du tableau de bord ouvre la page
 * du module sur sa propre liste : « Je ne veux pas qu'une carte ouvre simplement Tous
 * si un filtre precis peut etre applique. »
 *
 * La barre porte donc huit boutons : « Tous », plus les sept categories du tableau de
 * bord. Et le filtre ne CALCULE plus rien — il lit l'appartenance etablie une seule
 * fois par classerTableauDeBord. C'est ce qui empeche une carte d'annoncer un chiffre
 * que la liste qu'elle ouvre contredirait.
 *
 * Ce que ce fichier verrouille :
 *   - les huit filtres, leurs cles et leurs libelles, dans les deux sens ;
 *   - qu'un libelle de bouton est IDENTIQUE au libelle de sa carte ;
 *   - que plus aucune date n'est calculee ici ;
 *   - le comportement devant un classement absent.
 *
 * Trois filtres ont disparu au fil de la journee — « Avec loyer », « Sans échéance »,
 * puis « Fin proche ». Les deux premiers n'avaient plus de sens ; le troisieme
 * recouvrait exactement deux des nouveaux sans les distinguer, et refaisait son propre
 * calcul de preavis avec l'horloge de la page, gelee au montage.
 */
import { readFileSync } from 'node:fs';
import {
  filtrerDossiers, preparerLignes, valeurAffichee, type FiltreDossiers,
} from '../../src/lib/crmImmoRecherche.ts';
import type { DossierImmo } from '../../src/pages/admin/views/crm-immo/crmImmoTypes.ts';
import {
  COLONNES_SYSTEME, CHAMPS_DOSSIER, MODES_PAIEMENT,
} from '../../src/pages/admin/views/crm-immo/crmImmoTypes.ts';
import { toutesLesColonnes, REGLAGE_VIDE } from '../../src/lib/crmImmoColonnes.ts';
import { CATEGORIES_IMMO, type CategorieImmo } from '../../src/lib/crmImmoEcheancier.ts';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};

const lire = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const code = (p: string) => lire(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

function dossier(p: Partial<DossierImmo> & { id: string }): DossierImmo {
  return {
    id: p.id, company_id: 'co-1', nom: 'Nom', prenom: 'Prenom',
    email: null, telephone: null, date_entree: null, date_fin_contrat: null,
    locataire: null, proprietaire: null, jour_encaissement: null, commentaire: null,
    extra: {}, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
    ...p,
  } as DossierImmo;
}

/** Un classement vide, ou chaque test place ensuite ce dont il a besoin. */
const vide = (): Record<CategorieImmo, Set<string>> =>
  Object.fromEntries(CATEGORIES_IMMO.map(c => [c, new Set<string>()])) as Record<CategorieImmo, Set<string>>;

console.log('\n=== 1. HUIT FILTRES : « TOUS », PLUS LES SEPT CATEGORIES ===');
{
  const src = code('../../src/pages/admin/views/crm-immo/CrmImmoFilters.tsx');

  /* Les sept libelles sont declares dans un Record<CategorieImmo, string> : le
     compilateur reclame une entree des qu'une categorie est ajoutee au calcul. */
  const bloc = /const LIBELLES: Record<CategorieImmo, string> = \{([\s\S]*?)\};/.exec(src);
  t('la table des libelles est trouvable', bloc !== null);

  const cles = [...(bloc?.[1] ?? '').matchAll(/'([a-z-]+)':/g)].map(m => m[1]);
  t('les sept categories ont un libelle', cles.length === 7);
  t('et ce sont exactement celles du calcul',
    cles.slice().sort().join() === CATEGORIES_IMMO.slice().sort().join());

  t('« Tous » est conserve, en tete', /\{ valeur: 'tous', libelle: 'Tous' \}/.test(src));
  t('les sept autres viennent de CATEGORIES_IMMO, pas d une recopie',
    /\.\.\.CATEGORIES_IMMO\.map\(/.test(src));

  /* Dans les deux sens : ce qui ne doit PLUS exister. */
  t('« Fin proche » a disparu de la barre', !/fin-proche|Fin proche/.test(src));
  t('« Avec loyer » a disparu de la barre', !/avec-loyer|Avec loyer/.test(src));
  t('« Sans échéance » a disparu de la barre', !/sans-echeance|Sans échéance/.test(src));
}

console.log('\n=== 1 bis. UNE SEULE RANGEE, QUI DEFILE ===');
{
  /*
   * MESURE DU 22 OCTOBRE 2026, sur la vraie barre rendue avec les vrais tokens.
   *
   *   a 375 px : 8 pilules, UNE rangee, 44 px de haut, conteneur visible 359 px pour
   *              974 px de contenu — donc il defile ; 0 debordement de page, 0 texte
   *              tronque. A 320 px, identique.
   *   a 1024 px : les huit tiennent, le conteneur ne defile plus.
   *
   * En `flex-wrap`, les memes huit libelles faisaient TROIS a QUATRE rangees a 375 px :
   * la liste etait repoussee hors de l'ecran avant d'avoir commence. Ce test garde la
   * mise en page qui l'a corrige — un `flex-wrap` revenu ne casserait rien d'autre.
   */
  const src = lire('../../src/pages/admin/views/crm-immo/CrmImmoFilters.tsx');
  const rangee = /<div className="([^"]*)">\s*\{FILTRES\.map/.exec(src)?.[1] ?? '';
  t('la rangee des filtres est trouvable', rangee !== '');
  t('elle ne se replie PAS sur plusieurs lignes', !/flex-wrap/.test(rangee));
  t('elle defile horizontalement', /overflow-x-auto/.test(rangee));
  t('sans barre de defilement visible', /no-scrollbar/.test(rangee));

  const pilule = /className="([^"]*)"\s*\n?\s*style=\{actif/.exec(src)?.[1]
    ?? /px-3 py-1 rounded-full[^"]*/.exec(src)?.[0] ?? '';
  t('un libelle ne se casse pas au milieu d une pilule', /whitespace-nowrap/.test(pilule));
  t('une pilule ne retrecit pas pour entrer de force', /shrink-0/.test(pilule));
  t('et elle fait 44 px de haut au doigt', /max-md:min-h-\[44px\]/.test(pilule));

  /* Le compte etait dans la rangee, en `ml-auto` : dans un conteneur qui defile, il
     partait a droite du dernier bouton, donc hors de l'ecran. Il vit maintenant dessous. */
  t('le compte n est plus dans la rangee qui defile', !/ml-auto/.test(rangee));
  t('et il est rendu sous la barre',
    /crm-immo-compte/.test(src) && src.indexOf('crm-immo-compte') > src.indexOf('FILTRES.map'));
}

console.log('\n=== 2. UN BOUTON PORTE EXACTEMENT LE LIBELLE DE SA CARTE ===');
{
  /*
   * LE CONTRAT CARTE <-> FILTRE.
   *
   * On clique « Loyers en retard » sur le dashboard, on doit arriver sur un filtre qui
   * s'appelle « Loyers en retard ». Un libelle qui derive d'un cote laisse croire qu'on
   * a atterri ailleurs — et c'est invisible aux types, les deux etant des chaines.
   */
  const filtres = code('../../src/pages/admin/views/crm-immo/CrmImmoFilters.tsx');
  const cartes = code('../../src/pages/admin/views/SocieteKpiGrid.tsx');

  const libelleFiltre = (c: CategorieImmo) =>
    new RegExp(`'${c}': '([^']+)'`).exec(filtres)?.[1] ?? null;
  const libelleCarte = (c: CategorieImmo) =>
    new RegExp(`key: '${c}', label: '([^']+)'`).exec(cartes)?.[1] ?? null;

  for (const c of CATEGORIES_IMMO) {
    const f = libelleFiltre(c), k = libelleCarte(c);
    t(`« ${c} » : meme libelle sur la carte et sur le filtre`, f !== null && f === k);
  }
}

console.log('\n=== 3. LE FILTRE NE CALCULE PLUS AUCUNE DATE ===');
{
  const src = code('../../src/lib/crmImmoRecherche.ts');
  t('le type est « tous » plus les categories du calcul',
    /export type FiltreDossiers = 'tous' \| CategorieImmo;/.test(src));
  t('plus aucune branche « fin-proche »', !/fin-proche/.test(src));
  t('plus aucune branche « avec-loyer »', !/avec-loyer/.test(src));
  t('plus aucune branche « sans-echeance »', !/sans-echeance/.test(src));

  /*
   * Le coeur du changement : ce module lisait des dates, avec sa propre constante de
   * preavis et l'horloge de la page — gelee au montage. Il n'en lit plus aucune, donc
   * il ne peut plus se tromper de date ni de fuseau.
   */
  t('plus aucune arithmetique de date', !/86_400_000|Date\.parse|preavisJours/.test(src));
  t('et plus d « aujourdhui » du tout', !/aujourdhui/.test(src));
  t('la colonne Encaissement loyer existe toujours',
    COLONNES_SYSTEME.some(c => c.cle === 'jour_encaissement'));
}

console.log('\n=== 4. LE FILTRE LIT L APPARTENANCE, ET RIEN D AUTRE ===');
{
  const lot = [dossier({ id: 'a' }), dossier({ id: 'b' }), dossier({ id: 'c' })];
  const classement = vide();
  classement['baux-expires'].add('a');
  classement['baux-expires'].add('c');
  classement['loyers-en-retard'].add('b');

  const ids = (f: FiltreDossiers) => filtrerDossiers(lot, f, classement).map(d => d.id).join();

  t('« Tous » ne filtre rien', ids('tous') === 'a,b,c');
  t('une categorie rend exactement ses dossiers', ids('baux-expires') === 'a,c');
  t('une autre categorie rend les siens', ids('loyers-en-retard') === 'b');
  t('une categorie vide ne rend rien', ids('baux-a-venir') === '');

  /* L'ordre rendu est celui de la LISTE, pas celui de l'ensemble : le tri de la page
     doit rester maitre. On le prouve en inversant l'ordre d'insertion. */
  const inverse = vide();
  inverse['baux-expires'].add('c');
  inverse['baux-expires'].add('a');
  t('l ordre rendu est celui de la liste, pas celui de l ensemble',
    filtrerDossiers(lot, 'baux-expires', inverse).map(d => d.id).join() === 'a,c');

  /*
   * CLASSEMENT ABSENT : la liste doit etre VIDE, jamais complete.
   *
   * Le classement arrive par le reseau. Rendre la liste entiere pendant ce temps ferait
   * croire que les 300 dossiers de la Societe ont tous un loyer en retard — le plus
   * alarmant des mensonges possibles sur cet ecran.
   */
  t('sans classement, une categorie ne rend AUCUN dossier',
    filtrerDossiers(lot, 'baux-expires', null).length === 0);
  t('mais « Tous » rend tout, lui, meme sans classement',
    filtrerDossiers(lot, 'tous', null).length === 3);

  /* Un dossier sans contrat complet n'est dans aucune categorie : il n'a ni bail ni
     loyer a montrer, et il reste visible par « Tous ». */
  const orphelin = [dossier({ id: 'zz' })];
  t('un dossier sans contrat n apparait dans aucune categorie',
    CATEGORIES_IMMO.every(c => filtrerDossiers(orphelin, c, classement).length === 0));
  t('mais il reste visible dans « Tous »',
    filtrerDossiers(orphelin, 'tous', classement).length === 1);
}

console.log('\n=== 5. LE PIPELINE COMPLET REPOND ENCORE ===');
{
  const colonnes = toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: [], reglage: REGLAGE_VIDE });
  const lot = [
    dossier({ id: 'a', nom: 'Dupont' }),
    dossier({ id: 'b', nom: 'Martin' }),
  ];
  const classement = vide();
  classement['contrats-a-renouveler'].add('a');

  const rendu = (filtre: FiltreDossiers, terme: string) =>
    preparerLignes({ dossiers: lot, terme, colonnes, triSur: null, sens: 'asc', filtre, classement })
      .map(d => d.id).join();

  t('sans filtre ni terme : tout sort', rendu('tous', '') === 'a,b');
  t('le filtre s applique avant la recherche', rendu('contrats-a-renouveler', '') === 'a');
  t('la recherche porte toujours sur les valeurs', rendu('tous', 'martin') === 'b');
  t('filtre et recherche se combinent', rendu('contrats-a-renouveler', 'martin') === '');
}

console.log('\n=== 6. LES LIBELLES DES QUATRE CHAMPS, COTE FORMULAIRE ===');
{
  /*
   * Quatre champs, deux personnes. Les deux dernieres CLES ne disent pas ce que leur
   * libelle affiche : c est assume, renommer ces colonnes exigerait une migration.
   * Ce test est la pour que personne ne << corrige >> l incoherence en renommant la base.
   *
   * Depuis le 23 octobre 2026 ces quatre libelles vivent dans CHAMPS_DOSSIER, la liste
   * du FORMULAIRE : le tableau, lui, n en montre plus que deux colonnes fusionnees. La
   * distinction nom/prenom reste donc entiere la ou on SAISIT.
   */
  /*
   * REECRIT LE 28/10/2026 : le formulaire ne saisit plus les quatre cles, mais DEUX
   * champs uniques de nom complet. Les cles SQL, elles, n ont pas bouge d un octet.
   */
  const DISPARUES = ['nom', 'prenom', 'locataire', 'proprietaire'];
  for (const cle of DISPARUES) {
    t(`${cle} a quitte le formulaire, sans quoi le nom se saisirait deux fois`,
      CHAMPS_DOSSIER.every(c => c.cle !== cle));
  }
  const attendus: [string, string][] = [
    ['nom_complet_locataire', 'Nom prénom locataire'],
    ['nom_complet_proprietaire', 'Nom prénom propriétaire'],
  ];
  for (const [cle, libelle] of attendus) {
    const d = CHAMPS_DOSSIER.find(c => c.cle === cle);
    t(`le formulaire saisit ${cle} sous « ${libelle} »`, d?.libelle === libelle);
  }
  t('les deux libelles de nom du formulaire sont differents',
    new Set(attendus.map(a => a[1])).size === 2);
  /* Et le champ du locataire reste le SEUL non masquable : c est lui qui identifie la
     ligne, le masquer viderait la fiche de ce qui la nomme. */
  t('le nom du locataire reste obligatoire dans le formulaire',
    CHAMPS_DOSSIER.find(c => c.cle === 'nom_complet_locataire')?.masquable === false);
  t('plus aucun libelle de champ ne dit « Nom du client »',
    CHAMPS_DOSSIER.every(c => c.libelle !== 'Nom du client'));

  /* Le tableau ne porte PLUS ces quatre colonnes separement : si l une revenait, la
     fusion demandee par David serait defaite sans que rien ne le signale. */
  for (const [, libelle] of attendus) {
    t(`le tableau ne montre plus de colonne « ${libelle} »`,
      COLONNES_SYSTEME.every(c => c.libelle !== libelle));
  }
}

console.log('\n=== 7. LES DEUX COLONNES FUSIONNEES ===');
{
  /*
   * David : « fusionne Nom et Prenom locataire en UNE seule colonne visible », et la
   * meme chose pour le proprietaire — sans fusionner les colonnes techniques en base.
   * Ce qui suit verrouille les deux moities de cette phrase.
   */
  const npL = COLONNES_SYSTEME.find(c => c.cle === 'np_locataire');
  const npP = COLONNES_SYSTEME.find(c => c.cle === 'np_proprietaire');

  t('« N/P locataire » existe cote tableau', npL?.libelle === 'N/P locataire');
  t('« N/P propriétaire » existe cote tableau', npP?.libelle === 'N/P propriétaire');
  t('N/P locataire reunit nom puis prenom',
    JSON.stringify(npL?.composeDe) === JSON.stringify(['nom', 'prenom']));
  /* LE PIEGE : ce sont `locataire` et `proprietaire` qui portent le nom et le prenom
     du PROPRIETAIRE. Une inversion ici afficherait le prenom avant le nom sans qu aucun
     compilateur ne s en apercoive. */
  t('N/P propriétaire reunit locataire puis proprietaire — et dans cet ordre',
    JSON.stringify(npP?.composeDe) === JSON.stringify(['locataire', 'proprietaire']));

  /* Une colonne composee n existe nulle part en SQL : elle ne doit donc JAMAIS se
     retrouver dans la liste des champs que le formulaire ecrit. */
  const clesChamps = new Set(CHAMPS_DOSSIER.map(c => c.cle as string));
  t('np_locataire n est pas un champ ecrivable', !clesChamps.has('np_locataire'));
  t('np_proprietaire n est pas un champ ecrivable', !clesChamps.has('np_proprietaire'));

  /* Et la composition arrive REELLEMENT jusqu a la cellule. */
  const colonnes = toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: [], reglage: REGLAGE_VIDE });
  const colL = colonnes.find(c => c.famille === 'systeme' && c.cle === 'np_locataire')!;
  const colP = colonnes.find(c => c.famille === 'systeme' && c.cle === 'np_proprietaire')!;
  const bail = dossier({
    nom: 'Dupont', prenom: 'Marie', locataire: 'Fournier', proprietaire: 'Paul',
  });
  t('la cellule rend « Dupont Marie »', valeurAffichee(bail, colL) === 'Dupont Marie');
  t('la cellule rend « Fournier Paul »', valeurAffichee(bail, colP) === 'Fournier Paul');

  /* Un prenom vide ne doit pas laisser d espace en trop : « Dupont », pas « Dupont  ». */
  const sansPrenom = dossier({ nom: 'Dupont', prenom: null, locataire: null, proprietaire: 'Paul' });
  t('un prenom absent ne laisse pas d espace', valeurAffichee(sansPrenom, colL) === 'Dupont');
  t('un nom absent ne laisse pas d espace devant', valeurAffichee(sansPrenom, colP) === 'Paul');

  /* La recherche herite de la fusion : chercher le nom ET le prenom ensemble marche,
     ce qu aucune des deux colonnes separees ne permettait. */
  const lot = [bail, dossier({ id: 'z', nom: 'Martin', prenom: 'Luc' })];
  const trouve = preparerLignes({
    dossiers: lot, terme: 'dupont marie', colonnes, triSur: null, sens: 'asc',
    filtre: 'tous', classement: vide(),
  });
  t('la recherche trouve « dupont marie » d un seul tenant', trouve.length === 1);
}

console.log('\n=== 8. LE MODE DE PAIEMENT ===');
{
  const col = COLONNES_SYSTEME.find(c => c.cle === 'mode_paiement');
  t('la colonne « Mode de paiement » existe', col?.libelle === 'Mode de paiement');
  t('elle porte EXACTEMENT trois choix', col?.choix?.length === 3);
  t('ce sont cheque, especes, virement',
    JSON.stringify(col?.choix?.map(c => c.valeur)) === JSON.stringify(['cheque', 'especes', 'virement']));
  t('et leurs libelles portent les accents',
    JSON.stringify(col?.choix?.map(c => c.libelle)) === JSON.stringify(['Chèque', 'Espèces', 'Virement']));
  /* La valeur technique va en base, et la contrainte SQL ne connait que ces trois mots
     sans accent : un accent cote valeur rendrait toute comparaison dependante de la
     normalisation Unicode. */
  t('aucune valeur technique ne porte d accent',
    MODES_PAIEMENT.every(m => m.valeur === m.valeur.normalize('NFD').replace(/[̀-ͯ]/g, '')));
  t('le formulaire propose les memes trois choix',
    CHAMPS_DOSSIER.find(c => c.cle === 'mode_paiement')?.choix === MODES_PAIEMENT);

  /* C est la PRESENCE de `choix` qui rend une colonne modifiable au menu. Si une autre
     colonne systeme en recevait un par megarde, elle deviendrait modifiable sans que
     personne l ait decide. */
  t('une seule colonne systeme porte des choix',
    COLONNES_SYSTEME.filter(c => c.choix !== undefined).length === 1);

  /* La cellule affiche le LIBELLE, jamais la valeur technique. */
  const colonnes = toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: [], reglage: REGLAGE_VIDE });
  const c = colonnes.find(x => x.famille === 'systeme' && x.cle === 'mode_paiement')!;
  t('un dossier en cheque affiche « Chèque »',
    valeurAffichee(dossier({ mode_paiement: 'cheque' }), c) === 'Chèque');
  t('un dossier en especes affiche « Espèces »',
    valeurAffichee(dossier({ mode_paiement: 'especes' }), c) === 'Espèces');
  t('un dossier en virement affiche « Virement »',
    valeurAffichee(dossier({ mode_paiement: 'virement' }), c) === 'Virement');
  /* Un ancien dossier n a pas de mode : il rend une chaine vide, que la cellule
     transforme en tiret. Il ne doit SURTOUT pas rendre « null ». */
  t('un dossier sans mode rend une chaine vide',
    valeurAffichee(dossier({ mode_paiement: null }), c) === '');
  /* Et une valeur inconnue venue d un vieil enregistrement ne s affiche pas brute. */
  t('une valeur inconnue ne s affiche pas telle quelle',
    valeurAffichee(dossier({ mode_paiement: 'carte' }), c) === '');
}

console.log('\n=== 9. L ORDRE DES COLONNES DEMANDE PAR DAVID ===');
{
  /*
   * L ordre est celui du message du 23 octobre 2026, mot pour mot. Actions n y figure
   * pas : ce n est pas une colonne du modele, c est une colonne epinglee du tableau.
   *
   * Deux changements depuis, demandes par David le 27 octobre 2026 :
   *   - « Telephone » devient « Telephone locataire ». Le libelle nu etait sans ambiguite
   *     tant qu il n y avait qu un telephone ; il a cesse de l etre le jour ou le second
   *     est arrive.
   *   - « Telephone proprietaire » s insere JUSTE APRES « N/P proprietaire » : le tableau
   *     se lit personne par personne.
   */
  t('l ordre est exactement celui demande',
    JSON.stringify(COLONNES_SYSTEME.map(c => c.libelle)) === JSON.stringify([
      'N/P locataire', 'Email', 'Téléphone locataire', "Date d'entrée", 'Fin de contrat',
      'N/P propriétaire', 'Téléphone propriétaire', 'Encaissement loyer', 'Commentaire', 'Mode de paiement',
    ]));
  t('« N/P locataire » reste la seule colonne non masquable',
    COLONNES_SYSTEME.filter(c => !c.masquable).map(c => c.cle).join() === 'np_locataire');
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
