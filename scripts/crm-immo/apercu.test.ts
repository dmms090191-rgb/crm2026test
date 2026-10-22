/**
 * Tests du MODELE de l'apercu plein ecran — zoom, deplacement, bornes.
 * Lancer :  npx tsx scripts/crm-immo/apercu.test.ts
 *
 * ---------- CE QUE CE FICHIER GARDE ----------
 *
 * Un pincement ne se verifie pas a l'oeil : on voit qu'une image bouge, pas qu'elle
 * bouge JUSTE. Les quatre promesses de l'apercu sont arithmetiques, et c'est ici
 * qu'elles se prouvent :
 *
 *   1. l'image n'est jamais DEFORMEE — une seule echelle, jamais deux ;
 *   2. a l'echelle 1 elle n'est jamais COUPEE ni deplacable ;
 *   3. au-dela, on ne peut pas la tirer hors de l'ecran ;
 *   4. le point pince reste SOUS LES DOIGTS.
 *
 * La quatrieme est la seule qu'un essai manuel attrape vraiment, et c'est la plus facile
 * a casser d'une ligne : elle est donc testee par son algebre, pas par son rendu.
 */
import {
  ECHELLE_MIN, ECHELLE_MAX, ECHELLE_DOUBLE_TAPE, ETAT_INITIAL,
  distance, milieu, echelleBornee, tailleAjustee, decalageBorne,
  versEchelle, versDecalage, apresDoubleTape, apresPincement,
  type EtatApercu, type Taille, type Point,
} from '../../src/lib/crmImmoApercu.ts';

let ko = 0, ok = 0;
const t = (nom: string, cond: boolean) => {
  if (cond) { ok++; console.log('  OK    | ' + nom); }
  else { ko++; console.log('  ECHEC | ' + nom); }
};
/** Deux nombres flottants egaux a un cheveu pres : l'algebre passe par des divisions. */
const proche = (a: number, b: number, marge = 1e-9) => Math.abs(a - b) < marge;

const CADRE: Taille = { largeur: 360, hauteur: 800 };

console.log('\n=== 1. LES OUTILS DE GESTE ===');
{
  t('la distance entre deux doigts est euclidienne', distance({ x: 0, y: 0 }, { x: 3, y: 4 }) === 5);
  t('deux doigts au meme endroit sont a distance nulle', distance({ x: 7, y: 7 }, { x: 7, y: 7 }) === 0);
  const m = milieu({ x: 0, y: 10 }, { x: 20, y: 30 });
  t('le milieu est bien au milieu', m.x === 10 && m.y === 20);
}

console.log('\n=== 2. L ECHELLE RESTE ENTRE SES BORNES ===');
{
  t('on ne descend pas sous 1', echelleBornee(0.2) === ECHELLE_MIN);
  t('on ne monte pas au-dessus de 4', echelleBornee(99) === ECHELLE_MAX);
  t('une valeur normale passe', echelleBornee(2.5) === 2.5);
  /* Une division par zero quelque part en amont ne doit pas propager un NaN dans le
     transform : une image qui disparait est pire qu'une image qui ne zoome pas. */
  t('un NaN retombe sur le repos', echelleBornee(Number.NaN) === ECHELLE_MIN);
  t('un infini aussi', echelleBornee(Number.POSITIVE_INFINITY) === ECHELLE_MIN);
  t('les bornes sont celles annoncees', ECHELLE_MIN === 1 && ECHELLE_MAX === 4 && ECHELLE_DOUBLE_TAPE === 2);
  t('l etat de repos est centre et non zoome',
    ETAT_INITIAL.echelle === 1 && ETAT_INITIAL.x === 0 && ETAT_INITIAL.y === 0);
}

