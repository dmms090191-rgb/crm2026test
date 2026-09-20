import type { WheelParams } from './talixyConfig';

/*
 * TALIXY — geometrie FLUIDE de l'arc.
 *
 * Avant, l'arc choisissait entre trois jeux de valeurs (compact / laptop / desktop) selon deux
 * seuils. Resultat : a 1439 px il etait encore en « laptop » puis sautait d'un coup a 1440.
 * Entre les paliers, rien ne bougeait ; sur les paliers, tout bougeait en meme temps.
 *
 * Ici, ces trois jeux deviennent les POINTS D'ANCRAGE d'une courbe continue. On interpole entre
 * eux, et on prolonge par un plateau de chaque cote. Consequences :
 *   - a 768, 1024 et 1440 px on retombe EXACTEMENT sur les valeurs validees par David ;
 *   - entre deux, chaque grandeur varie sans a-coup ;
 *   - au-dela de 1440 px, plus rien ne grandit : l'arc ne se deforme pas sur un ultrawide.
 *
 * LA HAUTEUR SE TRAITE A PART, et surtout PAS a partir de la hauteur de la fenetre : elle est
 * MESUREE sur le conteneur reel de l'arc (voir ajusteALaHauteur). Deviner la place prise par le
 * logo et le pied avec une constante donnait un arc qui se croyait a l'aise et lachait ses sept
 * positions des 768 px de haut.
 *
 * Module pur, sans aucun import de valeur : testable avec node --test.
 */

export interface ArcMetrics {
  /** Distance entre deux crans le long de la jante (px). Le rayon en decoule : spacing / stepDeg. */
  spacing: number;
  /** Place entre le bord gauche de la colonne et l'apex des disques (px). */
  padStart: number;
  padEnd: number;
  /** Largeur de la colonne de navigation (px). */
  asideW: number;
  /** Ecart entre le cercle des disques et la ligne d'arc (px). */
  lineGap: number;
  /** Diametre du disque au repos (px). L'actif est agrandi par --tx-disc-active. */
  disc: number;
  /** Hauteur du foyer, en fraction de la hauteur de la colonne. */
  focus: number;
}

/** Un point d'ancrage : la largeur a laquelle ces valeurs ont ete validees a l'ecran. */
interface Ancre extends ArcMetrics {
  w: number;
}

/*
 * Les trois jeux d'origine, inchanges, simplement etiquetes par leur largeur de validation.
 * Toute modification ici change le rendu AUX paliers : ce sont des mesures, pas des reglages.
 */
const ANCRES: readonly Ancre[] = [
  { w: 768, spacing: 56, padStart: 106, padEnd: 14, asideW: 312, lineGap: 20, disc: 38, focus: 0.51 },
  { w: 1024, spacing: 67, padStart: 160, padEnd: 20, asideW: 376, lineGap: 24, disc: 44, focus: 0.51 },
  { w: 1440, spacing: 75, padStart: 179, padEnd: 24, asideW: 420, lineGap: 27, disc: 44, focus: 0.51 },
];

/*
 * Plancher : en dessous de 768 px la barre laterale Talixy redevient une liste classique et l'arc
 * n'est plus rendu. On garde quand meme une descente continue jusqu'a 600 px, pour que rien ne
 * saute si l'arc est affiche dans un volet etroit (apercu, fenetre redimensionnee a la main).
 */
const PLANCHER: Ancre = { w: 600, spacing: 46, padStart: 84, padEnd: 12, asideW: 258, lineGap: 16, disc: 34, focus: 0.51 };

/** Nombre de positions que l'arc doit tenir : c'est l'objectif, pas une consequence. */
export const CRANS_VISIBLES = 7;
/** En dessous, l'arc devient illisible : mieux vaut alors montrer moins d'onglets. */
export const SPACING_MIN = 34;

const melange = (a: number, b: number, t: number) => a + (b - a) * t;

/** Arrondit au demi-pixel : evite le tremblement d un pixel a l autre pendant un redimensionnement. */
const arrondi = (v: number) => Math.round(v * 2) / 2;
/*
 * L espacement, lui, s arrondit VERS LE BAS. Sinon l arrondi peut repasser au-dessus du plafond
 * de hauteur qu on vient de calculer, et l arc deborde d un demi-pixel par cran — soit 3,5 px sur
 * sept crans, assez pour mordre sur le pied de la colonne.
 */
const arrondiBas = (v: number) => Math.floor(v * 2) / 2;

/**
 * Geometrie de l'arc pour une fenetre donnee. Continue : deux largeurs voisines donnent deux
 * geometries voisines, sans aucun saut.
 */
