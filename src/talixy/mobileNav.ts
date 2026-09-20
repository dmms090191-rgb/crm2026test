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
 * Ecart CIRCULAIRE entre un onglet et l'actif, centre sur zero : le plus court chemin autour de la
 * roue, dans [-n/2, n/2[. C'est ce qui permet a l'arc de rester plein des deux cotes, y compris sur
 * le premier et le dernier onglet — apres Systeme vient Dashboard, avant Dashboard vient Systeme.
 */
export function ecartCirculaire(i: number, actif: number, n: number): number {
  if (n <= 0) return 0;
  const demi = n / 2;
  return ((((i - actif + demi) % n) + n) % n) - demi;
}
