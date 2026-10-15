/**
 * LE CADRAGE DES SCENES 3D, SELON LA FORME DE L'ECRAN.
 *
 * Module PUR : aucune dependance a three.js, a React ni au DOM. Tout le raisonnement de
 * cadrage tient dans quelques fonctions verifiables avec node --test.
 *
 * ---------- LE DEFAUT QUE CE MODULE CORRIGE ----------
 *
 * La camera etait posee une fois pour toutes : position [0, 0, 9.4] et ouverture 42 degres.
 * Or en trois dimensions, l'ouverture d'un objectif se mesure VERTICALEMENT : le champ
 * horizontal, lui, se deduit de la forme de l'ecran. La hauteur vue vaut donc 9,4 x tan(21°),
 * soit 3,61 unites de part et d'autre du centre, A TOUTES LES TAILLES — mais la largeur vue
 * vaut cette hauteur MULTIPLIEE par le rapport largeur/hauteur de l'ecran :
 *
 *     bureau   1440 x 900  (rapport 1,600) ->  5,77 unites de demi-largeur
 *     tablette  768 x 1024 (rapport 0,750) ->  2,71 unites
 *     telephone 375 x 812  (rapport 0,462) ->  1,67 unites
 *
 * Les deux scenes demandent 3,17 unites. Sur un telephone, la moitie des anneaux et un tiers
 * de l'arbre etaient donc litteralement hors du cadre — non par un defaut de CSS, que n'importe
 * quelle mesure de rectangles aurait vu, mais par la geometrie de la camera, qu'aucune mesure
 * de rectangles ne peut voir. C'est pour cela que le defaut avait survecu a un releve de 160
 * combinaisons sans jamais y apparaitre.
 *
 * ---------- LE CHOIX : RECULER, PAS ELARGIR ----------
 *
 * Deux gestes ramenent la scene dans le cadre : elargir l'objectif a distance constante, ou
 * reculer la camera a objectif constant. Les deux donnent le MEME champ — c'est la forme de
 * l'ecran qui le dicte, pas nous. Ils ne donnent pas la meme IMAGE :
 *
 *   - elargir a 74 degres deforme : un tronc vu au grand-angle s'evase, et les feuilles, dont
 *     la taille en pixels depend de leur distance a la camera, gardent leur taille pendant que
 *     l'arbre retrecit. La couronne devient une grappe de grosses taches.
 *   - reculer garde l'objectif, donc le dessin : l'arbre retrecit, ses feuilles aussi, dans le
 *     meme rapport. C'est un recul de cameraman, pas un changement de focale.
 *
 * On recule. Et on ne recule JAMAIS en deca de 9,4 : sur un ecran large, le cadrage d'origine
 * est deja le bon, et il ne doit pas bouger d'un pixel.
 *
 * ---------- UNE SEULE FONCTION, ET C'EST VOULU ----------
 *
 * Le cadrage se demande par `cadrer()`, qui rend la distance ET la hauteur de camera ensemble.
 * Ces deux valeurs ne peuvent pas se calculer separement : remonter la scene dans le cadre
 * consomme de la marge en haut, donc exige de reculer davantage. Une premiere version exposait
 * deux fonctions independantes, et une revue a trouve le defaut previsible — sur une fenetre
 * proche du carre (rapport >= 0,915), ou le recul vaut deja son minimum, la remontee poussait
 * le haut des anneaux jusqu'a 97 px hors du cadre. Les deux calculs ne se quittent plus.
 */

/** Ouverture VERTICALE de l'objectif, en degres. Elle ne change jamais : c'est le parti pris. */
export const OUVERTURE = 42;

/** La distance pour laquelle les scenes ont ete composees. Jamais moins : un ecran large garde son cadrage. */
export const DISTANCE_MIN = 9.4;

/** tan(ouverture / 2), le facteur qui relie une distance a la hauteur vue. */
const TANGENTE = Math.tan((OUVERTURE * Math.PI) / 360);

