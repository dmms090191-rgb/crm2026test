import type { LayoutEntry } from '../lib/sidebarLayout';

/*
 * TALIXY MOBILE — les deux calculs de la navigation, sans React ni Supabase.
 * Module pur : testable avec node --test, comme le reste du moteur Talixy.
 */

export interface MobileNavItem {
  id: string;
  label: string;
  /** Libelle du compartiment auquel cet onglet appartient. Vide si aucun compartiment au-dessus. */
  compartiment: string;
}

/**
 * Transforme la liste d'entrees en onglets mobiles, chacun portant son compartiment.
 *
 * La resolution du libelle est passee en parametre : ce module reste ainsi SANS aucun import de
 * valeur, donc chargeable tel quel par node --test. Le renommage garde sa source unique (entryLabel).
 * Le compartiment d'un onglet est la derniere section rencontree AVANT lui : renommer une section
 * sur le bureau renomme donc le compartiment du mini arc, sans une ligne de code de plus.
 */
export function mobileItems(entries: LayoutEntry[], libelle: (e: LayoutEntry) => string): MobileNavItem[] {
  const out: MobileNavItem[] = [];
  let courant = '';
  for (const e of entries) {
    if (e.kind === 'section') { courant = e.label; continue; }
    if (e.kind !== 'item') continue;
    out.push({ id: e.id, label: libelle(e), compartiment: courant });
  }
  return out;
}

/**
 * Ne garde que les onglets dont la coquille telephone a une VRAIE vue, sans toucher a l'ordre.
 *
 * ---------- POURQUOI CE FILTRE EXISTE ----------
 *
 * Le mini arc tirait bien ses onglets de layout.visible — il en proposait donc 24 pour Talvex
 * Administrateur. Le `switch` de rendu de la coquille n'en connaissait que 11, et finissait par
 * `default: return <SADashboard />`. Choisir « Logo » affichait le Dashboard SOUS LE TITRE
 * « Logo », puisque le libelle venait de la vraie liste et la vue d'un switch incomplet.
 * Treize onglets mentaient ainsi : pas un ecran vide, la MAUVAISE page sous le bon titre.
 *
 * Le filtre est la reponse : un onglet sans vue DISPARAIT de la navigation, au lieu
 * d'apparaitre et de tromper. Il s'applique APRES mobileItems, et c'est voulu — le
 * compartiment d'un onglet est la section qui le precede dans la liste COMPLETE, donc filtrer
 * avant pourrait lui attribuer le compartiment d'un voisin.
 *
 * L'ordre n'est jamais retouche : c'est celui que David a choisi en reorganisant sa barre
 * laterale. Inventer ici un classement « intelligent » reintroduirait une deuxieme verite a
 * cote de la sienne.
 */
export function filtrerRendables<T extends { id: string }>(
  items: readonly T[],
  rendables: readonly string[],
): T[] {
  const su = new Set(rendables);
  return items.filter(i => su.has(i.id));
}

/**
 * Nombre de cellules de la barre du bas.
 *
 * Cinq, parce que c'est ce que la barre affichait deja : on ne change pas ce que l'oeil
 * connait. Au-dela, la cinquieme devient « Plus » et le reste part dans la feuille, DANS LE
 * MEME ORDRE.
 */
export const CELLULES_BARRE = 5;

/**
 * Repartit les onglets entre la barre du bas et la feuille « Plus ».
 *
 * Jusqu'a CELLULES_BARRE onglets, tout tient en bas et il n'y a PAS de bouton « Plus » : une
 * Societe qui n'a garde que quatre onglets ne doit pas voir un bouton qui n'ouvre rien.
 */
export function repartirOnglets<T extends { id: string }>(
  onglets: readonly T[],
): { barre: T[]; plus: T[] } {
  if (onglets.length <= CELLULES_BARRE) return { barre: [...onglets], plus: [] };
  return { barre: onglets.slice(0, CELLULES_BARRE - 1), plus: onglets.slice(CELLULES_BARRE - 1) };
}

/**
 * L'onglet a afficher quand celui qui est actif n'est plus atteignable.
 *
 * Ce n'est PAS le repli silencieux qu'on vient de supprimer, et la difference est tout le
 * sujet. Le repli supprime cachait un trou dans le code : un id sans vue affichait le
 * Dashboard en pretendant etre autre chose. Ici, l'onglet actif a disparu parce que
 * l'UTILISATEUR vient de le masquer depuis son bureau, ou parce que son droit a change.
 * Rester sur un onglet que sa configuration ne contient plus n'aurait aucun sens.
 *
 * Rend null quand il n'y a rien a montrer : l'appelant doit alors le DIRE, pas deviner.
 */
export function corrigerOngletActif(
  actif: string,
  onglets: readonly { id: string }[],
): string | null {
  if (onglets.some(o => o.id === actif)) return actif;
  return onglets[0]?.id ?? null;
}

/**
 * Ecart CIRCULAIRE entre un onglet et l'actif, centre sur zero : le plus court chemin autour de la
 * roue, dans [-n/2, n/2[. C'est ce qui permet a l'arc de rester plein des deux cotes, y compris sur
 * le premier et le dernier onglet — apres Systeme vient Dashboard, avant Dashboard vient Systeme.
 */
export function ecartCirculaire(i: number, actif: number, n: number): number {
  if (n <= 0) return 0;
  const demi = n / 2;
  return ((((i - actif + demi) % n) + n) % n) - demi;
}
