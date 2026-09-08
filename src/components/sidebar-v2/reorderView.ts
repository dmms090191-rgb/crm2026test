import type { LayoutEntry } from '../../lib/sidebarLayout';

/**
 * COUCHE VUE du mode Reorganiser — logique pure, testable.
 *
 * Ne fait AUCUNE modification de donnees. Elle traduit seulement entre :
 *   · ce qui est AFFICHE (regroupe, potentiellement filtre)
 *   · et les index REELS dans `entries`, sur lesquels operent move / rename /
 *     remove / toggleHidden.
 *
 * Sans cette traduction, regrouper les masques en bas decalerait tous les
 * index et une action porterait sur la mauvaise entree.
 */
export interface DisplayRow {
  entry: LayoutEntry;
  /** Index dans `entries`. C'est LUI que consomment les callbacks de donnees. */
  realIdx: number;
}

export interface DisplaySplit {
  /** Onglets visibles, compartiments et separateurs — dans l'ordre REEL. */
  main: DisplayRow[];
  /** Onglets masques uniquement — dans l'ordre REEL entre eux. */
  hidden: DisplayRow[];
}

/**
 * Repartit les entrees en deux zones d'AFFICHAGE.
 *
 * `entries` n'est jamais modifie : chaque ligne conserve son `realIdx`, donc sa
 * vraie place. Un onglet masque descend visuellement en bas, mais sa position
 * reelle reste intacte — la demasquer le fait remonter a sa vraie place sans
 * qu'on ait rien a reconstruire.
 *
 * Compartiments et separateurs ne descendent JAMAIS : ils restent dans `main`,
 * meme vides, meme en derniere position.
 */
export function splitDisplayRows(entries: LayoutEntry[], reordering: boolean): DisplaySplit {
  const main: DisplayRow[] = [];
  const hidden: DisplayRow[] = [];
  entries.forEach((entry, realIdx) => {
    const estMasque = entry.kind === 'item' && entry.hidden === true;
    if (reordering && estMasque) hidden.push({ entry, realIdx });
    else main.push({ entry, realIdx });
  });
  return { main, hidden };
}

/**
 * Liste aplatie dans l'ordre d'AFFICHAGE : `main`, puis la zone des masques si
 * elle est ouverte. C'est cette liste qui indexe le glisser-deposer.
 */
export function flatRows(split: DisplaySplit, showHidden: boolean): DisplayRow[] {
  return showHidden ? [...split.main, ...split.hidden] : split.main;
}

/**
 * Traduit un glisser-deposer exprime en positions AFFICHEES en un couple
 * (from, to) d'index REELS, directement utilisable par moveEntry().
 *
 * Depose « apres » la ligne affichee j = juste apres son entree reelle : l'element
 * atterrit au contact du voisin sur lequel on l'a lache.
 *
 * Renvoie null si le deplacement est sans effet.
 */
export function resolveDrop(
  rows: DisplayRow[],
  fromDisplay: number,
  toDisplay: number,
  edge: 'before' | 'after',
): { from: number; to: number } | null {
  const source = rows[fromDisplay];
  const target = rows[toDisplay];
  if (!source || !target) return null;

  const from = source.realIdx;
  let to = edge === 'after' ? target.realIdx + 1 : target.realIdx;
  if (from < to) to -= 1;
  if (to < 0 || from === to) return null;
  return { from, to };
}

/** Y a-t-il au moins un onglet masque ? Pilote l'affichage du bouton bascule. */
export function hasHiddenItems(entries: LayoutEntry[]): boolean {
  return entries.some(e => e.kind === 'item' && e.hidden === true);
}
