import type { WheelParams, WheelPresetName, TALIXY_MOTION, TALIXY_BREAKPOINTS } from './talixyConfig';

/*
 * TALIXY — geometrie de la roue. Une VRAIE roue, pas un faux arc.
 *
 * Modele : une roue vue de profil. L'element actif est au foyer, le point le plus proche de
 * l'utilisateur ; les voisins sont places sur la jante, reculent, basculent, rapetissent et s'eteignent ;
 * le reste de la roue est cache derriere l'interface. Repere du foyer : actif en (0,0), x vers la
 * droite, y vers le bas, z vers l'utilisateur.
 *
 * Point cle : chaque element est place par une ROTATION AUTOUR DU CENTRE DE LA ROUE (pivot), et
 * toutes les cases ont exactement la meme liste de fonctions CSS. Quand l'actif change, le navigateur
 * interpole donc les angles : chaque element voyage SUR LE CERCLE (jamais en ligne droite), et tout le
 * systeme tourne en meme temps. L'asymetrie de la reference est portee par la position du pivot, pas
 * par l'angle : au foyer, la transformation est exactement neutre (texte de l'actif parfaitement net).
 *
 * Module pur : seuls des types sont importes (testable avec node --test).
 */

export type ArcOrientation = 'vertical' | 'horizontal';
export type RimKind = 'item' | 'section' | 'divider';
type MotionTiming = Pick<typeof TALIXY_MOTION, 'navMs' | 'navPerExtraStepMs' | 'navMaxMs'>;
type Breakpoints = typeof TALIXY_BREAKPOINTS;

const DEG = Math.PI / 180;

