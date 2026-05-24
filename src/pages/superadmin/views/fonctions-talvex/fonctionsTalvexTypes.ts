export type FonctionEtat = 'actif' | 'a_ameliorer' | 'futur';

export interface TalvexFonction {
  id: string;
  categoryId: string;
  titre: string;
  descriptionCourte: string;
  descriptionDetaillee: string;
  roleTalvex: string;
  utilisateurs: string;
  etat: FonctionEtat;
  notesTechniques: string;
  updatedAt: string;
}

export interface TalvexCategorie {
  id: string;
  label: string;
  order: number;
}

export const ETAT_CONFIG: Record<FonctionEtat, { label: string; color: string; bg: string }> = {
  actif: { label: 'Actif', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  a_ameliorer: { label: 'A ameliorer', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  futur: { label: 'Futur', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
};
