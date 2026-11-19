import type { CompanySuperAdmin } from '../pages/superadmin/views/super-admins/superAdminTypes';

/**
 * LA DERNIERE LISTE DES GROUPES CONNUE — memoire de la vue « Liste des groupes ».
 *
 * POURQUOI (diagnostic du 19/11/2026, journaux de production). La vue repartait d'une liste
 * VIDE a chaque ouverture et montrait un spinner central pendant tout l'aller-retour vers
 * l'Edge Function list-company-super-admins : 0,5 s a chaud, 6,4 s au reveil, 24,5 s le 19/11.
 * Avec cette memoire, la derniere liste connue s'affiche tout de suite et la vue se rafraichit
 * en arriere-plan (stale-while-revalidate).
 *
 * OU ELLE VIT, decision de David du 19/11/2026 : en memoire du module, doublee de
 * sessionStorage pour survivre a un F5. JAMAIS localStorage : sessionStorage meurt avec
 * l'onglet, comme le jeton de session qui y vit deja sur le web (src/lib/supabase.ts).
 *
 * CE QU'ELLE CONTIENT : exactement ce que l'Edge Function rend a TOUT Super Admin (la liste
 * ne depend pas de l'appelant), plus les statuts affiches. Elle est videe a chaque deconnexion
 * (src/lib/deconnexion.ts, et la fin de session vue par App.tsx). C'est CET EFFACEMENT, et lui
 * seul, qui garantit qu'une liste ne passe pas d'une session a la suivante : l'affichage ne
 * compare pas le compte (voir `userId` ci-dessous).
 * Donnee au repos assumee (decision du 19/11/2026) : la cle contient les coordonnees des
 * Groupes, en clair, comme le jeton de session voisin ; seul un Super Admin peut l'ecrire.
 *
 * LA GENERATION : chaque relecture FORCEE (apres une creation, une suppression, un changement
 * de statut...) et chaque oubli ouvrent une generation nouvelle. Une reponse partie AVANT
 * n'ecrit alors ni l'ecran ni cette memoire : un Groupe supprime ne peut pas y revenir par
 * une lecture plus ancienne qui arriverait en retard.
 */

export interface GroupesConnus {
  /** Le compte qui a lu cette liste. Sert a garder ses statuts d'une lecture a l'autre ; il n'est
      PAS controle a l'affichage, c'est l'effacement a la deconnexion qui protege (voir plus haut). */
  userId: string;
  list: CompanySuperAdmin[];
  statuts: Record<string, string>;
}

const CLE = 'talvex:sa-groupes:v1';

let memoire: GroupesConnus | null = null;
let generation = 0;

export function generationCourante(): number { return generation; }
export function nouvelleGeneration(): number { generation += 1; return generation; }

export function lireGroupesConnus(): GroupesConnus | null {
  if (memoire) return memoire;
  try {
    const brut = sessionStorage.getItem(CLE);
    if (!brut) return null;
    const v = JSON.parse(brut) as Partial<GroupesConnus> | null;
    if (v && typeof v.userId === 'string' && Array.isArray(v.list) && v.statuts && typeof v.statuts === 'object') {
      memoire = { userId: v.userId, list: v.list, statuts: v.statuts };
      return memoire;
    }
  } catch { /* stockage indisponible ou illisible : on repart du reseau */ }
  return null;
}

export function ecrireGroupesConnus(v: GroupesConnus): void {
  memoire = v;
  try { sessionStorage.setItem(CLE, JSON.stringify(v)); } catch { /* quota, mode prive : la memoire du module suffit */ }
}

/** Un statut ENREGISTRE par la vue (upsert reussi) est ecrit aussi ici, pour qu'un retour sur la page ne montre pas l'ancien. */
export function memoriserStatutConnu(companyId: string, nom: string): void {
  const c = lireGroupesConnus();
  if (c) ecrireGroupesConnus({ ...c, statuts: { ...c.statuts, [companyId]: nom } });
}

/** A la deconnexion : plus rien de la session precedente, et toute reponse encore en vol est perimee. */
export function oublierGroupesConnus(): void {
  memoire = null;
  generation += 1;
  try { sessionStorage.removeItem(CLE); } catch { /* ignore */ }
}