/**
 * Plafond de la remontee, en part du demi-cadre. Sans lui, un panneau occupant presque tout
 * l'ecran ferait diverger le recul : a 1, la scene demanderait une distance infinie.
 */
const REMONTEE_MAX = 0.55;

/** Ce qu'une scene doit tenir dans le cadre, en unites de scene, depuis son centre. */
export interface Etendue {
  demiLargeur: number;
  demiHauteur: number;
}

/**
 * CES CHIFFRES SONT MESURES, PAS DEVINES — mais lis la nuance sur les hauteurs.
 *
 * Les DEMI-LARGEURS viennent d'un releve en pixels sur le rendu reel, en 1920 x 1080, ou rien
 * ne coupe les scenes : on cherche la matiere lumineuse, on prend son ecart maximal au centre,
 * et on le convertit en unites de scene par la geometrie de la camera. Les deux scenes
 * demandent 3,17 unites ; on garde 3,30, pour qu'un trait ne lèche jamais le bord. L'arbre en
 * demandait 3,51 avant d'etre pose sur son propre centre plutot que sur zero (voir ArbreDeVie) :
 * un objet decentre oblige le cadre a tenir son cote le plus large DES DEUX cotes.
 *
 * Les DEMI-HAUTEURS sont la hauteur que l'on s'engage a montrer, et NON l'etendue totale de la
 * scene. La difference compte pour l'arbre : sa couronne monte a 3,10 mais ses racines
 * descendent a 3,93, alors que le cadre d'origine n'en voit que 3,61. Les pointes de racines
 * sortent donc du bas de l'image sur un ecran large — depuis toujours, bien avant ce module, et
 * c'est un parti pris : un arbre enracine plus loin que le cadre. Declarer ici 3,93 ferait
 * reculer la camera de 9,4 a 10,24 et changerait un rendu de bureau deja valide. On declare
 * donc 3,60, et le test unitaire enonce cet ecart au lieu de le masquer.
 *
 * Pour les anneaux, 3,45 est au contraire confortable : leur sommet reel atteint 3,22.
 *
 * Les tests CADRAGE de scripts/site/israelHaya.test.ts verrouillent ces proprietes.
 */
export const ETENDUE: Record<3 | 4, Etendue> = {
  3: { demiLargeur: 3.3, demiHauteur: 3.45 },
  4: { demiLargeur: 3.3, demiHauteur: 3.6 },
};

/**
 * Etendue REELLE des scenes, mesuree sur leur geometrie. Elle ne sert pas au cadrage : elle
 * existe pour que les tests puissent enoncer l'ecart entre ce qu'on montre et ce qui existe,
 * au lieu de le laisser se perdre dans un commentaire.
 */
export const ETENDUE_REELLE: Record<3 | 4, { demiLargeur: number; haut: number; bas: number }> = {
  3: { demiLargeur: 3.17, haut: 3.22, bas: 3.22 },
  4: { demiLargeur: 3.17, haut: 3.10, bas: 3.93 },
};

/** La demi-hauteur vue, en unites de scene, a une distance donnee. */
export function demiHauteurVue(distance: number): number {
  return distance * TANGENTE;
}

/**
 * A quelle distance poser la camera pour que l'etendue demandee tienne dans le cadre.
 *
 * `remontee` est la part du demi-cadre dont la scene va etre remontee : elle mange d'autant la
 * marge disponible en haut, et c'est pour cela qu'elle entre dans ce calcul. L'ignorer etait le
 * defaut bloquant trouve en revue.
 */
export function distanceCamera(etendue: Etendue, aspect: number, remontee = 0): number {
  if (!Number.isFinite(aspect) || aspect <= 0) return DISTANCE_MIN;
  const part = Number.isFinite(remontee) ? Math.min(REMONTEE_MAX, Math.max(0, remontee)) : 0;
  return Math.max(
    DISTANCE_MIN,
    etendue.demiHauteur / (TANGENTE * (1 - part)),
    etendue.demiLargeur / (aspect * TANGENTE),
  );
}

