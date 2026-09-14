/**
 * Module Boutique — types et catalogue de modeles.
 *
 * Une Societe possede PLUSIEURS boutiques. Les elements futurs (3D, articles,
 * ecrans, musique, lumieres, decoration) viendront dans des tables ENFANTS
 * referencant `boutique_id` — jamais comme colonnes ajoutees a `Boutique`.
 */

/** Ligne de la table `boutiques`. Miroir exact du schema Supabase. */
export interface Boutique {
  id: string;
  company_id: string;
  name: string;
  /** Cle du modele d'origine, ou null si la boutique a ete creee de zero. */
  template_key: string | null;
  status: string;
  created_at: string;
}

/** Modele de boutique proposable au demarrage. */
export interface BoutiqueTemplate {
  key: string;
  name: string;
  category: string;
  type: string;
  description: string;
}

/**
 * Catalogue des modeles disponibles.
 * Pour l'instant un seul : la boutique Johanna deja concue.
 * L'integration de la scene 3D n'est PAS faite a cette etape.
 */
export const BOUTIQUE_TEMPLATES: BoutiqueTemplate[] = [
  {
    key: 'johanna-mode-luxe',
    name: 'Johanna',
    category: 'Mode Luxe',
    type: 'Boutique 3D',
    description: 'Une boutique immersive au style épuré, pensée pour la mode haut de gamme.',
  },
];

export function findTemplate(key: string | null): BoutiqueTemplate | undefined {
  if (!key) return undefined;
  return BOUTIQUE_TEMPLATES.find(t => t.key === key);
}

/** Libelle affiche dans la colonne « Modele » du tableau. */
export function templateLabel(key: string | null): string {
  const t = findTemplate(key);
  if (t) return `${t.name} — ${t.category}`;
  return key ? key : 'Personnalisée';
}

/** Date de creation au format jj/mm/aaaa. */
export function formatBoutiqueDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