console.log('\n=== 3. L IMAGE N EST NI DEFORMEE NI COUPEE ===');
{
  /* Une photo en paysage dans un cadre de telephone : c'est la largeur qui contraint. */
  const paysage = tailleAjustee({ largeur: 4000, hauteur: 3000 }, CADRE);
  t('une photo paysage est ajustee sur la LARGEUR', proche(paysage.largeur, 360));
  t('et sa hauteur suit le rapport', proche(paysage.hauteur, 270));
  t('le rapport est EXACTEMENT conserve',
    proche(paysage.largeur / paysage.hauteur, 4000 / 3000));

  /* Un portrait tres haut : c'est la hauteur qui contraint, et rien ne depasse. */
  const portrait = tailleAjustee({ largeur: 1000, hauteur: 4000 }, CADRE);
  t('une photo portrait est ajustee sur la HAUTEUR', proche(portrait.hauteur, 800));
  t('et elle ne deborde pas en largeur', portrait.largeur <= CADRE.largeur + 1e-9);
  t('son rapport est conserve aussi', proche(portrait.largeur / portrait.hauteur, 1000 / 4000));

  /* TEMOIN : si tailleAjustee prenait le MAXIMUM au lieu du minimum — l'erreur d'un
     caractere — la photo paysage ferait 1066 px de haut dans un cadre de 800. */
  t('TEMOIN : l ajustement ne prend pas le plus grand rapport',
    paysage.hauteur < CADRE.hauteur && portrait.largeur < CADRE.largeur + 1e-9);

  /* Une image pas encore decodee : pas de NaN, pas de cadre fantome. */
  const inconnue = tailleAjustee({ largeur: 0, hauteur: 0 }, CADRE);
  t('une image non decodee rend une taille nulle, jamais NaN',
    inconnue.largeur === 0 && inconnue.hauteur === 0);
  t('un cadre nul aussi', tailleAjustee({ largeur: 100, hauteur: 100 }, { largeur: 0, hauteur: 0 }).largeur === 0);
}

console.log('\n=== 4. A L ECHELLE 1, RIEN NE BOUGE ===');
{
  const ajustee = tailleAjustee({ largeur: 4000, hauteur: 3000 }, CADRE);
  const d = decalageBorne(500, -500, 1, ajustee, CADRE);
  /* LE POINT : a l'echelle 1 l'image tient dans le cadre, le debordement est nul, donc
     la borne est nulle. On ne peut pas la faire sortir — aucune regle en plus. */
  t('LE POINT : a l echelle 1, tout deplacement est ecrase a zero', d.x === 0 && d.y === 0);

  const apres = versDecalage({ echelle: 1, x: 0, y: 0 }, 200, 200, ajustee, CADRE);
  t('et un glissement au doigt ne la deplace pas non plus', apres.x === 0 && apres.y === 0);
  t('son echelle n a pas bouge pour autant', apres.echelle === 1);
}

console.log('\n=== 5. AU-DELA DE 1, ON NE TIRE PAS L IMAGE HORS DE L ECRAN ===');
{
  const ajustee = tailleAjustee({ largeur: 4000, hauteur: 3000 }, CADRE);  // 360 x 270
  /* A l'echelle 2 : 720 x 540. Le debordement horizontal vaut (720-360)/2 = 180.
     En hauteur, 540 < 800 : aucun debordement, donc aucun deplacement vertical. */
  const d = decalageBorne(9999, 9999, 2, ajustee, CADRE);
  t('le deplacement horizontal est borne par le debordement reel', proche(d.x, 180));
  t('et il n y a pas de deplacement vertical sans debordement vertical', d.y === 0);
  const g = decalageBorne(-9999, -9999, 2, ajustee, CADRE);
  t('la borne vaut aussi dans l autre sens', proche(g.x, -180));

  /* TEMOIN : sans bornes, 9999 passerait tel quel et l'image quitterait l'ecran. */
  t('TEMOIN : la valeur brute ne passe pas', d.x !== 9999);

  const nan = decalageBorne(Number.NaN, Number.NaN, 2, ajustee, CADRE);
  t('un NaN de deplacement retombe a zero', nan.x === 0 && nan.y === 0);
}

