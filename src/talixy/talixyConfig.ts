/*
 * TALIXY — parametres centraux du mouvement et de la roue.
 *
 * Seule source des durees, courbes et parametres de roue : aucun composant ne doit ecrire ces valeurs
 * en dur. Les variables CSS de duree (talixy.css) les recopient, et un test verifie qu'elles sont identiques.
 * Module pur, sans aucun import : testable avec node --test.
 */

/* Mouvement : rapide au depart, freinage propre. La lumiere de l'actif arrive juste apres la rotation. */
export const TALIXY_MOTION = {
  easeOut: 'cubic-bezier(.22,1,.36,1)',
  /** Rotation de la roue lors d'un changement d'onglet (un cran). */
  navMs: 280,
  /** Supplement par cran au-dela du premier, plafonne par navMaxMs. */
  navPerExtraStepMs: 20,
  navMaxMs: 380,
  /** Anneau et lueur de l'actif : apres le debut de la rotation (mesure de la reference : 80 a 120 ms). */
  ringDelayMs: 70,
  ringMs: 160,
  hoverMs: 180,
  modalInMs: 260,
  modalOutMs: 160,
  viewEnterMs: 280,
  /** Mobile : animations plus courtes (280 ms -> environ 200 ms). */
  mobileFactor: 0.72,
} as const;

/*
 * Roue : ajustement d'un cercle sur les decalages mesures dans la video de reference
 * (ecart moyen 0,6 px) : pas de 11,7 deg, rayon = 4,88 x espacement, point le plus proche
 * de l'utilisateur 0,39 cran sous l'element actif (arc asymetrique).
 */
export const TALIXY_WHEEL_REFERENCE = {
  stepDeg: 11.7,
  radiusPerSpacing: 4.88,
  apexOffsetSteps: 0.39,
  /** Decalages mesures (px) pour un espacement de 60 px : crans -2, -1, +1, +2. */
  measuredOffsets: { spacing: 60, byStep: { '-2': 33, '-1': 12, '1': 2, '2': 15 } },
} as const;

export interface WheelParams {
  /**
   * Cote du moyeu (roue verticale) : 'right' = video de reference (les voisins partent vers la droite) ;
   * 'left' = image de reference de David (la planete a gauche, les onglets suivent sa jante).
   * Meme roue, simple miroir : pas, rayon, asymetrie, profondeur et opacites identiques.
   */
  hub: 'right' | 'left';
  /** Distance entre deux crans le long de la jante (px). Le rayon en decoule : spacing / pas. */
  spacing: number;
  /** Pas angulaire entre deux elements (degres). */
  stepDeg: number;
  /** Asymetrie de la reference : point le plus proche, en crans sous l'actif. */
  apexOffsetSteps: number;
  /** Recul dans la profondeur par cran (px), plafonne a depthMax. */
  depthPerStep: number;
  depthMax: number;
  /** Bascule autour de l'axe de la roue par cran (degres), plafonnee a tiltMaxDeg. */
  tiltPerStepDeg: number;
  tiltMaxDeg: number;
  /** Part de la rotation gardee par l'element : 0 = toujours droit, 1 = suit entierement la jante. */
  labelTurn: number;
  /** Reduction de taille par cran (l'actif est le plus grand), plafonnee a scaleMin. */
  scalePerStep: number;
  scaleMin: number;
  /** Opacite par cran au-dessus (index = nombre de crans) puis au-dessous : la reference s'eteint plus vite en haut. */
  opacityAbove: readonly number[];
  opacityBelow: readonly number[];
  /** Au-dela de ce nombre de crans : invisible, non cliquable, gare au bord de la jante. */
  windowSteps: number;
  /** Perspective du conteneur de la roue (px). */
  perspective: number;
  /** Place occupee sur la jante par un titre de compartiment et par un separateur (en crans). */
  sectionStep: number;
  dividerStep: number;
}

export type WheelPresetName = 'desktop' | 'laptop' | 'tablet' | 'mobile' | 'collapsed';

const BASE: WheelParams = {
  hub: 'left',
  spacing: 64,
  stepDeg: TALIXY_WHEEL_REFERENCE.stepDeg,
  apexOffsetSteps: TALIXY_WHEEL_REFERENCE.apexOffsetSteps,
  depthPerStep: 14,
  depthMax: 56,
  tiltPerStepDeg: 3,
  tiltMaxDeg: 10,
  labelTurn: 0.3,
  scalePerStep: 0.035,
  scaleMin: 0.84,
  opacityAbove: [1, 0.7, 0.42, 0.2, 0.06],
  opacityBelow: [1, 0.8, 0.56, 0.34, 0.16],
  windowSteps: 4.5,
  perspective: 1000,
  sectionStep: 0.6,
  dividerStep: 0.4,
};

/*
 * Presets par taille d'ecran. Le rayon n'est jamais fixe a part : il decoule de spacing et stepDeg,
 * ce qui garde la meme courbe que la reference a toutes les tailles.
 * Mode reduit (colonne de 64 px) : pas de 3 deg, donc grand rayon et courbe douce, profondeur gardee.
 */
export const TALIXY_WHEEL_PRESETS: Readonly<Record<WheelPresetName, WheelParams>> = {
  desktop: { ...BASE, spacing: 64 },
  laptop: { ...BASE, spacing: 58 },
  tablet: { ...BASE, spacing: 54 },
  mobile: { ...BASE, spacing: 56, depthPerStep: 7, depthMax: 28, tiltPerStepDeg: 0, tiltMaxDeg: 0 },
  collapsed: { ...BASE, spacing: 48, stepDeg: 3, labelTurn: 0, sectionStep: 0, dividerStep: 0.3 },
};

