/*
 * TALIXY dans la Bibliotheque de themes (prototype).
 *
 * Pendant le prototype, l'onglet Talixy n'existe que dans la portee PERSONNELLE de Talvex Administrateur :
 * le choix s'ecrit alors dans sa propre preference (user_preferences.theme_by_role.super_admin).
 * Partout ailleurs, l'onglet n'existe pas : Groupe, Societe, Commercial, Client, et aussi Talvex en Visu,
 * ou choisir un theme ecrirait le theme de toute l'entreprise visualisee.
 * Aucune ligne theme_config n'est necessaire : Talixy n'apparait donc pas non plus dans « Tous ».
 *
 * Module pur, sans aucun import : testable avec node --test.
 */
export const TALIXY_TAB = 'talixy';

export interface LibraryTab {
  key: string;
  label: string;
}

/** Ajoute l'onglet Talixy juste apres Favoris (Tous | Favoris | Talixy | ...), seulement si autorise. */
export function withTalixyTab(tabs: readonly LibraryTab[], allowed: boolean, favKey: string): LibraryTab[] {
  const base = tabs.filter(t => t.key !== TALIXY_TAB);
  if (!allowed) return base;
  const fav = base.findIndex(t => t.key === favKey);
  const at = fav >= 0 ? fav + 1 : Math.min(1, base.length);
  return [...base.slice(0, at), { key: TALIXY_TAB, label: 'Talixy' }, ...base.slice(at)];
}