console.log('\n=== 6. LE POINT PINCE RESTE SOUS LES DOIGTS ===');
{
  /*
   * Un portrait 2000 x 3000 dans un cadre de 360 x 800. ATTENTION au rapport : c'est la
   * LARGEUR qui contraint (360/2000 = 0,18 contre 800/3000 = 0,267), donc l'image ajustee
   * fait 360 x 540 et non 533 x 800. Une premiere version de ce test s'est trompee la,
   * a choisi une ancre dont le decalage depassait la borne verticale, et a conclu a un
   * defaut du modele qui n'existait pas.
   *
   * On prend donc une ancre dont le resultat reste DANS les bornes, pour mesurer la
   * fixite du point et elle seule. Le cas ou les bornes gagnent est teste juste apres,
   * parce que c'est une regle a part entiere.
   */
  const naturelle = { largeur: 2000, hauteur: 3000 };
  const ajustee = tailleAjustee(naturelle, CADRE);           // 360 x 540
  const cx = CADRE.largeur / 2, cy = CADRE.hauteur / 2;

  /** Le point de l'IMAGE qui se trouve sous un point de l'ECRAN. */
  const sousLeDoigt = (e: EtatApercu, p: Point) => ({
    x: (p.x - cx - e.x) / e.echelle,
    y: (p.y - cy - e.y) / e.echelle,
  });

  const depart: EtatApercu = { echelle: 1, x: 0, y: 0 };
  const ancre: Point = { x: 100, y: 350 };
  const avant = sousLeDoigt(depart, ancre);
  const apres = versEchelle(depart, 2, ancre, ajustee, CADRE);
  const apresPoint = sousLeDoigt(apres, ancre);

  t('LE POINT : le point sous le doigt est le meme avant et apres le zoom',
    proche(avant.x, apresPoint.x, 1e-6) && proche(avant.y, apresPoint.y, 1e-6));
  t('et l echelle a bien change', apres.echelle === 2);

  /* TEMOIN : un zoom qui ne corrigerait PAS le deplacement laisserait l'etat a x=0,
     et le point sous le doigt se serait deplace. On verifie que ce n'est pas le cas. */
  const naif = sousLeDoigt({ echelle: 2, x: 0, y: 0 }, ancre);
  t('TEMOIN : un zoom sans correction deplacerait le point', !proche(avant.x, naif.x, 1e-6));

  /* Zoomer pile au centre ne doit rien deplacer du tout. */
  const auCentre = versEchelle(depart, 3, { x: cx, y: cy }, ajustee, CADRE);
  t('zoomer au centre ne decale pas l image', proche(auCentre.x, 0) && proche(auCentre.y, 0));

  /*
   * ---------- ET QUAND LES DEUX PROMESSES SE CONTREDISENT ----------
   *
   * Pres d'un bord, garder le point sous le doigt demanderait de tirer l'image hors du
   * cadre. Les deux regles ne peuvent pas etre tenues ensemble, et c'est la BORNE qui
   * gagne : mieux vaut un point qui glisse de quelques pixels qu'une zone vide a
   * l'ecran. L'ordre de priorite est une decision, pas un accident — il se teste.
   */
  const auBord = versEchelle(depart, 2, { x: 100, y: 60 }, ajustee, CADRE);
  const maxY = (ajustee.hauteur * 2 - CADRE.hauteur) / 2;     // (1080 - 800) / 2 = 140
  t('LE POINT : pres d un bord, la borne l emporte sur la fixite du point',
    proche(auBord.y, maxY) && auBord.y <= maxY + 1e-9);
  t('et l image reste donc entierement dans le cadre',
    Math.abs(auBord.x) <= (ajustee.largeur * 2 - CADRE.largeur) / 2 + 1e-9);
}