export function arcMetrics(largeur: number): ArcMetrics {
  const points = [PLANCHER, ...ANCRES];

  if (largeur <= points[0].w) return { ...points[0] };
  // Plateau : au-dela de la plus grande ancre, l'arc ne grandit plus, la place va au contenu.
  if (largeur >= points[points.length - 1].w) return { ...points[points.length - 1] };

  let i = 0;
  while (i < points.length - 2 && largeur > points[i + 1].w) i++;
  const a = points[i];
  const b = points[i + 1];
  const t = (largeur - a.w) / (b.w - a.w);
  return {
    spacing: arrondiBas(melange(a.spacing, b.spacing, t)),
    padStart: arrondi(melange(a.padStart, b.padStart, t)),
    padEnd: arrondi(melange(a.padEnd, b.padEnd, t)),
    asideW: arrondi(melange(a.asideW, b.asideW, t)),
    lineGap: arrondi(melange(a.lineGap, b.lineGap, t)),
    disc: arrondi(melange(a.disc, b.disc, t)),
    focus: melange(a.focus, b.focus, t),
  };
}

/*
 * ---------- HAUTEUR : plus aucune constante devinee ----------
 *
 * L'arc doit tenir ENTIER dans la colonne, des deux cotes du foyer. La condition exacte — celle que
 * TalixyArc verifie deja pour decider s'il garde ses positions fixes — est :
 *
 *     hauteurUtile x min(focus, 1 - focus)  >=  (span / 2) x spacing + spacing / 2 + marge
 *
 * span est l'etendue reelle de la jante en crans (onglets ET respirations des compartiments), et
 * hauteurUtile la hauteur MESUREE du conteneur de l'arc — pas la hauteur de la fenetre moins un
 * nombre choisi au juge. On resout donc en spacing, ce qui donne le plus grand espacement qui
 * tient. C'est l'inverse exact du calcul du composant : par construction, il ne peut plus se
 * rabattre sur son mode degrade tant que la place physique existe.
 *
 * Rappel du defaut que cela corrige : quand la place manquait, l'arc lachait ses 7 positions et se
 * recentrait sur l'onglet ACTIF. Dashboard etant le premier de la liste, la moitie haute restait
 * vide et il ne restait que 3 onglets. Ce n'etait pas un probleme de reserve, mais de repli.
 */
/*
 * marge = 6,5 et non 6 : le composant compare avec >=, et l egalite stricte en virgule flottante
 * bascule du mauvais cote (245 calcule ici ressort en 244,999... la-bas). Un demi-pixel de
 * securite coute zero visuellement et supprime la classe entiere de ce bug.
 */
export function spacingPourHauteur(hauteurUtile: number, span: number, focus: number, marge = 6.5): number {
  const cote = Math.min(focus, 1 - focus);
  const denominateur = span / 2 + 0.5;
  if (hauteurUtile <= 0 || cote <= 0 || denominateur <= 0) return Number.POSITIVE_INFINITY;
  return (hauteurUtile * cote - marge) / denominateur;
}

/**
 * Geometrie finale : la courbe de largeur, resserree si la hauteur mesuree l'exige.
 *
 * Degradation progressive, dans cet ordre : l'espacement d'abord, le diametre ensuite et moins
 * vite, l'ecart de ligne enfin. On ne descend jamais sous SPACING_MIN ni sous 30 px de disque :
 * en dessous l'arc cesse d'etre lisible et la cible devient trop petite au doigt. Ce n'est qu'a
 * ce moment-la, et seulement alors, que montrer moins de 7 onglets devient le moindre mal.
 */
export function ajusteALaHauteur(base: ArcMetrics, hauteurUtile: number, span: number): ArcMetrics {
  if (hauteurUtile <= 0) return base;
  const possible = spacingPourHauteur(hauteurUtile, span, base.focus);
  if (!Number.isFinite(possible) || possible >= base.spacing) return base;

  const spacing = Math.max(SPACING_MIN, possible);
  const rapport = spacing / base.spacing;
  return {
    ...base,
    spacing: arrondiBas(spacing),
    // Le disque suit, mais moins vite : il reste confortable au doigt le plus longtemps possible.
    disc: arrondi(Math.max(30, base.disc * (0.55 + 0.45 * rapport))),
    lineGap: arrondi(Math.max(12, base.lineGap * rapport)),
  };
}

/** Parametres de roue pour une fenetre donnee : l'ARC2 d'origine, avec l'espacement fluide. */
export function arcParams(base: WheelParams, largeur: number): WheelParams {
  return { ...base, spacing: arcMetrics(largeur).spacing };
}
