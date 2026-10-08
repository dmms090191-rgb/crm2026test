/**
 * Module Cabinet — types et catalogue de modeles.
 *
 * Une Societe possede PLUSIEURS cabinets, exactement comme elle possede plusieurs
 * boutiques. Les elements futurs (scene 3D, salles, equipements, praticiens) viendront
 * dans des tables ENFANTS referencant `cabinet_id` — jamais comme colonnes ajoutees
 * a `Cabinet`. C'est la meme discipline que le module Boutique, et pour la meme raison :
 * une colonne ajoutee ici est payee par toutes les lignes, une table enfant ne coute
 * que ce qu'elle contient.
 */

/** Ligne de la table `cabinets`. Miroir exact du schema Supabase. */
export interface Cabinet {
  id: string;
  company_id: string;
  name: string;
  /** Cle du modele d'origine, ou null si le cabinet a ete cree de zero. */
  template_key: string | null;
  /**
   * Version du modele utilisee par ce cabinet. Elle decide du dossier d'assets servi.
   *
   * Contrairement a `boutiques`, la colonne existe DES LA CREATION de la table : la lecon
   * y a deja ete payee. Elle reste nullable, parce qu'un cabinet cree de zero n'a aucun
   * modele, donc aucune version.
   */
  template_version: number | null;
  status: string;
  created_at: string;
}

/** Modele de cabinet proposable au demarrage. */
export interface CabinetTemplate {
  key: string;
  name: string;
  category: string;
  type: string;
  description: string;
}

/**
 * Catalogue COMMERCIAL des modeles de cabinet : ce que la Societe voit au moment de creer
 * son cabinet.
 *
 * VIDE AUJOURD'HUI, et c'est exact : aucun modele de cabinet n'a encore ete concu dans
 * Blender. Le parcours de creation s'y adapte tout seul — la carte « Choisir un modele »
 * s'annonce indisponible tant que cette liste est vide, et se reactive des qu'une entree
 * y apparait. Rien d'autre a modifier dans l'interface.
 *
 * Quand le premier modele existera, il s'ajoute ici, et sa scene se declare dans
 * `MODELES_CABINET_3D` ci-dessous.
 */
export const CABINET_TEMPLATES: CabinetTemplate[] = [];

/**
 * Catalogue TECHNIQUE : quels modeles savent reellement s'ouvrir en 3D.
 *
 * Il est separe du catalogue commercial pour la meme raison que dans le module Boutique :
 * un modele peut etre propose a la vente avant que sa scene soit prete, et une scene peut
 * exister sans etre proposee. Les deux se rejoignent par `template_key`.
 *
 * VIDE AUJOURD'HUI. Ce module ne depend volontairement d'AUCUN fichier de `src/boutique3d` :
 * ce dossier porte le moteur en miroir d'un autre depot, et un cabinet n'a pas a dependre
 * du catalogue des boutiques pour exister.
 */
export const MODELES_CABINET_3D: Record<string, { templateKey: string; nom: string; versionParDefaut: number }> = {};

export function findCabinetTemplate(key: string | null): CabinetTemplate | undefined {
  if (!key) return undefined;
  return CABINET_TEMPLATES.find(t => t.key === key);
}

/** Ce cabinet peut-il ouvrir une scene 3D ? Faux tant que son modele n'est pas declare. */
export function aUnCabinet3D(templateKey: string | null | undefined): boolean {
  if (!templateKey) return false;
  return MODELES_CABINET_3D[templateKey] !== undefined;
}

/** Libelle affiche dans la colonne « Modele » du tableau. */
export function cabinetTemplateLabel(key: string | null): string {
  const t = findCabinetTemplate(key);
  if (t) return `${t.name} — ${t.category}`;
  return key ? key : 'Personnalisé';
}

/** Date de creation au format jj/mm/aaaa. */
export function formatCabinetDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
