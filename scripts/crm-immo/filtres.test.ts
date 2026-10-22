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
import { filtrerDossiers, preparerLignes, type FiltreDossiers } from '../../src/lib/crmImmoRecherche.ts';
import type { DossierImmo } from '../../src/pages/admin/views/crm-immo/crmImmoTypes.ts';
import { COLONNES_SYSTEME } from '../../src/pages/admin/views/crm-immo/crmImmoTypes.ts';
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

console.log('\n=== 6. LES LIBELLES DES QUATRE CHAMPS ===');
{
  /*
   * Quatre champs, deux personnes. Les deux dernieres CLES ne disent plus ce que leur
   * libelle affiche : c est assume, renommer ces colonnes exigerait une migration.
   * Ce test est la pour que personne ne << corrige >> l incoherence en renommant la base.
   */
  const attendus: [string, string][] = [
    ['nom', 'Nom locataire'],
    ['prenom', 'Prénom locataire'],
    ['locataire', 'Nom propriétaire'],
    ['proprietaire', 'Prénom propriétaire'],
  ];
  for (const [cle, libelle] of attendus) {
    const d = COLONNES_SYSTEME.find(c => c.cle === cle);
    t(`${cle} s affiche « ${libelle} »`, d?.libelle === libelle);
  }

  /* Et ces libelles arrivent bien jusqu aux colonnes que le tableau et les cartes lisent. */
  const colonnes = toutesLesColonnes({ systeme: COLONNES_SYSTEME, perso: [], reglage: REGLAGE_VIDE });
  for (const [cle, libelle] of attendus) {
    t(`le tableau et les cartes affichent « ${libelle} »`,
      colonnes.some(c => c.nom === libelle && c.cle === cle));
  }

  t('plus aucun libelle systeme ne dit « N/P »',
    COLONNES_SYSTEME.every(c => !c.libelle.includes('N/P')));
  t('plus aucun libelle systeme ne dit « Nom du client »',
    COLONNES_SYSTEME.every(c => c.libelle !== 'Nom du client'));
  t('les quatre libelles sont tous differents',
    new Set(attendus.map(a => a[1])).size === 4);
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