/* Seuils de largeur de fenetre (px) pour choisir un preset. */
export const TALIXY_BREAKPOINTS = { laptop: 1024, desktop: 1440, mobileMax: 767 } as const;

/*
 * Sidebar en roue : place de l'actif dans la colonne. Moyeu a gauche : les voisins repartent vers la gauche,
 * l'actif est donc pose en retrait (padStart) pour que les trois crans voisins restent dans la colonne.
 * focus : hauteur du foyer (fraction de la hauteur de la colonne).
 */
export interface SidebarWheelLayout { padStart: number; padEnd: number; focus: number }
export const TALIXY_SIDEBAR_LAYOUT: Readonly<Record<WheelPresetName, SidebarWheelLayout>> = {
  desktop: { padStart: 74, padEnd: 30, focus: 0.42 },
  laptop: { padStart: 66, padEnd: 30, focus: 0.42 },
  tablet: { padStart: 60, padEnd: 28, focus: 0.42 },
  mobile: { padStart: 62, padEnd: 28, focus: 0.42 },
  collapsed: { padStart: 12, padEnd: 4, focus: 0.4 },
};
export const TALIXY_PLANET = {
  /** Marge entre la jante de la planete et le bord droit de la sidebar (px). */
  rimGap: 18,
  /** Les lunes tournent avec la roue, plus lentement (parallaxe) : part de la rotation de la roue. */
  orbitShare: 0.5,
} as const;

/*
 * ---------- ARC « maquette gris bleute » (reference absolue : image 3, 1672x941) ----------
 * Mesures : moyeu a DROITE des boutons (arc en « ( »), rayon des disques 512 px, ligne d'arc a
 * +51 px, pas 8 deg (ecart 69-71 px, plus large autour de l'actif), apex au milieu de la liste,
 * disques Ø 50 px (actif Ø 68-72 px), tous les elements opaques. David : 7 onglets visibles au plus ;
 * liste plus longue -> rotation (actif au centre), liste qui tient -> arc FIXE centre verticalement.
 */
export type TalixyArcMode = 'wheel' | 'fixed';
/** Interrupteur global : 'fixed' = maquette ; remettre 'wheel' rend l'ancienne roue (rien n'est supprime). */
export const TALIXY_ARC_MODE: TalixyArcMode = 'fixed';

/*
 * Calibrage : le cercle de la geometrie passe par l'ORIGINE des cases (bord gauche), et le centre
 * du disque est 25 px plus a droite. Pour que les CENTRES des disques soient sur le cercle R = 512
 * de la maquette (apex mesure x = 204, moyeu x = 715), le cercle des cases vaut R = 537 px
 * (spacing 75 = 537 x 8 deg) et padStart = 179 (= 204 - 25).
 */
const ARC2: WheelParams = {
  hub: 'right',
  spacing: 75,                 // R cases 537 px -> centres des disques sur R 512 px (maquette)
  stepDeg: 8,
  apexOffsetSteps: 0,          // l'apex est l'ancre (milieu de la liste), pas l'actif
  depthPerStep: 0,
  depthMax: 0,
  tiltPerStepDeg: 0,
  tiltMaxDeg: 0,
  labelTurn: 0,                // les libelles restent droits
  scalePerStep: 0,
  scaleMin: 1,
  opacityAbove: [1, 1, 1, 1],  // tout est opaque dans la fenetre (maquette)
  opacityBelow: [1, 1, 1, 1],
  windowSteps: 3.49,           // actif ±3 crans -> 7 onglets visibles au plus (David)
  perspective: 1000,
  sectionStep: 0.42,           // un compartiment = un point discret sur la ligne
  dividerStep: 0.24,
};

export type TalixyArc2Size = 'desktop' | 'laptop' | 'compact';
export const TALIXY_ARC2_PRESETS: Readonly<Record<TalixyArc2Size, WheelParams>> = {
  desktop: { ...ARC2, spacing: 75 },     // >= 1440 px : echelle exacte de la maquette
  laptop: { ...ARC2, spacing: 67 },      // 1024-1439 px : meme courbure, ~0,9x
  compact: { ...ARC2, spacing: 56 },     // 768-1023 px (volet d'apercu) : meme courbure, ~0,75x
};

/** Mise en valeur de l'actif, mesuree sur la maquette : disque x1,36-1,45, libelle x1,27. */
export const TALIXY_ARC2_EMPHASIS = { discScale: 1.36, labelScale: 1.04, liftPx: 14 } as const;

/**
 * Colonne de navigation en mode maquette. focus 0.46 : centre du cercle a 46 % de la hauteur (mesure).
 * padStart : place entre le bord gauche et l'apex des disques (l'arc derive vers la droite aux extremites).
 */
export const TALIXY_ARC2_LAYOUT: Readonly<Record<TalixyArc2Size, SidebarWheelLayout & { asideW: number; lineGap: number }>> = {
  desktop: { padStart: 179, padEnd: 24, focus: 0.51, asideW: 420, lineGap: 27 },
  laptop: { padStart: 160, padEnd: 20, focus: 0.51, asideW: 376, lineGap: 24 },
  compact: { padStart: 106, padEnd: 14, focus: 0.51, asideW: 312, lineGap: 20 },
};