/* Arrondi stable pour les chaines CSS (evite aussi le « -0 »). */
function n(v: number): number {
  const r = Math.round(v * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
}

/** Rayon de la roue : la distance entre deux crans le long de la jante vaut `spacing`. */
export function wheelRadius(p: Pick<WheelParams, 'spacing' | 'stepDeg'>): number {
  return p.spacing / (p.stepDeg * DEG);
}

/**
 * Reglages directs d'une roue (rayon en px, pas angulaire en degres, recul par cran en px).
 * Le rayon fixe l'espacement le long de la jante (espacement = rayon x pas) : la geometrie reste la meme.
 */
export function withOverrides(p: WheelParams, o: { radius?: number; angleStep?: number; depth?: number }): WheelParams {
  const stepDeg = o.angleStep ?? p.stepDeg;
  const spacing = o.radius !== undefined ? o.radius * stepDeg * DEG : p.spacing;
  return { ...p, stepDeg, spacing, depthPerStep: o.depth ?? p.depthPerStep };
}

/**
 * Sens de la roue : +1 moyeu a droite (video de reference), -1 moyeu a gauche (miroir exact).
 * Le miroir ne concerne que la roue verticale ; la roue horizontale garde son moyeu au-dessus.
 */
export function hubSign(p: Pick<WheelParams, 'hub'>, orientation: ArcOrientation = 'vertical'): 1 | -1 {
  return orientation === 'vertical' && p.hub === 'left' ? -1 : 1;
}

/** Centre de la roue dans le repere du foyer. Vertical : roue a droite (ou a gauche) ; horizontal : la meme roue tournee de -90 deg. */
export function wheelPivot(p: WheelParams, orientation: ArcOrientation = 'vertical'): { x: number; y: number } {
  const R = wheelRadius(p);
  const phi0 = p.apexOffsetSteps * p.stepDeg * DEG;
  const cx = R * Math.cos(phi0);
  const cy = R * Math.sin(phi0);
  return orientation === 'vertical' ? { x: hubSign(p) * cx, y: cy } : { x: cy, y: -cx };
}

/** Rotation de toute la roue autour du moyeu (degres) quand son centre est a `center` crans. */
export function wheelTurnDeg(center: number, p: WheelParams, orientation: ArcOrientation = 'vertical'): number {
  return Number.isFinite(center) ? n(hubSign(p, orientation) * center * p.stepDeg) : 0;
}

/** Position de chaque element sur la jante, en crans : un element avance la position de la place qu'il occupe. */
export function rimPositions(kinds: readonly RimKind[], p: Pick<WheelParams, 'sectionStep' | 'dividerStep'>): number[] {
  const out: number[] = [];
  let pos = 0;
  for (const kind of kinds) {
    out.push(pos);
    pos += kind === 'item' ? 1 : kind === 'section' ? p.sectionStep : p.dividerStep;
  }
  return out;
}

/** Centre de la roue : position de l'actif ; actif introuvable (ex. onglet masque) -> dernier centre connu. */
export function resolveCenter(positions: readonly number[], activeIndex: number, fallback: number): number {
  const v = activeIndex >= 0 && activeIndex < positions.length ? positions[activeIndex] : undefined;
  return v !== undefined && Number.isFinite(v) ? v : fallback;
}

/** Hors fenetre, un element est « gare » au bord de la jante : il ne fait jamais le tour de la roue. */
export function parkDelta(delta: number, windowSteps: number): number {
  const lim = windowSteps + 1;
  if (!Number.isFinite(delta)) return lim;
  return Math.max(-lim, Math.min(lim, delta));
}

/** Opacite selon la distance au foyer (tables asymetriques), puis extinction jusqu'au bord de la fenetre. */
export function opacityAt(delta: number, p: WheelParams): number {
  const d = Math.abs(delta);
  if (!Number.isFinite(delta) || d > p.windowSteps) return 0;
  const table = delta < 0 ? p.opacityAbove : p.opacityBelow;
  const last = table.length - 1;
  if (d <= last) {
    const i = Math.floor(d);
    const hi = table[Math.min(i + 1, last)];
    return n(table[i] + (hi - table[i]) * (d - i));
  }
  const span = p.windowSteps - last;
  return span <= 0 ? 0 : n(Math.max(0, table[last] * (1 - (d - last) / span)));
}

export interface ArcPose {
  /** Distance au foyer en crans, apres gare. */
  delta: number;
  x: number;
  y: number;
  z: number;
  /** Rotation nette de l'element dans son plan (degres). */
  turnDeg: number;
  tiltDeg: number;
  scale: number;
  opacity: number;
  visible: boolean;
  zIndex: number;
  /** Transformation CSS : meme liste de fonctions pour toutes les cases d'une meme roue. */
  transform: string;
}

/** Pose d'un element situe a `delta` crans du foyer (negatif = au-dessus / a gauche). */
export function arcPose(delta: number, p: WheelParams, orientation: ArcOrientation = 'vertical'): ArcPose {
  const d = parkDelta(delta, p.windowSteps);
  const s = hubSign(p, orientation);
  const theta = d * p.stepDeg;                    // degres
  const beta = -s * theta;                        // rotation autour du pivot : d > 0 va vers le bas / la droite
  const C = wheelPivot(p, orientation);
  const b = beta * DEG;
  // Position : C + rotation(beta) de (foyer - C)
  const x = C.x + (-C.x * Math.cos(b) + C.y * Math.sin(b));
  const y = C.y + (-C.x * Math.sin(b) - C.y * Math.cos(b));
  const ad = Math.abs(d);
  const z = -Math.min(p.depthMax, p.depthPerStep * ad);
  const counter = s * theta * (1 - p.labelTurn);
  const tiltRaw = (orientation === 'vertical' ? -1 : 1) * p.tiltPerStepDeg * d;
  const tilt = Math.max(-p.tiltMaxDeg, Math.min(p.tiltMaxDeg, tiltRaw));
  const scale = Math.max(p.scaleMin, 1 - p.scalePerStep * ad);
  const opacity = Number.isFinite(delta) ? opacityAt(delta, p) : 0;
  const tiltFn = orientation === 'vertical' ? 'rotateX' : 'rotateY';
  const transform =
    `translate3d(${n(C.x)}px, ${n(C.y)}px, 0px) rotateZ(${n(beta)}deg) ` +
    `translate3d(${n(-C.x)}px, ${n(-C.y)}px, ${n(z)}px) rotateZ(${n(counter)}deg) ` +
    `${tiltFn}(${n(tilt)}deg) scale(${n(scale)})`;
  return {
    delta: d,
    x: n(x),
    y: n(y),
    z: n(z),
    turnDeg: n(beta + counter),
    tiltDeg: n(tilt),
    scale: n(scale),
    opacity,
    visible: opacity > 0.001,
    zIndex: 100 - Math.round(ad * 10),
    transform,
  };
}

/** Duree de rotation pour un saut de `steps` crans : 280 ms, plus 20 ms par cran supplementaire, plafonnee. */
export function transitionMs(steps: number, m: MotionTiming): number {
  const s = Math.max(1, Math.ceil(Math.abs(Number.isFinite(steps) ? steps : 1)));
  return Math.min(m.navMaxMs, m.navMs + (s - 1) * m.navPerExtraStepMs);
}

/** Preset de roue selon la largeur de fenetre et le mode reduit. */
export function presetNameFor(viewportWidth: number, collapsed: boolean, bp: Breakpoints): WheelPresetName {
  if (collapsed) return 'collapsed';
  if (viewportWidth <= bp.mobileMax) return 'mobile';
  if (viewportWidth < bp.laptop) return 'tablet';
  if (viewportWidth < bp.desktop) return 'laptop';
  return 'desktop';
}

/** Nombre de crans visibles au-dessus et au-dessous du foyer, selon la place reellement disponible (px). */
export function visibleWindow(spaceAbove: number, spaceBelow: number, p: WheelParams): { above: number; below: number } {
  const fit = (sign: 1 | -1, space: number) => {
    let last = 0;
    for (let k = 1; k <= Math.floor(p.windowSteps); k++) {
      const pose = arcPose(sign * k, p);
      if (Math.abs(pose.y) + p.spacing / 2 > space) break;
      last = k;
    }
    return last;
  };
  return { above: fit(-1, Math.max(0, spaceAbove)), below: fit(1, Math.max(0, spaceBelow)) };
}

/* ---------- Mode « fixe » (maquette gris bleute) : l'ancre est le milieu de la liste, pas l'actif. ---------- */

/** Ancre de l'arc fixe : position mediane entre le premier et le dernier element de la jante. */
export function fixedAnchor(positions: readonly number[]): number {
  if (positions.length === 0) return 0;
  return (positions[0] + positions[positions.length - 1]) / 2;
}

/** La liste tient-elle entierement dans la fenetre (7 visibles au plus) autour de l'ancre ? */
export function listFits(positions: readonly number[], p: Pick<WheelParams, 'windowSteps'>): boolean {
  if (positions.length === 0) return true;
  const anchor = fixedAnchor(positions);
  return positions[positions.length - 1] - anchor <= p.windowSteps && anchor - positions[0] <= p.windowSteps;
}

/**
 * Fenetre glissante quand la liste depasse : le centre ne bouge QUE si l'actif sort de la fenetre
 * (marge de confort), et reste borne pour que les extremites de la liste ne laissent jamais de vide.
 */
export function followCenter(
  prev: number,
  activePos: number,
  positions: readonly number[],
  p: Pick<WheelParams, 'windowSteps'>,
  comfort = 0.5
): number {
  if (positions.length === 0 || !Number.isFinite(activePos)) return prev;
  const lo = positions[0] + p.windowSteps;
  const hi = positions[positions.length - 1] - p.windowSteps;
  const clampCenter = (c: number) => (hi <= lo ? fixedAnchor(positions) : Math.max(Math.min(c, hi), lo));
  let c = Number.isFinite(prev) ? prev : activePos;
  const reach = p.windowSteps - comfort;
  if (activePos > c + reach) c = activePos - reach;
  else if (activePos < c - reach) c = activePos + reach;
  return clampCenter(c);
}

/* ---------- Carrousel : N positions FIXES sur la jante, ce sont les onglets qui tournent. ---------- */

/** Nombre de positions visibles du carrousel (decision de David : toujours 7). */
export const CAROUSEL_SLOTS = 7;

/**
 * Jante du carrousel : elle ne porte QUE les onglets, espaces d'un cran plein.
 * Le decor (compartiments, separateurs) sort de la jante — il recoit une position infinie, donc
 * une opacite nulle et aucune interaction. Sans cela, les respirations mangeraient la fenetre et
 * on verrait 5 ou 6 onglets au lieu de 7.
 */
export function carouselPositions(kinds: readonly RimKind[]): number[] {
  let k = 0;
  return kinds.map(kind => (kind === 'item' ? k++ : Number.POSITIVE_INFINITY));
}

/**
 * Indice du PREMIER onglet visible.
 *   - borne a [0, count - slots] : aux deux extremites la fenetre reste pleine, jamais de vide ;
 *   - si l'onglet actif (ou vise) est hors fenetre, on tourne juste assez pour l'y ramener.
 * `active` vaut -1 quand il n'y a rien a ramener (simple coup de molette).
 */
export function carouselStart(start: number, active: number, count: number, slots = CAROUSEL_SLOTS): number {
  const max = Math.max(0, count - slots);
  const clamp = (v: number) => Math.min(Math.max(Math.round(v), 0), max);
  let s = clamp(start);
  if (active >= 0) {
    if (active < s) s = active;
    else if (active > s + slots - 1) s = active - slots + 1;
  }
  return clamp(s);
}

/* ---------- Separateurs de compartiment : le nom reste a gauche, seul le trait s'adapte. ---------- */

/**
 * Abscisse du cercle d'arc a une ordonnee donnee, cote GAUCHE (moyeu a droite).
 * Sert a poser le point lumineux du separateur PILE sur la ligne, quelle que soit la hauteur a
 * laquelle tombe la separation : c'est ce qui fait varier la longueur du trait de liaison.
 * Retourne null si l'ordonnee sort du cercle.
 */
export function arcXAtY(y: number, hubX: number, hubY: number, radius: number): number | null {
  const dy = y - hubY;
  const inside = radius * radius - dy * dy;
  if (inside <= 0) return null;
  return hubX - Math.sqrt(inside);
}

/**
 * Position d'une separation SUR LA JANTE : le milieu exact entre le dernier onglet qui precede le
 * compartiment et le premier qui le suit, dans la LISTE — pas parmi les seuls onglets visibles.
 *
 * C'est le point clef : ancrer sur les voisins visibles collait le premier compartiment au bord
 * haut de la fenetre (il n'a jamais de voisin au-dessus) et le dernier au bord bas. Ancre sur la
 * liste, la separation tourne avec la roue exactement comme un onglet, et sort du cadre avec son
 * groupe. Aucun compartiment n'a de traitement particulier.
 */
export function separatorRim(positions: readonly number[], kinds: readonly RimKind[], index: number): number | null {
  const cherche = (step: number) => {
    for (let i = index + step; i >= 0 && i < kinds.length; i += step) {
      if (kinds[i] === 'item' && Number.isFinite(positions[i])) return positions[i];
    }
    return null;
  };
  const avant = cherche(-1);
  const apres = cherche(1);
  if (avant !== null && apres !== null) return (avant + apres) / 2;
  if (apres !== null) return apres - 0.5;
  if (avant !== null) return avant + 0.5;
  return null;
}
