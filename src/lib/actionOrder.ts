/**
 * Ordre visuel d'une petite liste d'actions — logique pure, sans React ni
 * Supabase. Volontairement minimal : une liste d'ids, rien d'autre.
 * Ce n'est pas le moteur Sidebar V2 et ca n'a pas a le devenir.
 */

/**
 * Confronte l'ordre enregistre aux actions reellement presentes dans le code.
 *   · action connue et enregistree  -> a sa place enregistree
 *   · action disparue du code        -> simplement plus rendue
 *   · action ajoutee au code         -> ajoutee EN FIN
 *
 * Aucune action definie dans le code n'est jamais perdue.
 */
export function reconcileOrder(saved: string[] | null | undefined, present: string[]): string[] {
  if (!saved) return present;
  const known = new Set(present);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of saved) {
    if (!known.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  for (const id of present) if (!seen.has(id)) out.push(id);
  return out;
}

/**
 * Confronte la liste des actions MASQUEES au code reel.
 * Un id masque qui n'existe plus est ignore ; aucune action du code n'est
 * jamais masquee implicitement. Sans reglage : rien n'est masque.
 */
export function reconcileHidden(saved: string[] | null | undefined, present: string[]): string[] {
  if (!saved) return [];
  const known = new Set(present);
  return [...new Set(saved.filter(id => known.has(id)))];
}

/** Deplace un element. Hors bornes ou sur place : la liste est rendue telle quelle. */
export function moveInOrder(order: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) return order;
  const next = [...order];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
