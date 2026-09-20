import type { RimKind } from './arcGeometry';

/*
 * TALIXY — parcours de la roue (logique pure, sans React ni DOM).
 * La roue ne s'arrete que sur des onglets : titres de compartiment et separateurs sont portes par la jante
 * mais ne sont jamais au foyer. Seuls imports : des types (testable avec node --test).
 */

/** Index des onglets (les seuls elements sur lesquels la roue s'arrete). */
export function itemIndexes(kinds: readonly RimKind[]): number[] {
  const out: number[] = [];
  kinds.forEach((k, i) => { if (k === 'item') out.push(i); });
  return out;
}

/** Onglet le plus proche d'une position de jante ; -1 s'il n'y a aucun onglet. */
export function nearestItem(center: number, positions: readonly number[], kinds: readonly RimKind[]): number {
  let best = -1;
  let bestDist = Infinity;
  for (const i of itemIndexes(kinds)) {
    const dist = Math.abs(positions[i] - center);
    if (dist < bestDist) { best = i; bestDist = dist; }
  }
  return best;
}

/** Onglet voisin (dir = +1 : suivant, -1 : precedent), borne au premier et au dernier onglet. */
export function stepItem(fromIndex: number, kinds: readonly RimKind[], dir: 1 | -1): number {
  const items = itemIndexes(kinds);
  if (items.length === 0) return -1;
  const at = items.indexOf(fromIndex);
  if (at < 0) return items[dir > 0 ? 0 : items.length - 1];
  return items[Math.max(0, Math.min(items.length - 1, at + dir))];
}

/** Premier ou dernier onglet (touches Debut / Fin). */
export function edgeItem(kinds: readonly RimKind[], edge: 'first' | 'last'): number {
  const items = itemIndexes(kinds);
  if (items.length === 0) return -1;
  return edge === 'first' ? items[0] : items[items.length - 1];
}

/*
 * Molette et trackpad : un trackpad envoie des dizaines de petits deltas (inertie). On les cumule et on ne
 * tourne d'un cran qu'au-dela d'un seuil, avec un intervalle minimal entre deux crans.
 * deltaMode 1 (Firefox) compte en lignes : converti en pixels.
 */
export interface WheelInputState {
  acc: number;
  lastStepAt: number;
}

export const WHEEL_INPUT = { thresholdPx: 50, lineHeightPx: 33, minIntervalMs: 140 } as const;

export function wheelStep(
  state: WheelInputState, deltaY: number, deltaMode: number, now: number,
  opts: typeof WHEEL_INPUT = WHEEL_INPUT,
): { state: WheelInputState; step: -1 | 0 | 1 } {
  if (!Number.isFinite(deltaY) || deltaY === 0) return { state, step: 0 };
  const px = deltaMode === 1 ? deltaY * opts.lineHeightPx : deltaMode === 2 ? deltaY * 400 : deltaY;
  // Changement de sens : on repart de zero.
  const acc = Math.sign(px) !== Math.sign(state.acc) ? px : state.acc + px;
  if (Math.abs(acc) < opts.thresholdPx || now - state.lastStepAt < opts.minIntervalMs) {
    return { state: { acc, lastStepAt: state.lastStepAt }, step: 0 };
  }
  return { state: { acc: 0, lastStepAt: now }, step: acc > 0 ? 1 : -1 };
}