/** Transition douce de 0 a 1 entre deux seuils : evite toute bascule brutale entre deux tailles. */
export function adoucir(x: number, bas: number, haut: number): number {
  if (!Number.isFinite(x)) return 0;
  if (haut <= bas) return x >= haut ? 1 : 0;
  const u = Math.min(1, Math.max(0, (x - bas) / (haut - bas)));
  return u * u * (3 - 2 * u);
}

export interface Cadre {
  /** Ce que la scene doit montrer. */
  etendue: Etendue;
  /** Taille de la scene a l'ecran, en pixels. */
  largeurScene: number;
  hauteurScene: number;
  /** Haut du panneau de saisie par rapport au haut de la scene, en pixels. null : pas de panneau. */
  hautPanneau: number | null;
  /** Largeur de ce panneau, en pixels. */
  largeurPanneau: number;
  /**
   * Part de l'apparition du panneau, de 0 (pas encore la) a 1 (entierement visible).
   *
   * Le panneau reste MONTE pendant tout le chapitre des anneaux et ne devient visible qu'a sa
   * seconde moitie : masque par `visibility`, il garde sa boite, donc il se mesure deja. Sans
   * cette valeur, la scene etait remontee de 166 px devant un bas d'ecran vide pendant le
   * premier tiers du chapitre, et ne bougeait plus au moment ou le panneau arrivait vraiment.
   */
  montee: number;
}

/**
 * DE QUELLE PART DU DEMI-CADRE LA SCENE DOIT REMONTER, de 0 a 1.
 *
 * Au chapitre des anneaux, le panneau de saisie se pose en bas. Au-dela d'environ 1260 px de
 * large il ne pese plus que 35 % de la largeur et plus rien ne bouge — c'est le cas du bureau,
 * ou il tient dans un coin et ou les anneaux respirent a cote. Sur un telephone il occupe 92 %
 * de la largeur et les 44 % du bas : sans remontee, les anneaux passeraient derriere lui.
 *
 * Le poids passe de 0 a 1 entre 35 % et 85 % de la largeur, puis se multiplie par la part
 * d'apparition du panneau : une tablette fait le chemin a moitie, et l'arrivee du panneau
 * accompagne la remontee au lieu de la suivre. Aucune bascule, ni entre deux tailles voisines,
 * ni entre deux instants.
 *
 * Le resultat est une PART, sans unite : elle ne depend que de pixels, donc elle se calcule
 * AVANT la distance — ce qui permet justement a la distance d'en tenir compte.
 */
export function remonteeScene(p: Cadre): number {
  if (p.hautPanneau === null || !(p.hauteurScene > 0) || !(p.largeurScene > 0)) return 0;

  const visible = Number.isFinite(p.montee) ? Math.min(1, Math.max(0, p.montee)) : 0;
  if (visible <= 0) return 0;

  const poids = adoucir(p.largeurPanneau / p.largeurScene, 0.35, 0.85) * visible;
  if (poids <= 0) return 0;

  // On vise le centre de ce qui reste libre au-dessus du panneau.
  const haut = Math.max(0, Math.min(p.hautPanneau, p.hauteurScene));
  const part = ((p.hauteurScene - haut) / p.hauteurScene) * poids;
  return Math.min(REMONTEE_MAX, Math.max(0, part));
}

/**
 * LE CADRAGE COMPLET : distance et hauteur de camera, calculees ensemble.
 *
 * `hauteur` est NEGATIVE quand la scene doit remonter dans le cadre : en montant sur une
 * chaise, on voit la table plus bas. Descendre la camera remonte donc son sujet.
 */
export function cadrer(p: Cadre): { distance: number; hauteur: number } {
  const aspect = p.hauteurScene > 0 ? p.largeurScene / p.hauteurScene : 1;
  const remontee = remonteeScene(p);
  const distance = distanceCamera(p.etendue, aspect, remontee);
  // Zero franc quand il n'y a rien a remonter : `-0 * x` rend `-0`, que Object.is distingue
  // de `0`, et un appelant qui compare a zero se ferait avoir pour rien.
  return { distance, hauteur: remontee > 0 ? -remontee * demiHauteurVue(distance) : 0 };
}