console.log('\n=== 7. LE PINCEMENT PART DE L ECHELLE DU DEBUT DU GESTE ===');
{
  const naturelle = { largeur: 2000, hauteur: 3000 };
  const ajustee = tailleAjustee(naturelle, CADRE);
  const cadreCentre = { x: CADRE.largeur / 2, y: CADRE.hauteur / 2 };
  const depart = { etat: { ...ETAT_INITIAL }, distance: 100 };

  const double = apresPincement(depart, 200, cadreCentre, ajustee, CADRE);
  t('ecarter les doigts du double double l echelle', proche(double.echelle, 2));

  const moitie = apresPincement({ etat: { echelle: 2, x: 0, y: 0 }, distance: 200 }, 100, cadreCentre, ajustee, CADRE);
  t('les rapprocher de moitie la divise par deux', proche(moitie.echelle, 1));

  /* LE POINT : on repart TOUJOURS de l'echelle du debut du geste. Un aller-retour des
     doigts doit donc revenir exactement a l'echelle de depart, sans derive. */
  const allerRetour = apresPincement(depart, 100, cadreCentre, ajustee, CADRE);
  t('LE POINT : un aller-retour des doigts revient a l echelle de depart',
    proche(allerRetour.echelle, depart.etat.echelle));

  t('l echelle du pincement reste bornee', apresPincement(depart, 100000, cadreCentre, ajustee, CADRE).echelle === ECHELLE_MAX);
  /* Une distance de depart nulle — les deux pointeurs au meme pixel — diviserait par
     zero : on rend l'etat tel quel plutot qu'un NaN. */
  t('une distance de depart nulle ne produit pas de NaN',
    apresPincement({ etat: { ...ETAT_INITIAL }, distance: 0 }, 50, cadreCentre, ajustee, CADRE).echelle === 1);
}

console.log('\n=== 8. LE DOUBLE-TAPE BASCULE, IL N ACCUMULE PAS ===');
{
  const ajustee = tailleAjustee({ largeur: 2000, hauteur: 3000 }, CADRE);
  const ancre: Point = { x: 120, y: 300 };

  const zoome = apresDoubleTape({ ...ETAT_INITIAL }, ancre, ajustee, CADRE);
  t('au repos, le double-tape agrandit', zoome.echelle === ECHELLE_DOUBLE_TAPE);

  const revenu = apresDoubleTape(zoome, ancre, ajustee, CADRE);
  t('LE POINT : zoome, il REVIENT au repos au lieu d agrandir encore',
    revenu.echelle === ECHELLE_MIN && revenu.x === 0 && revenu.y === 0);

  /* Depuis une echelle intermediaire atteinte au pincement, il revient aussi au repos :
     la regle est << zoome ou pas >>, pas << exactement 2 ou pas >>. */
  const depuis3 = apresDoubleTape({ echelle: 3, x: 50, y: 50 }, ancre, ajustee, CADRE);
  t('depuis une echelle quelconque, il revient aussi au repos', depuis3.echelle === ECHELLE_MIN);
}

console.log('\n=== 9. UNE SEULE ECHELLE, JAMAIS DEUX ===');
{
  /*
   * La deformation serait invisible dans les chiffres d'un seul appel : elle se verrait
   * au fait qu'on porte DEUX facteurs. On verifie donc la forme meme de l'etat, qui n'a
   * qu'un champ `echelle` — un `echelleX` / `echelleY` ne pourrait pas s'y glisser sans
   * casser ce test.
   */
  const etat = versEchelle({ ...ETAT_INITIAL }, 2.37, { x: 10, y: 10 },
    tailleAjustee({ largeur: 1234, hauteur: 567 }, CADRE), CADRE);
  const champs = Object.keys(etat).sort();
  t('LE POINT : l etat ne porte qu UNE echelle, plus un deplacement',
    champs.join(',') === 'echelle,x,y');
  t('et tous ses champs sont des nombres finis',
    Number.isFinite(etat.echelle) && Number.isFinite(etat.x) && Number.isFinite(etat.y));
}

console.log(`\n=== RESULTAT : ${ok} OK, ${ko} ECHEC ===\n`);
process.exit(ko === 0 ? 0 : 1);
